import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/network/api_service.dart';
import '../models/trade_test_model.dart';

class TestState {
  final bool isLoading;
  final String? errorMessage;
  final TradeTestModel? currentTest;
  final int currentQuestionIndex;
  final Map<int, int> selectedAnswers; // questionIndex -> optionIndex
  final TradeTestResultModel? result;
  final String selectedLanguage;

  TestState({
    this.isLoading = false,
    this.errorMessage,
    this.currentTest,
    this.currentQuestionIndex = 0,
    this.selectedAnswers = const {},
    this.result,
    this.selectedLanguage = 'HINDI',
  });

  TestState copyWith({
    bool? isLoading,
    String? errorMessage,
    TradeTestModel? currentTest,
    int? currentQuestionIndex,
    Map<int, int>? selectedAnswers,
    TradeTestResultModel? result,
    bool clearResult = false,
    String? selectedLanguage,
  }) {
    return TestState(
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
      currentTest: currentTest ?? this.currentTest,
      currentQuestionIndex: currentQuestionIndex ?? this.currentQuestionIndex,
      selectedAnswers: selectedAnswers ?? this.selectedAnswers,
      result: clearResult ? null : (result ?? this.result),
      selectedLanguage: selectedLanguage ?? this.selectedLanguage,
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

class TestNotifier extends StateNotifier<TestState> {
  final ApiService _apiService = ApiService();

  TestNotifier() : super(TestState());

  void setLanguage(String language) {
    state = state.copyWith(selectedLanguage: language);
  }

  void resetTestState() {
    state = TestState(selectedLanguage: state.selectedLanguage);
  }

  Future<void> fetchTestById(String testId) async {
    state = TestState(
      isLoading: true,
      selectedLanguage: state.selectedLanguage,
    );
    try {
      final response = await _apiService.getTestById(testId);
      if (response.statusCode == 200 && response.data != null) {
        final test = TradeTestModel.fromJson(Map<String, dynamic>.from(response.data));
        state = TestState(
          isLoading: false,
          currentTest: test,
          currentQuestionIndex: 0,
          selectedAnswers: {},
          result: null,
          selectedLanguage: state.selectedLanguage,
        );
      } else {
        state = state.copyWith(isLoading: false, errorMessage: 'Could not load this assessment', clearResult: true);
      }
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: _extractError(e, 'Failed to load test: $e'), clearResult: true);
    }
  }

  void selectOption(int questionIndex, int optionIndex) {
    final updated = Map<int, int>.from(state.selectedAnswers);
    updated[questionIndex] = optionIndex;
    state = state.copyWith(selectedAnswers: updated);
  }

  void goToNextQuestion() {
    if (state.currentTest != null && state.currentQuestionIndex < state.currentTest!.questions.length - 1) {
      state = state.copyWith(currentQuestionIndex: state.currentQuestionIndex + 1);
    }
  }

  void goToPreviousQuestion() {
    if (state.currentQuestionIndex > 0) {
      state = state.copyWith(currentQuestionIndex: state.currentQuestionIndex - 1);
    }
  }

  Future<bool> submitTest(String workerId) async {
    if (state.currentTest == null) return false;
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      // The backend's Groq evaluator indexes answers[i] as plain text
      // against questions[i] — a flat ordered list, not objects.
      final answersPayload = <String>[];
      for (int i = 0; i < state.currentTest!.questions.length; i++) {
        final q = state.currentTest!.questions[i];
        final selectedOptIndex = state.selectedAnswers[i];
        answersPayload.add(selectedOptIndex != null ? q.options[selectedOptIndex] : '');
      }

      final response = await _apiService.submitTradeTest(workerId, {
        'testId': state.currentTest!.id,
        'answers': answersPayload,
      });

      if (response.statusCode == 200 && response.data != null) {
        final data = Map<String, dynamic>.from(response.data);
        final evaluation = Map<String, dynamic>.from(data['evaluation'] ?? {});
        final res = TradeTestResultModel(
          totalScore: (data['testScore'] ?? evaluation['totalScore'] ?? 0).toDouble(),
          overallFeedback: evaluation['overallFeedback']?.toString() ?? '',
          questionBreakdown: (evaluation['breakdown'] as List<dynamic>?)
                  ?.map((q) => QuestionResultModel.fromJson(Map<String, dynamic>.from(q)))
                  .toList() ??
              [],
        );
        state = state.copyWith(isLoading: false, result: res);
        return true;
      }
      state = state.copyWith(isLoading: false, errorMessage: 'Submission failed');
      return false;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: _extractError(e, 'Submission failed: $e'));
      return false;
    }
  }
}

final testProvider = StateNotifierProvider<TestNotifier, TestState>((ref) {
  return TestNotifier();
});
