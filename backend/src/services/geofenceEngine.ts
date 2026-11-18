import { Geofence } from '../models/Geofence.js';
import { GeofenceEvent } from '../models/GeofenceEvent.js';
import { GeofencePresence } from '../models/GeofencePresence.js';
import { Alert } from '../models/Alert.js';
import { getIO } from '../sockets/index.js';

const EARTH_RADIUS_M = 6371000;
/** Ignore jitter near the boundary (meters) — used as soft hysteresis for circles. */
const BOUNDARY_TOLERANCE_M = 15;
/** Suppress duplicate same-type events within this window. */
const DEDUP_MS = 60_000;

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

/** Ray-casting point-in-polygon. Ring is [lng, lat][]. */
export function pointInPolygon(lng: number, lat: number, ring: number[][]) {
  if (!ring?.length) return false;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const pi = ring[i];
    const pj = ring[j];
    if (!pi || !pj || pi.length < 2 || pj.length < 2) continue;
    const xi = pi[0]!;
    const yi = pi[1]!;
    const xj = pj[0]!;
    const yj = pj[1]!;
    const intersect =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function isInsideGeofence(
  lat: number,
  lng: number,
  fence: {
    type: string;
    center?: { lat?: number; lng?: number } | null;
    radiusMeters?: number | null;
    coordinates?: number[][];
  },
): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;

  if (fence.type === 'circle') {
    if (!fence.center || fence.radiusMeters == null) return false;
    const dist = haversineMeters(lat, lng, fence.center.lat!, fence.center.lng!);
    return dist <= Math.max(0, fence.radiusMeters - BOUNDARY_TOLERANCE_M / 2);
  }

  const ring = fence.coordinates || [];
  return pointInPolygon(lng, lat, ring);
}

export type PositionInput = {
  vehicleId: string;
  customerId?: string | null;
  deviceId?: string | null;
  latitude: number;
  longitude: number;
  speedKmh?: number;
  recordedAt: Date;
  positionId?: string | null;
  source?: string;
};

/**
 * Evaluate geofence transitions for a single vehicle position update.
 * Only checks geofences that assign this vehicle.
 */
export async function evaluateVehicleGeofences(input: PositionInput) {
  if (!input.vehicleId) return [];
  if (!Number.isFinite(input.latitude) || !Number.isFinite(input.longitude)) return [];

  const fences = await Geofence.find({
    isActive: true,
    assignedVehicleIds: input.vehicleId,
  }).lean();

  if (!fences.length) return [];

  const createdEvents = [];

  for (const fence of fences) {
    const inside = isInsideGeofence(input.latitude, input.longitude, fence as never);
    const presence = await GeofencePresence.findOne({
      geofenceId: fence._id,
      vehicleId: input.vehicleId,
    });

    const previouslyInside = presence?.inside;
    let eventType: 'entry' | 'exit' | null = null;

    if (previouslyInside === undefined || previouslyInside === null) {
      // First observation — seed state without alerting
      await GeofencePresence.findOneAndUpdate(
        { geofenceId: fence._id, vehicleId: input.vehicleId },
        {
          inside,
          lastEvaluatedAt: input.recordedAt,
          lastLatitude: input.latitude,
          lastLongitude: input.longitude,
        },
        { upsert: true },
      );
      continue;
    }

    if (!previouslyInside && inside) eventType = 'entry';
    if (previouslyInside && !inside) eventType = 'exit';

    await GeofencePresence.findOneAndUpdate(
      { geofenceId: fence._id, vehicleId: input.vehicleId },
      {
        inside,
        lastEvaluatedAt: input.recordedAt,
        lastLatitude: input.latitude,
        lastLongitude: input.longitude,
      },
      { upsert: true },
    );

    if (!eventType) continue;

    const alerts = fence.alertSettings || { enabled: true, onEntry: true, onExit: true };
    const shouldAlert =
      alerts.enabled !== false &&
      ((eventType === 'entry' && alerts.onEntry !== false) ||
        (eventType === 'exit' && alerts.onExit !== false));

    // Deduplicate rapid GPS chatter
    const recent = await GeofenceEvent.findOne({
      geofenceId: fence._id,
      vehicleId: input.vehicleId,
      eventType,
      recordedAt: { $gte: new Date(input.recordedAt.getTime() - DEDUP_MS) },
    });
    if (recent) continue;

    let alertId = null;
    if (shouldAlert) {
      const alert = await Alert.create({
        customerId: fence.customerId || input.customerId || null,
        vehicleId: input.vehicleId,
        deviceId: input.deviceId || null,
        type: 'geofence',
        severity: 'warning',
        title: eventType === 'entry' ? 'Geofence entry' : 'Geofence exit',
        message: `Vehicle ${eventType === 'entry' ? 'entered' : 'exited'} geofence "${fence.name}"`,
        metadata: {
          geofenceId: String(fence._id),
          geofenceName: fence.name,
          eventType,
          latitude: input.latitude,
          longitude: input.longitude,
          source: input.source || 'device',
        },
      });
      alertId = alert._id;
    }

    const event = await GeofenceEvent.create({
      geofenceId: fence._id,
      vehicleId: input.vehicleId,
      customerId: fence.customerId || input.customerId || null,
      deviceId: input.deviceId || null,
      eventType,
      latitude: input.latitude,
      longitude: input.longitude,
      speedKmh: input.speedKmh ?? 0,
      recordedAt: input.recordedAt,
      positionSource: input.source || 'device',
      positionId: input.positionId || null,
      alertId,
    });

    createdEvents.push(event);

    try {
      const io = getIO();
      io.to('admins').emit('geofence:event', {
        eventId: String(event._id),
        geofenceId: String(fence._id),
        vehicleId: input.vehicleId,
        eventType,
        recordedAt: input.recordedAt,
      });
      if (fence.customerId) {
        io.to(`customer:${fence.customerId}`).emit('geofence:event', {
          eventId: String(event._id),
          geofenceId: String(fence._id),
          vehicleId: input.vehicleId,
          eventType,
        });
      }
    } catch {
      /* socket may not be ready in tests */
    }
  }

  return createdEvents;
}
