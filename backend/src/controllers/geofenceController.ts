import { z } from 'zod';
import type { Request, Response } from 'express';
import { Geofence } from '../models/Geofence.js';
import { GeofenceEvent } from '../models/GeofenceEvent.js';
import { GeofencePresence } from '../models/GeofencePresence.js';
import { Vehicle } from '../models/Vehicle.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { created, success } from '../utils/apiResponse.js';
import { AppError } from '../utils/AppError.js';
import { resolveCustomerScope } from '../middleware/auth.js';
import { writeAuditLog } from '../services/auditService.js';
import { evaluateVehicleGeofences } from '../services/geofenceEngine.js';

const pointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const geofenceSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().optional().default(''),
  customerId: z.string().min(1),
  countryId: z.string().nullable().optional().default(null),
  cityId: z.string().nullable().optional().default(null),
  type: z.enum(['circle', 'polygon', 'rectangle']),
  color: z.string().optional().default('#5577E8'),
  center: pointSchema.nullable().optional().default(null),
  radiusMeters: z.number().positive().nullable().optional().default(null),
  /** GeoJSON order [lng, lat] */
  coordinates: z.array(z.tuple([z.number(), z.number()])).optional().default([]),
  assignedVehicleIds: z.array(z.string()).optional().default([]),
  alertSettings: z
    .object({
      enabled: z.boolean().optional().default(true),
      onEntry: z.boolean().optional().default(true),
      onExit: z.boolean().optional().default(true),
    })
    .optional()
    .default({ enabled: true, onEntry: true, onExit: true }),
  isActive: z.boolean().optional().default(true),
});

function closeRing(coords: number[][]): number[][] {
  if (!coords.length) return coords;
  const first = coords[0];
  const last = coords[coords.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) return coords;
  return [...coords, [first[0], first[1]]];
}

function validateGeometry(payload: z.infer<typeof geofenceSchema>) {
  if (payload.type === 'circle') {
    if (!payload.center) throw new AppError('Circle geofence requires a center point', 400);
    if (!payload.radiusMeters || payload.radiusMeters <= 0) {
      throw new AppError('Circle geofence requires a positive radius', 400);
    }
    if (payload.radiusMeters > 500_000) {
      throw new AppError('Radius cannot exceed 500 km', 400);
    }
  } else {
    const ring = payload.coordinates || [];
    if (ring.length < 3) {
      throw new AppError(`${payload.type} geofence requires at least 3 coordinates`, 400);
    }
    for (const [lng, lat] of ring) {
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        throw new AppError('Invalid coordinate in boundary', 400);
      }
    }
  }
}

function buildGeometry(payload: z.infer<typeof geofenceSchema>) {
  if (payload.type === 'circle' && payload.center) {
    return {
      type: 'Point' as const,
      coordinates: [payload.center.lng, payload.center.lat] as [number, number],
    };
  }
  const ring = closeRing(payload.coordinates || []);
  return {
    type: 'Polygon' as const,
    coordinates: [ring],
  };
}

function polygonAreaApproxM2(ring: number[][]) {
  if (ring.length < 3) return 0;
  // Spherical excess approximation via equirectangular projected shoelace
  const R = 6371000;
  const lat0 = (ring.reduce((s, c) => s + c[1], 0) / ring.length) * (Math.PI / 180);
  let area = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const x1 = ring[i][0] * (Math.PI / 180) * Math.cos(lat0) * R;
    const y1 = ring[i][1] * (Math.PI / 180) * R;
    const x2 = ring[i + 1][0] * (Math.PI / 180) * Math.cos(lat0) * R;
    const y2 = ring[i + 1][1] * (Math.PI / 180) * R;
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area / 2);
}

