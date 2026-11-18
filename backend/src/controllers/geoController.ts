import { z } from 'zod';
import type { Request, Response } from 'express';
import { Country } from '../models/Country.js';
import { City } from '../models/City.js';
import { Customer } from '../models/Customer.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { created, success } from '../utils/apiResponse.js';
import { AppError } from '../utils/AppError.js';
import { writeAuditLog } from '../services/auditService.js';

export const countrySchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2).max(8),
  isoAlpha2: z.string().length(2),
  isoAlpha3: z.string().length(3),
  phoneCode: z.string().optional().default(''),
  currencyName: z.string().optional().default(''),
  currencyCode: z.string().optional().default(''),
  currencySymbol: z.string().optional().default(''),
  flagUrl: z.string().optional().default(''),
  isActive: z.boolean().optional().default(true),
});

export const citySchema = z.object({
  name: z.string().min(2),
  countryId: z.string().min(1),
  cityCode: z.string().optional().default(''),
  region: z.string().optional().default(''),
  timezone: z.string().optional().default(''),
  description: z.string().optional().default(''),
  isActive: z.boolean().optional().default(true),
});

export const listCountriesAdmin = asyncHandler(async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = {};
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (q) {
    filter.$or = [
      { name: new RegExp(q, 'i') },
      { code: new RegExp(q, 'i') },
      { isoAlpha2: new RegExp(q, 'i') },
      { isoAlpha3: new RegExp(q, 'i') },
    ];
  }
  if (req.query.status === 'active') filter.isActive = true;
  if (req.query.status === 'inactive') filter.isActive = false;

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;
  const sort = typeof req.query.sort === 'string' ? req.query.sort : 'name';

  const [items, total] = await Promise.all([
    Country.find(filter).sort(sort).skip(skip).limit(limit),
    Country.countDocuments(filter),
  ]);

  const counts = await City.aggregate([
    { $group: { _id: '$countryId', totalCities: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c.totalCities]));

  return success(res, {
    items: items.map((c, idx) => ({
      ...c.toObject(),
      rowNumber: skip + idx + 1,
      totalCities: countMap.get(String(c._id)) ?? 0,
    })),
    total,
    page,
    limit,
  });
});

export const getCountry = asyncHandler(async (req: Request, res: Response) => {
  const country = await Country.findById(req.params.id);
  if (!country) throw new AppError('Country not found', 404);
  const totalCities = await City.countDocuments({ countryId: country._id });
  return success(res, { ...country.toObject(), totalCities });
});

export const createCountry = asyncHandler(async (req: Request, res: Response) => {
  const payload = {
    ...req.body,
    code: String(req.body.code).toUpperCase(),
    isoAlpha2: String(req.body.isoAlpha2).toUpperCase(),
    isoAlpha3: String(req.body.isoAlpha3).toUpperCase(),
    currencyCode: String(req.body.currencyCode || '').toUpperCase(),
  };
  const exists = await Country.findOne({
    $or: [{ code: payload.code }, { isoAlpha2: payload.isoAlpha2 }, { isoAlpha3: payload.isoAlpha3 }],
  });
  if (exists) throw new AppError('Country with same code/ISO already exists', 409);

  const country = await Country.create(payload);
  await writeAuditLog(req, 'create', 'country', String(country._id), payload);
  return created(res, country, 'Country created');
});

export const updateCountry = asyncHandler(async (req: Request, res: Response) => {
  const payload = { ...req.body };
  if (payload.code) payload.code = String(payload.code).toUpperCase();
  if (payload.isoAlpha2) payload.isoAlpha2 = String(payload.isoAlpha2).toUpperCase();
  if (payload.isoAlpha3) payload.isoAlpha3 = String(payload.isoAlpha3).toUpperCase();
  if (payload.currencyCode) payload.currencyCode = String(payload.currencyCode).toUpperCase();

  const country = await Country.findByIdAndUpdate(req.params.id, payload, {
    new: true,
    runValidators: true,
  });
  if (!country) throw new AppError('Country not found', 404);
  await writeAuditLog(req, 'update', 'country', String(country._id), payload);
  return success(res, country, 'Country updated');
});

