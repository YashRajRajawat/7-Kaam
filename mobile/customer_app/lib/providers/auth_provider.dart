import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/network/api_service.dart';
import '../core/network/dio_client.dart';
import '../core/storage/secure_storage.dart';
import '../models/customer_model.dart';

enum AuthStatus { initial, loading, authenticated, unauthenticated, error }

class AuthState {
  final AuthStatus status;
  final CustomerModel? customer;
  final String? errorMessage;

  AuthState({
    required this.status,
    this.customer,
    this.errorMessage,
  });

  AuthState copyWith({
    AuthStatus? status,
    CustomerModel? customer,
    String? errorMessage,
  }) {
    return AuthState(
      status: status ?? this.status,
      customer: customer ?? this.customer,
      errorMessage: errorMessage,
    );
  }
}

String _extractError(Object e, String fallback) {
  if (e is DioException) {
    final data = e.response?.data;
    if (data is Map && data['error'] != null) return data['error'].toString();
  }
  return fallback;
}

class AuthNotifier extends StateNotifier<AuthState> {
  final ApiService _apiService;
  final SecureStorageService _storage;

  AuthNotifier(this._apiService, this._storage)
      : super(AuthState(status: AuthStatus.initial)) {
    initAuth();
  }

  Future<void> initAuth() async {
    state = state.copyWith(status: AuthStatus.loading);
    try {
      final token = await _storage.getToken();
      final id = await _storage.getCustomerId();
      final name = await _storage.getCustomerName();
      final phone = await _storage.getCustomerPhone();
      final city = await _storage.getCustomerCity();

      if (token != null && id != null && name != null) {
        final customer = CustomerModel(
          id: id,
          fullName: name,
          phoneNumber: phone ?? '',
          city: city ?? '',
        );
        state = state.copyWith(status: AuthStatus.authenticated, customer: customer);
      } else {
        state = state.copyWith(status: AuthStatus.unauthenticated);
      }
    } catch (_) {
      state = state.copyWith(status: AuthStatus.unauthenticated);
    }
  }

  Future<bool> login(String phoneNumber, String otp) async {
    state = state.copyWith(status: AuthStatus.loading, errorMessage: null);
    try {
      final response = await _apiService.loginCustomer(phoneNumber: phoneNumber, otp: otp);
      final data = Map<String, dynamic>.from(response.data);
      final customer = CustomerModel.fromJson(Map<String, dynamic>.from(data['customer']));

      await _storage.saveToken(data['accessToken'].toString());
      if (data['refreshToken'] != null) {
        await _storage.saveRefreshToken(data['refreshToken'].toString());
      }
      await _storage.saveCustomerData(
        id: customer.id,
        name: customer.fullName,
        phone: customer.phoneNumber,
        city: customer.city,
      );

      state = state.copyWith(status: AuthStatus.authenticated, customer: customer);
      return true;
    } catch (e) {
      state = state.copyWith(status: AuthStatus.error, errorMessage: _extractError(e, 'Login failed: $e'));
      return false;
    }
  }

  Future<bool> register({
    required String fullName,
    required String phoneNumber,
    required String city,
  }) async {
    state = state.copyWith(status: AuthStatus.loading, errorMessage: null);
    try {
      final response = await _apiService.registerCustomer(
        fullName: fullName,
        phoneNumber: phoneNumber,
        city: city,
      );
      final data = Map<String, dynamic>.from(response.data);
      final customer = CustomerModel.fromJson(Map<String, dynamic>.from(data['customer']));

      await _storage.saveToken(data['accessToken'].toString());
      if (data['refreshToken'] != null) {
        await _storage.saveRefreshToken(data['refreshToken'].toString());
      }
      await _storage.saveCustomerData(
        id: customer.id,
        name: customer.fullName,
        phone: customer.phoneNumber,
        city: customer.city,
      );

      state = state.copyWith(status: AuthStatus.authenticated, customer: customer);
      return true;
    } catch (e) {
      state = state.copyWith(status: AuthStatus.error, errorMessage: _extractError(e, 'Registration failed: $e'));
      return false;
    }
  }

  Future<bool> updateProfile({String? fullName, String? city}) async {
    if (state.customer == null) return false;
    try {
      final data = <String, dynamic>{};
      if (fullName != null && fullName.isNotEmpty) data['fullName'] = fullName;
      if (city != null && city.isNotEmpty) data['city'] = city;
      if (data.isEmpty) return false;

      final response = await _apiService.updateCustomerProfile(state.customer!.id, data);
      final updated = CustomerModel.fromJson(Map<String, dynamic>.from(response.data));
      await _storage.saveCustomerData(
        id: updated.id,
        name: updated.fullName,
        phone: updated.phoneNumber,
        city: updated.city,
      );
      state = state.copyWith(customer: updated);
      return true;
    } catch (e) {
      state = state.copyWith(errorMessage: _extractError(e, 'Update failed: $e'));
      return false;
    }
  }

  Future<void> logout() async {
    await _storage.clearAll();
    state = AuthState(status: AuthStatus.unauthenticated);
  }
}

final dioClientProvider = Provider<DioClient>((ref) => DioClient());
final apiServiceProvider = Provider<ApiService>((ref) => ApiService(ref.read(dioClientProvider)));
final storageServiceProvider = Provider<SecureStorageService>((ref) => SecureStorageService());

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final apiService = ref.watch(apiServiceProvider);
  final storageService = ref.watch(storageServiceProvider);
  return AuthNotifier(apiService, storageService);
});
