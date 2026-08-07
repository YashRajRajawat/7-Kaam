import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import '../core/network/api_service.dart';
import '../models/worker_model.dart';
import '../models/work_history_model.dart';

class WorkerState {
  final bool isLoading;
  final String? errorMessage;
  final WorkerModel? worker;
  final double videoUploadProgress;

  WorkerState({
    this.isLoading = false,
    this.errorMessage,
    this.worker,
    this.videoUploadProgress = 0.0,
  });

  WorkerState copyWith({
    bool? isLoading,
    String? errorMessage,
    WorkerModel? worker,
    double? videoUploadProgress,
  }) {
    return WorkerState(
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
      worker: worker ?? this.worker,
      videoUploadProgress: videoUploadProgress ?? this.videoUploadProgress,
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

class WorkerNotifier extends StateNotifier<WorkerState> {
  final ApiService _apiService = ApiService();

  WorkerNotifier() : super(WorkerState());

  void setWorker(WorkerModel worker) {
    state = state.copyWith(worker: worker);
  }

  Future<void> fetchWorkerProfile(String workerId) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final response = await _apiService.getWorkerProfile(workerId);
      if (response.statusCode == 200 && response.data != null) {
        final worker = WorkerModel.fromJson(Map<String, dynamic>.from(response.data));
        state = state.copyWith(isLoading: false, worker: worker);
      } else {
        state = state.copyWith(isLoading: false, errorMessage: 'Failed to load profile');
      }
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: _extractError(e, 'Failed to load profile: $e'),
      );
    }
  }

  Future<bool> updateProfile(Map<String, dynamic> data) async {
    if (state.worker == null) return false;
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final response = await _apiService.updateWorkerProfile(state.worker!.id, data);
      if (response.statusCode == 200 && response.data != null) {
        final updatedWorker = WorkerModel.fromJson(Map<String, dynamic>.from(response.data));
        state = state.copyWith(isLoading: false, worker: updatedWorker);
        return true;
      }
      state = state.copyWith(isLoading: false, errorMessage: 'Update failed');
      return false;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: _extractError(e, 'Update failed: $e'));
      return false;
    }
  }

  // Uploads the recorded video to Supabase Storage via a backend-issued
  // presigned URL, then saves videoUrl on the worker. Video scoring itself
  // is admin-manual only (see 7Kaam sync spec) — no auto-score call here,
  // the worker just sees a "pending admin scoring" status afterward.
  Future<bool> uploadVideoAndTriggerScore(List<int> videoBytes, String fileName, {WorkerModel? fallbackWorker}) async {
    final targetWorker = state.worker ?? fallbackWorker;
    if (targetWorker == null) return false;

    state = state.copyWith(
      isLoading: true,
      videoUploadProgress: 0.2,
      worker: targetWorker,
      errorMessage: null,
    );

    try {
      final presignedRes = await _apiService.getUploadVideoPresignedUrl(targetWorker.id, fileName);
      if (presignedRes.statusCode != 200 || presignedRes.data == null) {
        throw Exception('Could not get an upload URL from the server');
      }

      final data = Map<String, dynamic>.from(presignedRes.data);
      final signedUrl = data['signedUrl'];
      final videoUrl = data['videoUrl']?.toString() ?? '';
      state = state.copyWith(videoUploadProgress: 0.5);

      if (signedUrl != null && signedUrl.toString().isNotEmpty) {
        await _apiService.uploadVideoToUrl(signedUrl.toString(), videoBytes, 'video/mp4');
      }
      state = state.copyWith(videoUploadProgress: 0.9);

      final updatedWorker = targetWorker.copyWith(videoUrl: videoUrl);
      state = state.copyWith(
        isLoading: false,
        videoUploadProgress: 1.0,
        worker: updatedWorker,
      );
      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        videoUploadProgress: 0.0,
        errorMessage: _extractError(e, 'Video upload failed: $e'),
      );
      return false;
    }
  }

  Future<bool> addWorkHistory(WorkHistoryModel entry) async {
    if (state.worker == null) return false;
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      await _apiService.addWorkHistory(state.worker!.id, entry.toJson());

      final updatedList = List<WorkHistoryModel>.from(state.worker!.workHistory)..add(entry);
      final updatedWorker = state.worker!.copyWith(workHistory: updatedList);

      state = state.copyWith(isLoading: false, worker: updatedWorker);
      // Refresh from the server so the real computed workHistoryScore/finalScore show up.
      await fetchWorkerProfile(updatedWorker.id);
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: _extractError(e, 'Failed to add work history: $e'));
      return false;
    }
  }

  /// Request GPS permission and save current lat/lng to the backend.
  /// Called once from the dashboard after the worker logs in so the worker
  /// appears on the customer's GPS map view automatically.
  Future<void> saveLocation() async {
    if (state.worker == null) return;
    try {
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.deniedForever ||
          permission == LocationPermission.denied) { return; }

      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.medium,
      );

      await updateProfile({
        'latitude': position.latitude,
        'longitude': position.longitude,
      });
    } catch (_) {
      // Location is best-effort — never crash if GPS fails.
    }
  }
}

final workerProvider = StateNotifierProvider<WorkerNotifier, WorkerState>((ref) {
  return WorkerNotifier();
});