function formatArea(fence: {
  type: string;
  radiusMeters?: number | null;
  coordinates?: number[][];
}) {
  if (fence.type === 'circle' && fence.radiusMeters != null) {
    const r = fence.radiusMeters;
    if (r >= 1000) return `${(r / 1000).toFixed(2)} km radius`;
    return `${Math.round(r)} m radius`;
  }
  const m2 = polygonAreaApproxM2(fence.coordinates || []);
  if (m2 >= 1_000_000) return `${(m2 / 1_000_000).toFixed(2)} km²`;
  if (m2 >= 10_000) return `${(m2 / 10_000).toFixed(2)} ha`;
  return `${Math.round(m2)} m²`;
}

async function assertVehiclesBelongToCustomer(vehicleIds: string[], customerId: string) {
  if (!vehicleIds.length) return;
  const count = await Vehicle.countDocuments({
    _id: { $in: vehicleIds },
    customerId,
  });
  if (count !== vehicleIds.length) {
    throw new AppError('All assigned vehicles must belong to the selected customer', 400);
  }
}

function applyScopeFilter(req: Request, filter: Record<string, unknown>) {
  const scope = resolveCustomerScope(req);
  if (req.user?.role === 'customer') {
    filter.customerId = scope;
  } else if (typeof req.query.customerId === 'string' && req.query.customerId) {
    filter.customerId = req.query.customerId;
  }
  if (req.user?.role === 'country_manager' && req.user.countryId) {
    filter.countryId = req.user.countryId;
  }
  if (req.user?.role === 'city_manager' && req.user.cityId) {
    filter.cityId = req.user.cityId;
  }
  return scope;
}

export const getStatistics = asyncHandler(async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = {};
  applyScopeFilter(req, filter);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [total, active, inactive, vehicleAgg, entryToday, exitToday] = await Promise.all([
    Geofence.countDocuments(filter),
    Geofence.countDocuments({ ...filter, isActive: true }),
    Geofence.countDocuments({ ...filter, isActive: false }),
    Geofence.aggregate([
      { $match: filter },
      { $unwind: { path: '$assignedVehicleIds', preserveNullAndEmptyArrays: false } },
      { $group: { _id: '$assignedVehicleIds' } },
      { $count: 'count' },
    ]),
    GeofenceEvent.countDocuments({
      ...(filter.customerId ? { customerId: filter.customerId } : {}),
      eventType: 'entry',
      recordedAt: { $gte: startOfDay },
    }),
    GeofenceEvent.countDocuments({
      ...(filter.customerId ? { customerId: filter.customerId } : {}),
      eventType: 'exit',
      recordedAt: { $gte: startOfDay },
    }),
  ]);

  return success(res, {
    totalGeofences: total,
    activeGeofences: active,
    inactiveGeofences: inactive,
    vehiclesAssigned: vehicleAgg[0]?.count ?? 0,
    entryAlertsToday: entryToday,
    exitAlertsToday: exitToday,
  });
});

export const listGeofences = asyncHandler(async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = {};
  applyScopeFilter(req, filter);

  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (q) {
    filter.$or = [{ name: new RegExp(q, 'i') }, { description: new RegExp(q, 'i') }];
  }
  if (typeof req.query.countryId === 'string' && req.query.countryId && !filter.countryId) {
    filter.countryId = req.query.countryId;
  }
  if (typeof req.query.cityId === 'string' && req.query.cityId && !filter.cityId) {
    filter.cityId = req.query.cityId;
  }
  if (typeof req.query.type === 'string' && ['circle', 'polygon', 'rectangle'].includes(req.query.type)) {
    filter.type = req.query.type;
  }
  if (req.query.status === 'active') filter.isActive = true;
  if (req.query.status === 'inactive') filter.isActive = false;

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;
  const sortKey = typeof req.query.sort === 'string' ? req.query.sort : '-createdAt';

  const [items, total] = await Promise.all([
    Geofence.find(filter)
      .populate('customerId', 'companyName')
      .populate('countryId', 'name code')
      .populate('cityId', 'name')
      .populate('assignedVehicleIds', 'name plateNumber')
      .sort(sortKey)
      .skip(skip)
      .limit(limit),
    Geofence.countDocuments(filter),
  ]);

  return success(res, {
    items: items.map((g, idx) => {
      const obj = g.toObject();
      const alert = obj.alertSettings || { enabled: true, onEntry: true, onExit: true };
      let alertRules = 'Disabled';
      if (alert.enabled !== false) {
        if (alert.onEntry && alert.onExit) alertRules = 'Entry & Exit';
        else if (alert.onEntry) alertRules = 'Entry only';
        else if (alert.onExit) alertRules = 'Exit only';
        else alertRules = 'Enabled (no rules)';
      }
      return {
        ...obj,
        rowNumber: skip + idx + 1,
        areaLabel: formatArea(obj as never),
        alertRules,
        assignedVehicleCount: Array.isArray(obj.assignedVehicleIds) ? obj.assignedVehicleIds.length : 0,
      };
    }),
    total,
    page,
    limit,
  });
});

