import type { Request, Response } from 'express';
import { Trip } from '../models/Trip.js';
import { Vehicle } from '../models/Vehicle.js';
import { Position } from '../models/Position.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { success } from '../utils/apiResponse.js';
import { resolveCustomerScope } from '../middleware/auth.js';

function dateRange(req: Request) {
  const to = req.query.to ? new Date(String(req.query.to)) : new Date();
  const from = req.query.from
    ? new Date(String(req.query.from))
    : new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
  return { from, to };
}

export const distanceReport = asyncHandler(async (req: Request, res: Response) => {
  const scope = resolveCustomerScope(req);
  const { from, to } = dateRange(req);
  const match: Record<string, unknown> = {
    startTime: { $gte: from, $lte: to },
    status: 'completed',
  };
  if (scope) match.customerId = scope;
  if (typeof req.query.vehicleId === 'string' && req.query.vehicleId) {
    match.vehicleId = req.query.vehicleId;
  }

  const rows = await Trip.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$vehicleId',
        totalDistanceKm: { $sum: '$distanceKm' },
        tripCount: { $sum: 1 },
        avgSpeedKmh: { $avg: '$avgSpeedKmh' },
        maxSpeedKmh: { $max: '$maxSpeedKmh' },
      },
    },
  ]);

  const vehicleIds = rows.map((r) => r._id);
  const vehicles = await Vehicle.find({ _id: { $in: vehicleIds } }).select('name plateNumber');
  const vehicleMap = new Map(vehicles.map((v) => [String(v._id), v]));

  return success(res, {
    from,
    to,
    items: rows.map((r) => ({
      vehicle: vehicleMap.get(String(r._id)) ?? null,
      ...r,
      totalDistanceKm: Number(r.totalDistanceKm.toFixed(2)),
    })),
  });
});

export const tripReport = asyncHandler(async (req: Request, res: Response) => {
  const scope = resolveCustomerScope(req);
  const { from, to } = dateRange(req);
  const match: Record<string, unknown> = { startTime: { $gte: from, $lte: to } };
  if (scope) match.customerId = scope;

  const summary = await Trip.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        trips: { $sum: 1 },
        distanceKm: { $sum: '$distanceKm' },
        durationSec: { $sum: '$durationSec' },
        avgSpeedKmh: { $avg: '$avgSpeedKmh' },
      },
    },
  ]);

  const byDay = await Trip.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$startTime' } },
        trips: { $sum: 1 },
        distanceKm: { $sum: '$distanceKm' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return success(res, {
    from,
    to,
    summary: summary[0] ?? { trips: 0, distanceKm: 0, durationSec: 0, avgSpeedKmh: 0 },
    byDay,
  });
});

export const speedReport = asyncHandler(async (req: Request, res: Response) => {
  const scope = resolveCustomerScope(req);
  const { from, to } = dateRange(req);

  const vehicleFilter: Record<string, unknown> = {};
  if (scope) vehicleFilter.customerId = scope;
  const vehicles = await Vehicle.find(vehicleFilter).select('_id name plateNumber speedLimitKmh');
  const ids = vehicles.map((v) => v._id);

  const speeding = await Position.aggregate([
    {
      $match: {
        vehicleId: { $in: ids },
        recordedAt: { $gte: from, $lte: to },
        speedKmh: { $gt: 0 },
      },
    },
    {
      $lookup: {
        from: 'vehicles',
        localField: 'vehicleId',
        foreignField: '_id',
        as: 'vehicle',
      },
    },
    { $unwind: '$vehicle' },
    {
      $match: {
        $expr: { $gt: ['$speedKmh', '$vehicle.speedLimitKmh'] },
      },
    },
    {
      $group: {
        _id: '$vehicleId',
        events: { $sum: 1 },
        maxSpeedKmh: { $max: '$speedKmh' },
      },
    },
  ]);

  const map = new Map(vehicles.map((v) => [String(v._id), v]));
  return success(res, {
    from,
    to,
    items: speeding.map((s) => ({
      vehicle: map.get(String(s._id)) ?? null,
      events: s.events,
      maxSpeedKmh: s.maxSpeedKmh,
    })),
  });
});

export const vehicleSummaryReport = asyncHandler(async (req: Request, res: Response) => {
  const scope = resolveCustomerScope(req);
  const filter: Record<string, unknown> = {};
  if (scope) filter.customerId = scope;

  const vehicles = await Vehicle.find(filter)
    .populate('vehicleTypeId', 'name')
    .populate('deviceId', 'imei connectionStatus');

  const byStatus = vehicles.reduce<Record<string, number>>((acc, v) => {
    acc[v.motionStatus] = (acc[v.motionStatus] || 0) + 1;
    return acc;
  }, {});

  return success(res, {
    total: vehicles.length,
    byStatus,
    vehicles,
  });
});
