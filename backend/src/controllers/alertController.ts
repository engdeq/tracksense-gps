import type { Request, Response } from 'express';
import { Alert } from '../models/Alert.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { success } from '../utils/apiResponse.js';
import { AppError } from '../utils/AppError.js';
import { resolveCustomerScope } from '../middleware/auth.js';

export const listAlerts = asyncHandler(async (req: Request, res: Response) => {
  const scope = resolveCustomerScope(req);
  const filter: Record<string, unknown> = {};

  if (req.user?.role === 'customer') {
    filter.customerId = scope;
  } else if (typeof req.query.customerId === 'string' && req.query.customerId) {
    filter.customerId = req.query.customerId;
  }

  if (typeof req.query.type === 'string' && req.query.type) filter.type = req.query.type;
  if (req.query.isRead === 'true') filter.isRead = true;
  if (req.query.isRead === 'false') filter.isRead = false;

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  const [items, total, unread] = await Promise.all([
    Alert.find(filter)
      .populate('vehicleId', 'name plateNumber')
      .populate('deviceId', 'name imei')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Alert.countDocuments(filter),
    Alert.countDocuments({ ...filter, isRead: false }),
  ]);

  return success(res, { items, total, unread, page, limit });
});

export const getAlert = asyncHandler(async (req: Request, res: Response) => {
  const scope = resolveCustomerScope(req);
  const alert = await Alert.findById(req.params.id)
    .populate('vehicleId', 'name plateNumber')
    .populate('deviceId', 'name imei');
  if (!alert) throw new AppError('Alert not found', 404);
  if (scope && alert.customerId && String(alert.customerId) !== scope) {
    throw new AppError('Forbidden', 403);
  }
  return success(res, alert);
});

export const markRead = asyncHandler(async (req: Request, res: Response) => {
  const scope = resolveCustomerScope(req);
  const alert = await Alert.findById(req.params.id);
  if (!alert) throw new AppError('Alert not found', 404);
  if (scope && alert.customerId && String(alert.customerId) !== scope) {
    throw new AppError('Forbidden', 403);
  }
  alert.isRead = true;
  alert.readAt = new Date();
  await alert.save();
  return success(res, alert, 'Marked as read');
});

export const markAllRead = asyncHandler(async (req: Request, res: Response) => {
  const scope = resolveCustomerScope(req);
  const filter: Record<string, unknown> = { isRead: false };
  if (req.user?.role === 'customer') filter.customerId = scope;
  const result = await Alert.updateMany(filter, { $set: { isRead: true, readAt: new Date() } });
  return success(res, { modified: result.modifiedCount }, 'All alerts marked as read');
});
