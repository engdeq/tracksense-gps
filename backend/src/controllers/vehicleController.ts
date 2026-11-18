import { z } from 'zod';
import type { Request, Response } from 'express';
import { Vehicle } from '../models/Vehicle.js';
import { Device } from '../models/Device.js';
import { Position } from '../models/Position.js';
import { Trip } from '../models/Trip.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { created, success } from '../utils/apiResponse.js';
import { AppError } from '../utils/AppError.js';
import { writeAuditLog } from '../services/auditService.js';
import { resolveCustomerScope } from '../middleware/auth.js';

export const vehicleSchema = z.object({
  name: z.string().min(1),
  plateNumber: z.string().min(2),
  brand: z.string().optional().default(''),
  model: z.string().optional().default(''),
  year: z.number().optional().nullable(),
  color: z.string().optional().default(''),
  vin: z.string().optional().default(''),
  customerId: z.string().min(1),
  vehicleTypeId: z.string().min(1),
  iconId: z.string().optional().nullable(),
  deviceId: z.string().optional().nullable(),
  status: z.enum(['active', 'inactive', 'maintenance']).optional().default('active'),
  speedLimitKmh: z.number().optional().default(120),
  notes: z.string().optional().default(''),
});

export const listVehicles = asyncHandler(async (req: Request, res: Response) => {
  const scope = resolveCustomerScope(req);
  const filter: Record<string, unknown> = {};
  if (scope) filter.customerId = scope;
  else if (typeof req.query.customerId === 'string' && req.query.customerId) {
    filter.customerId = req.query.customerId;
  }

  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (q) filter.$text = { $search: q };
  if (typeof req.query.motionStatus === 'string' && req.query.motionStatus) {
    filter.motionStatus = req.query.motionStatus;
  }
  if (typeof req.query.status === 'string' && req.query.status) filter.status = req.query.status;

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;
  const sort = typeof req.query.sort === 'string' ? req.query.sort : '-updatedAt';

  const [items, total] = await Promise.all([
    Vehicle.find(filter)
      .populate('customerId', 'companyName contactName')
      .populate('vehicleTypeId', 'name iconKey')
      .populate('iconId', 'name key imageUrl')
      .populate('deviceId', 'imei name connectionStatus lastCommunicationAt')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Vehicle.countDocuments(filter),
  ]);

  const vehicleIds = items.map((v) => v._id);
  const latestPositions = await Position.aggregate([
    { $match: { vehicleId: { $in: vehicleIds } } },
    { $sort: { recordedAt: -1 } },
    {
      $group: {
        _id: '$vehicleId',
        latitude: { $first: '$latitude' },
        longitude: { $first: '$longitude' },
        speedKmh: { $first: '$speedKmh' },
        heading: { $first: '$heading' },
        recordedAt: { $first: '$recordedAt' },
        address: { $first: '$address' },
      },
    },
  ]);
  const positionMap = new Map(latestPositions.map((p) => [String(p._id), p]));

  const enriched = items.map((v) => ({
    ...v.toObject(),
    lastPosition: positionMap.get(String(v._id)) ?? null,
  }));

  return success(res, { items: enriched, total, page, limit });
});

export const getVehicle = asyncHandler(async (req: Request, res: Response) => {
  const scope = resolveCustomerScope(req);
  const vehicle = await Vehicle.findById(req.params.id)
    .populate('customerId', 'companyName contactName email phone')
    .populate('vehicleTypeId', 'name iconKey')
    .populate('iconId', 'name key imageUrl')
    .populate('deviceId');

  if (!vehicle) throw new AppError('Vehicle not found', 404);
  if (scope && String(vehicle.customerId?._id ?? vehicle.customerId) !== scope) {
    throw new AppError('Forbidden', 403);
  }

  const [lastPosition, recentTrips] = await Promise.all([
    Position.findOne({ vehicleId: vehicle._id }).sort({ recordedAt: -1 }),
    Trip.find({ vehicleId: vehicle._id }).sort({ startTime: -1 }).limit(10),
  ]);

  const distanceStats = await Trip.aggregate([
    { $match: { vehicleId: vehicle._id } },
    {
      $group: {
        _id: null,
        totalDistanceKm: { $sum: '$distanceKm' },
        totalTrips: { $sum: 1 },
        avgSpeedKmh: { $avg: '$avgSpeedKmh' },
      },
    },
  ]);

  return success(res, {
    vehicle,
    lastPosition,
    recentTrips,
    distanceStats: distanceStats[0] ?? { totalDistanceKm: 0, totalTrips: 0, avgSpeedKmh: 0 },
  });
});

export const createVehicle = asyncHandler(async (req: Request, res: Response) => {
  if (req.user?.role === 'customer') {
    req.body.customerId = req.user.customerId;
  }

  const vehicle = await Vehicle.create(req.body);

  if (req.body.deviceId) {
    await Device.findByIdAndUpdate(req.body.deviceId, {
      vehicleId: vehicle._id,
      customerId: vehicle.customerId,
    });
  }

  await writeAuditLog(req, 'create', 'vehicle', String(vehicle._id), req.body);
  return created(res, vehicle, 'Vehicle created');
});

export const updateVehicle = asyncHandler(async (req: Request, res: Response) => {
  const scope = resolveCustomerScope(req);
  const existing = await Vehicle.findById(req.params.id);
  if (!existing) throw new AppError('Vehicle not found', 404);
  if (scope && String(existing.customerId) !== scope) throw new AppError('Forbidden', 403);

  if (req.user?.role === 'customer') {
    delete req.body.customerId;
  }

  const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (req.body.deviceId) {
    await Device.updateMany({ vehicleId: vehicle!._id }, { $set: { vehicleId: null } });
    await Device.findByIdAndUpdate(req.body.deviceId, {
      vehicleId: vehicle!._id,
      customerId: vehicle!.customerId,
    });
  }

  await writeAuditLog(req, 'update', 'vehicle', String(vehicle!._id), req.body);
  return success(res, vehicle, 'Vehicle updated');
});

export const deleteVehicle = asyncHandler(async (req: Request, res: Response) => {
  const scope = resolveCustomerScope(req);
  const vehicle = await Vehicle.findById(req.params.id);
  if (!vehicle) throw new AppError('Vehicle not found', 404);
  if (scope && String(vehicle.customerId) !== scope) throw new AppError('Forbidden', 403);

  await Device.updateMany({ vehicleId: vehicle._id }, { $set: { vehicleId: null } });
  await vehicle.deleteOne();
  await writeAuditLog(req, 'delete', 'vehicle', String(vehicle._id));
  return success(res, null, 'Vehicle deleted');
});
