import '../../../core/utils/json_helpers.dart';

class Vehicle {
  Vehicle({
    required this.id,
    required this.name,
    required this.plateNumber,
    this.brand,
    this.model,
    this.motionStatus,
    this.status,
    this.speedLimitKmh,
    this.deviceId,
    this.color,
    this.year,
  });

  factory Vehicle.fromJson(Map<String, dynamic> json) {
    return Vehicle(
      id: stringId(json['_id'] ?? json['id']),
      name: json['name'] as String? ?? '',
      plateNumber: json['plateNumber'] as String? ?? '',
      brand: json['brand'] as String?,
      model: json['model'] as String?,
      motionStatus: json['motionStatus'] as String?,
      status: json['status'] as String?,
      speedLimitKmh: toDouble(json['speedLimitKmh']),
      deviceId: stringOrNull(json['deviceId']),
      color: json['color'] as String?,
      year: json['year'] as int?,
    );
  }

  final String id;
  final String name;
  final String plateNumber;
  final String? brand;
  final String? model;
  final String? motionStatus;
  final String? status;
  final double? speedLimitKmh;
  final String? deviceId;
  final String? color;
  final int? year;
}

class VehicleListResult {
  VehicleListResult({required this.items, required this.total});

  factory VehicleListResult.fromJson(Map<String, dynamic> json) {
    final list = (json['items'] as List<dynamic>? ?? [])
        .map((e) => Vehicle.fromJson(e as Map<String, dynamic>))
        .toList();
    return VehicleListResult(items: list, total: json['total'] as int? ?? list.length);
  }

  final List<Vehicle> items;
  final int total;
}