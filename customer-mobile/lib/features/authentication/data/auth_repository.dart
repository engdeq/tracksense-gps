import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_response.dart';
import '../../../core/api/dio_client.dart';
import '../../../core/errors/app_exception.dart';
import 'auth_models.dart';

class AuthRepository {
  AuthRepository(this._dio, this._dioClient);

  final Dio _dio;
  final DioClient _dioClient;

  Future<LoginResult> login(String username, String password) async {
    try {
      final response = await _dio.post('/auth/login', data: {
        'username': username,
        'password': password,
      });
      final parsed = ApiResponse.fromJson(
        response.data as Map<String, dynamic>,
        (d) => LoginResult.fromJson(d as Map<String, dynamic>),
      );
      return parsed.data!;
    } on DioException catch (e) {
      throw _dioClient.mapError(e);
    }
  }

  Future<LoginResult> refresh(String refreshToken) async {
    try {
      final response = await _dio.post('/auth/refresh', data: {'refreshToken': refreshToken});
      final data = response.data['data'] as Map<String, dynamic>;
      final accessToken = data['accessToken'] as String;
      final newRefresh = data['refreshToken'] as String? ?? refreshToken;
      final userJson = data['user'] as Map<String, dynamic>?;
      final user = userJson != null
          ? AuthUser.fromJson(userJson)
          : (await me());
      return LoginResult(user: user, accessToken: accessToken, refreshToken: newRefresh);
    } on DioException catch (e) {
      throw _dioClient.mapError(e);
    }
  }

  Future<void> logout(String? refreshToken) async {
    try {
      await _dio.post('/auth/logout', data: {
        if (refreshToken != null) 'refreshToken': refreshToken,
      });
    } on DioException catch (_) {}
  }

  Future<AuthUser> me() async {
    try {
      final response = await _dio.get('/auth/me');
      final parsed = ApiResponse.fromJson(
        response.data as Map<String, dynamic>,
        (d) => AuthUser.fromJson(d as Map<String, dynamic>),
      );
      if (parsed.data == null) throw AppException('Unable to load profile');
      return parsed.data!;
    } on DioException catch (e) {
      throw _dioClient.mapError(e);
    }
  }

  Future<String> forgotPassword(String email) async {
    try {
      final response = await _dio.post('/auth/forgot-password', data: {'email': email});
      return response.data['message'] as String? ?? 'Check your email';
    } on DioException catch (e) {
      throw _dioClient.mapError(e);
    }
  }

  Future<String> resetPassword(String token, String password) async {
    try {
      final response = await _dio.post('/auth/reset-password', data: {
        'token': token,
        'password': password,
      });
      return response.data['message'] as String? ?? 'Password updated';
    } on DioException catch (e) {
      throw _dioClient.mapError(e);
    }
  }
}

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  final dioClient = ref.watch(dioClientProvider);
  return AuthRepository(dioClient.dio, dioClient);
});