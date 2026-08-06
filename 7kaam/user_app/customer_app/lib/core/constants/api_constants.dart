class ApiConstants {
  static const String baseUrl = 'http://localhost:8000/api/v1';

  // Auth Endpoints
  static const String customerRegister = '/mobile/customers/register';
  static const String customerLogin = '/auth/customer/login';

  // Worker & Discovery Endpoints
  static const String nearbyWorkers = '/mobile/workers/nearby';
  static String workerPublic(String id) => '/mobile/workers/$id/public';
  static String verifyQrToken(String token) => '/verify/$token';

  // Booking Endpoints
  static const String bookings = '/mobile/bookings';
  static String bookingDetail(String id) => '/mobile/bookings/$id';
  static String customerBookings(String customerId) => '/mobile/customers/$customerId/bookings';
}
