import '../../../core/utils/json_helpers.dart';
import '../../vehicles/data/vehicle_models.dart';

class GpsPosition {
  GpsPosition({
    this.latitude,
    this.longitude,
    this.speedKmh,
    this.heading,
    this.recordedAt,
    this.address,
    this.ignition,
  });

  factory GpsPosition.fromJson(Map<String, dynamic> json) {
    return GpsPosition(
      latitude: toDouble(json['latitude']),
      longitude: toDouble(json['longitude']),
      speedKmh: toDouble(json['speedKmh']),
      heading: toDouble(json['heading']),
      recordedAt: parseDate(json['recordedAt']),
      address: json['address'] as String?,
      ignition: json['ignition'] as bool?,
    );
  }

  final double? latitude;
  final double? longitude;
  final double? speedKmh;
  final double? heading;
  final DateTime? recordedAt;
  final String? address;
  final bool? ignition;
}

class GpsPositionItem {
  GpsPositionItem({this.vehicle, this.position});

  factory GpsPositionItem.fromJson(Map<String, dynamic> json) {
    return GpsPositionItem(
      vehicle: json['vehicle'] != null
          ? Vehicle.fromJson(json['vehicle'] as Map<String, dynamic>)
          : null,
      position: json['position'] != null
          ? GpsPosition.fromJson(json['position'] as Map<String, dynamic>)
          : null,
    );
  }

  final Vehicle? vehicle;
  final GpsPosition? position;
}