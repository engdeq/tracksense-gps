import 'package:dio/dio.dart';

import '../../../core/api/dio_client.dart';
import '../../../core/errors/app_exception.dart';
import '../../authentication/data/auth_models.dart';

class ProfileRepository {
  ProfileRepository(this._dioClient);

  final DioClient _dioClient;
  Dio get _dio => _dioClient.dio;

  Future<AuthUser> updateProfile({
    String? fullName,
    String? phone,
    String? email,
  }) async {
    try {
      final response = await _dio.put('/profile', data: {
        if (fullName != null) 'fullName': fullName,
        if (phone != null) 'phone': phone,
        if (email != null) 'email': email,
      });
      final body = response.data as Map<String, dynamic>;
      final data = body['data'];
      if (data is Map<String, dynamic>) {
        return AuthUser.fromJson({
          ...data,
          'id': data['_id'] ?? data['id'],
          'role': data['roleKey'] ?? data['role'],
        });
      }
      throw AppException('Invalid profile response');
    } on DioException catch (e) {
      throw _dioClient.mapError(e);
    }
  }

  Future<String> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    try {
      final response = await _dio.post('/profile/change-password', data: {
        'currentPassword': currentPassword,
        'newPassword': newPassword,
      });
      return response.data['message'] as String? ?? 'Password updated';
    } on DioException catch (e) {
      throw _dioClient.mapError(e);
    }
  }
}