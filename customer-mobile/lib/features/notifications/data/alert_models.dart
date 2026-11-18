import '../../../core/utils/json_helpers.dart';

class AlertItem {
  AlertItem({
    required this.id,
    required this.title,
    this.message,
    this.type,
    this.isRead = false,
    this.createdAt,
    this.vehicleName,
  });

  factory AlertItem.fromJson(Map<String, dynamic> json) {
    final vehicle = asMap(json['vehicleId']);
    return AlertItem(
      id: stringId(json['_id'] ?? json['id']),
      title: json['title'] as String? ?? json['type'] as String? ?? 'Alert',
      message: json['message'] as String? ?? json['description'] as String?,
      type: json['type'] as String?,
      isRead: json['isRead'] as bool? ?? false,
      createdAt: parseDate(json['createdAt']),
      vehicleName: vehicle?['name'] as String?,
    );
  }

  final String id;
  final String title;
  final String? message;
  final String? type;
  final bool isRead;
  final DateTime? createdAt;
  final String? vehicleName;
}

class AlertListResult {
  AlertListResult({required this.items, required this.total, required this.unread});

  factory AlertListResult.fromJson(Map<String, dynamic> json) {
    final items = (json['items'] as List<dynamic>? ?? [])
        .map((e) => AlertItem.fromJson(e as Map<String, dynamic>))
        .toList();
    return AlertListResult(
      items: items,
      total: json['total'] as int? ?? items.length,
      unread: json['unread'] as int? ?? 0,
    );
  }

  final List<AlertItem> items;
  final int total;
  final int unread;
}