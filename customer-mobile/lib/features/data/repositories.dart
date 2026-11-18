import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_response.dart';
import '../../core/api/dio_client.dart';
import '../dashboard/data/dashboard_models.dart';
import '../devices/data/device_models.dart';
import '../live_tracking/data/gps_models.dart';
import '../notifications/data/alert_models.dart';
import '../profile/data/profile_repository.dart';
import '../reports/data/report_models.dart';
import '../trips/data/trip_models.dart';
import '../vehicles/data/vehicle_models.dart';

class CustomerApi {
  CustomerApi(this._dio, this._dioClient);

  final Dio _dio;
  final DioClient _dioClient;

  Future<T> _get<T>(
    String path, {
    Map<String, dynamic>? query,
    required T Function(dynamic) parse,
  }) async {
    try {
      final response = await _dio.get(path, queryParameters: query);
      final parsed = ApiResponse.fromJson(
        response.data as Map<String, dynamic>,
        parse,
      );
      return parsed.data as T;
    } on DioException catch (e) {
      throw _dioClient.mapError(e);
    }
  }

  Future<CustomerDashboard> dashboard() =>
      _get('/dashboard/customer', parse: (d) => CustomerDashboard.fromJson(d as Map<String, dynamic>));

  Future<VehicleListResult> vehicles({String? q, int page = 1}) => _get(
        '/vehicles',
        query: {if (q != null && q.isNotEmpty) 'q': q, 'page': page, 'limit': 50},
        parse: (d) => VehicleListResult.fromJson(d as Map<String, dynamic>),
      );

  Future<Vehicle> vehicle(String id) => _get(
        '/vehicles/$id',
        parse: (d) => Vehicle.fromJson(d as Map<String, dynamic>),
      );

  Future<DeviceListResult> devices({String? q, int page = 1}) => _get(
        '/devices',
        query: {if (q != null && q.isNotEmpty) 'q': q, 'page': page, 'limit': 50},
        parse: (d) => DeviceListResult.fromJson(d as Map<String, dynamic>),
      );

  Future<Device> device(String id) => _get(
        '/devices/$id',
        parse: (d) => Device.fromJson(d as Map<String, dynamic>),
      );

  Future<List<GpsPositionItem>> gpsPositions({String? q}) async {
    final data = await _get<Map<String, dynamic>>(
      '/gps/positions',
      query: {if (q != null && q.isNotEmpty) 'q': q},
      parse: (d) => d as Map<String, dynamic>,
    );
    return (data['items'] as List<dynamic>? ?? [])
        .map((e) => GpsPositionItem.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<TripListResult> trips({int page = 1, String? vehicleId}) => _get(
        '/trips',
        query: {
          'page': page,
          'limit': 30,
          if (vehicleId != null) 'vehicleId': vehicleId,
        },
        parse: (d) => TripListResult.fromJson(d as Map<String, dynamic>),
      );

  Future<TripDetailResult> trip(String id) => _get(
        '/trips/$id',
        parse: (d) => TripDetailResult.fromJson(d as Map<String, dynamic>),
      );

  Future<TripPlaybackResult> tripPlayback(String id) => _get(
        '/trips/$id/playback',
        parse: (d) => TripPlaybackResult.fromJson(d as Map<String, dynamic>),
      );

  Future<AlertListResult> alerts({int page = 1, bool? unreadOnly}) => _get(
        '/alerts',
        query: {
          'page': page,
          'limit': 30,
          if (unreadOnly == true) 'isRead': 'false',
        },
        parse: (d) => AlertListResult.fromJson(d as Map<String, dynamic>),
      );

  Future<AlertItem> alert(String id) => _get(
        '/alerts/$id',
        parse: (d) => AlertItem.fromJson(d as Map<String, dynamic>),
      );

  Future<void> markAlertRead(String id) async {
    try {
      await _dio.patch('/alerts/$id/read');
    } on DioException catch (e) {
      throw _dioClient.mapError(e);
    }
  }

  Future<void> markAllAlertsRead() async {
    try {
      await _dio.post('/alerts/read-all');
    } on DioException catch (e) {
      throw _dioClient.mapError(e);
    }
  }

  Future<DistanceReportResult> distanceReport({DateTime? from, DateTime? to}) => _get(
        '/reports/distance',
        query: {
          if (from != null) 'from': from.toIso8601String(),
          if (to != null) 'to': to.toIso8601String(),
        },
        parse: (d) => DistanceReportResult.fromJson(d as Map<String, dynamic>),
      );

  Future<TripReportResult> tripReport({DateTime? from, DateTime? to}) => _get(
        '/reports/trips',
        query: {
          if (from != null) 'from': from.toIso8601String(),
          if (to != null) 'to': to.toIso8601String(),
        },
        parse: (d) => TripReportResult.fromJson(d as Map<String, dynamic>),
      );

  Future<SpeedReportResult> speedReport({DateTime? from, DateTime? to}) => _get(
        '/reports/speed',
        query: {
          if (from != null) 'from': from.toIso8601String(),
          if (to != null) 'to': to.toIso8601String(),
        },
        parse: (d) => SpeedReportResult.fromJson(d as Map<String, dynamic>),
      );

  Future<VehicleSummaryReportResult> vehicleSummaryReport({DateTime? from, DateTime? to}) =>
      _get(
        '/reports/vehicles',
        query: {
          if (from != null) 'from': from.toIso8601String(),
          if (to != null) 'to': to.toIso8601String(),
        },
        parse: (d) => VehicleSummaryReportResult.fromJson(d as Map<String, dynamic>),
      );
}

final customerApiProvider = Provider<CustomerApi>((ref) {
  final dioClient = ref.watch(dioClientProvider);
  return CustomerApi(dioClient.dio, dioClient);
});

final profileRepositoryProvider = Provider<ProfileRepository>((ref) {
  return ProfileRepository(ref.watch(dioClientProvider));
});