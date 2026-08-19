import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStorageService {
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  static const String _keyToken = 'auth_token';
  static const String _keyRefreshToken = 'refresh_token';
  static const String _keyCustomerId = 'customer_id';
  static const String _keyCustomerName = 'customer_name';
  static const String _keyCustomerPhone = 'customer_phone';
  static const String _keyCustomerCity = 'customer_city';
  static const String _keyOnboardingDone = 'onboarding_done';

  // Tokens
  Future<void> saveToken(String token) async {
    await _storage.write(key: _keyToken, value: token);
  }

  Future<String?> getToken() async {
    return await _storage.read(key: _keyToken);
  }

  Future<void> saveRefreshToken(String token) async {
    await _storage.write(key: _keyRefreshToken, value: token);
  }

  Future<String?> getRefreshToken() async {
    return await _storage.read(key: _keyRefreshToken);
  }

  // Customer Data
  Future<void> saveCustomerData({
    required String id,
    required String name,
    required String phone,
    required String city,
  }) async {
    await _storage.write(key: _keyCustomerId, value: id);
    await _storage.write(key: _keyCustomerName, value: name);
    await _storage.write(key: _keyCustomerPhone, value: phone);
    await _storage.write(key: _keyCustomerCity, value: city);
  }

  Future<String?> getCustomerId() async {
    return await _storage.read(key: _keyCustomerId);
  }

  Future<String?> getCustomerName() async {
    return await _storage.read(key: _keyCustomerName);
  }

  Future<String?> getCustomerPhone() async {
    return await _storage.read(key: _keyCustomerPhone);
  }

  Future<String?> getCustomerCity() async {
    return await _storage.read(key: _keyCustomerCity);
  }

  // Onboarding Status
  Future<void> setOnboardingComplete() async {
    await _storage.write(key: _keyOnboardingDone, value: 'true');
  }

  Future<bool> isOnboardingComplete() async {
    final val = await _storage.read(key: _keyOnboardingDone);
    return val == 'true';
  }

  // Clear session
  Future<void> clearAll() async {
    await _storage.deleteAll();
  }
}
