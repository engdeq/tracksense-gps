import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../app/config/env.dart';
import '../errors/app_exception.dart';
import '../storage/token_storage.dart';

class DioClient {
  DioClient({
    required this.dio,
    required this.tokenStorage,
    required this.onSessionExpired,
  }) {
    dio.options = BaseOptions(
      baseUrl: AppEnv.apiBaseUrl,
      connectTimeout: const Duration(seconds: 20),
      receiveTimeout: const Duration(seconds: 30),
      headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
    );

    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await tokenStorage.getAccessToken();
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
        onError: (error, handler) async {
          final status = error.response?.statusCode;
          if (status == 401 && error.requestOptions.extra['retried'] != true) {
            final refreshed = await _tryRefresh();
            if (refreshed) {
              final token = await tokenStorage.getAccessToken();
              final opts = error.requestOptions;
              opts.headers['Authorization'] = 'Bearer $token';
              opts.extra['retried'] = true;
              try {
                final response = await dio.fetch(opts);
                return handler.resolve(response);
              } catch (e) {
                return handler.next(error);
              }
            }
            await tokenStorage.clear();
            onSessionExpired();
            return handler.reject(error);
          }
          handler.next(error);
        },
      ),
    );
  }

  final Dio dio;
  final TokenStorage tokenStorage;
  final void Function() onSessionExpired;

  Future<bool> _tryRefresh() async {
    final refreshToken = await tokenStorage.getRefreshToken();
    if (refreshToken == null) return false;
  try {
      final bare = Dio(BaseOptions(baseUrl: AppEnv.apiBaseUrl));
      final response = await bare.post('/auth/refresh', data: {'refreshToken': refreshToken});
      final data = response.data;
      if (data is Map<String, dynamic> && data['success'] == true) {
        final payload = data['data'] as Map<String, dynamic>?;
        final access = payload?['accessToken'] as String?;
        final refresh = payload?['refreshToken'] as String? ?? refreshToken;
        if (access != null) {
          await tokenStorage.saveTokens(accessToken: access, refreshToken: refresh);
          return true;
        }
      }
    } catch (_) {}
    return false;
  }

  AppException mapError(DioException error) {
    if (error.type == DioExceptionType.connectionError ||
        error.type == DioExceptionType.connectionTimeout) {
      return NetworkException();
    }
    final data = error.response?.data;
    if (data is Map<String, dynamic>) {
      final message = data['message'] as String? ?? 'Request failed';
      return AppException(message, statusCode: error.response?.statusCode);
    }
    return AppException(error.message ?? 'Request failed', statusCode: error.response?.statusCode);
  }
}

final sessionExpiredProvider =
    NotifierProvider<SessionExpiredNotifier, bool>(SessionExpiredNotifier.new);

class SessionExpiredNotifier extends Notifier<bool> {
  @override
  bool build() => false;

  void markExpired() => state = true;

  void clear() => state = false;
}

final tokenStorageProvider = Provider<TokenStorage>((ref) {
  return TokenStorage(const FlutterSecureStorage());
});

final dioClientProvider = Provider<DioClient>((ref) {
  final tokenStorage = ref.watch(tokenStorageProvider);
  return DioClient(
    dio: Dio(),
    tokenStorage: tokenStorage,
    onSessionExpired: () => ref.read(sessionExpiredProvider.notifier).markExpired(),
  );
});

final dioProvider = Provider<Dio>((ref) => ref.watch(dioClientProvider).dio);