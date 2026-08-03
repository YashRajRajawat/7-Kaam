import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../../providers/worker_provider.dart';
import '../../providers/test_provider.dart';
import '../../widgets/custom_button.dart';

class TradeTestScreen extends ConsumerStatefulWidget {
  const TradeTestScreen({super.key});

  @override
  ConsumerState<TradeTestScreen> createState() => _TradeTestScreenState();
}

class _TradeTestScreenState extends ConsumerState<TradeTestScreen> {
  bool _isReviewing = false;

  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      final worker = ref.read(workerProvider).worker ?? ref.read(authProvider).currentWorker;
      final trade = worker?.trade ?? 'ELECTRICIAN';
      ref.read(testProvider.notifier).fetchTradeTest(trade: trade);
    });
  }

  Future<void> _confirmAndSubmit() async {
    final worker = ref.read(workerProvider).worker ?? ref.read(authProvider).currentWorker;
    if (worker == null) return;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(
          'Submit Test Answers?',
          style: GoogleFonts.poppins(fontWeight: FontWeight.bold),
        ),
        content: Text(
          'Are you sure you want to submit your test? Groq AI will evaluate all 10 responses.',
          style: GoogleFonts.poppins(fontSize: 14, color: AppColors.grayText),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: Text('Cancel', style: GoogleFonts.poppins(color: AppColors.grayText)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primaryTeal),
            child: Text('Submit Now', style: GoogleFonts.poppins(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      final success = await ref.read(testProvider.notifier).submitTest(worker.id);
      if (success && mounted) {
        // Update worker test step in workerProvider
        final result = ref.read(testProvider).result;
        final updated = worker.copyWith(
          testCompleted: true,
          testScore: result?.totalScore ?? 88.0,
          pipelineStep: worker.pipelineStep < 4 ? 4 : worker.pipelineStep,
        );
        ref.read(workerProvider.notifier).setWorker(updated);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final testState = ref.watch(testProvider);

    if (testState.isLoading) {
      return Scaffold(
        backgroundColor: AppColors.background,
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const CircularProgressIndicator(color: AppColors.primaryTeal),
              const SizedBox(height: 16),
              Text(
                'Groq AI is evaluating your answers...',
                style: GoogleFonts.poppins(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primaryTeal,
                ),
              ),
            ],
          ),
        ),
      );
    }

    // Results View
    if (testState.result != null) {
      return _buildResultsScreen(testState);
    }

    final test = testState.currentTest;
    if (test == null || test.questions.isEmpty) {
      return const Scaffold(
        backgroundColor: AppColors.background,
        body: Center(child: Text('No questions loaded')),
      );
    }

    // Answer Review Screen before submission
    if (_isReviewing) {
      return _buildReviewScreen(testState, test);
    }

    final qIndex = testState.currentQuestionIndex;
    final question = test.questions[qIndex];
    final selectedOption = testState.selectedAnswers[qIndex];
    final isLastQuestion = qIndex == test.questions.length - 1;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.primaryTeal,
        title: Text(
          test.title,
          style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
        ),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 16),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.white24,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              testState.selectedLanguage,
              style: GoogleFonts.poppins(fontSize: 12, color: Colors.white, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Question Progress Header
            Container(
              padding: const EdgeInsets.all(16),
              color: Colors.white,
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Question ${qIndex + 1} of ${test.questions.length}',
                        style: GoogleFonts.poppins(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primaryTeal,
                        ),
                      ),
                      Text(
                        '${((qIndex + 1) / test.questions.length * 100).toInt()}% Done',
                        style: GoogleFonts.poppins(fontSize: 12, color: AppColors.grayText),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  LinearProgressIndicator(
                    value: (qIndex + 1) / test.questions.length,
                    backgroundColor: Colors.grey.shade200,
                    valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primaryTeal),
                    minHeight: 6,
                  ),
                ],
              ),
            ),

            // Question & 4 Option Buttons
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      question.question,
                      style: GoogleFonts.poppins(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: AppColors.darkText,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Options List
                    ...List.generate(question.options.length, (optIndex) {
                      final optionText = question.options[optIndex];
                      final isSelected = selectedOption == optIndex;

                      return GestureDetector(
                        onTap: () {
                          ref.read(testProvider.notifier).selectOption(qIndex, optIndex);
                        },
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          margin: const EdgeInsets.only(bottom: 14),
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: isSelected
                                ? AppColors.primaryTeal.withValues(alpha: 0.1)
                                : Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: isSelected ? AppColors.primaryTeal : Colors.grey.shade300,
                              width: isSelected ? 2.0 : 1.0,
                            ),
                            boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 4)],
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 28,
                                height: 28,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: isSelected ? AppColors.primaryTeal : Colors.grey.shade200,
                                ),
                                child: Center(
                                  child: Text(
                                    String.fromCharCode(65 + optIndex), // A, B, C, D
                                    style: GoogleFonts.poppins(
                                      color: isSelected ? Colors.white : AppColors.darkText,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 14,
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Text(
                                  optionText,
                                  style: GoogleFonts.poppins(
                                    fontSize: 15,
                                    fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                    color: AppColors.darkText,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    }),
                  ],
                ),
              ),
            ),

            // Next & Previous Buttons
            Padding(
              padding: const EdgeInsets.all(20),
              child: Row(
                children: [
                  if (qIndex > 0) ...[
                    Expanded(
                      child: CustomButton(
                        text: 'Previous',
                        isOutlined: true,
                        onPressed: () {
                          ref.read(testProvider.notifier).goToPreviousQuestion();
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                  ],
                  Expanded(
                    child: CustomButton(
                      text: isLastQuestion ? 'Review Answers' : 'Next',
                      onPressed: selectedOption == null
                          ? null
                          : () {
                              if (isLastQuestion) {
                                setState(() {
                                  _isReviewing = true;
                                });
                              } else {
                                ref.read(testProvider.notifier).goToNextQuestion();
                              }
                            },
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildReviewScreen(TestState testState, dynamic test) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.primaryTeal,
        title: Text('Review Test Answers', style: GoogleFonts.poppins(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.all(20),
                itemCount: test.questions.length,
                itemBuilder: (context, index) {
                  final q = test.questions[index];
                  final selIdx = testState.selectedAnswers[index];
                  final selText = selIdx != null ? q.options[selIdx] : 'Not answered';

                  return Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          q.question,
                          style: GoogleFonts.poppins(fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Your Answer: $selText',
                          style: GoogleFonts.poppins(
                            color: AppColors.primaryTeal,
                            fontWeight: FontWeight.w600,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(20),
              child: Row(
                children: [
                  Expanded(
                    child: CustomButton(
                      text: 'Edit Answers',
                      isOutlined: true,
                      onPressed: () {
                        setState(() {
                          _isReviewing = false;
                        });
                      },
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: CustomButton(
                      text: 'Submit Test',
                      onPressed: _confirmAndSubmit,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildResultsScreen(TestState testState) {
    final result = testState.result!;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.primaryTeal,
        title: Text('Test Results', style: GoogleFonts.poppins(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            children: [
              // Score Banner
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 6)],
                ),
                child: Column(
                  children: [
                    Text(
                      'Groq AI Evaluation Complete',
                      style: GoogleFonts.poppins(fontSize: 14, color: AppColors.grayText),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      '${result.totalScore.toInt()} / 100',
                      style: GoogleFonts.poppins(
                        fontSize: 42,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primaryTeal,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      result.overallFeedback,
                      textAlign: TextAlign.center,
                      style: GoogleFonts.poppins(fontSize: 14, color: AppColors.darkText),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Breakdown header
              Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Per-Question AI Feedback',
                  style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(height: 12),

              ...result.questionBreakdown.map((item) {
                return Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(item.questionText, style: GoogleFonts.poppins(fontWeight: FontWeight.bold, fontSize: 13)),
                      const SizedBox(height: 4),
                      Text('Selected: ${item.selectedAnswer}', style: GoogleFonts.poppins(fontSize: 12, color: AppColors.primaryTeal)),
                      const SizedBox(height: 4),
                      Text('AI Feedback: ${item.feedback}', style: GoogleFonts.poppins(fontSize: 12, color: AppColors.grayText)),
                    ],
                  ),
                );
              }),
              const SizedBox(height: 20),

              CustomButton(
                text: 'Back to Pipeline',
                onPressed: () {
                  context.pop();
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}
