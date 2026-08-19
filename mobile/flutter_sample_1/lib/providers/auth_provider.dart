import 'package:dio/dio.dart';
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

String _extractError(Object e, String fallback) {
  if (e is DioException) {
    final data = e.response?.data;
    if (data is Map && data['error'] != null) return data['error'].toString();
  }
  return fallback;
}

class AuthNotifier extends StateNotifier<AuthState> {
  final ApiService _apiService = ApiService();

  AuthNotifier() : super(AuthState());

  Future<bool> checkAuthStatus() async {
    state = state.copyWith(status: AuthStatus.loading);
    try {
      final token = await SecureStorage.instance.getJwtToken();
      final workerId = await SecureStorage.instance.getWorkerId();
      if (token == null || workerId == null) {
        state = state.copyWith(status: AuthStatus.unauthenticated);
        return false;
      }

      final response = await _apiService.getWorkerProfile(workerId);
      if (response.statusCode == 200 && response.data != null) {
        final worker = WorkerModel.fromJson(Map<String, dynamic>.from(response.data));
        state = state.copyWith(status: AuthStatus.authenticated, currentWorker: worker);
        return true;
      }
      state = state.copyWith(status: AuthStatus.unauthenticated);
      return false;
    } catch (_) {
      // Invalid/expired token or backend unreachable — treat as logged out.
      await SecureStorage.instance.clearAll();
      state = state.copyWith(status: AuthStatus.unauthenticated);
      return false;
    }
  }

  // Fixed OTP (1234) for now — the backend has no real SMS OTP provider
  // wired up yet either (see backend/src/controllers/authController.js).
  // Nothing to call here; login itself validates the OTP.
  Future<bool> sendOtp(String phone) async {
    state = state.copyWith(status: AuthStatus.unauthenticated, otpSentToPhone: phone, errorMessage: null);
    return true;
  }

  Future<bool> verifyOtpAndLogin(String phoneNumber, String otp) async {
    state = state.copyWith(status: AuthStatus.loading, errorMessage: null);
    try {
      final response = await _apiService.loginWorker(phoneNumber, otp);
      if (response.statusCode == 200 && response.data != null) {
        final data = Map<String, dynamic>.from(response.data);
        final worker = WorkerModel.fromJson(Map<String, dynamic>.from(data['worker']));

        await SecureStorage.instance.saveTokens(
          jwtToken: data['accessToken'].toString(),
          refreshToken: data['refreshToken']?.toString(),
        );
        await SecureStorage.instance.saveWorkerId(worker.id);

        state = state.copyWith(status: AuthStatus.authenticated, currentWorker: worker);
        return true;
      }
      state = state.copyWith(status: AuthStatus.error, errorMessage: 'Login failed');
      return false;
    } catch (e) {
      state = state.copyWith(
        status: AuthStatus.error,
        errorMessage: _extractError(e, 'Login failed: $e'),
      );
      return false;
    }
  }

  Future<bool> registerWorker(Map<String, dynamic> registrationData) async {
    state = state.copyWith(status: AuthStatus.loading, errorMessage: null);
    try {
      final response = await _apiService.registerWorker(registrationData);
      if (response.statusCode == 201 || response.statusCode == 200) {
        final data = Map<String, dynamic>.from(response.data);
        final worker = WorkerModel.fromJson(Map<String, dynamic>.from(data['worker']));

        await SecureStorage.instance.saveTokens(
          jwtToken: data['accessToken'].toString(),
          refreshToken: data['refreshToken']?.toString(),
        );
        await SecureStorage.instance.saveWorkerId(worker.id);

        state = state.copyWith(status: AuthStatus.authenticated, currentWorker: worker);
        return true;
      }
      state = state.copyWith(status: AuthStatus.error, errorMessage: 'Registration failed');
      return false;
    } catch (e) {
      state = state.copyWith(
        status: AuthStatus.error,
        errorMessage: _extractError(e, 'Registration failed: $e'),
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
