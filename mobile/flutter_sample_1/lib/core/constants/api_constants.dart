import 'package:flutter/foundation.dart';

class ApiConstants {
  static String get baseUrl {
    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:8000/api/v1';
    }
    return 'http://localhost:8000/api/v1';
  }

  // Auth endpoints
  static const String registerWorker = '/auth/worker/register';
  static const String loginWorker = '/auth/worker/login';
  static const String refreshToken = '/auth/refresh';

  // Worker Profile
  static String workerProfile(String id) => '/workers/$id';

  // Scoring Pipeline
  static String uploadVideo(String id) => '/workers/$id/upload-video';
  static String submitTest(String id) => '/workers/$id/submit-test';
  static String addWorkHistory(String id) => '/workers/$id/add-work-history';

  // Trade Tests
  static const String tradeTests = '/tests';
  static String testById(String id) => '/tests/$id';

  // KaamCard & Public Verification
  static String kaamCard(String workerId) => '/kaamcards/$workerId';
  static String kaamCardHistory(String workerId) => '/workers/$workerId/kaamcard/history';
  static String verifyQr(String qrToken) => '/verify/$qrToken';
}
