import { z } from 'zod';
import type { Request, Response } from 'express';
import { VehicleType } from '../models/VehicleType.js';
import { VehicleIcon } from '../models/VehicleIcon.js';
import { DeviceModel } from '../models/DeviceModel.js';
import { DeviceProtocol } from '../models/DeviceProtocol.js';
import { MapSettings } from '../models/MapSettings.js';
import { AppSettings } from '../models/AppSettings.js';
import { Vehicle } from '../models/Vehicle.js';
import { Device } from '../models/Device.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { created, success } from '../utils/apiResponse.js';
import { AppError } from '../utils/AppError.js';
import { writeAuditLog } from '../services/auditService.js';
import { publicUploadPath } from '../middleware/upload.js';
import { isProtocolDecoderImplemented } from '../protocols/registry.js';

function slugCode(input: string) {
  return String(input || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 32);
}

function paginate(req: Request) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

function maskSecret(value?: string) {
  if (!value) return '';
  if (value.length <= 4) return '••••';
  return `${'•'.repeat(Math.min(12, value.length - 4))}${value.slice(-4)}`;
}

// ─── Vehicle Types ───────────────────────────────────────────────────────────

export const vehicleTypeSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2).max(32).optional(),
  description: z.string().optional().default(''),
  iconKey: z.string().optional().default('car'),
  defaultIconId: z.string().nullable().optional(),
  isActive: z.boolean().optional().default(true),
});

export const listVehicleTypesAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = paginate(req);
  const filter: Record<string, unknown> = {};
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (q) filter.$or = [{ name: new RegExp(q, 'i') }, { code: new RegExp(q, 'i') }];
  if (req.query.status === 'active') filter.isActive = true;
  if (req.query.status === 'inactive') filter.isActive = false;

  const [items, total] = await Promise.all([
    VehicleType.find(filter).populate('defaultIconId').sort({ name: 1 }).skip(skip).limit(limit),
    VehicleType.countDocuments(filter),
  ]);

  const counts = await Vehicle.aggregate([{ $group: { _id: '$vehicleTypeId', total: { $sum: 1 } } }]);
  const countMap = new Map(counts.map((c) => [String(c._id), c.total as number]));

  return success(res, {
    items: items.map((item, idx) => ({
      ...item.toObject(),
      rowNumber: skip + idx + 1,
      totalVehicles: countMap.get(String(item._id)) ?? 0,
    })),
    total,
    page,
    limit,
  });
});

export const getVehicleType = asyncHandler(async (req: Request, res: Response) => {
  const item = await VehicleType.findById(req.params.id).populate('defaultIconId');
  if (!item) throw new AppError('Vehicle type not found', 404);
  const totalVehicles = await Vehicle.countDocuments({ vehicleTypeId: item._id });
  return success(res, { ...item.toObject(), totalVehicles });
});

export const createVehicleType = asyncHandler(async (req: Request, res: Response) => {
  const code = slugCode(req.body.code || req.body.name);
  const exists = await VehicleType.findOne({ $or: [{ name: req.body.name }, { code }] });
  if (exists) throw new AppError('Vehicle type name/code already exists', 409);
  const item = await VehicleType.create({
    ...req.body,
    code,
    defaultIconId: req.body.defaultIconId || null,
  });
  await writeAuditLog(req, 'create', 'vehicle_type', String(item._id), req.body);
  return created(res, item, 'Vehicle type created');
});

export const updateVehicleType = asyncHandler(async (req: Request, res: Response) => {
  const payload = { ...req.body };
  if (payload.code) payload.code = slugCode(payload.code);
  if (payload.defaultIconId === '') payload.defaultIconId = null;
  const item = await VehicleType.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
  if (!item) throw new AppError('Vehicle type not found', 404);
  await writeAuditLog(req, 'update', 'vehicle_type', String(item._id), payload);
  return success(res, item, 'Vehicle type updated');
});

export const deleteVehicleType = asyncHandler(async (req: Request, res: Response) => {
  const used = await Vehicle.countDocuments({ vehicleTypeId: req.params.id });
  if (used > 0) throw new AppError('Cannot delete vehicle type assigned to vehicles', 400);
  const item = await VehicleType.findByIdAndDelete(req.params.id);
  if (!item) throw new AppError('Vehicle type not found', 404);
  await writeAuditLog(req, 'delete', 'vehicle_type', String(item._id));
  return success(res, { id: item._id }, 'Vehicle type deleted');
});

// ─── Vehicle Icons ───────────────────────────────────────────────────────────

