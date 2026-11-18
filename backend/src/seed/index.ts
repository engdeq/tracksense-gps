import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import {
  Country,
  City,
  Role,
  Permission,
  RolePermission,
  User,
  Customer,
  VehicleType,
  VehicleIcon,
  Vehicle,
  DeviceModel,
  DeviceProtocol,
  Device,
  Position,
  Trip,
  Alert,
  Menu,
  AppSettings,
  MapSettings,
} from '../models/index.js';

async function seed() {
  await connectDatabase();
  console.log('Seeding tracksense_db...');

  // Clear collections for a clean demo seed
  const collections = await mongoose.connection.db?.collections();
  if (collections) {
    for (const col of collections) {
      await col.deleteMany({});
    }
  }

  const saudi = await Country.create({
    name: 'Saudi Arabia',
    code: 'SA',
    isoAlpha2: 'SA',
    isoAlpha3: 'SAU',
    phoneCode: '+966',
    currencyName: 'Saudi Riyal',
    currencyCode: 'SAR',
    currencySymbol: '﷼',
    flagUrl: 'https://flagcdn.com/w80/sa.png',
  });
  const uae = await Country.create({
    name: 'United Arab Emirates',
    code: 'AE',
    isoAlpha2: 'AE',
    isoAlpha3: 'ARE',
    phoneCode: '+971',
    currencyName: 'UAE Dirham',
    currencyCode: 'AED',
    currencySymbol: 'د.إ',
    flagUrl: 'https://flagcdn.com/w80/ae.png',
  });
  const riyadh = await City.create({
    name: 'Riyadh',
    countryId: saudi._id,
    cityCode: 'RUH',
    region: 'Riyadh Province',
    timezone: 'Asia/Riyadh',
  });
  const jeddah = await City.create({
    name: 'Jeddah',
    countryId: saudi._id,
    cityCode: 'JED',
    region: 'Makkah Province',
    timezone: 'Asia/Riyadh',
  });
  const dubai = await City.create({
    name: 'Dubai',
    countryId: uae._id,
    cityCode: 'DXB',
    region: 'Dubai',
    timezone: 'Asia/Dubai',
  });

  const permissions = await Permission.insertMany([
    { key: 'customers.read', name: 'View Customers', module: 'customers' },
    { key: 'customers.write', name: 'Manage Customers', module: 'customers' },
    { key: 'vehicles.read', name: 'View Vehicles', module: 'vehicles' },
    { key: 'vehicles.write', name: 'Manage Vehicles', module: 'vehicles' },
    { key: 'devices.read', name: 'View Devices', module: 'devices' },
    { key: 'devices.write', name: 'Manage Devices', module: 'devices' },
    { key: 'gps.live', name: 'Live Tracking', module: 'gps' },
    { key: 'trips.read', name: 'View Trips', module: 'trips' },
    { key: 'reports.read', name: 'View Reports', module: 'reports' },
    { key: 'users.manage', name: 'Manage Users', module: 'users' },
    { key: 'settings.manage', name: 'System Configuration', module: 'settings' },
  ]);

  const roles = await Role.insertMany([
    { key: 'super_admin', name: 'Super Admin', isSystem: true },
    { key: 'admin', name: 'Admin', isSystem: true },
    { key: 'operator', name: 'Operator', isSystem: true },
    { key: 'customer', name: 'Customer', isSystem: true },
  ]);

  const adminRole = roles.find((r) => r.key === 'admin')!;
  const customerRole = roles.find((r) => r.key === 'customer')!;
  const operatorRole = roles.find((r) => r.key === 'operator')!;

  await RolePermission.insertMany(
    permissions.map((p) => ({ roleId: adminRole._id, permissionId: p._id })),
  );
  await RolePermission.insertMany(
    permissions
      .filter((p) => !['users.manage', 'settings.manage', 'customers.write'].includes(p.key))
      .map((p) => ({ roleId: operatorRole._id, permissionId: p._id })),
  );
  await RolePermission.insertMany(
    permissions
      .filter((p) =>
        ['vehicles.read', 'devices.read', 'gps.live', 'trips.read', 'reports.read'].includes(p.key),
      )
      .map((p) => ({ roleId: customerRole._id, permissionId: p._id })),
  );

  const adminRoles = ['super_admin', 'admin', 'operator'];
  const adminOnly = ['super_admin', 'admin'];

  const dashboard = await Menu.create({
    key: 'dashboard',
    label: 'Dashboard',
    path: '/',
    icon: 'LayoutDashboard',
    order: 1,
    group: 'main',
    roles: adminRoles,
  });

  const tracking = await Menu.create({
    key: 'tracking',
    label: 'Tracking',
    path: '',
    icon: 'MapPinned',
    order: 2,
    group: 'main',
    roles: adminRoles,
  });
  await Menu.insertMany([
    { key: 'live', label: 'Live Tracking', path: '/live-tracking', icon: 'MapPinned', parentId: tracking._id, order: 1, group: 'tracking', roles: adminRoles },
    { key: 'trips', label: 'Trips & History', path: '/trips', icon: 'Route', parentId: tracking._id, order: 2, group: 'tracking', roles: adminRoles },
    { key: 'geofences', label: 'Geofences', path: '/geofences', icon: 'Hexagon', parentId: tracking._id, order: 3, group: 'tracking', roles: adminRoles },
  ]);

  const management = await Menu.create({
    key: 'management',
    label: 'Management',
    path: '',
    icon: 'BriefcaseBusiness',
    order: 3,
    group: 'main',
    roles: adminRoles,
  });
  await Menu.insertMany([
    { key: 'customers', label: 'Customers', path: '/customers', icon: 'Building2', parentId: management._id, order: 1, group: 'management', roles: adminRoles },
    { key: 'vehicles', label: 'Vehicles', path: '/vehicles', icon: 'Car', parentId: management._id, order: 2, group: 'management', roles: adminRoles },
    { key: 'devices', label: 'GPS Devices', path: '/devices', icon: 'Cpu', parentId: management._id, order: 3, group: 'management', roles: adminRoles },
  ]);

  const reports = await Menu.create({
    key: 'reports',
    label: 'Reports & Analytics',
    path: '',
    icon: 'ChartNoAxesCombined',
    order: 4,
    group: 'main',
    roles: adminRoles,
  });
  await Menu.insertMany([
    { key: 'reports-fleet', label: 'Fleet Reports', path: '/reports?type=fleet', icon: 'PieChart', parentId: reports._id, order: 1, group: 'reports', roles: adminRoles },
    { key: 'reports-trips', label: 'Trip Reports', path: '/reports?type=trips', icon: 'Route', parentId: reports._id, order: 2, group: 'reports', roles: adminRoles },
    { key: 'reports-distance', label: 'Distance Reports', path: '/reports?type=distance', icon: 'Gauge', parentId: reports._id, order: 3, group: 'reports', roles: adminRoles },
    { key: 'reports-devices', label: 'Device Reports', path: '/reports?type=devices', icon: 'Cpu', parentId: reports._id, order: 4, group: 'reports', roles: adminRoles },
  ]);

  const alerts = await Menu.create({
    key: 'alerts',
    label: 'Alerts & Notifications',
    path: '',
    icon: 'BellRing',
    order: 5,
    group: 'main',
    roles: adminRoles,
  });
  await Menu.insertMany([
    { key: 'alerts-all', label: 'All Alerts', path: '/alerts', icon: 'BellRing', parentId: alerts._id, order: 1, group: 'alerts', roles: adminRoles },
    { key: 'alerts-settings', label: 'Alert Settings', path: '/alerts/settings', icon: 'SlidersHorizontal', parentId: alerts._id, order: 2, group: 'alerts', roles: adminOnly },
  ]);

  const administration = await Menu.create({
    key: 'administration',
    label: 'Administration',
    path: '',
    icon: 'ShieldCheck',
    order: 6,
    group: 'main',
    roles: adminOnly,
  });
  await Menu.insertMany([
    { key: 'users', label: 'Users', path: '/users', icon: 'Users', parentId: administration._id, order: 1, group: 'administration', roles: adminOnly },
    { key: 'roles', label: 'Roles & Permissions', path: '/roles', icon: 'KeyRound', parentId: administration._id, order: 2, group: 'administration', roles: adminOnly },
    { key: 'audit', label: 'Audit Logs', path: '/audit-logs', icon: 'ScrollText', parentId: administration._id, order: 3, group: 'administration', roles: adminOnly },
    { key: 'access', label: 'Access Control', path: '/access-control', icon: 'Lock', parentId: administration._id, order: 4, group: 'administration', roles: adminOnly },
  ]);

  const system = await Menu.create({
    key: 'system',
    label: 'System Configuration',
    path: '',
    icon: 'Settings2',
    order: 7,
    group: 'main',
    roles: adminOnly,
  });
  await Menu.insertMany([
    { key: 'countries', label: 'Countries', path: '/countries', icon: 'Globe2', parentId: system._id, order: 1, group: 'system', roles: adminOnly },
    { key: 'cities', label: 'Cities', path: '/cities', icon: 'MapPin', parentId: system._id, order: 2, group: 'system', roles: adminOnly },
    { key: 'vehicle-types', label: 'Vehicle Types', path: '/vehicle-types', icon: 'Shapes', parentId: system._id, order: 3, group: 'system', roles: adminOnly },
    { key: 'vehicle-icons', label: 'Vehicle Icons', path: '/vehicle-icons', icon: 'Image', parentId: system._id, order: 4, group: 'system', roles: adminOnly },
    { key: 'device-models', label: 'Device Models', path: '/device-models', icon: 'Box', parentId: system._id, order: 5, group: 'system', roles: adminOnly },
    { key: 'device-protocols', label: 'Device Protocols', path: '/device-protocols', icon: 'Cable', parentId: system._id, order: 6, group: 'system', roles: adminOnly },
    { key: 'map-settings', label: 'Map Settings', path: '/map-settings', icon: 'Map', parentId: system._id, order: 7, group: 'system', roles: adminOnly },
    { key: 'app-settings', label: 'App Settings', path: '/settings', icon: 'Sliders', parentId: system._id, order: 8, group: 'system', roles: adminOnly },
    { key: 'menu-management', label: 'Menu Management', path: '/menus', icon: 'Menu', parentId: system._id, order: 9, group: 'system', roles: adminOnly },
  ]);

  void dashboard;

  const protocol = await DeviceProtocol.create({
    key: 'teltonika_codec8',
    name: 'Teltonika Codec8',
    version: '8',
    description: 'Teltonika FMB920 / Codec8 AVL protocol',
    defaultPort: 5027,
    connectionType: 'tcp',
    decoderKey: 'teltonika_codec8',
  });

  const fmb920 = await DeviceModel.create({
    name: 'FMB920',
    code: 'FMB920',
    manufacturer: 'Teltonika',
    protocolId: protocol._id,
    protocolKey: 'teltonika_codec8',
    description: 'Compact GPS tracker with BLE',
  });

  const carType = await VehicleType.create({
    name: 'Car',
    code: 'CAR',
    description: 'Passenger car',
    iconKey: 'car',
  });
  const vanType = await VehicleType.create({
    name: 'Van',
    code: 'VAN',
    description: 'Light commercial van',
    iconKey: 'van',
  });
  const truckType = await VehicleType.create({
    name: 'Truck',
    code: 'TRUCK',
    description: 'Heavy goods vehicle',
    iconKey: 'truck',
  });
  await VehicleType.insertMany([
    { name: 'Bus', code: 'BUS', description: 'Passenger bus', iconKey: 'bus' },
    { name: 'Motorbike', code: 'BIKE', description: 'Two-wheeler', iconKey: 'bike' },
    { name: 'Pickup', code: 'PICKUP', description: 'Pickup truck', iconKey: 'pickup' },
    { name: 'Minibus', code: 'MINIBUS', description: 'Small bus', iconKey: 'minibus' },
    { name: 'Bicycle', code: 'BICYCLE', description: 'Bicycle / micromobility', iconKey: 'bike' },
  ]);

  const carIcon = await VehicleIcon.create({
    name: 'Sedan',
    key: 'sedan',
    category: 'car',
    imageUrl: '/icons/sedan.svg', // served from admin-web/public/icons
    vehicleTypeId: carType._id,
  });
  const vanIcon = await VehicleIcon.create({
    name: 'Van',
    key: 'van',
    category: 'van',
    imageUrl: '/icons/van.svg',
    vehicleTypeId: vanType._id,
  });
  const truckIcon = await VehicleIcon.create({
    name: 'Truck',
    key: 'truck',
    category: 'truck',
    imageUrl: '/icons/truck.svg',
    vehicleTypeId: truckType._id,
  });

  const customer = await Customer.create({
    companyName: 'Oasis Logistics',
    contactName: 'Ahmed Al-Rashid',
    email: 'ahmed@oasis-logistics.sa',
    phone: '+966501234567',
    countryId: saudi._id,
    cityId: riyadh._id,
    address: 'King Fahd Road, Riyadh',
    status: 'active',
  });

  const customer2 = await Customer.create({
    companyName: 'Gulf Fleet Services',
    contactName: 'Sara Hassan',
    email: 'sara@gulffleet.ae',
    phone: '+971501112233',
    countryId: uae._id,
    cityId: dubai._id,
    address: 'Business Bay, Dubai',
    status: 'active',
  });

  const adminHash = await bcrypt.hash('Admin@12345', 12);
  const customerHash = await bcrypt.hash('Customer@123', 12);

  await User.create({
    username: 'admin',
    email: 'admin@tracksense.io',
    passwordHash: adminHash,
    fullName: 'TrackSense Admin',
    phone: '+966500000001',
    roleKey: 'admin',
    countryId: saudi._id,
    cityId: riyadh._id,
    isActive: true,
  });

  await User.create({
    username: 'customer1',
    email: 'ahmed@oasis-logistics.sa',
    passwordHash: customerHash,
    fullName: 'Ahmed Al-Rashid',
    phone: '+966501234567',
    roleKey: 'customer',
    customerId: customer._id,
    countryId: saudi._id,
    cityId: riyadh._id,
    isActive: true,
  });

  const devices = await Device.insertMany([
    {
      imei: '352094089012345',
      name: 'FMB920-Oasis-01',
      deviceModelId: fmb920._id,
      protocolId: protocol._id,
      customerId: customer._id,
      simNumber: '+966551111001',
      simOperator: 'STC',
      connectionStatus: 'online',
      lastCommunicationAt: new Date(),
      isActive: true,
    },
    {
      imei: '352094089012346',
      name: 'FMB920-Oasis-02',
      deviceModelId: fmb920._id,
      protocolId: protocol._id,
      customerId: customer._id,
      simNumber: '+966551111002',
      simOperator: 'Mobily',
      connectionStatus: 'online',
      lastCommunicationAt: new Date(Date.now() - 2 * 60 * 1000),
      isActive: true,
    },
    {
      imei: '352094089012347',
      name: 'FMB920-Oasis-03',
      deviceModelId: fmb920._id,
      protocolId: protocol._id,
      customerId: customer._id,
      simNumber: '+966551111003',
      simOperator: 'Zain',
      connectionStatus: 'offline',
      lastCommunicationAt: new Date(Date.now() - 45 * 60 * 1000),
      isActive: true,
    },
    {
      imei: '352094089012348',
      name: 'FMB920-Gulf-01',
      deviceModelId: fmb920._id,
      protocolId: protocol._id,
      customerId: customer2._id,
      simNumber: '+971501000001',
      simOperator: 'Etisalat',
      connectionStatus: 'online',
      lastCommunicationAt: new Date(),
      isActive: true,
    },
  ]);

  const vehicles = await Vehicle.insertMany([
    {
      name: 'Oasis Sedan 1',
      plateNumber: 'RYD-1001',
      brand: 'Toyota',
      model: 'Camry',
      year: 2024,
      color: 'White',
      customerId: customer._id,
      vehicleTypeId: carType._id,
      iconId: carIcon._id,
      deviceId: devices[0]._id,
      status: 'active',
      motionStatus: 'moving',
      speedLimitKmh: 120,
    },
    {
      name: 'Oasis Van 1',
      plateNumber: 'RYD-2002',
      brand: 'Hyundai',
      model: 'H1',
      year: 2023,
      color: 'Silver',
      customerId: customer._id,
      vehicleTypeId: vanType._id,
      iconId: vanIcon._id,
      deviceId: devices[1]._id,
      status: 'active',
      motionStatus: 'stopped',
      speedLimitKmh: 110,
    },
    {
      name: 'Oasis Truck 1',
      plateNumber: 'JED-3003',
      brand: 'Isuzu',
      model: 'NPR',
      year: 2022,
      color: 'Blue',
      customerId: customer._id,
      vehicleTypeId: truckType._id,
      iconId: truckIcon._id,
      deviceId: devices[2]._id,
      status: 'active',
      motionStatus: 'offline',
      speedLimitKmh: 100,
    },
    {
      name: 'Gulf Fleet Car',
      plateNumber: 'DXB-4401',
      brand: 'Nissan',
      model: 'Altima',
      year: 2024,
      color: 'Black',
      customerId: customer2._id,
      vehicleTypeId: carType._id,
      iconId: carIcon._id,
      deviceId: devices[3]._id,
      status: 'active',
      motionStatus: 'moving',
      speedLimitKmh: 120,
    },
  ]);

  await Device.updateOne({ _id: devices[0]._id }, { vehicleId: vehicles[0]._id });
  await Device.updateOne({ _id: devices[1]._id }, { vehicleId: vehicles[1]._id });
  await Device.updateOne({ _id: devices[2]._id }, { vehicleId: vehicles[2]._id });
  await Device.updateOne({ _id: devices[3]._id }, { vehicleId: vehicles[3]._id });

  // Seeded demonstration GPS samples (source: import) — not live production device telemetry
  const now = Date.now();
  const demoRoutes = [
    {
      vehicle: vehicles[0],
      device: devices[0],
      points: [
        [24.7136, 46.6753, 62],
        [24.7150, 46.6780, 68],
        [24.7175, 46.6810, 55],
        [24.7200, 46.6840, 72],
        [24.7225, 46.6875, 48],
      ] as Array<[number, number, number]>,
    },
    {
      vehicle: vehicles[1],
      device: devices[1],
      points: [[24.6877, 46.7219, 0], [24.6877, 46.7219, 0]] as Array<[number, number, number]>,
    },
    {
      vehicle: vehicles[2],
      device: devices[2],
      points: [[21.5433, 39.1728, 0]] as Array<[number, number, number]>,
    },
    {
      vehicle: vehicles[3],
      device: devices[3],
      points: [
        [25.2048, 55.2708, 45],
        [25.2080, 55.2750, 52],
        [25.2110, 55.2800, 58],
      ] as Array<[number, number, number]>,
    },
  ];

  for (const route of demoRoutes) {
    for (let i = 0; i < route.points.length; i++) {
      const [lat, lng, speed] = route.points[i];
      await Position.create({
        deviceId: route.device._id,
        vehicleId: route.vehicle._id,
        customerId: route.vehicle.customerId,
        imei: route.device.imei,
        latitude: lat,
        longitude: lng,
        speedKmh: speed,
        heading: i * 15,
        satellites: 12,
        ignition: speed > 0 || i === 0,
        recordedAt: new Date(now - (route.points.length - i) * 60_000),
        receivedAt: new Date(now - (route.points.length - i) * 60_000),
        source: 'import',
        address: 'Seeded demonstration sample',
      });
    }
  }

  const tripStart = new Date(now - 90 * 60_000);
  const tripEnd = new Date(now - 30 * 60_000);
  const trip = await Trip.create({
    vehicleId: vehicles[0]._id,
    customerId: customer._id,
    deviceId: devices[0]._id,
    startTime: tripStart,
    endTime: tripEnd,
    startLatitude: 24.7136,
    startLongitude: 46.6753,
    endLatitude: 24.7225,
    endLongitude: 46.6875,
    startAddress: 'Riyadh Center',
    endAddress: 'Olaya District',
    distanceKm: 12.4,
    durationSec: 3600,
    avgSpeedKmh: 48,
    maxSpeedKmh: 72,
    status: 'completed',
  });

  await Trip.create({
    vehicleId: vehicles[0]._id,
    customerId: customer._id,
    deviceId: devices[0]._id,
    startTime: new Date(now - 20 * 60_000),
    endTime: null,
    startLatitude: 24.7225,
    startLongitude: 46.6875,
    startAddress: 'Olaya District',
    distanceKm: 3.1,
    durationSec: 1200,
    avgSpeedKmh: 55,
    maxSpeedKmh: 68,
    status: 'active',
  });

  await Alert.insertMany([
    {
      customerId: customer._id,
      vehicleId: vehicles[0]._id,
      deviceId: devices[0]._id,
      type: 'speeding',
      severity: 'warning',
      title: 'Speeding detected',
      message: 'RYD-1001 reached 72 km/h in a monitored segment (seeded demo alert).',
      isRead: false,
    },
    {
      customerId: customer._id,
      vehicleId: vehicles[2]._id,
      deviceId: devices[2]._id,
      type: 'offline',
      severity: 'critical',
      title: 'Device offline',
      message: 'FMB920-Oasis-03 has not communicated for 45 minutes (seeded demo alert).',
      isRead: false,
    },
    {
      customerId: customer._id,
      vehicleId: vehicles[1]._id,
      type: 'movement',
      severity: 'info',
      title: 'Vehicle stopped',
      message: 'Oasis Van 1 is currently stopped (seeded demo alert).',
      isRead: true,
      readAt: new Date(),
    },
  ]);

  await AppSettings.insertMany([
    { key: 'brand.name', value: 'TrackSense', description: 'Product name' },
    { key: 'brand.tagline', value: 'Intelligent GPS Tracking & Fleet Management.', description: 'Tagline' },
    { key: 'theme.primary', value: '#5577E8', description: 'Primary brand color' },
    { key: 'app.name', value: 'TrackSense', description: 'Application name' },
    { key: 'app.description', value: 'Intelligent GPS Tracking & Fleet Management', description: 'Application description' },
    { key: 'app.supportEmail', value: 'support@tracksense.io', description: 'Support email' },
    { key: 'appearance.primaryColor', value: '#5577E8', description: 'Primary brand color' },
    { key: 'appearance.defaultTheme', value: 'system', description: 'Default theme' },
    { key: 'notifications.email', value: true, description: 'Email notifications' },
    { key: 'notifications.systemAlerts', value: true, description: 'System alerts' },
    { key: 'system.paginationDefault', value: 20, description: 'Default page size' },
    { key: 'system.sessionTimeoutMinutes', value: 60, description: 'Session timeout' },
    { key: 'system.maintenanceMode', value: false, description: 'Maintenance mode' },
  ]);

  await MapSettings.create({
    key: 'default',
    provider: 'google',
    mapStyle: 'normal',
    defaultLat: 24.7136,
    defaultLng: 46.6753,
    defaultZoom: 6,
    minZoom: 3,
    maxZoom: 19,
    tileProvider: 'osm',
    clusteringEnabled: true,
    showVehicleLabels: true,
    refreshIntervalSeconds: 20,
    offlineThresholdMinutes: 10,
  });

  console.log('Seed complete.');
  console.log('Admin: admin / Admin@12345');
  console.log('Customer: customer1 / Customer@123');
  console.log(`Sample trip id: ${trip._id}`);
  console.log(`Cities seeded: ${riyadh.name}, ${jeddah.name}, ${dubai.name}`);

  await disconnectDatabase();
}

seed().catch(async (err) => {
  console.error(err);
  await disconnectDatabase();
  process.exit(1);
});
