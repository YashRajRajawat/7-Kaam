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
    // 'Verified only' filter. Server default is false — unclaimed public
    // directory listings are returned but always ranked last and always
    // labelled. Sending 'true' drops every unclaimed row server-side.
    bool? verifiedOnly,
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
    if (verifiedOnly == true) queryParams['verifiedOnly'] = 'true';

    return await _dioClient.dio.get(
      ApiConstants.publicWorkers,
      queryParameters: queryParams,
    );
  }

  // Worker Public Profile — phone included automatically if a customer token is attached
  Future<Response> getWorkerPublicProfile(String workerId) async {
    return await _dioClient.dio.get(ApiConstants.publicWorkerDetail(workerId));
  }

  // Claim / removal request for an unclaimed public-directory listing.
  // POST /public/workers/:id/listing-request — see backend §D.6.
  // `type` is 'CLAIM' or 'REMOVAL'. Neither grants anything by itself:
  // CLAIM only records a pending claim, REMOVAL suppresses the listing.
  Future<Response> submitListingRequest({
    required String workerId,
    required String type,
    required String contactName,
    required String contactPhone,
    String? note,
  }) async {
    return await _dioClient.dio.post(
      '${ApiConstants.publicWorkerDetail(workerId)}/listing-request',
      data: {
        'type': type,
        'contactName': contactName,
        'contactPhone': contactPhone,
        if (note != null && note.isNotEmpty) 'note': note,
      },
    );
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
