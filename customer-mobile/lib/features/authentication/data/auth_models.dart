import 'package:equatable/equatable.dart';

import '../../../core/utils/json_helpers.dart';

class AuthUser extends Equatable {
  const AuthUser({
    required this.id,
    required this.username,
    this.email,
    this.fullName,
    this.phone,
    this.avatarUrl,
    this.role,
  });

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    return AuthUser(
      id: stringId(json['id'] ?? json['_id']),
      username: json['username'] as String? ?? '',
      email: json['email'] as String?,
      fullName: json['fullName'] as String?,
      phone: json['phone'] as String?,
      avatarUrl: json['avatarUrl'] as String?,
      role: json['role'] as String?,
    );
  }

  final String id;
  final String username;
  final String? email;
  final String? fullName;
  final String? phone;
  final String? avatarUrl;
  final String? role;

  @override
  List<Object?> get props => [id, username, email, fullName, phone, avatarUrl, role];
}

class LoginResult {
  const LoginResult({
    required this.user,
    required this.accessToken,
    required this.refreshToken,
  });

  factory LoginResult.fromJson(Map<String, dynamic> json) {
    return LoginResult(
      user: AuthUser.fromJson(json['user'] as Map<String, dynamic>),
      accessToken: json['accessToken'] as String,
      refreshToken: json['refreshToken'] as String,
    );
  }

  final AuthUser user;
  final String accessToken;
  final String refreshToken;
}