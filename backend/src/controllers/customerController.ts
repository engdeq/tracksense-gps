import { z } from 'zod';
import type { Request, Response } from 'express';
import { Customer } from '../models/Customer.js';
import { Vehicle } from '../models/Vehicle.js';
import { Device } from '../models/Device.js';
import { User } from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { created, success } from '../utils/apiResponse.js';
import { AppError } from '../utils/AppError.js';
import { writeAuditLog } from '../services/auditService.js';
import { resolveCustomerScope } from '../middleware/auth.js';

export const customerSchema = z.object({
  companyName: z.string().min(2),
  contactName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional().default(''),
  countryId: z.string().min(1),
  cityId: z.string().min(1),
  address: z.string().optional().default(''),
  status: z.enum(['active', 'inactive', 'suspended']).optional().default('active'),
  notes: z.string().optional().default(''),
});

export const listCustomers = asyncHandler(async (req: Request, res: Response) => {
  const scope = resolveCustomerScope(req);
  const filter: Record<string, unknown> = {};
  if (scope) filter._id = scope;

  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (q) filter.$text = { $search: q };
  if (typeof req.query.status === 'string' && req.query.status) filter.status = req.query.status;
  if (typeof req.query.countryId === 'string' && req.query.countryId) filter.countryId = req.query.countryId;

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Customer.find(filter)
      .populate('countryId', 'name code')
      .populate('cityId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Customer.countDocuments(filter),
  ]);

  return success(res, { items, total, page, limit });
});

export const getCustomer = asyncHandler(async (req: Request, res: Response) => {
  const scope = resolveCustomerScope(req);
  const customer = await Customer.findById(req.params.id)
    .populate('countryId', 'name code')
    .populate('cityId', 'name');
  if (!customer) throw new AppError('Customer not found', 404);
  if (scope && String(customer._id) !== scope) throw new AppError('Forbidden', 403);

  const [vehicles, devices, users] = await Promise.all([
    Vehicle.find({ customerId: customer._id }).populate('vehicleTypeId', 'name iconKey'),
    Device.find({ customerId: customer._id }),
    User.find({ customerId: customer._id }).select('-passwordHash'),
  ]);

  return success(res, { customer, vehicles, devices, users });
});

export const createCustomer = asyncHandler(async (req: Request, res: Response) => {
  const customer = await Customer.create({
    ...req.body,
    createdBy: req.user?.id,
  });
  await writeAuditLog(req, 'create', 'customer', String(customer._id), req.body);
  return created(res, customer, 'Customer created');
});

export const updateCustomer = asyncHandler(async (req: Request, res: Response) => {
  const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!customer) throw new AppError('Customer not found', 404);
  await writeAuditLog(req, 'update', 'customer', String(customer._id), req.body);
  return success(res, customer, 'Customer updated');
});

export const deleteCustomer = asyncHandler(async (req: Request, res: Response) => {
  const customer = await Customer.findByIdAndDelete(req.params.id);
  if (!customer) throw new AppError('Customer not found', 404);
  await writeAuditLog(req, 'delete', 'customer', String(customer._id));
  return success(res, null, 'Customer deleted');
});

export const customerDashboard = asyncHandler(async (req: Request, res: Response) => {
  const scope = resolveCustomerScope(req);
  if (!scope) throw new AppError('Customer scope required', 400);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [vehicles, devices, tripsToday, alerts] = await Promise.all([
    Vehicle.find({ customerId: scope }),
    Device.find({ customerId: scope }),
    (await import('../models/Trip.js')).Trip.find({
      customerId: scope,
      startTime: { $gte: startOfDay },
    }),
    (await import('../models/Alert.js')).Alert.find({ customerId: scope })
      .sort({ createdAt: -1 })
      .limit(10),
  ]);

  const onlineVehicles = vehicles.filter((v) => v.motionStatus !== 'offline').length;
  const offlineVehicles = vehicles.filter((v) => v.motionStatus === 'offline').length;
  const movingVehicles = vehicles.filter((v) => v.motionStatus === 'moving' || v.motionStatus === 'speeding').length;
  const stoppedVehicles = vehicles.filter((v) => v.motionStatus === 'stopped').length;
  const distanceToday = tripsToday.reduce((sum, t) => sum + (t.distanceKm || 0), 0);

  return success(res, {
    totalVehicles: vehicles.length,
    totalDevices: devices.length,
    onlineVehicles,
    offlineVehicles,
    movingVehicles,
    stoppedVehicles,
    todaysTrips: tripsToday.length,
    distanceTodayKm: Number(distanceToday.toFixed(2)),
    recentAlerts: alerts,
    recentTrips: tripsToday.slice(0, 5),
    vehicles,
  });
});
