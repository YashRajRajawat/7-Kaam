import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/network/api_service.dart';
import '../models/kaam_card_model.dart';
import '../models/kaam_card_history_model.dart';

class KaamCardState {
  final bool isLoading;
  final String? errorMessage;
  final KaamCardModel? kaamCard;
  final KaamCardModel? verifiedCard; // Public QR verification result
  final List<KaamCardHistoryModel> history;

  KaamCardState({
    this.isLoading = false,
    this.errorMessage,
    this.kaamCard,
    this.verifiedCard,
    this.history = const [],
  });

  KaamCardState copyWith({
    bool? isLoading,
    String? errorMessage,
    KaamCardModel? kaamCard,
    bool clearKaamCard = false,
    KaamCardModel? verifiedCard,
    List<KaamCardHistoryModel>? history,
  }) {
    return KaamCardState(
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
      kaamCard: clearKaamCard ? null : (kaamCard ?? this.kaamCard),
      verifiedCard: verifiedCard ?? this.verifiedCard,
      history: history ?? this.history,
    );
  }
}

class KaamCardNotifier extends StateNotifier<KaamCardState> {
  final ApiService _apiService = ApiService();

  KaamCardNotifier() : super(KaamCardState());

  void clearKaamCard() {
    state = KaamCardState();
  }

  // No card yet is a normal, expected state — KaamCards are issued
  // manually by an admin after reviewing assessments (see 7Kaam sync
  // spec). A 404 here just means "not issued yet", not an error.
  Future<void> fetchKaamCard(String workerId) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final response = await _apiService.getKaamCard(workerId);
      if (response.statusCode == 200 && response.data != null) {
        final card = KaamCardModel.fromJson(Map<String, dynamic>.from(response.data));
        state = state.copyWith(isLoading: false, kaamCard: card);
      } else {
        state = state.copyWith(isLoading: false, clearKaamCard: true);
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        state = state.copyWith(isLoading: false, clearKaamCard: true);
      } else {
        state = state.copyWith(isLoading: false, errorMessage: 'Failed to load KaamCard', clearKaamCard: true);
      }
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: 'Failed to load KaamCard: $e', clearKaamCard: true);
    }
  }

  Future<void> fetchKaamCardHistory(String workerId) async {
    try {
      final response = await _apiService.getKaamCardHistory(workerId);
      if (response.statusCode == 200 && response.data is List) {
        final history = (response.data as List)
            .map((h) => KaamCardHistoryModel.fromJson(Map<String, dynamic>.from(h)))
            .toList();
        state = state.copyWith(history: history);
      }
    } catch (_) {
      // Non-critical — the trend chart just shows "not enough history" instead.
    }
  }

  Future<void> verifyQrToken(String qrToken) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final response = await _apiService.verifyQrToken(qrToken);
      if (response.statusCode == 200 && response.data != null) {
        final card = KaamCardModel.fromJson(Map<String, dynamic>.from(response.data));
        state = state.copyWith(isLoading: false, verifiedCard: card);
      } else {
        state = state.copyWith(isLoading: false, errorMessage: 'Verification failed');
      }
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: 'Verification failed: $e');
    }
  }
}

final kaamCardProvider = StateNotifierProvider<KaamCardNotifier, KaamCardState>((ref) {
  return KaamCardNotifier();
});
