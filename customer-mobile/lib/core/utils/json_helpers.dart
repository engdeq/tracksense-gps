String? stringOrNull(dynamic value) {
  if (value == null) return null;
  if (value is String) return value;
  if (value is Map && value.containsKey('_id')) return value['_id']?.toString();
  return value.toString();
}

String stringId(dynamic value, {String fallback = ''}) {
  if (value == null) return fallback;
  if (value is String) return value;
  if (value is Map) return value['_id']?.toString() ?? value['id']?.toString() ?? fallback;
  return value.toString();
}

double? toDouble(dynamic value) {
  if (value == null) return null;
  if (value is num) return value.toDouble();
  return double.tryParse(value.toString());
}

DateTime? parseDate(dynamic value) {
  if (value == null) return null;
  if (value is DateTime) return value;
  return DateTime.tryParse(value.toString());
}

Map<String, dynamic>? asMap(dynamic value) {
  if (value is Map<String, dynamic>) return value;
  if (value is Map) return Map<String, dynamic>.from(value);
  return null;
}