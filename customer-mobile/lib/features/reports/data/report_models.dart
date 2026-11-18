import '../../../core/utils/json_helpers.dart';

class DistanceReportRow {
  DistanceReportRow({this.vehicleName, this.plate, this.totalDistanceKm, this.tripCount});

  factory DistanceReportRow.fromJson(Map<String, dynamic> json) {
    final vehicle = asMap(json['vehicle']);
    return DistanceReportRow(
      vehicleName: vehicle?['name'] as String?,
      plate: vehicle?['plateNumber'] as String?,
      totalDistanceKm: toDouble(json['totalDistanceKm']),
      tripCount: json['tripCount'] as int?,
    );
  }

  final String? vehicleName;
  final String? plate;
  final double? totalDistanceKm;
  final int? tripCount;
}

class DistanceReportResult {
  DistanceReportResult({required this.items, this.from, this.to});

  factory DistanceReportResult.fromJson(Map<String, dynamic> json) {
    return DistanceReportResult(
      items: (json['items'] as List<dynamic>? ?? [])
          .map((e) => DistanceReportRow.fromJson(e as Map<String, dynamic>))
          .toList(),
      from: parseDate(json['from']),
      to: parseDate(json['to']),
    );
  }

  final List<DistanceReportRow> items;
  final DateTime? from;
  final DateTime? to;
}

class TripReportResult {
  TripReportResult({required this.items});

  factory TripReportResult.fromJson(Map<String, dynamic> json) {
    return TripReportResult(items: json['items'] as List<dynamic>? ?? []);
  }

  final List<dynamic> items;
}

class SpeedReportResult {
  SpeedReportResult({required this.items});

  factory SpeedReportResult.fromJson(Map<String, dynamic> json) {
    return SpeedReportResult(items: json['items'] as List<dynamic>? ?? []);
  }

  final List<dynamic> items;
}

class VehicleSummaryReportResult {
  VehicleSummaryReportResult({required this.items});

  factory VehicleSummaryReportResult.fromJson(Map<String, dynamic> json) {
    return VehicleSummaryReportResult(items: json['items'] as List<dynamic>? ?? []);
  }

  final List<dynamic> items;
}