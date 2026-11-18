import type { Request, Response } from 'express';
import { Position } from '../models/Position.js';
import { Vehicle } from '../models/Vehicle.js';
import { Device } from '../models/Device.js';
import { Customer } from '../models/Customer.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { success } from '../utils/apiResponse.js';
import { AppError } from '../utils/AppError.js';
import { resolveCustomerScope } from '../middleware/auth.js';

export const currentPositions = asyncHandler(async (req: Request, res: Response) => {
  const scope = resolveCustomerScope(req);
  const vehicleFilter: Record<string, unknown> = { status: 'active' };
  if (scope) vehicleFilter.customerId = scope;
  if (typeof req.query.customerId === 'string' && req.query.customerId && !scope) {
    vehicleFilter.customerId = req.query.customerId;
  }

  // Country / city scope via customers (header country selector)
  const countryId =
    typeof req.query.countryId === 'string' && req.query.countryId ? req.query.countryId : undefined;
  const cityId =
    typeof req.query.cityId === 'string' && req.query.cityId ? req.query.cityId : undefined;
  if (!scope && (countryId || cityId)) {
    const customerFilter: Record<string, unknown> = {};
    if (countryId) customerFilter.countryId = countryId;
    if (cityId) customerFilter.cityId = cityId;
    const customerIds = await Customer.find(customerFilter).distinct('_id');
    vehicleFilter.customerId = { $in: customerIds };
  }

  if (typeof req.query.q === 'string' && req.query.q.trim()) {
    vehicleFilter.$text = { $search: req.query.q.trim() };
  }

  const vehicles = await Vehicle.find(vehicleFilter)
    .populate('customerId', 'companyName countryId cityId')
    .populate('vehicleTypeId', 'name iconKey')
    .populate('iconId', 'key imageUrl')
    .populate('deviceId', 'imei connectionStatus lastCommunicationAt');

  const ids = vehicles.map((v) => v._id);
  const latest = await Position.aggregate([
    { $match: { vehicleId: { $in: ids } } },
    { $sort: { recordedAt: -1 } },
    {
      $group: {
        _id: '$vehicleId',
        latitude: { $first: '$latitude' },
        longitude: { $first: '$longitude' },
        speedKmh: { $first: '$speedKmh' },
        heading: { $first: '$heading' },
        ignition: { $first: '$ignition' },
        recordedAt: { $first: '$recordedAt' },
        address: { $first: '$address' },
        source: { $first: '$source' },
      },
    },
  ]);
  const map = new Map(latest.map((p) => [String(p._id), p]));

  const items = vehicles.map((v) => ({
    vehicle: v,
    position: map.get(String(v._id)) ?? null,
  }));

  return success(res, {
    items,
    note: 'Positions reflect last received GPS device data or seeded demonstration samples labelled by source field.',
  });
});

export const positionHistory = asyncHandler(async (req: Request, res: Response) => {
  const scope = resolveCustomerScope(req);
  const vehicleId = String(req.query.vehicleId || '');
  if (!vehicleId) throw new AppError('vehicleId is required', 400);

  const vehicle = await Vehicle.findById(vehicleId);
  if (!vehicle) throw new AppError('Vehicle not found', 404);
  if (scope && String(vehicle.customerId) !== scope) throw new AppError('Forbidden', 403);

  const from = req.query.from ? new Date(String(req.query.from)) : new Date(Date.now() - 24 * 60 * 60 * 1000);
  const to = req.query.to ? new Date(String(req.query.to)) : new Date();

  const positions = await Position.find({
    vehicleId,
    recordedAt: { $gte: from, $lte: to },
  })
    .sort({ recordedAt: 1 })
    .limit(5000);

  return success(res, { vehicleId, from, to, positions });
});

export const deviceStatusSummary = asyncHandler(async (req: Request, res: Response) => {
  const scope = resolveCustomerScope(req);
  const match: Record<string, unknown> = {};
  if (scope) match.customerId = scope;

  const [online, offline, total] = await Promise.all([
    Device.countDocuments({ ...match, connectionStatus: 'online' }),
    Device.countDocuments({ ...match, connectionStatus: 'offline' }),
    Device.countDocuments(match),
  ]);

  return success(res, { online, offline, total });
});
