import 'package:flutter/foundation.dart';

class ApiConstants {
  static String get baseUrl {
    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:8000/api/v1';
    }
    return 'http://localhost:8000/api/v1';
  }

  // Auth endpoints
  static const String registerWorker = '/workers/register';
  static const String loginWorker = '/auth/worker/login';
  static const String refreshToken = '/auth/refresh';

  // Worker Profile
  static String workerProfile(String id) => '/workers/$id';

  // Scoring Pipeline
  static String uploadVideo(String id) => '/workers/$id/upload-video';
  static String scoreVideo(String id) => '/workers/$id/score-video';
  static String submitTest(String id) => '/workers/$id/submit-test';
  static String addWorkHistory(String id) => '/workers/$id/add-work-history';
  static String computeScore(String id) => '/workers/$id/compute-score';
  static String issueKaamCard(String id) => '/workers/$id/issue-kaamcard';

  // Trade Tests
  static const String tradeTests = '/tests';

  // KaamCard & Public Verification
  static String kaamCard(String workerId) => '/kaamcards/$workerId';
  static String verifyQr(String qrToken) => '/verify/$qrToken';
}
