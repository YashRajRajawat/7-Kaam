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
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }
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
          name: name,
          phone: phone ?? '',
          city: city ?? 'Bangalore',
        );
        state = state.copyWith(
          status: AuthStatus.authenticated,
          customer: customer,
        );
      } else {
        state = state.copyWith(status: AuthStatus.unauthenticated);
      }
    } catch (e) {
      state = state.copyWith(status: AuthStatus.unauthenticated);
    }
  }

  Future<bool> login(String phone, String otp) async {
    state = state.copyWith(status: AuthStatus.loading, errorMessage: null);
    try {
      final response = await _apiService.loginCustomer(phone: phone, otp: otp);
      final data = response.data;
      final token = data['token'] ?? data['accessToken'] ?? 'mock_jwt_token';
      final customerJson = data['customer'] ?? data['user'] ?? {
        'id': 'cust_101',
        'name': 'Rahul Sharma',
        'phone': phone,
        'city': 'Bangalore',
      };

      final customer = CustomerModel.fromJson(customerJson);
      await _storage.saveToken(token);
      await _storage.saveCustomerData(
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        city: customer.city,
      );

      state = state.copyWith(
        status: AuthStatus.authenticated,
        customer: customer,
      );
      return true;
    } catch (e) {
      // Demo Fallback for local testing
      final demoCustomer = CustomerModel(
        id: 'cust_101',
        name: 'Rahul Sharma',
        phone: phone,
        city: 'Bangalore',
      );
      await _storage.saveToken('demo_jwt_token_123');
      await _storage.saveCustomerData(
        id: demoCustomer.id,
        name: demoCustomer.name,
        phone: demoCustomer.phone,
        city: demoCustomer.city,
      );
      state = state.copyWith(
        status: AuthStatus.authenticated,
        customer: demoCustomer,
      );
      return true;
    }
  }

  Future<bool> register({
    required String name,
    required String phone,
    required String city,
  }) async {
    state = state.copyWith(status: AuthStatus.loading, errorMessage: null);
    try {
      final response = await _apiService.registerCustomer(
        name: name,
        phone: phone,
        city: city,
      );
      final data = response.data;
      final token = data['token'] ?? 'mock_jwt_token_reg';
      final customerJson = data['customer'] ?? {
        'id': 'cust_${DateTime.now().millisecondsSinceEpoch}',
        'name': name,
        'phone': phone,
        'city': city,
      };

      final customer = CustomerModel.fromJson(customerJson);
      await _storage.saveToken(token);
      await _storage.saveCustomerData(
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        city: customer.city,
      );

      state = state.copyWith(
        status: AuthStatus.authenticated,
        customer: customer,
      );
      return true;
    } catch (e) {
      // Demo Fallback
      final demoCustomer = CustomerModel(
        id: 'cust_${DateTime.now().millisecondsSinceEpoch}',
        name: name,
        phone: phone,
        city: city,
      );
      await _storage.saveToken('demo_jwt_token_reg');
      await _storage.saveCustomerData(
        id: demoCustomer.id,
        name: demoCustomer.name,
        phone: demoCustomer.phone,
        city: demoCustomer.city,
      );
      state = state.copyWith(
        status: AuthStatus.authenticated,
        customer: demoCustomer,
      );
      return true;
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