export const vehicleIconSchema = z.object({
  name: z.string().min(2),
  key: z.string().min(2).max(64).optional(),
  category: z.string().optional().default('general'),
  imageUrl: z.string().optional().default(''),
  vehicleTypeId: z.string().nullable().optional(),
  isActive: z.boolean().optional().default(true),
});

export const listVehicleIconsAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = paginate(req);
  const filter: Record<string, unknown> = {};
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (q) filter.$or = [{ name: new RegExp(q, 'i') }, { key: new RegExp(q, 'i') }, { category: new RegExp(q, 'i') }];
  if (req.query.status === 'active') filter.isActive = true;
  if (req.query.status === 'inactive') filter.isActive = false;
  if (typeof req.query.category === 'string' && req.query.category) filter.category = req.query.category;

  const [items, total] = await Promise.all([
    VehicleIcon.find(filter).populate('vehicleTypeId', 'name code').sort({ name: 1 }).skip(skip).limit(limit),
    VehicleIcon.countDocuments(filter),
  ]);

  return success(res, {
    items: items.map((item, idx) => ({ ...item.toObject(), rowNumber: skip + idx + 1 })),
    total,
    page,
    limit,
  });
});

export const getVehicleIcon = asyncHandler(async (req: Request, res: Response) => {
  const item = await VehicleIcon.findById(req.params.id).populate('vehicleTypeId', 'name code');
  if (!item) throw new AppError('Vehicle icon not found', 404);
  return success(res, item);
});

export const createVehicleIcon = asyncHandler(async (req: Request, res: Response) => {
  const key = String(req.body.key || req.body.name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-');
  const exists = await VehicleIcon.findOne({ $or: [{ name: req.body.name }, { key }] });
  if (exists) throw new AppError('Vehicle icon name/key already exists', 409);

  let imageUrl = req.body.imageUrl || '';
  let mimeType = '';
  let fileSize = 0;
  const file = (req as Request & { file?: { filename: string; mimetype: string; size: number } }).file;
  if (file) {
    imageUrl = publicUploadPath(file.filename);
    mimeType = file.mimetype;
    fileSize = file.size;
  }
  if (!imageUrl) throw new AppError('Icon image URL or upload is required', 400);

  const item = await VehicleIcon.create({
    name: req.body.name,
    key,
    category: req.body.category || 'general',
    imageUrl,
    mimeType,
    fileSize,
    vehicleTypeId: req.body.vehicleTypeId || null,
    isActive: req.body.isActive !== 'false' && req.body.isActive !== false,
  });
  await writeAuditLog(req, 'create', 'vehicle_icon', String(item._id), { name: item.name, key: item.key });
  return created(res, item, 'Vehicle icon created');
});

export const updateVehicleIcon = asyncHandler(async (req: Request, res: Response) => {
  const payload: Record<string, unknown> = { ...req.body };
  if (payload.key) payload.key = String(payload.key).toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
  if (payload.vehicleTypeId === '') payload.vehicleTypeId = null;
  const file = (req as Request & { file?: { filename: string; mimetype: string; size: number } }).file;
  if (file) {
    payload.imageUrl = publicUploadPath(file.filename);
    payload.mimeType = file.mimetype;
    payload.fileSize = file.size;
  }
  if (typeof payload.isActive === 'string') payload.isActive = payload.isActive !== 'false';

  const item = await VehicleIcon.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
  if (!item) throw new AppError('Vehicle icon not found', 404);
  await writeAuditLog(req, 'update', 'vehicle_icon', String(item._id), payload);
  return success(res, item, 'Vehicle icon updated');
});

export const deleteVehicleIcon = asyncHandler(async (req: Request, res: Response) => {
  const used = await Vehicle.countDocuments({ iconId: req.params.id });
  if (used > 0) throw new AppError('Cannot delete icon assigned to vehicles', 400);
  const item = await VehicleIcon.findByIdAndDelete(req.params.id);
  if (!item) throw new AppError('Vehicle icon not found', 404);
  await writeAuditLog(req, 'delete', 'vehicle_icon', String(item._id));
  return success(res, { id: item._id }, 'Vehicle icon deleted');
});

// ─── Device Protocols ────────────────────────────────────────────────────────

export const deviceProtocolSchema = z.object({
  name: z.string().min(2),
  key: z.string().min(2).max(64).optional(),
  version: z.string().optional().default('1.0'),
  description: z.string().optional().default(''),
  defaultPort: z.coerce.number().int().min(1).max(65535).optional().default(5027),
  connectionType: z.enum(['tcp', 'udp', 'http', 'mqtt']).optional().default('tcp'),
  decoderKey: z.string().optional().default(''),
  isActive: z.boolean().optional().default(true),
});

export const listDeviceProtocolsAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = paginate(req);
  const filter: Record<string, unknown> = {};
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (q) filter.$or = [{ name: new RegExp(q, 'i') }, { key: new RegExp(q, 'i') }];
  if (req.query.status === 'active') filter.isActive = true;
  if (req.query.status === 'inactive') filter.isActive = false;

  const [items, total] = await Promise.all([
    DeviceProtocol.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
    DeviceProtocol.countDocuments(filter),
  ]);

  const modelCounts = await DeviceModel.aggregate([
    { $group: { _id: '$protocolKey', total: { $sum: 1 } } },
  ]);
  const byKey = new Map(modelCounts.map((c) => [String(c._id), c.total as number]));

  return success(res, {
    items: items.map((item, idx) => {
      const obj = item.toObject();
      return {
        ...obj,
        rowNumber: skip + idx + 1,
        supportedModels: byKey.get(obj.key) ?? 0,
        parserImplemented: isProtocolDecoderImplemented(obj.decoderKey || obj.key, obj.key),
      };
    }),
    total,
    page,
    limit,
  });
});

