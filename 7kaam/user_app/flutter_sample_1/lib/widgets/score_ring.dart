import 'dart:math';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../core/constants/app_colors.dart';

class ScoreRing extends StatelessWidget {
  final double score;
  final double size;
  final double strokeWidth;
  final bool showLabel;

  const ScoreRing({
    super.key,
    required this.score,
    this.size = 100,
    this.strokeWidth = 10,
    this.showLabel = true,
  });

  @override
  Widget build(BuildContext context) {
    final clampedScore = score.clamp(0.0, 100.0);
    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        alignment: Alignment.center,
        children: [
          CustomPaint(
            size: Size(size, size),
            painter: _ScoreRingPainter(
              scorePercentage: clampedScore / 100.0,
              strokeWidth: strokeWidth,
            ),
          ),
          Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                clampedScore.toInt().toString(),
                style: GoogleFonts.poppins(
                  fontSize: size * 0.3,
                  fontWeight: FontWeight.bold,
                  color: AppColors.navy,
                ),
              ),
              if (showLabel)
                Text(
                  '/ 100',
                  style: GoogleFonts.poppins(
                    fontSize: size * 0.12,
                    color: AppColors.grayText,
                    fontWeight: FontWeight.w500,
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ScoreRingPainter extends CustomPainter {
  final double scorePercentage;
  final double strokeWidth;

  _ScoreRingPainter({
    required this.scorePercentage,
    required this.strokeWidth,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (size.width - strokeWidth) / 2;

    final trackPaint = Paint()
      ..color = AppColors.primaryTeal.withValues(alpha: 0.15)
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth;

    final progressPaint = Paint()
      ..color = AppColors.primaryTeal
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    // Draw background circle track
    canvas.drawCircle(center, radius, trackPaint);

    // Draw active arc
    final sweepAngle = 2 * pi * scorePercentage;
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      -pi / 2, // Start at top
      sweepAngle,
      false,
      progressPaint,
    );
  }

  @override
  bool shouldRepaint(covariant _ScoreRingPainter oldDelegate) {
    return oldDelegate.scorePercentage != scorePercentage ||
        oldDelegate.strokeWidth != strokeWidth;
  }
}