export const getGeofence = asyncHandler(async (req: Request, res: Response) => {
  const scope = resolveCustomerScope(req);
  const fence = await Geofence.findById(req.params.id)
    .populate('customerId', 'companyName')
    .populate('countryId', 'name code')
    .populate('cityId', 'name')
    .populate('assignedVehicleIds', 'name plateNumber status motionStatus')
    .populate('createdBy', 'fullName username')
    .populate('updatedBy', 'fullName username');

  if (!fence) throw new AppError('Geofence not found', 404);
  if (scope && String(fence.customerId?._id || fence.customerId) !== scope) {
    throw new AppError('Forbidden', 403);
  }

  const recentEvents = await GeofenceEvent.find({ geofenceId: fence._id })
    .populate('vehicleId', 'name plateNumber')
    .sort({ recordedAt: -1 })
    .limit(20);

  return success(res, {
    ...fence.toObject(),
    areaLabel: formatArea(fence.toObject() as never),
    recentEvents,
    recentEntries: recentEvents.filter((e) => e.eventType === 'entry'),
    recentExits: recentEvents.filter((e) => e.eventType === 'exit'),
  });
});

export const createGeofence = asyncHandler(async (req: Request, res: Response) => {
  const scope = resolveCustomerScope(req);
  const body = geofenceSchema.parse(req.body);

  if (req.user?.role === 'customer') {
    if (!scope) throw new AppError('Forbidden', 403);
    body.customerId = scope;
  }

  validateGeometry(body);
  await assertVehiclesBelongToCustomer(body.assignedVehicleIds, body.customerId);

  const coordinates =
    body.type === 'circle'
      ? []
      : closeRing(body.coordinates.map(([lng, lat]) => [lng, lat]));

  const fence = await Geofence.create({
    name: body.name,
    description: body.description,
    customerId: body.customerId,
    countryId: body.countryId || null,
    cityId: body.cityId || null,
    type: body.type,
    color: body.color,
    center: body.type === 'circle' ? body.center : null,
    radiusMeters: body.type === 'circle' ? body.radiusMeters : null,
    coordinates,
    geometry: buildGeometry({ ...body, coordinates }),
    assignedVehicleIds: body.assignedVehicleIds,
    alertSettings: body.alertSettings,
    isActive: body.isActive,
    createdBy: req.user?.id || null,
    updatedBy: req.user?.id || null,
  });

  await writeAuditLog(req, 'create', 'geofence', String(fence._id), {
    name: fence.name,
    type: fence.type,
  });

  return created(res, fence, 'Geofence created');
});

