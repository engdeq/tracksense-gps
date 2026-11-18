import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../dashboard/data/dashboard_models.dart';
import '../devices/data/device_models.dart';
import '../live_tracking/data/gps_models.dart';
import '../notifications/data/alert_models.dart';
import '../reports/data/report_models.dart';
import '../trips/data/trip_models.dart';
import '../vehicles/data/vehicle_models.dart';
import 'repositories.dart';

final dashboardProvider = FutureProvider.autoDispose<CustomerDashboard>((ref) {
  return ref.watch(customerApiProvider).dashboard();
});

final vehiclesProvider = FutureProvider.autoDispose.family<VehicleListResult, String>((ref, query) {
  return ref.watch(customerApiProvider).vehicles(q: query.isEmpty ? null : query);
});

final vehicleProvider = FutureProvider.autoDispose.family<Vehicle, String>((ref, id) {
  return ref.watch(customerApiProvider).vehicle(id);
});

final devicesProvider = FutureProvider.autoDispose.family<DeviceListResult, String>((ref, query) {
  return ref.watch(customerApiProvider).devices(q: query.isEmpty ? null : query);
});

final deviceProvider = FutureProvider.autoDispose.family<Device, String>((ref, id) {
  return ref.watch(customerApiProvider).device(id);
});

final gpsPositionsProvider = FutureProvider.autoDispose.family<List<GpsPositionItem>, String>((ref, query) {
  return ref.watch(customerApiProvider).gpsPositions(q: query.isEmpty ? null : query);
});

final tripsProvider = FutureProvider.autoDispose<TripListResult>((ref) {
  return ref.watch(customerApiProvider).trips();
});

final tripProvider = FutureProvider.autoDispose.family<TripDetailResult, String>((ref, id) {
  return ref.watch(customerApiProvider).trip(id);
});

final tripPlaybackProvider = FutureProvider.autoDispose.family<TripPlaybackResult, String>((ref, id) {
  return ref.watch(customerApiProvider).tripPlayback(id);
});

final alertsProvider = FutureProvider.autoDispose<AlertListResult>((ref) {
  return ref.watch(customerApiProvider).alerts();
});

final distanceReportProvider = FutureProvider.autoDispose<DistanceReportResult>((ref) {
  return ref.watch(customerApiProvider).distanceReport();
});