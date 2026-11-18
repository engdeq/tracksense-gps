import '../../../core/utils/json_helpers.dart';
import '../../live_tracking/data/gps_models.dart';
import '../../vehicles/data/vehicle_models.dart';

class Trip {
  Trip({
    required this.id,
    required this.startTime,
    this.endTime,
    this.distanceKm,
    this.durationSec,
    this.avgSpeedKmh,
    this.maxSpeedKmh,
    this.status,
    this.vehicleId,
    this.vehicleName,
    this.vehiclePlate,
  });

  factory Trip.fromJson(Map<String, dynamic> json) {
    final vehicle = asMap(json['vehicleId']);
    return Trip(
      id: stringId(json['_id'] ?? json['id']),
      startTime: parseDate(json['startTime'])!,
      endTime: parseDate(json['endTime']),
      distanceKm: toDouble(json['distanceKm']),
      durationSec: json['durationSec'] as int?,
      avgSpeedKmh: toDouble(json['avgSpeedKmh']),
      maxSpeedKmh: toDouble(json['maxSpeedKmh']),
      status: json['status'] as String?,
      vehicleId: vehicle != null ? stringId(vehicle) : stringOrNull(json['vehicleId']),
      vehicleName: vehicle?['name'] as String?,
      vehiclePlate: vehicle?['plateNumber'] as String?,
    );
  }

  final String id;
  final DateTime startTime;
  final DateTime? endTime;
  final double? distanceKm;
  final int? durationSec;
  final double? avgSpeedKmh;
  final double? maxSpeedKmh;
  final String? status;
  final String? vehicleId;
  final String? vehicleName;
  final String? vehiclePlate;
}

class TripListResult {
  TripListResult({required this.items, required this.total});

  factory TripListResult.fromJson(Map<String, dynamic> json) {
    final items = (json['items'] as List<dynamic>? ?? [])
        .map((e) => Trip.fromJson(e as Map<String, dynamic>))
        .toList();
    return TripListResult(items: items, total: json['total'] as int? ?? items.length);
  }

  final List<Trip> items;
  final int total;
}

class TripDetailResult {
  TripDetailResult({required this.trip, required this.route});

  factory TripDetailResult.fromJson(Map<String, dynamic> json) {
    final route = (json['route'] as List<dynamic>? ?? [])
        .map((e) => GpsPosition.fromJson(e as Map<String, dynamic>))
        .toList();
    return TripDetailResult(
      trip: Trip.fromJson(json['trip'] as Map<String, dynamic>),
      route: route,
    );
  }

  final Trip trip;
  final List<GpsPosition> route;
}

class TripPlaybackResult {
  TripPlaybackResult({
    required this.trip,
    required this.points,
    this.vehicle,
    this.durationSec,
    this.distanceKm,
  });

  factory TripPlaybackResult.fromJson(Map<String, dynamic> json) {
    final points = (json['points'] as List<dynamic>? ?? [])
        .map((e) => GpsPosition.fromJson(e as Map<String, dynamic>))
        .toList();
    return TripPlaybackResult(
      trip: Trip.fromJson(json['trip'] as Map<String, dynamic>),
      points: points,
      vehicle: json['vehicle'] != null
          ? Vehicle.fromJson(json['vehicle'] as Map<String, dynamic>)
          : null,
      durationSec: json['durationSec'] as int?,
      distanceKm: toDouble(json['distanceKm']),
    );
  }

  final Trip trip;
  final List<GpsPosition> points;
  final Vehicle? vehicle;
  final int? durationSec;
  final double? distanceKm;
}