import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStorage {
  static final SecureStorage instance = SecureStorage._internal();
  factory SecureStorage() => instance;
  SecureStorage._internal();

  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  static const String _keyJwtToken = 'jwt_token';
  static const String _keyRefreshToken = 'refresh_token';
  static const String _keyWorkerId = 'worker_id';

  Future<void> saveTokens({required String jwtToken, String? refreshToken}) async {
    await _storage.write(key: _keyJwtToken, value: jwtToken);
    if (refreshToken != null) {
      await _storage.write(key: _keyRefreshToken, value: refreshToken);
    }
  }

  Future<String?> getJwtToken() async {
    return await _storage.read(key: _keyJwtToken);
  }

  Future<String?> getRefreshToken() async {
    return await _storage.read(key: _keyRefreshToken);
  }

  Future<void> saveWorkerId(String workerId) async {
    await _storage.write(key: _keyWorkerId, value: workerId);
  }

  Future<String?> getWorkerId() async {
    return await _storage.read(key: _keyWorkerId);
  }

  Future<void> clearAll() async {
    await _storage.deleteAll();
  }
}
