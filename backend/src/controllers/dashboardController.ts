import type { Request, Response } from 'express';
import { Customer } from '../models/Customer.js';
import { Vehicle } from '../models/Vehicle.js';
import { Device } from '../models/Device.js';
import { Trip } from '../models/Trip.js';
import { Alert } from '../models/Alert.js';
import { AuditLog } from '../models/AuditLog.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { success } from '../utils/apiResponse.js';

export const adminDashboard = asyncHandler(async (_req: Request, res: Response) => {
  const [
    totalCustomers,
    totalVehicles,
    totalDevices,
    onlineDevices,
    offlineDevices,
    totalTrips,
    vehicleStatus,
    recentAlerts,
    recentActivities,
  ] = await Promise.all([
    Customer.countDocuments(),
    Vehicle.countDocuments(),
    Device.countDocuments(),
    Device.countDocuments({ connectionStatus: 'online' }),
    Device.countDocuments({ connectionStatus: 'offline' }),
    Trip.countDocuments(),
    Vehicle.aggregate([{ $group: { _id: '$motionStatus', count: { $sum: 1 } } }]),
    Alert.find().sort({ createdAt: -1 }).limit(8).populate('vehicleId', 'name plateNumber'),
    AuditLog.find().sort({ createdAt: -1 }).limit(10),
  ]);

  const last7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const tripsDistance = await Trip.aggregate([
    { $match: { startTime: { $gte: last7 } } },
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
    kpis: {
      totalCustomers,
      totalVehicles,
      totalDevices,
      onlineDevices,
      offlineDevices,
      totalTrips,
    },
    vehicleStatus: vehicleStatus.map((s) => ({ status: s._id, count: s.count })),
    tripsDistance,
    recentAlerts,
    recentActivities,
  });
});
