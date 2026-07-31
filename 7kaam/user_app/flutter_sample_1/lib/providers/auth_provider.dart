import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/network/api_service.dart';
import '../core/storage/secure_storage.dart';
import '../models/worker_model.dart';

enum AuthStatus { initial, loading, authenticated, unauthenticated, error }

class AuthState {
  final AuthStatus status;
  final String? errorMessage;
  final WorkerModel? currentWorker;
  final String? otpSentToPhone;

  AuthState({
    this.status = AuthStatus.initial,
    this.errorMessage,
    this.currentWorker,
    this.otpSentToPhone,
  });

  AuthState copyWith({
    AuthStatus? status,
    String? errorMessage,
    WorkerModel? currentWorker,
    String? otpSentToPhone,
  }) {
    return AuthState(
      status: status ?? this.status,
      errorMessage: errorMessage,
      currentWorker: currentWorker ?? this.currentWorker,
      otpSentToPhone: otpSentToPhone ?? this.otpSentToPhone,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final ApiService _apiService = ApiService();

  AuthNotifier() : super(AuthState());

  Future<bool> checkAuthStatus() async {
    state = state.copyWith(status: AuthStatus.loading);
    try {
      final token = await SecureStorage.instance.getJwtToken();
      final workerId = await SecureStorage.instance.getWorkerId();
      if (token != null && workerId != null) {
        try {
          final response = await _apiService.getWorkerProfile(workerId);
          if (response.statusCode == 200 && response.data != null) {
            final worker = WorkerModel.fromJson(response.data);
            state = state.copyWith(
              status: AuthStatus.authenticated,
              currentWorker: worker,
            );
            return true;
          }
        } catch (_) {
          // Token invalid or backend unreachable in dev; fallback to unauthenticated
        }
      }
      state = state.copyWith(status: AuthStatus.unauthenticated);
      return false;
    } catch (e) {
      state = state.copyWith(status: AuthStatus.unauthenticated, errorMessage: e.toString());
      return false;
    }
  }

  // TODO: integrate SMS OTP
  Future<bool> sendOtp(String phone) async {
    state = state.copyWith(status: AuthStatus.loading, errorMessage: null);
    try {
      // Simulate sending OTP (fixed OTP: 1234)
      await Future.delayed(const Duration(milliseconds: 500));
      state = state.copyWith(
        status: AuthStatus.unauthenticated,
        otpSentToPhone: phone,
      );
      return true;
    } catch (e) {
      state = state.copyWith(
        status: AuthStatus.error,
        errorMessage: 'Failed to send OTP: $e',
      );
      return false;
    }
  }

  Future<bool> verifyOtpAndLogin(String phone, String otp) async {
    state = state.copyWith(status: AuthStatus.loading, errorMessage: null);
    try {
      // Static OTP check for now
      if (otp != '1234') {
        state = state.copyWith(
          status: AuthStatus.error,
          errorMessage: 'Invalid OTP. Please enter 1234',
        );
        return false;
      }

      try {
        final response = await _apiService.loginWorker(phone, otp);
        if (response.statusCode == 200 && response.data != null) {
          final data = response.data;
          final token = data['token'] ?? data['jwtToken'] ?? 'dummy_jwt_token';
          final workerData = data['worker'] ?? data;
          final worker = WorkerModel.fromJson(workerData);

          await SecureStorage.instance.saveTokens(jwtToken: token);
          await SecureStorage.instance.saveWorkerId(worker.id);

          state = state.copyWith(
            status: AuthStatus.authenticated,
            currentWorker: worker,
          );
          return true;
        }
      } catch (_) {
        // Fallback for dev mode without live backend
        final mockWorker = WorkerModel(
          id: 'w_101',
          name: 'Ramesh Kumar',
          phone: phone,
          trade: 'ELECTRICIAN',
          city: 'Bangalore',
          isCertified: false,
          pipelineStep: 1,
        );
        await SecureStorage.instance.saveTokens(jwtToken: 'dev_jwt_token_1234');
        await SecureStorage.instance.saveWorkerId('w_101');
        state = state.copyWith(
          status: AuthStatus.authenticated,
          currentWorker: mockWorker,
        );
        return true;
      }
      return false;
    } catch (e) {
      state = state.copyWith(
        status: AuthStatus.error,
        errorMessage: 'Login failed: $e',
      );
      return false;
    }
  }

  Future<bool> registerWorker(Map<String, dynamic> registrationData) async {
    state = state.copyWith(status: AuthStatus.loading, errorMessage: null);
    try {
      try {
        final response = await _apiService.registerWorker(registrationData);
        if (response.statusCode == 201 || response.statusCode == 200) {
          final data = response.data;
          final token = data['token'] ?? 'dev_jwt_token_registered';
          final workerObj = WorkerModel.fromJson(data['worker'] ?? data);

          await SecureStorage.instance.saveTokens(jwtToken: token);
          await SecureStorage.instance.saveWorkerId(workerObj.id);

          state = state.copyWith(
            status: AuthStatus.authenticated,
            currentWorker: workerObj,
          );
          return true;
        }
      } catch (_) {
        // Dev fallback
        final mockWorker = WorkerModel(
          id: 'w_${DateTime.now().millisecondsSinceEpoch}',
          name: registrationData['name'] ?? 'Worker',
          phone: registrationData['phone'] ?? '',
          trade: registrationData['trade'] ?? 'ELECTRICIAN',
          city: registrationData['city'] ?? 'Bangalore',
          locality: registrationData['locality'],
          aadhaarHash: registrationData['aadhaarHash'] ?? 'a3f8921e90b',
          profilePhotoUrl: registrationData['profilePhotoUrl'],
          isCertified: false,
          pipelineStep: 1,
        );
        await SecureStorage.instance.saveTokens(jwtToken: 'dev_jwt_token');
        await SecureStorage.instance.saveWorkerId(mockWorker.id);

        state = state.copyWith(
          status: AuthStatus.authenticated,
          currentWorker: mockWorker,
        );
        return true;
      }
      return false;
    } catch (e) {
      state = state.copyWith(
        status: AuthStatus.error,
        errorMessage: 'Registration failed: $e',
      );
      return false;
    }
  }

  Future<void> logout() async {
    await SecureStorage.instance.clearAll();
    state = AuthState(status: AuthStatus.unauthenticated);
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier();
});
