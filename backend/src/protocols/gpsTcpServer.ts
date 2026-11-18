import net from 'net';
import { env } from '../config/env.js';
import { Device } from '../models/Device.js';
import { Position } from '../models/Position.js';
import { Vehicle } from '../models/Vehicle.js';
import { emitVehiclePosition } from '../sockets/index.js';
import { parseCodec8Record, normalizeTeltonikaRecord } from './teltonika.js';
import { Alert } from '../models/Alert.js';
import { evaluateVehicleGeofences } from '../services/geofenceEngine.js';

let gpsTcpListening = false;

/** Real GPS TCP listener status for health checks — never invent "online". */
export function getGpsTcpStatus() {
  return {
    listening: gpsTcpListening,
    port: env.GPS_TCP_PORT,
  };
}

/**
 * Lightweight TCP listener for Teltonika FMB920 / Codec8 devices.
 * Accepts IMEI login, acknowledges, then processes AVL data packets.
 */
export function startGpsTcpServer() {
  const server = net.createServer((socket) => {
    let imei: string | null = null;
    let buffer = Buffer.alloc(0);

    socket.on('data', async (chunk) => {
      try {
        buffer = Buffer.concat([buffer, chunk]);

        if (!imei) {
          // Login packet
          if (buffer.length >= 2) {
            const imeiLen = buffer.readUInt16BE(0);
            if (buffer.length >= 2 + imeiLen) {
              imei = buffer.subarray(2, 2 + imeiLen).toString('ascii').trim();
              buffer = buffer.subarray(2 + imeiLen);
              // Acknowledge login
              socket.write(Buffer.from([0x01]));
              await Device.updateOne(
                { imei },
                { $set: { connectionStatus: 'online', lastCommunicationAt: new Date() } },
              );
            }
          }
          return;
        }

        // AVL data packet needs at least preamble + data length
        if (buffer.length < 8) return;
        const dataLength = buffer.readUInt32BE(4);
        const totalLen = 8 + dataLength + 4; // preamble(4)+len(4)+data+crc(4)
        if (buffer.length < totalLen) return;

        const packet = buffer.subarray(0, totalLen);
        buffer = buffer.subarray(totalLen);

        const codecId = packet.readUInt8(8);
        const recordCount = packet.readUInt8(9);
        if (codecId !== 0x08 && codecId !== 0x8e) {
          // Unsupported codec — still ACK count to keep device happy
          const ack = Buffer.alloc(4);
          ack.writeUInt32BE(recordCount, 0);
          socket.write(ack);
          return;
        }

        let offset = 10;
        const device = await Device.findOne({ imei });
        for (let i = 0; i < recordCount; i++) {
          const [record, next] = parseCodec8Record(packet, offset);
          offset = next;
          const fix = normalizeTeltonikaRecord(imei, record);

          if (!device) continue;

          const position = await Position.create({
            deviceId: device._id,
            vehicleId: device.vehicleId,
            customerId: device.customerId,
            imei,
            latitude: fix.latitude,
            longitude: fix.longitude,
            altitude: fix.altitude,
            speedKmh: fix.speedKmh,
            heading: fix.heading,
            satellites: fix.satellites,
            ignition: fix.ignition,
            recordedAt: fix.recordedAt,
            receivedAt: new Date(),
            source: 'device',
          });

          let motionStatus: 'moving' | 'stopped' | 'offline' | 'speeding' | 'engine' = 'stopped';
          if (fix.speedKmh > 5) motionStatus = 'moving';
          if (fix.ignition && fix.speedKmh <= 5) motionStatus = 'engine';

          if (device.vehicleId) {
            const vehicle = await Vehicle.findById(device.vehicleId);
            if (vehicle && fix.speedKmh > (vehicle.speedLimitKmh || 120)) {
              motionStatus = 'speeding';
              await Alert.create({
                customerId: vehicle.customerId,
                vehicleId: vehicle._id,
                deviceId: device._id,
                type: 'speeding',
                severity: 'warning',
                title: 'Speeding alert',
                message: `${vehicle.plateNumber} exceeded speed limit at ${fix.speedKmh} km/h`,
                metadata: { speedKmh: fix.speedKmh, limit: vehicle.speedLimitKmh },
              });
            }
            await Vehicle.findByIdAndUpdate(device.vehicleId, { motionStatus });
            emitVehiclePosition({
              vehicleId: String(device.vehicleId),
              customerId: device.customerId ? String(device.customerId) : null,
              motionStatus,
              position: position.toObject(),
            });

            // Real-time geofence entry/exit evaluation (assigned fences only)
            if (
              Number.isFinite(fix.latitude) &&
              Number.isFinite(fix.longitude) &&
              !(fix.latitude === 0 && fix.longitude === 0)
            ) {
              try {
                await evaluateVehicleGeofences({
                  vehicleId: String(device.vehicleId),
                  customerId: device.customerId ? String(device.customerId) : null,
                  deviceId: String(device._id),
                  latitude: fix.latitude,
                  longitude: fix.longitude,
                  speedKmh: fix.speedKmh,
                  recordedAt: fix.recordedAt,
                  positionId: String(position._id),
                  source: 'device',
                });
              } catch (geoErr) {
                console.error('Geofence evaluation error', geoErr);
              }
            }
          }

          await Device.updateOne(
            { _id: device._id },
            { $set: { connectionStatus: 'online', lastCommunicationAt: new Date() } },
          );
        }

        const ack = Buffer.alloc(4);
        ack.writeUInt32BE(recordCount, 0);
        socket.write(ack);
      } catch (err) {
        console.error('GPS TCP parse error', err);
      }
    });

    socket.on('close', async () => {
      if (imei) {
        await Device.updateOne({ imei }, { $set: { connectionStatus: 'offline' } });
      }
    });

    socket.on('error', (err) => {
      console.error('GPS TCP socket error', err.message);
    });
  });

  server.on('listening', () => {
    gpsTcpListening = true;
  });
  server.on('close', () => {
    gpsTcpListening = false;
  });
  server.on('error', () => {
    gpsTcpListening = false;
  });

  server.listen(env.GPS_TCP_PORT, () => {
    gpsTcpListening = true;
    console.log(`Teltonika GPS TCP server listening on port ${env.GPS_TCP_PORT}`);
  });

  return server;
}
