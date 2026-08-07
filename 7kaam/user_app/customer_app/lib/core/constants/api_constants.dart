class ApiConstants {
  static const String baseUrl = 'http://localhost:8000/api/v1';

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
