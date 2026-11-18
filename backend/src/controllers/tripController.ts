import type { Request, Response } from 'express';
import { Trip } from '../models/Trip.js';
import { Position } from '../models/Position.js';
import { Vehicle } from '../models/Vehicle.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { success } from '../utils/apiResponse.js';
import { AppError } from '../utils/AppError.js';
import { resolveCustomerScope } from '../middleware/auth.js';

export const listTrips = asyncHandler(async (req: Request, res: Response) => {
  const scope = resolveCustomerScope(req);
  const filter: Record<string, unknown> = {};
  if (scope) filter.customerId = scope;

  if (typeof req.query.vehicleId === 'string' && req.query.vehicleId) {
    filter.vehicleId = req.query.vehicleId;
  }
  if (req.query.from || req.query.to) {
    filter.startTime = {};
    if (req.query.from) (filter.startTime as Record<string, Date>).$gte = new Date(String(req.query.from));
    if (req.query.to) (filter.startTime as Record<string, Date>).$lte = new Date(String(req.query.to));
  }

  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (q) {
    const vehicleIds = await Vehicle.find({
      $or: [{ name: new RegExp(q, 'i') }, { plateNumber: new RegExp(q, 'i') }],
    }).distinct('_id');
    filter.$or = [
      { vehicleId: { $in: vehicleIds } },
      { startAddress: new RegExp(q, 'i') },
      { endAddress: new RegExp(q, 'i') },
    ];
  }

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Trip.find(filter)
      .populate('vehicleId', 'name plateNumber')
      .sort({ startTime: -1 })
      .skip(skip)
      .limit(limit),
    Trip.countDocuments(filter),
  ]);

  return success(res, { items, total, page, limit });
});

export const getTrip = asyncHandler(async (req: Request, res: Response) => {
  const scope = resolveCustomerScope(req);
  const trip = await Trip.findById(req.params.id).populate('vehicleId', 'name plateNumber brand model');
  if (!trip) throw new AppError('Trip not found', 404);
  if (scope && String(trip.customerId) !== scope) throw new AppError('Forbidden', 403);

  const route = await Position.find({
    vehicleId: trip.vehicleId,
    recordedAt: {
      $gte: trip.startTime,
      $lte: trip.endTime ?? new Date(),
    },
  })
    .sort({ recordedAt: 1 })
    .select('latitude longitude speedKmh heading recordedAt');

  return success(res, { trip, route });
});

export const tripPlayback = asyncHandler(async (req: Request, res: Response) => {
  const scope = resolveCustomerScope(req);
  const trip = await Trip.findById(req.params.id);
  if (!trip) throw new AppError('Trip not found', 404);
  if (scope && String(trip.customerId) !== scope) throw new AppError('Forbidden', 403);

  const vehicle = await Vehicle.findById(trip.vehicleId).select('name plateNumber');
  const points = await Position.find({
    vehicleId: trip.vehicleId,
    recordedAt: {
      $gte: trip.startTime,
      $lte: trip.endTime ?? new Date(),
    },
  })
    .sort({ recordedAt: 1 })
    .select('latitude longitude speedKmh heading recordedAt ignition');

  return success(res, {
    trip,
    vehicle,
    points,
    durationSec: trip.durationSec,
    distanceKm: trip.distanceKm,
  });
});
