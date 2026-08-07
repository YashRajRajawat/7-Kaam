import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/network/api_service.dart';
import '../models/worker_public_model.dart';
import 'auth_provider.dart';

class WorkerDetailState {
  final bool isLoading;
  final String? errorMessage;
  final WorkerPublicModel? worker;

  WorkerDetailState({this.isLoading = false, this.errorMessage, this.worker});

  WorkerDetailState copyWith({bool? isLoading, String? errorMessage, WorkerPublicModel? worker}) {
    return WorkerDetailState(
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
      worker: worker ?? this.worker,
    );
  }
}

class WorkerDetailNotifier extends StateNotifier<WorkerDetailState> {
  final ApiService _apiService;

  WorkerDetailNotifier(this._apiService) : super(WorkerDetailState());

  Future<void> fetchWorker(String workerId) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final response = await _apiService.getWorkerPublicProfile(workerId);
      final worker = WorkerPublicModel.fromJson(Map<String, dynamic>.from(response.data));
      state = state.copyWith(isLoading: false, worker: worker);
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: 'Could not load this worker: $e');
    }
  }
}

final workerDetailProvider = StateNotifierProvider<WorkerDetailNotifier, WorkerDetailState>((ref) {
  final apiService = ref.watch(apiServiceProvider);
  return WorkerDetailNotifier(apiService);
});
