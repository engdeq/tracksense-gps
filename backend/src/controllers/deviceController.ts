import { z } from 'zod';
import type { Request, Response } from 'express';
import { Device } from '../models/Device.js';
import { Vehicle } from '../models/Vehicle.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { created, success } from '../utils/apiResponse.js';
import { AppError } from '../utils/AppError.js';
import { writeAuditLog } from '../services/auditService.js';
import { resolveCustomerScope } from '../middleware/auth.js';

export const deviceSchema = z.object({
  imei: z.string().min(8),
  name: z.string().min(1),
  deviceModelId: z.string().min(1),
  protocolId: z.string().min(1),
  customerId: z.string().optional().nullable(),
  vehicleId: z.string().optional().nullable(),
  simNumber: z.string().optional().default(''),
  simIccid: z.string().optional().default(''),
  simOperator: z.string().optional().default(''),
  firmwareVersion: z.string().optional().default(''),
  notes: z.string().optional().default(''),
  isActive: z.boolean().optional().default(true),
});

export const listDevices = asyncHandler(async (req: Request, res: Response) => {
  const scope = resolveCustomerScope(req);
  const filter: Record<string, unknown> = {};
  if (scope) filter.customerId = scope;

  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (q) filter.$text = { $search: q };
  if (typeof req.query.connectionStatus === 'string' && req.query.connectionStatus) {
    filter.connectionStatus = req.query.connectionStatus;
  }

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Device.find(filter)
      .populate('deviceModelId', 'name manufacturer protocolKey')
      .populate('protocolId', 'key name')
      .populate('customerId', 'companyName')
      .populate('vehicleId', 'name plateNumber')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit),
    Device.countDocuments(filter),
  ]);

  return success(res, { items, total, page, limit });
});

export const getDevice = asyncHandler(async (req: Request, res: Response) => {
  const scope = resolveCustomerScope(req);
  const device = await Device.findById(req.params.id)
    .populate('deviceModelId')
    .populate('protocolId')
    .populate('customerId', 'companyName contactName')
    .populate('vehicleId', 'name plateNumber brand model');

  if (!device) throw new AppError('Device not found', 404);
  if (scope && String(device.customerId) !== scope) throw new AppError('Forbidden', 403);

  return success(res, device);
});

export const createDevice = asyncHandler(async (req: Request, res: Response) => {
  const exists = await Device.findOne({ imei: req.body.imei });
  if (exists) throw new AppError('IMEI already registered', 409);

  const device = await Device.create(req.body);

  if (req.body.vehicleId) {
    await Vehicle.findByIdAndUpdate(req.body.vehicleId, { deviceId: device._id });
  }

  await writeAuditLog(req, 'create', 'device', String(device._id), req.body);
  return created(res, device, 'Device created');
});

export const updateDevice = asyncHandler(async (req: Request, res: Response) => {
  const scope = resolveCustomerScope(req);
  const existing = await Device.findById(req.params.id);
  if (!existing) throw new AppError('Device not found', 404);
  if (scope && String(existing.customerId) !== scope) throw new AppError('Forbidden', 403);

  const device = await Device.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (req.body.vehicleId) {
    await Vehicle.updateMany({ deviceId: device!._id }, { $set: { deviceId: null } });
    await Vehicle.findByIdAndUpdate(req.body.vehicleId, { deviceId: device!._id });
  }

  await writeAuditLog(req, 'update', 'device', String(device!._id), req.body);
  return success(res, device, 'Device updated');
});

export const deleteDevice = asyncHandler(async (req: Request, res: Response) => {
  const device = await Device.findById(req.params.id);
  if (!device) throw new AppError('Device not found', 404);

  await Vehicle.updateMany({ deviceId: device._id }, { $set: { deviceId: null } });
  await device.deleteOne();
  await writeAuditLog(req, 'delete', 'device', String(device._id));
  return success(res, null, 'Device deleted');
});
