import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/constants/app_colors.dart';
import '../../models/trade_test_model.dart';
import '../../providers/test_provider.dart';
import '../../widgets/custom_button.dart';

class TestDetailScreen extends ConsumerStatefulWidget {
  final TradeTestModel test;

  const TestDetailScreen({super.key, required this.test});

  @override
  ConsumerState<TestDetailScreen> createState() => _TestDetailScreenState();
}

class _TestDetailScreenState extends ConsumerState<TestDetailScreen> {
  late String _selectedLanguage;

  @override
  void initState() {
    super.initState();
    _selectedLanguage = widget.test.language.isNotEmpty ? widget.test.language : 'ENGLISH';
  }

  Color _getDifficultyColor(String diff) {
    switch (diff.toUpperCase()) {
      case 'BEGINNER':
        return AppColors.successGreen;
      case 'INTERMEDIATE':
        return AppColors.gold;
      case 'ADVANCED':
        return AppColors.errorRed;
      default:
        return AppColors.primaryTeal;
    }
  }

  @override
  Widget build(BuildContext context) {
    final test = widget.test;
    final diffColor = _getDifficultyColor(test.difficulty);
    final hasAttempted = test.workerAttempts > 0;
    final isPassed = test.certificateEarned || (test.workerBestScore != null && test.workerBestScore! >= test.passingScore);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.primaryTeal,
        title: Text(
          'Assessment Details',
          style: GoogleFonts.poppins(fontWeight: FontWeight.bold, color: Colors.white),
        ),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Chips Row
              Wrap(
                spacing: 8,
                runSpacing: 6,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: diffColor.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: diffColor.withOpacity(0.4)),
                    ),
                    child: Text(
                      test.difficulty,
                      style: GoogleFonts.poppins(fontSize: 11, fontWeight: FontWeight.bold, color: diffColor),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.primaryTeal.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      test.category,
                      style: GoogleFonts.poppins(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.primaryTeal),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade200,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      test.trade,
                      style: GoogleFonts.poppins(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.darkText),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 14),

              // Title & Description
              Text(
                test.title,
                style: GoogleFonts.poppins(fontSize: 22, fontWeight: FontWeight.bold, color: AppColors.navy),
              ),
              const SizedBox(height: 8),
              Text(
                test.description.isNotEmpty
                    ? test.description
                    : 'Learn and prove your trade knowledge with this official 7 Kaam skill assessment.',
                style: GoogleFonts.poppins(fontSize: 13, color: Colors.grey.shade700, height: 1.5),
              ),

              const SizedBox(height: 20),

              // Stats Row
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _buildStatItem('👥 ${test.totalAttempts}', 'Learners Attempted'),
                    Container(width: 1, height: 36, color: Colors.grey.shade200),
                    _buildStatItem('⏱ ~${test.estimatedMinutes} mins', 'Duration'),
                    Container(width: 1, height: 36, color: Colors.grey.shade200),
                    _buildStatItem('📊 ${test.passingScore}/100', 'Pass Mark'),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // "What you'll be tested on" Topics Preview
              Text(
                "What You'll Be Tested On",
                style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.navy),
              ),
              const SizedBox(height: 10),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildTopicBullet('Safety compliance and personal protective equipment (PPE)'),
                    _buildTopicBullet('Standard tools selection, handling, and maintenance'),
                    _buildTopicBullet('Real-world trade execution techniques and Indian BIS standards'),
                    _buildTopicBullet('Troubleshooting common installation faults and emergency protocols'),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Your Attempt History (If attempted before)
              if (hasAttempted) ...[
                Text(
                  'Your Assessment History',
                  style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.navy),
                ),
                const SizedBox(height: 10),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: isPassed ? AppColors.successGreen.withOpacity(0.06) : Colors.amber.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: isPassed ? AppColors.successGreen.withOpacity(0.3) : Colors.amber.shade300),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Attempts: ${test.workerAttempts}',
                            style: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.navy),
                          ),
                          Text(
                            'Best Score: ${test.workerBestScore?.toInt() ?? 0}/100',
                            style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.bold, color: isPassed ? AppColors.successGreen : AppColors.gold),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          Icon(isPassed ? Icons.workspace_premium : Icons.info_outline, size: 16, color: isPassed ? AppColors.gold : Colors.grey),
                          const SizedBox(width: 6),
                          Text(
                            isPassed ? 'Certificate Earned ✓' : 'Score below 60 — Retake to earn certificate',
                            style: GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.w600, color: isPassed ? AppColors.navy : Colors.grey.shade700),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
              ],

              // Language Selector
              Text(
                'Select Test Language',
                style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.navy),
              ),
              const SizedBox(height: 8),
              Row(
                children: ['ENGLISH', 'HINDI', 'KANNADA', 'TAMIL'].map((lang) {
                  final selected = _selectedLanguage == lang;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8.0),
                    child: ChoiceChip(
                      label: Text(lang),
                      labelStyle: GoogleFonts.poppins(fontSize: 11, fontWeight: FontWeight.w600, color: selected ? Colors.white : AppColors.darkText),
                      selected: selected,
                      selectedColor: AppColors.primaryTeal,
                      backgroundColor: Colors.white,
                      onSelected: (val) {
                        if (val) {
                          setState(() => _selectedLanguage = lang);
                          ref.read(testProvider.notifier).setLanguage(lang);
                        }
                      },
                    ),
                  );
                }).toList(),
              ),

              const SizedBox(height: 32),

              // Start / Retake Action Button
              CustomButton(
                text: !hasAttempted
                    ? 'Start Assessment'
                    : (isPassed ? 'Retake to Improve Score' : 'Retake Assessment'),
                isOutlined: isPassed,
                onPressed: () {
                  ref.read(testProvider.notifier).setLanguage(_selectedLanguage);
                  context.push('/pipeline/trade-test/${test.id}');
                },
              ),

              if (isPassed) ...[
                const SizedBox(height: 12),
                CustomButton(
                  text: 'View Certificate',
                  icon: Icons.workspace_premium,
                  onPressed: () {
                    context.go('/home?tab=3'); // Navigate to Certificates tab
                  },
                ),
              ],
              const SizedBox(height: 30),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatItem(String val, String label) {
    return Column(
      children: [
        Text(val, style: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.navy)),
        const SizedBox(height: 2),
        Text(label, style: GoogleFonts.poppins(fontSize: 10, color: Colors.grey.shade600)),
      ],
    );
  }

  Widget _buildTopicBullet(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('• ', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.primaryTeal)),
          Expanded(
            child: Text(text, style: GoogleFonts.poppins(fontSize: 12, color: AppColors.darkText)),
          ),
        ],
      ),
    );
  }
}
