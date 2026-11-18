import { Router } from 'express';
import authRoutes from './authRoutes.js';
import { authenticate, requireRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as customerController from '../controllers/customerController.js';
import * as vehicleController from '../controllers/vehicleController.js';
import * as deviceController from '../controllers/deviceController.js';
import * as gpsController from '../controllers/gpsController.js';
import * as tripController from '../controllers/tripController.js';
import * as reportController from '../controllers/reportController.js';
import * as alertController from '../controllers/alertController.js';
import * as dashboardController from '../controllers/dashboardController.js';
import * as lookupController from '../controllers/lookupController.js';
import * as userController from '../controllers/userController.js';
import * as geoController from '../controllers/geoController.js';
import * as menuController from '../controllers/menuController.js';
import * as systemConfigController from '../controllers/systemConfigController.js';
import * as administrationController from '../controllers/administrationController.js';
import * as geofenceController from '../controllers/geofenceController.js';
import { vehicleIconUpload } from '../middleware/upload.js';


const router = Router();

router.get('/health', async (_req, res) => {
  const mongoose = await import('mongoose');
  const { getGpsTcpStatus } = await import('../protocols/gpsTcpServer.js');
  let database: 'online' | 'offline' = 'offline';
  try {
    const ready = mongoose.default.connection.readyState === 1;
    if (ready) {
      await mongoose.default.connection.db?.admin().ping();
      database = 'online';
    }
  } catch {
    database = 'offline';
  }
  const gps = getGpsTcpStatus();
  res.json({
    success: true,
    message: 'TrackSense health',
    timestamp: new Date().toISOString(),
    data: {
      api: 'online' as const,
      database,
      gps: gps.listening ? ('online' as const) : ('offline' as const),
      gpsPort: gps.port,
      version: '1.0.0',
    },
  });
});

router.use('/auth', authRoutes);

router.use(authenticate);

// Lookups
router.get('/countries', lookupController.listCountries);
router.get('/cities', lookupController.listCities);
router.get('/vehicle-types', lookupController.listVehicleTypes);
router.get('/vehicle-icons', lookupController.listVehicleIcons);
router.get('/device-models', lookupController.listDeviceModels);
router.get('/device-protocols', lookupController.listDeviceProtocols);
router.get('/menus', menuController.listMenusTree);
router.get('/settings', lookupController.getSettings);

// Geo admin CRUD
router.get('/admin/countries', requireRoles('super_admin', 'admin', 'operator'), geoController.listCountriesAdmin);
router.get('/admin/countries/:id', requireRoles('super_admin', 'admin', 'operator'), geoController.getCountry);
router.post('/admin/countries', requireRoles('super_admin', 'admin'), validate(geoController.countrySchema), geoController.createCountry);
router.put('/admin/countries/:id', requireRoles('super_admin', 'admin'), validate(geoController.countrySchema.partial()), geoController.updateCountry);
router.delete('/admin/countries/:id', requireRoles('super_admin', 'admin'), geoController.deleteCountry);

router.get('/admin/cities', requireRoles('super_admin', 'admin', 'operator'), geoController.listCitiesAdmin);
router.get('/admin/cities/:id', requireRoles('super_admin', 'admin', 'operator'), geoController.getCity);
router.post('/admin/cities', requireRoles('super_admin', 'admin'), validate(geoController.citySchema), geoController.createCity);
router.put('/admin/cities/:id', requireRoles('super_admin', 'admin'), validate(geoController.citySchema.partial()), geoController.updateCity);
router.delete('/admin/cities/:id', requireRoles('super_admin', 'admin'), geoController.deleteCity);

// Menu management
router.get('/admin/menus', requireRoles('super_admin', 'admin'), menuController.listMenusFlat);
router.get('/admin/menus/:id', requireRoles('super_admin', 'admin'), menuController.getMenu);
router.post('/admin/menus', requireRoles('super_admin', 'admin'), validate(menuController.menuSchema), menuController.createMenu);
router.put('/admin/menus/:id', requireRoles('super_admin', 'admin'), validate(menuController.menuSchema.partial()), menuController.updateMenu);
router.delete('/admin/menus/:id', requireRoles('super_admin', 'admin'), menuController.deleteMenu);
router.post('/admin/menus/reorder', requireRoles('super_admin', 'admin'), menuController.reorderMenus);

// System configuration CRUD
const adminOnly = requireRoles('super_admin', 'admin');
const adminOps = requireRoles('super_admin', 'admin', 'operator');

router.get('/admin/vehicle-types', adminOps, systemConfigController.listVehicleTypesAdmin);
router.get('/admin/vehicle-types/:id', adminOps, systemConfigController.getVehicleType);
router.post('/admin/vehicle-types', adminOnly, validate(systemConfigController.vehicleTypeSchema), systemConfigController.createVehicleType);
router.put('/admin/vehicle-types/:id', adminOnly, validate(systemConfigController.vehicleTypeSchema.partial()), systemConfigController.updateVehicleType);
router.delete('/admin/vehicle-types/:id', adminOnly, systemConfigController.deleteVehicleType);

router.get('/admin/vehicle-icons', adminOps, systemConfigController.listVehicleIconsAdmin);
router.get('/admin/vehicle-icons/:id', adminOps, systemConfigController.getVehicleIcon);
router.post('/admin/vehicle-icons', adminOnly, vehicleIconUpload.single('file'), systemConfigController.createVehicleIcon);
router.put('/admin/vehicle-icons/:id', adminOnly, vehicleIconUpload.single('file'), systemConfigController.updateVehicleIcon);
router.delete('/admin/vehicle-icons/:id', adminOnly, systemConfigController.deleteVehicleIcon);

router.get('/admin/device-protocols', adminOps, systemConfigController.listDeviceProtocolsAdmin);
router.get('/admin/device-protocols/:id', adminOps, systemConfigController.getDeviceProtocol);
router.post('/admin/device-protocols', adminOnly, validate(systemConfigController.deviceProtocolSchema), systemConfigController.createDeviceProtocol);
router.put('/admin/device-protocols/:id', adminOnly, validate(systemConfigController.deviceProtocolSchema.partial()), systemConfigController.updateDeviceProtocol);
router.delete('/admin/device-protocols/:id', adminOnly, systemConfigController.deleteDeviceProtocol);

router.get('/admin/device-models', adminOps, systemConfigController.listDeviceModelsAdmin);
router.get('/admin/device-models/:id', adminOps, systemConfigController.getDeviceModel);
router.post('/admin/device-models', adminOnly, validate(systemConfigController.deviceModelSchema), systemConfigController.createDeviceModel);
router.put('/admin/device-models/:id', adminOnly, validate(systemConfigController.deviceModelSchema.partial()), systemConfigController.updateDeviceModel);
router.delete('/admin/device-models/:id', adminOnly, systemConfigController.deleteDeviceModel);

router.get('/admin/map-settings', adminOps, systemConfigController.getMapSettings);
router.put('/admin/map-settings', adminOnly, validate(systemConfigController.mapSettingsSchema), systemConfigController.updateMapSettings);
router.post('/admin/map-settings/reset', adminOnly, systemConfigController.resetMapSettings);

router.get('/admin/app-settings', adminOps, systemConfigController.getAppSettingsAdmin);
router.put('/admin/app-settings', adminOnly, systemConfigController.updateAppSettingsAdmin);

// Dashboard
router.get('/dashboard/admin', requireRoles('super_admin', 'admin', 'operator'), dashboardController.adminDashboard);
router.get('/dashboard/customer', requireRoles('customer', 'admin', 'super_admin'), customerController.customerDashboard);

// Customers
router.get('/customers', requireRoles('super_admin', 'admin', 'operator', 'customer'), customerController.listCustomers);
router.get('/customers/:id', requireRoles('super_admin', 'admin', 'operator', 'customer'), customerController.getCustomer);
router.post('/customers', requireRoles('super_admin', 'admin'), validate(customerController.customerSchema), customerController.createCustomer);
router.put('/customers/:id', requireRoles('super_admin', 'admin'), validate(customerController.customerSchema.partial()), customerController.updateCustomer);
router.delete('/customers/:id', requireRoles('super_admin', 'admin'), customerController.deleteCustomer);

// Vehicles
router.get('/vehicles', vehicleController.listVehicles);
router.get('/vehicles/:id', vehicleController.getVehicle);
router.post('/vehicles', requireRoles('super_admin', 'admin', 'operator'), validate(vehicleController.vehicleSchema), vehicleController.createVehicle);
router.put('/vehicles/:id', requireRoles('super_admin', 'admin', 'operator'), validate(vehicleController.vehicleSchema.partial()), vehicleController.updateVehicle);
router.delete('/vehicles/:id', requireRoles('super_admin', 'admin'), vehicleController.deleteVehicle);

// Devices
router.get('/devices', deviceController.listDevices);
router.get('/devices/:id', deviceController.getDevice);
router.post('/devices', requireRoles('super_admin', 'admin', 'operator'), validate(deviceController.deviceSchema), deviceController.createDevice);
router.put('/devices/:id', requireRoles('super_admin', 'admin', 'operator'), validate(deviceController.deviceSchema.partial()), deviceController.updateDevice);
router.delete('/devices/:id', requireRoles('super_admin', 'admin'), deviceController.deleteDevice);

// GPS
router.get('/gps/positions', gpsController.currentPositions);
router.get('/gps/history', gpsController.positionHistory);
router.get('/gps/device-status', gpsController.deviceStatusSummary);

// Trips
router.get('/trips', tripController.listTrips);
router.get('/trips/:id', tripController.getTrip);
router.get('/trips/:id/playback', tripController.tripPlayback);

// Reports
router.get('/reports/distance', reportController.distanceReport);
router.get('/reports/trips', reportController.tripReport);
router.get('/reports/speed', reportController.speedReport);
router.get('/reports/vehicles', reportController.vehicleSummaryReport);

// Alerts / notifications
router.get('/alerts', alertController.listAlerts);
router.get('/alerts/:id', alertController.getAlert);
router.patch('/alerts/:id/read', alertController.markRead);
router.post('/alerts/read-all', alertController.markAllRead);

// Geofences
const geofenceRoles = requireRoles('super_admin', 'admin', 'operator', 'customer', 'country_manager', 'city_manager');
const geofenceWrite = requireRoles('super_admin', 'admin', 'operator', 'customer');
router.get('/geofences/statistics', geofenceRoles, geofenceController.getStatistics);
router.get('/geofences/events', geofenceRoles, geofenceController.listGeofenceEvents);
router.post(
  '/geofences/evaluate-test',
  requireRoles('super_admin', 'admin', 'operator'),
  geofenceController.evaluateTestFixture,
);
router.get('/geofences', geofenceRoles, geofenceController.listGeofences);
router.get('/geofences/:id', geofenceRoles, geofenceController.getGeofence);
router.post('/geofences', geofenceWrite, validate(geofenceController.geofenceSchema), geofenceController.createGeofence);
router.put('/geofences/:id', geofenceWrite, geofenceController.updateGeofence);
router.delete('/geofences/:id', requireRoles('super_admin', 'admin', 'operator'), geofenceController.deleteGeofence);
router.post('/geofences/:id/status', geofenceWrite, geofenceController.setGeofenceStatus);
router.post('/geofences/:id/assign-vehicles', geofenceWrite, geofenceController.assignVehicles);


// Users & profile
router.get('/users', requireRoles('super_admin', 'admin'), userController.listUsers);
router.post('/users', requireRoles('super_admin', 'admin'), validate(userController.createUserSchema), userController.createUser);
router.put('/profile', validate(userController.updateProfileSchema), userController.updateProfile);
router.post('/profile/change-password', validate(userController.changePasswordSchema), userController.changePassword);

// Roles & permissions
router.get('/roles', requireRoles('super_admin', 'admin'), administrationController.listRoles);
router.get('/roles/:id', requireRoles('super_admin', 'admin'), administrationController.getRole);
router.post('/roles', requireRoles('super_admin', 'admin'), validate(administrationController.roleSchema), administrationController.createRole);
router.put('/roles/:id', requireRoles('super_admin', 'admin'), validate(administrationController.roleSchema.partial()), administrationController.updateRole);
router.delete('/roles/:id', requireRoles('super_admin', 'admin'), administrationController.deleteRole);
router.get('/permissions', requireRoles('super_admin', 'admin'), administrationController.listPermissions);
router.put(
  '/roles/:id/permissions',
  requireRoles('super_admin', 'admin'),
  validate(administrationController.setRolePermissionsSchema),
  administrationController.setRolePermissions,
);

// Audit logs (read-only for admins)
router.get('/audit-logs', requireRoles('super_admin', 'admin'), administrationController.listAuditLogs);
router.get('/audit-logs/summary', requireRoles('super_admin', 'admin'), administrationController.auditSummary);
router.get('/audit-logs/export', requireRoles('super_admin', 'admin'), administrationController.exportAuditLogs);
router.get('/audit-logs/:id', requireRoles('super_admin', 'admin'), administrationController.getAuditLog);

// Access control
router.get('/access-control/summary', requireRoles('super_admin', 'admin'), administrationController.accessControlSummary);
router.get('/access-control/rules', requireRoles('super_admin', 'admin'), administrationController.listAccessRules);
router.get('/access-control/rules/:id', requireRoles('super_admin', 'admin'), administrationController.getAccessRule);
router.post('/access-control/rules', requireRoles('super_admin', 'admin'), validate(administrationController.accessRuleSchema), administrationController.createAccessRule);
router.put('/access-control/rules/:id', requireRoles('super_admin', 'admin'), validate(administrationController.accessRuleSchema.partial()), administrationController.updateAccessRule);
router.delete('/access-control/rules/:id', requireRoles('super_admin', 'admin'), administrationController.deleteAccessRule);
router.get('/access-control/users', requireRoles('super_admin', 'admin'), administrationController.listAccessUsers);
router.post('/access-control/users/:id/status', requireRoles('super_admin', 'admin'), administrationController.setUserAccessStatus);
router.post(
  '/access-control/users/:id/unlock',
  requireRoles('super_admin', 'admin'),
  (req, _res, next) => {
    req.body = { ...(req.body || {}), action: 'unlock' };
    next();
  },
  administrationController.setUserAccessStatus,
);
router.post('/access-control/users/:id/revoke-sessions', requireRoles('super_admin', 'admin'), administrationController.revokeUserSessions);

export default router;
