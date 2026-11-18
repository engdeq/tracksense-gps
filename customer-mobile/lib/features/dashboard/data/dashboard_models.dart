import '../../../core/utils/json_helpers.dart';
import '../../trips/data/trip_models.dart';
import '../../vehicles/data/vehicle_models.dart';

class CustomerDashboard {
  CustomerDashboard({
    required this.totalVehicles,
    required this.totalDevices,
    required this.onlineVehicles,
    required this.offlineVehicles,
    required this.movingVehicles,
    required this.stoppedVehicles,
    required this.todaysTrips,
    required this.distanceTodayKm,
    required this.vehicles,
    required this.recentTrips,
    required this.recentAlerts,
  });

  factory CustomerDashboard.fromJson(Map<String, dynamic> json) {
    return CustomerDashboard(
      totalVehicles: json['totalVehicles'] as int? ?? 0,
      totalDevices: json['totalDevices'] as int? ?? 0,
      onlineVehicles: json['onlineVehicles'] as int? ?? 0,
      offlineVehicles: json['offlineVehicles'] as int? ?? 0,
      movingVehicles: json['movingVehicles'] as int? ?? 0,
      stoppedVehicles: json['stoppedVehicles'] as int? ?? 0,
      todaysTrips: json['todaysTrips'] as int? ?? 0,
      distanceTodayKm: toDouble(json['distanceTodayKm']) ?? 0,
      vehicles: (json['vehicles'] as List<dynamic>? ?? [])
          .map((e) => Vehicle.fromJson(e as Map<String, dynamic>))
          .toList(),
      recentTrips: (json['recentTrips'] as List<dynamic>? ?? [])
          .map((e) => Trip.fromJson(e as Map<String, dynamic>))
          .toList(),
      recentAlerts: json['recentAlerts'] as List<dynamic>? ?? [],
    );
  }

  final int totalVehicles;
  final int totalDevices;
  final int onlineVehicles;
  final int offlineVehicles;
  final int movingVehicles;
  final int stoppedVehicles;
  final int todaysTrips;
  final double distanceTodayKm;
  final List<Vehicle> vehicles;
  final List<Trip> recentTrips;
  final List<dynamic> recentAlerts;
}