import '../../../core/utils/json_helpers.dart';

class Device {
  Device({
    required this.id,
    required this.name,
    required this.imei,
    this.connectionStatus,
    this.lastCommunicationAt,
    this.status,
    this.simNumber,
  });

  factory Device.fromJson(Map<String, dynamic> json) {
    return Device(
      id: stringId(json['_id'] ?? json['id']),
      name: json['name'] as String? ?? json['imei'] as String? ?? 'Device',
      imei: json['imei'] as String? ?? '',
      connectionStatus: json['connectionStatus'] as String?,
      lastCommunicationAt: parseDate(json['lastCommunicationAt']),
      status: json['status'] as String?,
      simNumber: json['simNumber'] as String?,
    );
  }

  final String id;
  final String name;
  final String imei;
  final String? connectionStatus;
  final DateTime? lastCommunicationAt;
  final String? status;
  final String? simNumber;
}

class DeviceListResult {
  DeviceListResult({required this.items, required this.total});

  factory DeviceListResult.fromJson(Map<String, dynamic> json) {
    final list = (json['items'] as List<dynamic>? ?? [])
        .map((e) => Device.fromJson(e as Map<String, dynamic>))
        .toList();
    return DeviceListResult(items: list, total: json['total'] as int? ?? list.length);
  }

  final List<Device> items;
  final int total;
}