export const updateGeofence = asyncHandler(async (req: Request, res: Response) => {
  const scope = resolveCustomerScope(req);
  const fence = await Geofence.findById(req.params.id);
  if (!fence) throw new AppError('Geofence not found', 404);
  if (scope && String(fence.customerId) !== scope) throw new AppError('Forbidden', 403);

  const body = geofenceSchema.partial().parse(req.body);
  if (req.user?.role === 'customer') {
    delete (body as { customerId?: string }).customerId;
  }

  const merged = {
    name: body.name ?? fence.name,
    description: body.description ?? fence.description,
    customerId: String(body.customerId ?? fence.customerId),
    countryId: body.countryId !== undefined ? body.countryId : fence.countryId ? String(fence.countryId) : null,
    cityId: body.cityId !== undefined ? body.cityId : fence.cityId ? String(fence.cityId) : null,
    type: body.type ?? fence.type,
    color: body.color ?? fence.color,
    center: body.center !== undefined ? body.center : fence.center,
    radiusMeters: body.radiusMeters !== undefined ? body.radiusMeters : fence.radiusMeters,
    coordinates: body.coordinates ?? (fence.coordinates as number[][]),
    assignedVehicleIds: body.assignedVehicleIds ?? fence.assignedVehicleIds.map(String),
    alertSettings: body.alertSettings ?? fence.alertSettings,
    isActive: body.isActive ?? fence.isActive,
  } as z.infer<typeof geofenceSchema>;

  validateGeometry(merged);
  await assertVehiclesBelongToCustomer(merged.assignedVehicleIds, merged.customerId);

  const coordinates =
    merged.type === 'circle' ? [] : closeRing(merged.coordinates.map(([lng, lat]) => [lng, lat]));

  fence.name = merged.name;
  fence.description = merged.description;
  fence.customerId = merged.customerId as never;
  fence.countryId = (merged.countryId || null) as never;
  fence.cityId = (merged.cityId || null) as never;
  fence.type = merged.type;
  fence.color = merged.color;
  fence.center = merged.type === 'circle' ? (merged.center as never) : null;
  fence.radiusMeters = merged.type === 'circle' ? merged.radiusMeters : null;
  fence.coordinates = coordinates as never;
  fence.geometry = buildGeometry({ ...merged, coordinates }) as never;
  fence.assignedVehicleIds = merged.assignedVehicleIds as never;
  fence.alertSettings = merged.alertSettings as never;
  fence.isActive = merged.isActive;
  fence.updatedBy = req.user?.id as never;
  await fence.save();

  await writeAuditLog(req, 'update', 'geofence', String(fence._id), { name: fence.name });
  return success(res, fence, 'Geofence updated');
});

export const deleteGeofence = asyncHandler(async (req: Request, res: Response) => {
  const scope = resolveCustomerScope(req);
  const fence = await Geofence.findById(req.params.id);
  if (!fence) throw new AppError('Geofence not found', 404);
  if (scope && String(fence.customerId) !== scope) throw new AppError('Forbidden', 403);

  await GeofenceEvent.deleteMany({ geofenceId: fence._id });
  await GeofencePresence.deleteMany({ geofenceId: fence._id });
  await fence.deleteOne();
  await writeAuditLog(req, 'delete', 'geofence', String(fence._id), { name: fence.name });
  return success(res, { id: req.params.id }, 'Geofence deleted');
});

export const setGeofenceStatus = asyncHandler(async (req: Request, res: Response) => {
  const scope = resolveCustomerScope(req);
  const fence = await Geofence.findById(req.params.id);
  if (!fence) throw new AppError('Geofence not found', 404);
  if (scope && String(fence.customerId) !== scope) throw new AppError('Forbidden', 403);

  const isActive = Boolean(req.body?.isActive);
  fence.isActive = isActive;
  fence.updatedBy = req.user?.id as never;
  await fence.save();
  await writeAuditLog(req, isActive ? 'activate' : 'deactivate', 'geofence', String(fence._id), {});
  return success(res, fence, isActive ? 'Geofence activated' : 'Geofence deactivated');
});

