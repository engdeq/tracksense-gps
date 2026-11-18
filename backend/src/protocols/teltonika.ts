/**
 * Extensible Teltonika Codec8 / FMB920 GPS protocol helpers.
 * This module parses Codec8 AVL records and normalizes them for TrackSense.
 *
 * Real devices connect via TCP (see gpsTcpServer). Demonstration/import data
 * must set source !== 'device' so clients never treat demo samples as live production telemetry.
 */

export interface TeltonikaAvlRecord {
  timestamp: Date;
  priority: number;
  longitude: number;
  latitude: number;
  altitude: number;
  angle: number;
  satellites: number;
  speed: number;
  eventIoId: number;
  ioElements: Record<number, number | bigint>;
}

export interface NormalizedGpsFix {
  imei: string;
  latitude: number;
  longitude: number;
  altitude: number;
  heading: number;
  speedKmh: number;
  satellites: number;
  ignition: boolean;
  recordedAt: Date;
  raw?: unknown;
}

function readInt32(buffer: Buffer, offset: number): number {
  return buffer.readInt32BE(offset);
}

function decodeCoordinate(value: number): number {
  return value / 10000000;
}

/** Parse a single Codec8 AVL record starting at offset. Returns [record, nextOffset] */
export function parseCodec8Record(buffer: Buffer, offset: number): [TeltonikaAvlRecord, number] {
  const timestamp = new Date(Number(buffer.readBigUInt64BE(offset)));
  offset += 8;
  const priority = buffer.readUInt8(offset);
  offset += 1;
  const longitude = decodeCoordinate(readInt32(buffer, offset));
  offset += 4;
  const latitude = decodeCoordinate(readInt32(buffer, offset));
  offset += 4;
  const altitude = buffer.readInt16BE(offset);
  offset += 2;
  const angle = buffer.readUInt16BE(offset);
  offset += 2;
  const satellites = buffer.readUInt8(offset);
  offset += 1;
  const speed = buffer.readUInt16BE(offset);
  offset += 2;
  const eventIoId = buffer.readUInt8(offset);
  offset += 1;
  const totalIo = buffer.readUInt8(offset);
  offset += 1;

  const ioElements: Record<number, number | bigint> = {};
  void totalIo;

  // 1-byte IO
  const n1 = buffer.readUInt8(offset);
  offset += 1;
  for (let i = 0; i < n1; i++) {
    const id = buffer.readUInt8(offset);
    offset += 1;
    ioElements[id] = buffer.readUInt8(offset);
    offset += 1;
  }

  // 2-byte IO
  const n2 = buffer.readUInt8(offset);
  offset += 1;
  for (let i = 0; i < n2; i++) {
    const id = buffer.readUInt8(offset);
    offset += 1;
    ioElements[id] = buffer.readUInt16BE(offset);
    offset += 2;
  }

  // 4-byte IO
  const n4 = buffer.readUInt8(offset);
  offset += 1;
  for (let i = 0; i < n4; i++) {
    const id = buffer.readUInt8(offset);
    offset += 1;
    ioElements[id] = buffer.readUInt32BE(offset);
    offset += 4;
  }

  // 8-byte IO
  const n8 = buffer.readUInt8(offset);
  offset += 1;
  for (let i = 0; i < n8; i++) {
    const id = buffer.readUInt8(offset);
    offset += 1;
    ioElements[id] = buffer.readBigUInt64BE(offset);
    offset += 8;
  }

  return [
    {
      timestamp,
      priority,
      longitude,
      latitude,
      altitude,
      angle,
      satellites,
      speed,
      eventIoId,
      ioElements,
    },
    offset,
  ];
}

export function normalizeTeltonikaRecord(imei: string, record: TeltonikaAvlRecord): NormalizedGpsFix {
  const ignition = Number(record.ioElements[239] ?? 0) === 1;
  return {
    imei,
    latitude: record.latitude,
    longitude: record.longitude,
    altitude: record.altitude,
    heading: record.angle,
    speedKmh: record.speed,
    satellites: record.satellites,
    ignition,
    recordedAt: record.timestamp,
    raw: record,
  };
}

export interface GpsProtocolHandler {
  key: string;
  name: string;
  parseImei?(buffer: Buffer): string | null;
  parseRecords?(buffer: Buffer, imei: string): NormalizedGpsFix[];
}

export const teltonikaFmb920Handler: GpsProtocolHandler = {
  key: 'teltonika_codec8',
  name: 'Teltonika Codec8 (FMB920)',
  parseImei(buffer: Buffer) {
    // IMEI login packet: 000F + IMEI length + ASCII IMEI
    if (buffer.length < 17) return null;
    const len = buffer.readUInt16BE(0);
    if (len > 0 && len < 20 && buffer.length >= 2 + len) {
      return buffer.subarray(2, 2 + len).toString('ascii').replace(/\0/g, '').trim();
    }
    return null;
  },
};

export const protocolRegistry: Record<string, GpsProtocolHandler> = {
  teltonika_codec8: teltonikaFmb920Handler,
  fmb920: teltonikaFmb920Handler,
};

export function getProtocolHandler(key: string): GpsProtocolHandler | undefined {
  return protocolRegistry[key];
}