export const deleteCountry = asyncHandler(async (req: Request, res: Response) => {
  const cityCount = await City.countDocuments({ countryId: req.params.id });
  if (cityCount > 0) {
    throw new AppError('Cannot delete country with cities. Remove cities first.', 400);
  }
  const country = await Country.findByIdAndDelete(req.params.id);
  if (!country) throw new AppError('Country not found', 404);
  await writeAuditLog(req, 'delete', 'country', String(country._id));
  return success(res, null, 'Country deleted');
});

export const listCitiesAdmin = asyncHandler(async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = {};
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (q) {
    filter.$or = [{ name: new RegExp(q, 'i') }, { cityCode: new RegExp(q, 'i') }, { region: new RegExp(q, 'i') }];
  }
  if (typeof req.query.countryId === 'string' && req.query.countryId) {
    filter.countryId = req.query.countryId;
  }
  if (req.query.status === 'active') filter.isActive = true;
  if (req.query.status === 'inactive') filter.isActive = false;

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    City.find(filter)
      .populate('countryId', 'name code isoAlpha2 flagUrl phoneCode')
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit),
    City.countDocuments(filter),
  ]);

  const cityIds = items.map((c) => c._id);
  const customerCounts = await Customer.aggregate([
    { $match: { cityId: { $in: cityIds } } },
    { $group: { _id: '$cityId', totalCustomers: { $sum: 1 } } },
  ]);
  const customerMap = new Map(customerCounts.map((c) => [String(c._id), c.totalCustomers]));

  return success(res, {
    items: items.map((c, idx) => ({
      ...c.toObject(),
      rowNumber: skip + idx + 1,
      totalCustomers: customerMap.get(String(c._id)) ?? 0,
    })),
    total,
    page,
    limit,
  });
});

export const getCity = asyncHandler(async (req: Request, res: Response) => {
  const city = await City.findById(req.params.id).populate(
    'countryId',
    'name code isoAlpha2 flagUrl phoneCode',
  );
  if (!city) throw new AppError('City not found', 404);
  const totalCustomers = await Customer.countDocuments({ cityId: city._id });
  return success(res, { ...city.toObject(), totalCustomers });
});

export const createCity = asyncHandler(async (req: Request, res: Response) => {
  const country = await Country.findById(req.body.countryId);
  if (!country) throw new AppError('Country not found', 404);

  const exists = await City.findOne({
    countryId: req.body.countryId,
    name: new RegExp(`^${String(req.body.name).trim()}$`, 'i'),
  });
  if (exists) throw new AppError('City already exists in this country', 409);

  const city = await City.create({
    ...req.body,
    cityCode: String(req.body.cityCode || '').toUpperCase(),
  });
  await writeAuditLog(req, 'create', 'city', String(city._id), req.body);
  return created(res, city, 'City created');
});

export const updateCity = asyncHandler(async (req: Request, res: Response) => {
  if (req.body.countryId) {
    const country = await Country.findById(req.body.countryId);
    if (!country) throw new AppError('Country not found', 404);
  }
  if (req.body.cityCode) req.body.cityCode = String(req.body.cityCode).toUpperCase();

  const city = await City.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).populate('countryId', 'name code isoAlpha2 flagUrl');
  if (!city) throw new AppError('City not found', 404);
  await writeAuditLog(req, 'update', 'city', String(city._id), req.body);
  return success(res, city, 'City updated');
});

export const deleteCity = asyncHandler(async (req: Request, res: Response) => {
  const customers = await Customer.countDocuments({ cityId: req.params.id });
  if (customers > 0) {
    throw new AppError('Cannot delete city with customers. Reassign customers first.', 400);
  }
  const city = await City.findByIdAndDelete(req.params.id);
  if (!city) throw new AppError('City not found', 404);
  await writeAuditLog(req, 'delete', 'city', String(city._id));
  return success(res, null, 'City deleted');
});