export const getDeviceProtocol = asyncHandler(async (req: Request, res: Response) => {
  const item = await DeviceProtocol.findById(req.params.id);
  if (!item) throw new AppError('Device protocol not found', 404);
  const models = await DeviceModel.find({ protocolKey: item.key }).select('name manufacturer code');
  return success(res, {
    ...item.toObject(),
    models,
    parserImplemented: isProtocolDecoderImplemented(item.decoderKey || item.key, item.key),
  });
});

export const createDeviceProtocol = asyncHandler(async (req: Request, res: Response) => {
  const key = String(req.body.key || req.body.name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_');
  const exists = await DeviceProtocol.findOne({ key });
  if (exists) throw new AppError('Protocol key already exists', 409);
  const item = await DeviceProtocol.create({
    ...req.body,
    key,
    decoderKey: req.body.decoderKey || key,
  });
  await writeAuditLog(req, 'create', 'device_protocol', String(item._id), req.body);
  return created(res, {
    ...item.toObject(),
    parserImplemented: isProtocolDecoderImplemented(item.decoderKey || item.key, item.key),
  }, 'Device protocol created');
});

export const updateDeviceProtocol = asyncHandler(async (req: Request, res: Response) => {
  const payload = { ...req.body };
  if (payload.key) payload.key = String(payload.key).toLowerCase().replace(/[^a-z0-9_]+/g, '_');
  const item = await DeviceProtocol.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
  if (!item) throw new AppError('Device protocol not found', 404);
  await writeAuditLog(req, 'update', 'device_protocol', String(item._id), payload);
  return success(res, {
    ...item.toObject(),
    parserImplemented: isProtocolDecoderImplemented(item.decoderKey || item.key, item.key),
  }, 'Device protocol updated');
});

export const deleteDeviceProtocol = asyncHandler(async (req: Request, res: Response) => {
  const item = await DeviceProtocol.findById(req.params.id);
  if (!item) throw new AppError('Device protocol not found', 404);
  const used = await DeviceModel.countDocuments({
    $or: [{ protocolId: item._id }, { protocolKey: item.key }],
  });
  if (used > 0) throw new AppError('Cannot delete protocol linked to device models', 400);
  await item.deleteOne();
  await writeAuditLog(req, 'delete', 'device_protocol', String(item._id));
  return success(res, { id: item._id }, 'Device protocol deleted');
});

// ─── Device Models ───────────────────────────────────────────────────────────

export const deviceModelSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2).max(32).optional(),
  manufacturer: z.string().min(2),
  protocolId: z.string().optional().nullable(),
  protocolKey: z.string().optional(),
  description: z.string().optional().default(''),
  isActive: z.boolean().optional().default(true),
});

