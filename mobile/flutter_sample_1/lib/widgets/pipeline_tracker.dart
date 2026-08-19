import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../core/constants/app_colors.dart';

class PipelineStepItem {
  final int stepNumber;
  final String title;
  final String description;
  final bool isComplete;
  final bool isInProgress;
  final bool isLocked;
  final String? statusText;
  final VoidCallback? onTap;
  final String? ctaText;

  PipelineStepItem({
    required this.stepNumber,
    required this.title,
    required this.description,
    this.isComplete = false,
    this.isInProgress = false,
    this.isLocked = false,
    this.statusText,
    this.onTap,
    this.ctaText,
  });
}

class PipelineTracker extends StatelessWidget {
  final List<PipelineStepItem> steps;

  const PipelineTracker({
    super.key,
    required this.steps,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: List.generate(steps.length, (index) {
        final item = steps[index];
        final isLast = index == steps.length - 1;

        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Column(
              children: [
                // Step circle indicator
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: item.isComplete
                        ? AppColors.primaryTeal
                        : (item.isInProgress
                            ? AppColors.primaryTeal.withValues(alpha: 0.15)
                            : Colors.grey.shade200),
                    border: Border.all(
                      color: item.isComplete || item.isInProgress
                          ? AppColors.primaryTeal
                          : Colors.grey.shade400,
                      width: 2,
                    ),
                  ),
                  child: Center(
                    child: item.isComplete
                        ? const Icon(Icons.check, color: AppColors.white, size: 20)
                        : Text(
                            '${item.stepNumber}',
                            style: GoogleFonts.poppins(
                              color: item.isInProgress
                                  ? AppColors.primaryTeal
                                  : (item.isLocked ? Colors.grey.shade500 : AppColors.darkText),
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                            ),
                          ),
                  ),
                ),
                // Connecting line
                if (!isLast)
                  Container(
                    width: 2,
                    height: item.ctaText != null ? 70 : 45,
                    color: item.isComplete
                        ? AppColors.primaryTeal
                        : Colors.grey.shade300,
                  ),
              ],
            ),
            const SizedBox(width: 14),
            // Details & Status Chip
            Expanded(
              child: Padding(
                padding: const EdgeInsets.only(bottom: 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            item.title,
                            style: GoogleFonts.poppins(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: item.isLocked ? Colors.grey.shade600 : AppColors.darkText,
                            ),
                          ),
                        ),
                        // Status chip
                        _buildStatusChip(item),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      item.description,
                      style: GoogleFonts.poppins(
                        fontSize: 13,
                        color: AppColors.grayText,
                      ),
                    ),
                    if (item.ctaText != null && !item.isComplete) ...[
                      const SizedBox(height: 8),
                      SizedBox(
                        height: 36,
                        child: ElevatedButton(
                          onPressed: item.isLocked ? null : item.onTap,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primaryTeal,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                          ),
                          child: Text(
                            item.ctaText!,
                            style: GoogleFonts.poppins(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: AppColors.white,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        );
      }),
    );
  }

  Widget _buildStatusChip(PipelineStepItem item) {
    String label = 'Locked';
    Color chipBg = Colors.grey.shade200;
    Color chipFg = Colors.grey.shade700;

    if (item.isComplete) {
      label = 'Complete';
      chipBg = AppColors.successGreen.withValues(alpha: 0.15);
      chipFg = AppColors.successGreen;
    } else if (item.isInProgress) {
      label = item.statusText ?? 'In Progress';
      chipBg = AppColors.primaryTeal.withValues(alpha: 0.15);
      chipFg = AppColors.primaryTeal;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
      decoration: BoxDecoration(
        color: chipBg,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        label,
        style: GoogleFonts.poppins(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: chipFg,
        ),
      ),
    );
  }
}
