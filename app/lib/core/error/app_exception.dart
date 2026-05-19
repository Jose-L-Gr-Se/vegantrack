/// Typed exceptions used throughout the app.
/// Keeps error handling explicit and avoids stringly-typed error messages.
sealed class AppException implements Exception {
  const AppException(this.message);
  final String message;

  @override
  String toString() => message;
}

final class NetworkException extends AppException {
  const NetworkException([super.message = 'Sin conexión. Comprueba tu red.']);
}

final class TimeoutException extends AppException {
  const TimeoutException([super.message = 'La petición tardó demasiado.']);
}

final class NotFoundExceptionApp extends AppException {
  const NotFoundExceptionApp([super.message = 'Producto no encontrado.']);
}

final class AuthException extends AppException {
  const AuthException([super.message = 'Error de autenticación.']);
}

final class PermissionException extends AppException {
  const PermissionException([super.message = 'Permiso de cámara denegado.']);
}

final class ServerException extends AppException {
  const ServerException([super.message = 'Error del servidor.']);
  const ServerException.withCode(int code)
      : super('Error del servidor ($code).');
}

final class UnknownException extends AppException {
  const UnknownException([super.message = 'Error inesperado.']);
}