export const listDeviceModelsAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = paginate(req);
  const filter: Record<string, unknown> = {};
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (q) {
    filter.$or = [
      { name: new RegExp(q, 'i') },
      { code: new RegExp(q, 'i') },
      { manufacturer: new RegExp(q, 'i') },
    ];
  }
  if (req.query.status === 'active') filter.isActive = true;
  if (req.query.status === 'inactive') filter.isActive = false;

  const [items, total] = await Promise.all([
    DeviceModel.find(filter).populate('protocolId').sort({ manufacturer: 1, name: 1 }).skip(skip).limit(limit),
    DeviceModel.countDocuments(filter),
  ]);

  const counts = await Device.aggregate([{ $group: { _id: '$deviceModelId', total: { $sum: 1 } } }]);
  const countMap = new Map(counts.map((c) => [String(c._id), c.total as number]));

  return success(res, {
    items: items.map((item, idx) => ({
      ...item.toObject(),
      rowNumber: skip + idx + 1,
      totalDevices: countMap.get(String(item._id)) ?? 0,
    })),
    total,
    page,
    limit,
  });
});

export const getDeviceModel = asyncHandler(async (req: Request, res: Response) => {
  const item = await DeviceModel.findById(req.params.id).populate('protocolId');
  if (!item) throw new AppError('Device model not found', 404);
  const totalDevices = await Device.countDocuments({ deviceModelId: item._id });
  return success(res, { ...item.toObject(), totalDevices });
});

export const createDeviceModel = asyncHandler(async (req: Request, res: Response) => {
  const code = slugCode(req.body.code || req.body.name);
  let protocolKey = req.body.protocolKey as string | undefined;
  let protocolId = req.body.protocolId || null;

  if (protocolId) {
    const protocol = await DeviceProtocol.findById(protocolId);
    if (!protocol) throw new AppError('Supported protocol not found', 400);
    protocolKey = protocol.key;
  }
  if (!protocolKey) throw new AppError('Supported protocol is required', 400);

  const exists = await DeviceModel.findOne({ $or: [{ name: req.body.name }, { code }] });
  if (exists) throw new AppError('Device model name/code already exists', 409);

  const item = await DeviceModel.create({
    name: req.body.name,
    code,
    manufacturer: req.body.manufacturer,
    protocolId,
    protocolKey,
    description: req.body.description || '',
    isActive: req.body.isActive ?? true,
  });
  await writeAuditLog(req, 'create', 'device_model', String(item._id), req.body);
  return created(res, item, 'Device model created');
});

export const updateDeviceModel = asyncHandler(async (req: Request, res: Response) => {
  const payload: Record<string, unknown> = { ...req.body };
  if (payload.code) payload.code = slugCode(String(payload.code));
  if (payload.protocolId) {
    const protocol = await DeviceProtocol.findById(String(payload.protocolId));
    if (!protocol) throw new AppError('Supported protocol not found', 400);
    payload.protocolKey = protocol.key;
  }
  if (payload.protocolId === '') payload.protocolId = null;
  const item = await DeviceModel.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
  if (!item) throw new AppError('Device model not found', 404);
  await writeAuditLog(req, 'update', 'device_model', String(item._id), payload);
  return success(res, item, 'Device model updated');
});

export const deleteDeviceModel = asyncHandler(async (req: Request, res: Response) => {
  const used = await Device.countDocuments({ deviceModelId: req.params.id });
  if (used > 0) throw new AppError('Cannot delete model assigned to devices', 400);
  const item = await DeviceModel.findByIdAndDelete(req.params.id);
  if (!item) throw new AppError('Device model not found', 404);
  await writeAuditLog(req, 'delete', 'device_model', String(item._id));
  return success(res, { id: item._id }, 'Device model deleted');
});

// ─── Map Settings ────────────────────────────────────────────────────────────

export const mapSettingsSchema = z.object({
  provider: z.enum(['osm', 'google']).optional(),
  mapStyle: z.string().optional(),
  defaultLat: z.coerce.number().min(-90).max(90).optional(),
  defaultLng: z.coerce.number().min(-180).max(180).optional(),
  defaultZoom: z.coerce.number().min(1).max(22).optional(),
  minZoom: z.coerce.number().min(0).max(22).optional(),
  maxZoom: z.coerce.number().min(1).max(22).optional(),
  tileProvider: z.string().optional(),
  clusteringEnabled: z.boolean().optional(),
  showVehicleLabels: z.boolean().optional(),
  refreshIntervalSeconds: z.coerce.number().min(5).max(300).optional(),
  offlineThresholdMinutes: z.coerce.number().min(1).max(1440).optional(),
  googleMapsApiKey: z.string().optional(),
});

