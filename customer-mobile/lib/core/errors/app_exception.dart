class AppException implements Exception {
  AppException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

class NetworkException extends AppException {
  NetworkException([String message = 'No internet connection'])
      : super(message);
}

class UnauthorizedException extends AppException {
  UnauthorizedException([String message = 'Session expired'])
      : super(message, statusCode: 401);
}