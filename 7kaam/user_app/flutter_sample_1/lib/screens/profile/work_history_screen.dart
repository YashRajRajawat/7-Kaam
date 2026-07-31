import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/constants/app_colors.dart';
import '../../models/work_history_model.dart';
import '../../providers/worker_provider.dart';
import '../../widgets/custom_button.dart';

class WorkHistoryScreen extends ConsumerStatefulWidget {
  const WorkHistoryScreen({super.key});

  @override
  ConsumerState<WorkHistoryScreen> createState() => _WorkHistoryScreenState();
}

class _WorkHistoryScreenState extends ConsumerState<WorkHistoryScreen> {
  final TextEditingController _employerController = TextEditingController();
  final TextEditingController _roleController = TextEditingController();
  final TextEditingController _startDateController = TextEditingController();
  final TextEditingController _endDateController = TextEditingController();
  final TextEditingController _feedbackController = TextEditingController();

  double _rating = 5.0;

  @override
  void dispose() {
    _employerController.dispose();
    _roleController.dispose();
    _startDateController.dispose();
    _endDateController.dispose();
    _feedbackController.dispose();
    super.dispose();
  }

  Future<void> _submitWorkHistory() async {
    if (_employerController.text.trim().isEmpty || _roleController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please fill Employer Name and Job Role'),
          backgroundColor: AppColors.errorRed,
        ),
      );
      return;
    }

    final entry = WorkHistoryModel(
      id: 'wh_${DateTime.now().millisecondsSinceEpoch}',
      employerName: _employerController.text.trim(),
      jobRole: _roleController.text.trim(),
      startDate: _startDateController.text.trim().isNotEmpty ? _startDateController.text.trim() : '2023',
      endDate: _endDateController.text.trim().isNotEmpty ? _endDateController.text.trim() : '2024',
      rating: _rating,
      feedback: _feedbackController.text.trim().isNotEmpty ? _feedbackController.text.trim() : null,
    );

    final success = await ref.read(workerProvider.notifier).addWorkHistory(entry);

    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Work history entry added successfully!'),
          backgroundColor: AppColors.successGreen,
        ),
      );
      context.pop();
    } else if (mounted) {
      final error = ref.read(workerProvider).errorMessage ?? 'Failed to add entry';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error), backgroundColor: AppColors.errorRed),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final workerState = ref.watch(workerProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.primaryTeal,
        title: Text(
          'Add Past Work Experience',
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
              Text(
                'Employer & Project Details',
                style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.darkText),
              ),
              const SizedBox(height: 16),

              _buildField('Employer / Company Name', _employerController, 'e.g. Prestige Builders / Homeowner Ramesh'),
              const SizedBox(height: 16),

              _buildField('Job Role / Trade Task', _roleController, 'e.g. Senior Electrician / Wiring Specialist'),
              const SizedBox(height: 16),

              Row(
                children: [
                  Expanded(child: _buildField('Start Date / Year', _startDateController, 'e.g. Jan 2023')),
                  const SizedBox(width: 12),
                  Expanded(child: _buildField('End Date / Year', _endDateController, 'e.g. Dec 2023')),
                ],
              ),
              const SizedBox(height: 20),

              // Rating Bar
              Text(
                'Employer Rating (1 to 5 Stars)',
                style: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.darkText),
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.grey.shade300),
                ),
                child: Row(
                  children: [
                    Text(
                      _rating.toStringAsFixed(1),
                      style: GoogleFonts.poppins(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.gold),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Slider(
                        value: _rating,
                        min: 1.0,
                        max: 5.0,
                        divisions: 8,
                        activeColor: AppColors.gold,
                        label: _rating.toString(),
                        onChanged: (val) {
                          setState(() {
                            _rating = val;
                          });
                        },
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              _buildField('Client Feedback / Certificate Notes (Optional)', _feedbackController, 'e.g. Completed 3BHK full house electrical wiring on time with zero defects.', maxLines: 3),
              const SizedBox(height: 28),

              CustomButton(
                text: 'Save Employer Entry',
                isLoading: workerState.isLoading,
                onPressed: _submitWorkHistory,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildField(String label, TextEditingController controller, String hint, {int maxLines = 1}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.darkText),
        ),
        const SizedBox(height: 6),
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.grey.shade300),
          ),
          child: TextField(
            controller: controller,
            maxLines: maxLines,
            decoration: InputDecoration(
              hintText: hint,
              border: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12),
            ),
          ),
        ),
      ],
    );
  }
}
