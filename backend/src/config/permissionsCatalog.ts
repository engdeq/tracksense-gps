export type PermissionDef = {
  key: string;
  name: string;
  module: string;
  description?: string;
  action?: 'view' | 'create' | 'edit' | 'delete' | 'export' | 'manage';
};

/** Canonical permission catalog used by Roles & Permissions UI and seed upserts. */
export const PERMISSIONS_CATALOG: PermissionDef[] = [
  // Dashboard
  { key: 'dashboard.view', name: 'View Dashboard', module: 'dashboard', action: 'view' },
  { key: 'dashboard.export', name: 'Export Dashboard', module: 'dashboard', action: 'export' },
  // Tracking
  { key: 'tracking.live', name: 'View Live Tracking', module: 'tracking', action: 'view' },
  { key: 'tracking.history', name: 'View GPS History', module: 'tracking', action: 'view' },
  { key: 'tracking.trips', name: 'View Trips', module: 'tracking', action: 'view' },
  { key: 'tracking.geofences', name: 'Manage Geofences', module: 'tracking', action: 'manage' },
  // Customers
  { key: 'customers.view', name: 'View Customers', module: 'customers', action: 'view' },
  { key: 'customers.create', name: 'Create Customers', module: 'customers', action: 'create' },
  { key: 'customers.edit', name: 'Edit Customers', module: 'customers', action: 'edit' },
  { key: 'customers.delete', name: 'Delete Customers', module: 'customers', action: 'delete' },
  // Vehicles
  { key: 'vehicles.view', name: 'View Vehicles', module: 'vehicles', action: 'view' },
  { key: 'vehicles.create', name: 'Create Vehicles', module: 'vehicles', action: 'create' },
  { key: 'vehicles.edit', name: 'Edit Vehicles', module: 'vehicles', action: 'edit' },
  { key: 'vehicles.delete', name: 'Delete Vehicles', module: 'vehicles', action: 'delete' },
  // Devices
  { key: 'devices.view', name: 'View Devices', module: 'devices', action: 'view' },
  { key: 'devices.create', name: 'Create Devices', module: 'devices', action: 'create' },
  { key: 'devices.edit', name: 'Edit Devices', module: 'devices', action: 'edit' },
  { key: 'devices.delete', name: 'Delete Devices', module: 'devices', action: 'delete' },
  // Reports
  { key: 'reports.view', name: 'View Reports', module: 'reports', action: 'view' },
  { key: 'reports.export', name: 'Export Reports', module: 'reports', action: 'export' },
  // Administration
  { key: 'users.manage', name: 'Manage Users', module: 'administration', action: 'manage' },
  { key: 'roles.manage', name: 'Manage Roles', module: 'administration', action: 'manage' },
  { key: 'permissions.manage', name: 'Manage Permissions', module: 'administration', action: 'manage' },
  { key: 'audit.view', name: 'View Audit Logs', module: 'administration', action: 'view' },
  { key: 'access.manage', name: 'Manage Access Control', module: 'administration', action: 'manage' },
  // System configuration
  { key: 'countries.manage', name: 'Manage Countries', module: 'system', action: 'manage' },
  { key: 'cities.manage', name: 'Manage Cities', module: 'system', action: 'manage' },
  { key: 'vehicle_types.manage', name: 'Manage Vehicle Types', module: 'system', action: 'manage' },
  { key: 'vehicle_icons.manage', name: 'Manage Vehicle Icons', module: 'system', action: 'manage' },
  { key: 'device_models.manage', name: 'Manage Device Models', module: 'system', action: 'manage' },
  { key: 'device_protocols.manage', name: 'Manage Device Protocols', module: 'system', action: 'manage' },
  { key: 'map_settings.manage', name: 'Manage Map Settings', module: 'system', action: 'manage' },
  { key: 'app_settings.manage', name: 'Manage App Settings', module: 'system', action: 'manage' },
  { key: 'menus.manage', name: 'Manage Menus', module: 'system', action: 'manage' },
  // Legacy aliases kept for existing role links
  { key: 'customers.read', name: 'View Customers (legacy)', module: 'customers', action: 'view' },
  { key: 'customers.write', name: 'Manage Customers (legacy)', module: 'customers', action: 'manage' },
  { key: 'vehicles.read', name: 'View Vehicles (legacy)', module: 'vehicles', action: 'view' },
  { key: 'vehicles.write', name: 'Manage Vehicles (legacy)', module: 'vehicles', action: 'manage' },
  { key: 'devices.read', name: 'View Devices (legacy)', module: 'devices', action: 'view' },
  { key: 'devices.write', name: 'Manage Devices (legacy)', module: 'devices', action: 'manage' },
  { key: 'gps.live', name: 'Live Tracking (legacy)', module: 'tracking', action: 'view' },
  { key: 'trips.read', name: 'View Trips (legacy)', module: 'tracking', action: 'view' },
  { key: 'reports.read', name: 'View Reports (legacy)', module: 'reports', action: 'view' },
  { key: 'settings.manage', name: 'System Configuration (legacy)', module: 'system', action: 'manage' },
];

export const MODULE_ORDER = [
  'dashboard',
  'tracking',
  'customers',
  'vehicles',
  'devices',
  'reports',
  'administration',
  'system',
] as const;
