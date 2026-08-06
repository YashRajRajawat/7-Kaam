import 'package:dio/dio.dart';
import '../constants/api_constants.dart';
import 'dio_client.dart';

class ApiService {
  final DioClient _dioClient;

  ApiService(this._dioClient);

  // Register Customer
  Future<Response> registerCustomer({
    required String name,
    required String phone,
    required String city,
  }) async {
    return await _dioClient.dio.post(
      ApiConstants.customerRegister,
      data: {
        'name': name,
        'phone': phone,
        'city': city,
      },
    );
  }

  // Login Customer
  Future<Response> loginCustomer({
    required String phone,
    required String otp,
  }) async {
    return await _dioClient.dio.post(
      ApiConstants.customerLogin,
      data: {
        'phone': phone,
        'otp': otp,
      },
    );
  }

  // Nearby Workers
  Future<Response> getNearbyWorkers({
    String? trade,
    String? tier,
    required String city,
    String? search,
    int page = 1,
    int limit = 20,
  }) async {
    final queryParams = <String, dynamic>{
      'city': city,
      'page': page,
      'limit': limit,
    };
    if (trade != null && trade.isNotEmpty && trade != 'All') {
      queryParams['trade'] = trade.toUpperCase().replaceAll(' ', '_');
    }
    if (tier != null && tier.isNotEmpty && tier != 'Any') {
      queryParams['tier'] = tier.replaceAll('+', '').toUpperCase();
    }
    if (search != null && search.isNotEmpty) {
      queryParams['search'] = search;
    }

    return await _dioClient.dio.get(
      ApiConstants.nearbyWorkers,
      queryParameters: queryParams,
    );
  }

  // Worker Public Profile
  Future<Response> getWorkerPublicProfile(String workerId) async {
    return await _dioClient.dio.get(ApiConstants.workerPublic(workerId));
  }

  // KaamCard QR Verification
  Future<Response> verifyKaamCard(String qrToken) async {
    return await _dioClient.dio.get(ApiConstants.verifyQrToken(qrToken));
  }

  // Create Booking
  Future<Response> createBooking({
    required String workerId,
    required String serviceDate,
    required String serviceTime,
    required String serviceAddress,
    String? notes,
    required String trade,
    String? priceEstimate,
  }) async {
    return await _dioClient.dio.post(
      ApiConstants.bookings,
      data: {
        'workerId': workerId,
        'serviceDate': serviceDate,
        'serviceTime': serviceTime,
        'serviceAddress': serviceAddress,
        if (notes != null) 'notes': notes,
        'trade': trade,
        if (priceEstimate != null) 'priceEstimate': priceEstimate,
      },
    );
  }

  // Customer Bookings
  Future<Response> getCustomerBookings(String customerId) async {
    return await _dioClient.dio.get(ApiConstants.customerBookings(customerId));
  }

  // Booking Detail
  Future<Response> getBookingDetail(String bookingId) async {
    return await _dioClient.dio.get(ApiConstants.bookingDetail(bookingId));
  }
}
