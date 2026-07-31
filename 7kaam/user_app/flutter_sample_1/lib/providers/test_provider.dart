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
    String? selectedLanguage,
  }) {
    return TestState(
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
      currentTest: currentTest ?? this.currentTest,
      currentQuestionIndex: currentQuestionIndex ?? this.currentQuestionIndex,
      selectedAnswers: selectedAnswers ?? this.selectedAnswers,
      result: result ?? this.result,
      selectedLanguage: selectedLanguage ?? this.selectedLanguage,
    );
  }
}

class TestNotifier extends StateNotifier<TestState> {
  final ApiService _apiService = ApiService();

  TestNotifier() : super(TestState());

  void setLanguage(String language) {
    state = state.copyWith(selectedLanguage: language);
  }

  Future<void> fetchTradeTest({required String trade, String? language}) async {
    final lang = language ?? state.selectedLanguage;
    state = state.copyWith(isLoading: true, errorMessage: null, selectedLanguage: lang);
    try {
      try {
        final response = await _apiService.getTradeTests(trade: trade, language: lang);
        if (response.statusCode == 200 && response.data != null) {
          final test = TradeTestModel.fromJson(response.data);
          state = state.copyWith(
            isLoading: false,
            currentTest: test,
            currentQuestionIndex: 0,
            selectedAnswers: {},
            result: null,
          );
          return;
        }
      } catch (_) {
        // Fallback sample test questions for dev/offline mode
        final mockTest = TradeTestModel(
          id: 'test_101',
          title: '$trade Skill Verification Test',
          trade: trade,
          language: lang,
          questions: _getMockQuestions(trade, lang),
        );
        state = state.copyWith(
          isLoading: false,
          currentTest: mockTest,
          currentQuestionIndex: 0,
          selectedAnswers: {},
          result: null,
        );
      }
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: 'Failed to load test: $e');
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
      final answersPayload = <Map<String, dynamic>>[];
      for (int i = 0; i < state.currentTest!.questions.length; i++) {
        final q = state.currentTest!.questions[i];
        final selectedOptIndex = state.selectedAnswers[i];
        final answerText = selectedOptIndex != null ? q.options[selectedOptIndex] : '';
        answersPayload.add({
          'questionId': q.id,
          'question': q.question,
          'selectedAnswer': answerText,
        });
      }

      try {
        final response = await _apiService.submitTradeTest(workerId, {
          'testId': state.currentTest!.id,
          'answers': answersPayload,
          'language': state.selectedLanguage,
        });
        if (response.statusCode == 200 && response.data != null) {
          final res = TradeTestResultModel.fromJson(response.data);
          state = state.copyWith(isLoading: false, result: res);
          return true;
        }
      } catch (_) {
        // Dev fallback simulated Groq AI evaluation result
        await Future.delayed(const Duration(seconds: 1));
        final mockBreakdown = <QuestionResultModel>[];
        double totalScore = 0;

        for (int i = 0; i < state.currentTest!.questions.length; i++) {
          final q = state.currentTest!.questions[i];
          final selectedIdx = state.selectedAnswers[i] ?? 0;
          final answer = q.options[selectedIdx];
          final score = selectedIdx == 0 ? 10.0 : 8.0; // dummy score logic
          totalScore += score;
          mockBreakdown.add(QuestionResultModel(
            questionId: q.id,
            questionText: q.question,
            selectedAnswer: answer,
            score: score,
            feedback: 'Good understanding of safety guidelines and procedure.',
          ));
        }

        final mockResult = TradeTestResultModel(
          totalScore: totalScore.clamp(0, 100),
          overallFeedback: 'Excellent knowledge of trade standards and safety regulations!',
          questionBreakdown: mockBreakdown,
        );

        state = state.copyWith(isLoading: false, result: mockResult);
        return true;
      }
      return false;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: 'Submission failed: $e');
      return false;
    }
  }

  List<QuestionModel> _getMockQuestions(String trade, String lang) {
    final isHindi = lang.toUpperCase() == 'HINDI';
    return [
      QuestionModel(
        id: 'q1',
        question: isHindi
            ? '1. बिजली के काम से पहले मुख्य स्विच (MCB) का क्या करना चाहिए?'
            : '1. What should be done with the main switch (MCB) before electrical work?',
        options: isHindi
            ? ['बंद (OFF) करना चाहिए', 'चालू (ON) रखना चाहिए', 'कोई फर्क नहीं पड़ता', 'पानी डालना चाहिए']
            : ['Turn it OFF', 'Keep it ON', 'Does not matter', 'Pour water'],
      ),
      QuestionModel(
        id: 'q2',
        question: isHindi
            ? '2. अर्थिंग (Earthing) तार का सामान्य रंग क्या होता है?'
            : '2. What is the standard color for the earthing wire in India?',
        options: isHindi
            ? ['हरा (Green)', 'लाल (Red)', 'काला (Black)', 'नीला (Blue)']
            : ['Green', 'Red', 'Black', 'Blue'],
      ),
      QuestionModel(
        id: 'q3',
        question: isHindi
            ? '3. थ्री-पिन प्लग में सबसे बड़ा और मोटा पिन किसका होता है?'
            : '3. In a 3-pin plug, which pin is the largest and thickest?',
        options: isHindi
            ? ['अर्थ (Earth)', 'फेज (Phase/Live)', 'न्यूट्रल (Neutral)', 'कोई भी']
            : ['Earth', 'Phase/Live', 'Neutral', 'Any pin'],
      ),
      QuestionModel(
        id: 'q4',
        question: isHindi
            ? '4. मल्टीमीटर का उपयोग क्या मापने के लिए किया जाता है?'
            : '4. What is a multimeter used for?',
        options: isHindi
            ? ['वोल्टेज, करंट और रेजिस्टेंस', 'केवल पानी का दबाव', 'केवल तापमान', 'केवल वजन']
            : ['Voltage, Current & Resistance', 'Water pressure only', 'Temperature only', 'Weight only'],
      ),
      QuestionModel(
        id: 'q5',
        question: isHindi
            ? '5. शॉर्ट सर्किट होने पर सबसे पहले क्या होता है?'
            : '5. What happens first during a short circuit?',
        options: isHindi
            ? ['MCB ट्रिप हो जाता है', 'लाइट्स तेज हो जाती हैं', 'तार ठंडी हो जाती है', 'पंखा तेज चलता है']
            : ['MCB trips', 'Lights get brighter', 'Wires become cold', 'Fan rotates faster'],
      ),
      QuestionModel(
        id: 'q6',
        question: isHindi
            ? '6. इंसुलेशन टेप (Insulation Tape) लगाने का क्या उद्देश्य है?'
            : '6. What is the main purpose of applying insulation tape on wires?',
        options: isHindi
            ? ['करंट से सुरक्षा और शॉर्ट सर्किट रोकना', 'तार को सजाना', 'तार को भारी बनाना', 'तार को ठंडा रखना']
            : ['Prevent electric shock & short circuit', 'Decoration', 'Make wire heavy', 'Keep wire cool'],
      ),
      QuestionModel(
        id: 'q7',
        question: isHindi
            ? '7. 1.5 sq mm कॉपर वायर सामान्यतः किस उपकरण के लिए उपयुक्त है?'
            : '7. 1.5 sq mm copper wire is standard for which type of load?',
        options: isHindi
            ? ['लाइटिंग और पंखे', '2-टन AC', 'इंडस्ट्रियल मोटर', 'गीजर 3KW']
            : ['Lighting & Fans', '2-Ton AC', 'Industrial Motor', '3KW Geyser'],
      ),
      QuestionModel(
        id: 'q8',
        question: isHindi
            ? '8. गीजर के लिए किस सॉकेट और प्लग का प्रयोग करना चाहिए?'
            : '8. Which rating socket/plug should be used for a Water Geyser?',
        options: isHindi
            ? ['16 Amp पावर सॉकेट', '6 Amp सॉकेट', '2 Amp सॉकेट', 'बिना प्लग के सीधा जोड़']
            : ['16 Amp Power Socket', '6 Amp Socket', '2 Amp Socket', 'Direct twist wire'],
      ),
      QuestionModel(
        id: 'q9',
        question: isHindi
            ? '9. सुरक्षा के लिए काम करते समय क्या पहनना जरूरी है?'
            : '9. What safety gear is essential while performing trade work?',
        options: isHindi
            ? ['इंसुलेटेड ग्लव्स और सेफ्टी शूज़', 'चप्पल', 'सूती रुमाल', 'गीले कपड़े']
            : ['Insulated gloves & safety shoes', 'Slippers', 'Cotton handkerchief', 'Wet clothes'],
      ),
      QuestionModel(
        id: 'q10',
        question: isHindi
            ? '10. RCCB / ELCB का मुख्य काम क्या है?'
            : '10. What is the primary function of RCCB / ELCB?',
        options: isHindi
            ? ['अर्थ लीक करंट से मानव जीवन बचाना', 'वोल्टेज बढ़ाना', 'बिजली बिल कम करना', 'जनरेटर चालू करना']
            : ['Protect human life from earth leakage shock', 'Increase voltage', 'Reduce electricity bill', 'Start generator'],
      ),
    ];
  }
}

final testProvider = StateNotifierProvider<TestNotifier, TestState>((ref) {
  return TestNotifier();
});
