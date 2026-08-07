import 'package:dio/dio.dart';
import '../constants/api_constants.dart';
import 'dio_client.dart';

class ApiService {
  final DioClient _dioClient;

  ApiService(this._dioClient);

  // Register Customer
  Future<Response> registerCustomer({
    required String fullName,
    required String phoneNumber,
    required String city,
  }) async {
    return await _dioClient.dio.post(
      ApiConstants.customerRegister,
      data: {
        'fullName': fullName,
        'phoneNumber': phoneNumber,
        'city': city,
      },
    );
  }

  // Login Customer
  Future<Response> loginCustomer({
    required String phoneNumber,
    required String otp,
  }) async {
    return await _dioClient.dio.post(
      ApiConstants.customerLogin,
      data: {
        'phoneNumber': phoneNumber,
        'otp': otp,
      },
    );
  }

  // Refresh access token
  Future<Response> refreshToken(String refreshToken) async {
    return await _dioClient.dio.post(
      ApiConstants.refreshToken,
      data: {'refreshToken': refreshToken},
    );
  }

  // Update own customer profile
  Future<Response> updateCustomerProfile(String customerId, Map<String, dynamic> data) async {
    return await _dioClient.dio.patch(ApiConstants.customerDetail(customerId), data: data);
  }

  // Discovery — real backend query params (see backend/src/controllers/publicController.js)
  Future<Response> getPublicWorkers({
    String? trade,
    String? city,
    double? lat,
    double? lng,
    double radiusKm = 10,
    bool? hasKaamCard,
    String? search,
    String sortBy = 'score',
    int page = 1,
    int limit = 20,
  }) async {
    final queryParams = <String, dynamic>{
      'sortBy': sortBy,
      'page': page,
      'limit': limit,
      'radiusKm': radiusKm,
    };
    if (trade != null && trade.isNotEmpty && trade != 'All') {
      queryParams['trade'] = trade.toUpperCase().replaceAll(' ', '_');
    }
    if (city != null && city.isNotEmpty) queryParams['city'] = city;
    if (lat != null && lng != null) {
      queryParams['lat'] = lat;
      queryParams['lng'] = lng;
    }
    if (hasKaamCard == true) queryParams['hasKaamCard'] = 'true';
    if (search != null && search.isNotEmpty) queryParams['search'] = search;

    return await _dioClient.dio.get(
      ApiConstants.publicWorkers,
      queryParameters: queryParams,
    );
  }

  // Worker Public Profile — phone included automatically if a customer token is attached
  Future<Response> getWorkerPublicProfile(String workerId) async {
    return await _dioClient.dio.get(ApiConstants.publicWorkerDetail(workerId));
  }

  // KaamCard QR Verification
  Future<Response> verifyKaamCard(String qrToken) async {
    return await _dioClient.dio.get(ApiConstants.verifyQrToken(qrToken));
  }

  // Report a worker
  Future<Response> createReport({
    required String workerId,
    required String reason,
    String? description,
  }) async {
    return await _dioClient.dio.post(
      ApiConstants.reports,
      data: {
        'workerId': workerId,
        'reason': reason,
        if (description != null && description.isNotEmpty) 'description': description,
      },
    );
  }
}