const MAP_DEFAULTS = {
  key: 'default',
  provider: 'google',
  mapStyle: 'normal',
  defaultLat: 24.7136,
  defaultLng: 46.6753,
  defaultZoom: 6,
  minZoom: 3,
  maxZoom: 19,
  tileProvider: 'google',
  clusteringEnabled: true,
  showVehicleLabels: true,
  refreshIntervalSeconds: 20,
  offlineThresholdMinutes: 10,
  googleMapsApiKey: '',
};

function serializeMapSettings(doc: InstanceType<typeof MapSettings>, revealKey = false) {
  const obj = doc.toObject();
  return {
    ...obj,
    provider: obj.provider || obj.tileProvider || 'osm',
    googleMapsApiKey: revealKey ? obj.googleMapsApiKey || '' : maskSecret(obj.googleMapsApiKey || ''),
    googleMapsConfigured: Boolean(obj.googleMapsApiKey),
    note: undefined,
  };
}

export const getMapSettings = asyncHandler(async (_req: Request, res: Response) => {
  let settings = await MapSettings.findOne({ key: 'default' });
  if (!settings) settings = await MapSettings.create(MAP_DEFAULTS);
  return success(res, serializeMapSettings(settings));
});

export const updateMapSettings = asyncHandler(async (req: Request, res: Response) => {
  const payload = { ...req.body };
  if (payload.provider) payload.tileProvider = payload.provider;
  if (payload.googleMapsApiKey && String(payload.googleMapsApiKey).includes('•')) {
    delete payload.googleMapsApiKey;
  }
  const settings = await MapSettings.findOneAndUpdate(
    { key: 'default' },
    { $set: payload, $setOnInsert: { key: 'default' } },
    { new: true, upsert: true, runValidators: true },
  );
  await writeAuditLog(req, 'update', 'map_settings', String(settings!._id), {
    ...payload,
    googleMapsApiKey: payload.googleMapsApiKey ? '[redacted]' : undefined,
  });
  return success(res, serializeMapSettings(settings!), 'Map settings saved');
});

export const resetMapSettings = asyncHandler(async (req: Request, res: Response) => {
  const settings = await MapSettings.findOneAndUpdate(
    { key: 'default' },
    { $set: MAP_DEFAULTS },
    { new: true, upsert: true },
  );
  await writeAuditLog(req, 'update', 'map_settings', String(settings!._id), { reset: true });
  return success(res, serializeMapSettings(settings!), 'Map settings reset');
});

// ─── App Settings ────────────────────────────────────────────────────────────

const APP_SETTING_KEYS = [
  'app.name',
  'app.description',
  'app.logoUrl',
  'app.supportEmail',
  'app.supportPhone',
  'localization.language',
  'localization.timezone',
  'localization.dateFormat',
  'localization.timeFormat',
  'localization.currency',
  'notifications.email',
  'notifications.push',
  'notifications.systemAlerts',
  'appearance.defaultTheme',
  'appearance.primaryColor',
  'appearance.sidebarStyle',
  'system.sessionTimeoutMinutes',
  'system.paginationDefault',
  'system.maintenanceMode',
] as const;

const APP_DEFAULTS: Record<(typeof APP_SETTING_KEYS)[number], unknown> = {
  'app.name': 'TrackSense',
  'app.description': 'Intelligent GPS Tracking & Fleet Management',
  'app.logoUrl': '',
  'app.supportEmail': 'support@tracksense.io',
  'app.supportPhone': '',
  'localization.language': 'en',
  'localization.timezone': 'Asia/Riyadh',
  'localization.dateFormat': 'YYYY-MM-DD',
  'localization.timeFormat': '24h',
  'localization.currency': 'SAR',
  'notifications.email': true,
  'notifications.push': false,
  'notifications.systemAlerts': true,
  'appearance.defaultTheme': 'system',
  'appearance.primaryColor': '#5577E8',
  'appearance.sidebarStyle': 'navy',
  'system.sessionTimeoutMinutes': 60,
  'system.paginationDefault': 20,
  'system.maintenanceMode': false,
};

export const appSettingsSchema = z.object({
  settings: z.record(z.string(), z.unknown()),
});

