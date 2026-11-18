import type { Request, Response } from 'express';
import { Country } from '../models/Country.js';
import { City } from '../models/City.js';
import { VehicleType } from '../models/VehicleType.js';
import { VehicleIcon } from '../models/VehicleIcon.js';
import { DeviceModel } from '../models/DeviceModel.js';
import { DeviceProtocol } from '../models/DeviceProtocol.js';
import { Menu } from '../models/Menu.js';
import { AppSettings } from '../models/AppSettings.js';
import { MapSettings } from '../models/MapSettings.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { success } from '../utils/apiResponse.js';

export const listCountries = asyncHandler(async (_req: Request, res: Response) => {
  const items = await Country.find({ isActive: true }).sort({ name: 1 });
  return success(res, items);
});

export const listCities = asyncHandler(async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = { isActive: true };
  if (typeof req.query.countryId === 'string' && req.query.countryId) {
    filter.countryId = req.query.countryId;
  }
  const items = await City.find(filter).sort({ name: 1 });
  return success(res, items);
});

export const listVehicleTypes = asyncHandler(async (_req: Request, res: Response) => {
  return success(res, await VehicleType.find({ isActive: true }).sort({ name: 1 }));
});

export const listVehicleIcons = asyncHandler(async (_req: Request, res: Response) => {
  return success(res, await VehicleIcon.find({ isActive: true }).sort({ name: 1 }));
});

export const listDeviceModels = asyncHandler(async (_req: Request, res: Response) => {
  return success(res, await DeviceModel.find({ isActive: true }).sort({ name: 1 }));
});

export const listDeviceProtocols = asyncHandler(async (_req: Request, res: Response) => {
  return success(res, await DeviceProtocol.find({ isActive: true }).sort({ name: 1 }));
});

export const listMenus = asyncHandler(async (req: Request, res: Response) => {
  const role = req.user?.role;
  const items = await Menu.find({ isActive: true, roles: role }).sort({ order: 1 });
  return success(res, items);
});

export const getSettings = asyncHandler(async (_req: Request, res: Response) => {
  const [app, map] = await Promise.all([
    AppSettings.find(),
    MapSettings.findOne({ key: 'default' }),
  ]);
  return success(res, { app, map });
});