export const assignVehicles = asyncHandler(async (req: Request, res: Response) => {
  const scope = resolveCustomerScope(req);
  const fence = await Geofence.findById(req.params.id);
  if (!fence) throw new AppError('Geofence not found', 404);
  if (scope && String(fence.customerId) !== scope) throw new AppError('Forbidden', 403);

  const vehicleIds = z.array(z.string()).parse(req.body?.vehicleIds ?? []);
  await assertVehiclesBelongToCustomer(vehicleIds, String(fence.customerId));
  fence.assignedVehicleIds = vehicleIds as never;
  fence.updatedBy = req.user?.id as never;
  await fence.save();
  return success(res, fence, 'Vehicles assigned');
});

export const listGeofenceEvents = asyncHandler(async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = {};
  const scope = resolveCustomerScope(req);
  if (req.user?.role === 'customer') filter.customerId = scope;
  else if (typeof req.query.customerId === 'string' && req.query.customerId) {
    filter.customerId = req.query.customerId;
  }

  if (typeof req.query.geofenceId === 'string' && req.query.geofenceId) {
    filter.geofenceId = req.query.geofenceId;
  }
  if (typeof req.query.vehicleId === 'string' && req.query.vehicleId) {
    filter.vehicleId = req.query.vehicleId;
  }
  if (req.query.eventType === 'entry' || req.query.eventType === 'exit') {
    filter.eventType = req.query.eventType;
  }
  if (req.query.from || req.query.to) {
    filter.recordedAt = {};
    if (req.query.from) (filter.recordedAt as Record<string, Date>).$gte = new Date(String(req.query.from));
    if (req.query.to) (filter.recordedAt as Record<string, Date>).$lte = new Date(String(req.query.to));
  }

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    GeofenceEvent.find(filter)
      .populate('vehicleId', 'name plateNumber')
      .populate('geofenceId', 'name type color')
      .populate('customerId', 'companyName')
      .sort({ recordedAt: -1 })
      .skip(skip)
      .limit(limit),
    GeofenceEvent.countDocuments(filter),
  ]);

  return success(res, {
    items: items.map((e, idx) => ({ ...e.toObject(), rowNumber: skip + idx + 1 })),
    total,
    page,
    limit,
  });
});

/**
 * Controlled evaluation fixture — admin only.
 * Uses a synthetic position against the real engine without writing a device Position.
 * Clearly labelled source=test_fixture so it never looks like production GPS.
 */
export const evaluateTestFixture = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || !['super_admin', 'admin', 'operator'].includes(req.user.role)) {
    throw new AppError('Forbidden', 403);
  }

  const body = z
    .object({
      vehicleId: z.string().min(1),
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      speedKmh: z.number().optional().default(0),
      /** When true, seeds presence without creating events (first observation). */
      seedOnly: z.boolean().optional().default(false),
    })
    .parse(req.body);

  const vehicle = await Vehicle.findById(body.vehicleId);
  if (!vehicle) throw new AppError('Vehicle not found', 404);

  if (body.seedOnly) {
    const { isInsideGeofence } = await import('../services/geofenceEngine.js');
    const fences = await Geofence.find({
      isActive: true,
      assignedVehicleIds: vehicle._id,
    });
    for (const fence of fences) {
      const inside = isInsideGeofence(body.latitude, body.longitude, fence as never);
      await GeofencePresence.findOneAndUpdate(
        { geofenceId: fence._id, vehicleId: vehicle._id },
        {
          inside,
          lastEvaluatedAt: new Date(),
          lastLatitude: body.latitude,
          lastLongitude: body.longitude,
        },
        { upsert: true },
      );
    }
    return success(res, { seeded: true, vehicleId: body.vehicleId }, 'Presence seeded (test fixture)');
  }

  const events = await evaluateVehicleGeofences({
    vehicleId: String(vehicle._id),
    customerId: vehicle.customerId ? String(vehicle.customerId) : null,
    latitude: body.latitude,
    longitude: body.longitude,
    speedKmh: body.speedKmh,
    recordedAt: new Date(),
    source: 'test_fixture',
  });

  return success(
    res,
    {
      events,
      note: 'Controlled test fixture — not device GPS. Events use positionSource=test_fixture.',
    },
    'Geofence evaluation complete',
  );
});