function groupAppSettings(rows: { key: string; value: unknown; description?: string }[]) {
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const value = (key: (typeof APP_SETTING_KEYS)[number]) =>
    map.has(key) ? map.get(key) : APP_DEFAULTS[key];

  return {
    general: {
      name: value('app.name'),
      description: value('app.description'),
      logoUrl: value('app.logoUrl'),
      supportEmail: value('app.supportEmail'),
      supportPhone: value('app.supportPhone'),
    },
    localization: {
      language: value('localization.language'),
      timezone: value('localization.timezone'),
      dateFormat: value('localization.dateFormat'),
      timeFormat: value('localization.timeFormat'),
      currency: value('localization.currency'),
    },
    notifications: {
      email: Boolean(value('notifications.email')),
      push: Boolean(value('notifications.push')),
      systemAlerts: Boolean(value('notifications.systemAlerts')),
    },
    appearance: {
      defaultTheme: value('appearance.defaultTheme'),
      primaryColor: value('appearance.primaryColor'),
      sidebarStyle: value('appearance.sidebarStyle'),
    },
    system: {
      sessionTimeoutMinutes: Number(value('system.sessionTimeoutMinutes')),
      paginationDefault: Number(value('system.paginationDefault')),
      maintenanceMode: Boolean(value('system.maintenanceMode')),
    },
    raw: Object.fromEntries(APP_SETTING_KEYS.map((k) => [k, value(k)])),
  };
}

export const getAppSettingsAdmin = asyncHandler(async (_req: Request, res: Response) => {
  const rows = await AppSettings.find({ key: { $in: [...APP_SETTING_KEYS, 'brand.name', 'brand.tagline', 'theme.primary'] } });
  // Migrate legacy seed keys into new structure if needed
  const legacy = new Map(rows.map((r) => [r.key, r.value]));
  if (!legacy.has('app.name') && legacy.has('brand.name')) {
    await AppSettings.findOneAndUpdate(
      { key: 'app.name' },
      { value: legacy.get('brand.name'), description: 'Application name' },
      { upsert: true },
    );
  }
  if (!legacy.has('app.description') && legacy.has('brand.tagline')) {
    await AppSettings.findOneAndUpdate(
      { key: 'app.description' },
      { value: legacy.get('brand.tagline'), description: 'Application description' },
      { upsert: true },
    );
  }
  if (!legacy.has('appearance.primaryColor') && legacy.has('theme.primary')) {
    await AppSettings.findOneAndUpdate(
      { key: 'appearance.primaryColor' },
      { value: '#5577E8', description: 'Primary brand color' },
      { upsert: true },
    );
  }
  const fresh = await AppSettings.find({ key: { $in: [...APP_SETTING_KEYS] } });
  return success(res, groupAppSettings(fresh.map((r) => r.toObject())));
});

export const updateAppSettingsAdmin = asyncHandler(async (req: Request, res: Response) => {
  const incoming = (req.body.settings ?? req.body) as Record<string, unknown>;
  const flat: Record<string, unknown> = {};

  if (incoming.general || incoming.localization || incoming.notifications || incoming.appearance || incoming.system) {
    const g = (incoming.general || {}) as Record<string, unknown>;
    const l = (incoming.localization || {}) as Record<string, unknown>;
    const n = (incoming.notifications || {}) as Record<string, unknown>;
    const a = (incoming.appearance || {}) as Record<string, unknown>;
    const s = (incoming.system || {}) as Record<string, unknown>;
    Object.assign(flat, {
      'app.name': g.name,
      'app.description': g.description,
      'app.logoUrl': g.logoUrl,
      'app.supportEmail': g.supportEmail,
      'app.supportPhone': g.supportPhone,
      'localization.language': l.language,
      'localization.timezone': l.timezone,
      'localization.dateFormat': l.dateFormat,
      'localization.timeFormat': l.timeFormat,
      'localization.currency': l.currency,
      'notifications.email': n.email,
      'notifications.push': n.push,
      'notifications.systemAlerts': n.systemAlerts,
      'appearance.defaultTheme': a.defaultTheme,
      'appearance.primaryColor': a.primaryColor,
      'appearance.sidebarStyle': a.sidebarStyle,
      'system.sessionTimeoutMinutes': s.sessionTimeoutMinutes,
      'system.paginationDefault': s.paginationDefault,
      'system.maintenanceMode': s.maintenanceMode,
    });
  } else {
    Object.assign(flat, incoming);
  }

  const ops = APP_SETTING_KEYS.filter((k) => flat[k] !== undefined).map((key) =>
    AppSettings.findOneAndUpdate(
      { key },
      { value: flat[key], description: key },
      { upsert: true, new: true },
    ),
  );
  await Promise.all(ops);
  await writeAuditLog(req, 'update', 'app_settings', 'bundle', { keys: Object.keys(flat) });
  const fresh = await AppSettings.find({ key: { $in: [...APP_SETTING_KEYS] } });
  return success(res, groupAppSettings(fresh.map((r) => r.toObject())), 'App settings saved');
});
