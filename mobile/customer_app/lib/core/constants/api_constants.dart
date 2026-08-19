import 'package:flutter/foundation.dart';

class ApiConstants {
  // ── Real device testing ─────────────────────────────────────────────────────
  // When running on a physical Android/iOS device, change this to your
  // machine's local IP address (run `ipconfig` on Windows to find it).
  // Example: static const String _deviceIp = '192.168.1.42';
  static const String _deviceIp = ''; // leave empty to use emulator defaults

  static String get baseUrl {
    if (_deviceIp.isNotEmpty) {
      return 'http://$_deviceIp:8000/api/v1';
    }
    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
      // 10.0.2.2 maps to host machine's localhost inside the Android emulator
      return 'http://10.0.2.2:8000/api/v1';
    }
    return 'http://localhost:8000/api/v1';
  }

  // Auth Endpoints
  static const String customerRegister = '/auth/customer/register';
  static const String customerLogin = '/auth/customer/login';
  static const String refreshToken = '/auth/refresh';

  // Worker & Discovery Endpoints
  static const String publicWorkers = '/public/workers';
  static String publicWorkerDetail(String id) => '/public/workers/$id';
  static String verifyQrToken(String token) => '/verify/$token';

  // Customer profile
  static String customerDetail(String id) => '/customers/$id';

  // Moderation
  static const String reports = '/reports';
}

