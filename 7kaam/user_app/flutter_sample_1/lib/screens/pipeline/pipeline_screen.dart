import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../../providers/worker_provider.dart';
import '../../providers/test_provider.dart';
import '../../providers/kaam_card_provider.dart';
import '../../widgets/pipeline_tracker.dart';

class PipelineScreen extends ConsumerWidget {
  const PipelineScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final workerState = ref.watch(workerProvider);
    final testState = ref.watch(testProvider);
    final kaamCardState = ref.watch(kaamCardProvider);

    final worker = workerState.worker ?? authState.currentWorker;

    // Evaluate completion of steps 1-4
    final isStep1Done = worker != null &&
        (worker.aadhaarHash != null && worker.aadhaarHash!.isNotEmpty);

    final isStep2Done = worker != null &&
        (worker.videoUrl != null && worker.videoUrl!.isNotEmpty);

    final isStep3Done = worker != null && (worker.testCompleted || testState.result != null);

    final isStep4Done = worker != null && worker.workHistory.isNotEmpty;

    final canIssueKaamCard = isStep1Done && isStep2Done && isStep3Done && isStep4Done;

    final steps = [
      PipelineStepItem(
        stepNumber: 1,
        title: 'Profile Setup',
        description: 'Verify identity with Aadhaar hash & upload profile photo.',
        isComplete: isStep1Done,
        isInProgress: !isStep1Done,
        ctaText: !isStep1Done ? 'Complete Profile' : null,
        onTap: () => context.push('/register'),
      ),
      PipelineStepItem(
        stepNumber: 2,
        title: 'Upload Skill Video',
        description: 'Record a 60-second video of yourself doing your trade work.',
        isComplete: isStep2Done,
        isInProgress: isStep1Done && !isStep2Done,
        isLocked: !isStep1Done,
        ctaText: isStep2Done ? 'Re-record Video' : 'Record Video',
        onTap: () => context.push('/pipeline/video-upload'),
      ),
      PipelineStepItem(
        stepNumber: 3,
        title: 'Take Trade Test',
        description: 'Answer 10 questions about your trade in your preferred language.',
        isComplete: isStep3Done,
        isInProgress: isStep2Done && !isStep3Done,
        isLocked: !isStep2Done,
        statusText: isStep3Done ? 'Score: ${worker.testScore?.toInt() ?? testState.result?.totalScore.toInt() ?? 90}' : null,
        ctaText: isStep3Done ? 'View Results' : 'Start Test',
        onTap: () => context.push('/pipeline/trade-test'),
      ),
      PipelineStepItem(
        stepNumber: 4,
        title: 'Work History',
        description: 'Add your past employers and ratings (${worker?.workHistory.length ?? 0} entries added).',
        isComplete: isStep4Done,
        isInProgress: isStep3Done && !isStep4Done,
        isLocked: !isStep3Done,
        ctaText: 'Add Employers',
        onTap: () => context.push('/profile/work-history'),
      ),
      PipelineStepItem(
        stepNumber: 5,
        title: 'Get KaamCard',
        description: 'AI computes final composite score and issues official KaamCard.',
        isComplete: (worker?.isCertified ?? false) || kaamCardState.kaamCard != null,
        isInProgress: canIssueKaamCard && (worker?.isCertified ?? false) != true,
        isLocked: !canIssueKaamCard && (worker?.isCertified ?? false) != true,
        ctaText: 'Issue My KaamCard',
        onTap: () async {
          if (worker == null) return;
          final success = await ref.read(kaamCardProvider.notifier).computeScoreAndIssueKaamCard(
                worker.id,
                workerName: worker.name,
                trade: worker.trade,
                city: worker.city,
              );
          if (success && context.mounted) {
            final card = ref.read(kaamCardProvider).kaamCard;
            final updatedWorker = worker.copyWith(
              isCertified: true,
              score: card?.score ?? 88.0,
              tier: card?.tier ?? 'GOLD',
              kaamCard: card,
              pipelineStep: 5,
            );
            ref.read(workerProvider.notifier).setWorker(updatedWorker);
            context.go('/home?tab=2'); // Switch to KaamCard tab
          }
        },
      ),
    ];

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.primaryTeal,
        title: Text(
          'Certification Journey',
          style: GoogleFonts.poppins(fontWeight: FontWeight.bold, color: Colors.white),
        ),
        elevation: 0,
      ),
      body: SafeArea(
        child: kaamCardState.isLoading
            ? Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const CircularProgressIndicator(color: AppColors.primaryTeal),
                    const SizedBox(height: 16),
                    Text(
                      kaamCardState.loadingMessage ?? 'AI is computing your score...',
                      style: GoogleFonts.poppins(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primaryTeal,
                      ),
                    ),
                  ],
                ),
              )
            : SingleChildScrollView(
                padding: const EdgeInsets.all(20.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Language Selector for Trade Test
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Test Language:',
                          style: GoogleFonts.poppins(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: AppColors.darkText,
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          decoration: BoxDecoration(
                            color: AppColors.white,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: Colors.grey.shade300),
                          ),
                          child: DropdownButtonHideUnderline(
                            child: DropdownButton<String>(
                              value: testState.selectedLanguage,
                              items: const [
                                DropdownMenuItem(value: 'ENGLISH', child: Text('English')),
                                DropdownMenuItem(value: 'HINDI', child: Text('Hindi (हिंदी)')),
                                DropdownMenuItem(value: 'KANNADA', child: Text('Kannada (ಕನ್ನಡ)')),
                                DropdownMenuItem(value: 'TAMIL', child: Text('Tamil (தமிழ்)')),
                              ],
                              onChanged: (val) {
                                if (val != null) {
                                  ref.read(testProvider.notifier).setLanguage(val);
                                }
                              },
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),

                    // Pipeline tracker widget
                    PipelineTracker(steps: steps),
                  ],
                ),
              ),
      ),
    );
  }
}
