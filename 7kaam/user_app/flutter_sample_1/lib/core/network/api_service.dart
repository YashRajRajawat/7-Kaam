import 'package:dio/dio.dart';
import '../constants/api_constants.dart';
import 'dio_client.dart';

class ApiService {
  final Dio _dio = DioClient().dio;

  // Auth: Register
  Future<Response> registerWorker(Map<String, dynamic> data) async {
    return await _dio.post(ApiConstants.registerWorker, data: data);
  }

  // Auth: Login
  Future<Response> loginWorker(String phone, String otp) async {
    return await _dio.post(ApiConstants.loginWorker, data: {
      'phone': phone,
      'otp': otp,
    });
  }

  // Auth: Refresh Token
  Future<Response> refreshToken(String refreshToken) async {
    return await _dio.post(ApiConstants.refreshToken, data: {
      'refreshToken': refreshToken,
    });
  }

  // Profile: Get
  Future<Response> getWorkerProfile(String workerId) async {
    return await _dio.get(ApiConstants.workerProfile(workerId));
  }

  // Profile: Update
  Future<Response> updateWorkerProfile(String workerId, Map<String, dynamic> data) async {
    return await _dio.patch(ApiConstants.workerProfile(workerId), data: data);
  }

  // Scoring: Video Presigned URL & Upload
  Future<Response> getUploadVideoPresignedUrl(String workerId, String fileName) async {
    return await _dio.post(ApiConstants.uploadVideo(workerId), data: {
      'fileName': fileName,
    });
  }

  // Direct upload to presigned URL (S3 / Supabase)
  Future<Response> uploadVideoToUrl(String presignedUrl, List<int> bytes, String contentType) async {
    return await Dio().put(
      presignedUrl,
      data: Stream.fromIterable([bytes]),
      options: Options(
        headers: {
          'Content-Type': contentType,
          'Content-Length': bytes.length,
        },
      ),
    );
  }

  // Scoring: Trigger Video Scoring
  Future<Response> scoreVideo(String workerId, String videoUrl) async {
    return await _dio.post(ApiConstants.scoreVideo(workerId), data: {
      'videoUrl': videoUrl,
    });
  }

  // Scoring: Submit Trade Test Answers
  Future<Response> submitTradeTest(String workerId, Map<String, dynamic> payload) async {
    return await _dio.post(ApiConstants.submitTest(workerId), data: payload);
  }

  // Scoring: Add Employer / Work History Entry
  Future<Response> addWorkHistory(String workerId, Map<String, dynamic> payload) async {
    return await _dio.post(ApiConstants.addWorkHistory(workerId), data: payload);
  }

  // Scoring: Compute Final Score
  Future<Response> computeScore(String workerId) async {
    return await _dio.post(ApiConstants.computeScore(workerId));
  }

  // Scoring: Issue KaamCard
  Future<Response> issueKaamCard(String workerId) async {
    return await _dio.post(ApiConstants.issueKaamCard(workerId));
  }

  // Trade Tests: Get available tests
  Future<Response> getTradeTests({required String trade, required String language}) async {
    return await _dio.get(
      ApiConstants.tradeTests,
      queryParameters: {
        'trade': trade,
        'language': language,
      },
    );
  }

  // KaamCard: Get worker's card
  Future<Response> getKaamCard(String workerId) async {
    return await _dio.get(ApiConstants.kaamCard(workerId));
  }

  // KaamCard: Public QR Verification
  Future<Response> verifyQrToken(String qrToken) async {
    return await _dio.get(ApiConstants.verifyQr(qrToken));
  }

  // Skill Certificates
  Future<Response> getWorkerCertificates(String workerId) async {
    return await _dio.get('/workers/$workerId/certificates');
  }

  Future<Response> getCertificateDetail(String certId) async {
    return await _dio.get('/certificates/$certId');
  }

  // Catalogue
  Future<Response> getTestCatalogue({
    required String trade,
    String? category,
    String? difficulty,
    String? language,
    String? search,
    String? workerId,
  }) async {
    final queryParams = <String, dynamic>{'trade': trade};
    if (category != null) queryParams['category'] = category;
    if (difficulty != null) queryParams['difficulty'] = difficulty;
    if (language != null) queryParams['language'] = language;
    if (search != null) queryParams['search'] = search;
    if (workerId != null) queryParams['workerId'] = workerId;

    return await _dio.get('/tests/catalogue', queryParameters: queryParams);
  }
}
