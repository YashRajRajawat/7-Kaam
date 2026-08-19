import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/network/api_service.dart';
import 'auth_provider.dart';

class ReportState {
  final bool isSubmitting;
  final bool submitted;
  final String? errorMessage;

  ReportState({this.isSubmitting = false, this.submitted = false, this.errorMessage});

  ReportState copyWith({bool? isSubmitting, bool? submitted, String? errorMessage}) {
    return ReportState(
      isSubmitting: isSubmitting ?? this.isSubmitting,
      submitted: submitted ?? this.submitted,
      errorMessage: errorMessage,
    );
  }
}

class ReportNotifier extends StateNotifier<ReportState> {
  final ApiService _apiService;

  ReportNotifier(this._apiService) : super(ReportState());

  Future<bool> submitReport({required String workerId, required String reason, String? description}) async {
    state = state.copyWith(isSubmitting: true, errorMessage: null);
    try {
      await _apiService.createReport(workerId: workerId, reason: reason, description: description);
      state = state.copyWith(isSubmitting: false, submitted: true);
      return true;
    } catch (e) {
      String message = 'Could not submit report: $e';
      if (e is DioException) {
        final data = e.response?.data;
        if (data is Map && data['error'] != null) message = data['error'].toString();
      }
      state = state.copyWith(isSubmitting: false, errorMessage: message);
      return false;
    }
  }

  void reset() {
    state = ReportState();
  }
}

final reportProvider = StateNotifierProvider<ReportNotifier, ReportState>((ref) {
  final apiService = ref.watch(apiServiceProvider);
  return ReportNotifier(apiService);
});
