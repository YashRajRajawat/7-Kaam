import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../../providers/worker_provider.dart';
import '../../providers/kaam_card_provider.dart';
import '../../widgets/kaam_card_widget.dart';
import '../../widgets/custom_button.dart';

class KaamCardScreen extends ConsumerWidget {
  final Function(int)? onNavigateTab;

  const KaamCardScreen({super.key, this.onNavigateTab});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final workerState = ref.watch(workerProvider);
    final kaamCardState = ref.watch(kaamCardProvider);

    final worker = workerState.worker ?? authState.currentWorker;
    final card = kaamCardState.kaamCard ?? worker?.kaamCard;

    if (card == null || worker?.isCertified == false) {
      return Scaffold(
        backgroundColor: AppColors.background,
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 140,
                  height: 140,
                  decoration: BoxDecoration(
                    color: AppColors.primaryTeal.withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.badge_outlined,
                    size: 70,
                    color: AppColors.primaryTeal,
                  ),
                ),
                const SizedBox(height: 24),
                Text(
                  'No KaamCard Yet',
                  style: GoogleFonts.poppins(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    color: AppColors.darkText,
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  'Complete your certification pipeline to get your official AI-verified KaamCard.',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.poppins(
                    fontSize: 14,
                    color: AppColors.grayText,
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 32),
                CustomButton(
                  text: 'Go to Pipeline',
                  onPressed: () {
                    if (onNavigateTab != null) {
                      onNavigateTab!(1); // Go to Certify tab
                    }
                  },
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.primaryTeal,
        title: Text(
          'My KaamCard',
          style: GoogleFonts.poppins(fontWeight: FontWeight.bold, color: Colors.white),
        ),
        elevation: 0,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            children: [
              // Visual KaamCard Widget
              KaamCardWidget(card: card),

              const SizedBox(height: 28),

              // Action Buttons below card
              CustomButton(
                text: 'Download PDF',
                icon: Icons.picture_as_pdf,
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Downloading KaamCard PDF from ${card.kaamCardUrl ?? 'backend'}...'),
                      backgroundColor: AppColors.successGreen,
                    ),
                  );
                },
              ),
              const SizedBox(height: 12),

              CustomButton(
                text: 'Share Certificate',
                isOutlined: true,
                icon: Icons.share,
                onPressed: () {
                  final link = 'https://7kaam.in/verify/${card.qrToken.isNotEmpty ? card.qrToken : card.workerId}';
                  Clipboard.setData(ClipboardData(text: 'Check out my verified KaamCard certificate on 7 Kaam: $link'));
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Certificate link copied to clipboard! Ready to share on WhatsApp.'),
                      backgroundColor: AppColors.successGreen,
                    ),
                  );
                },
              ),
              const SizedBox(height: 12),

              CustomButton(
                text: 'Copy Verification Link',
                isOutlined: true,
                icon: Icons.link,
                onPressed: () {
                  final link = '7kaam.in/verify/${card.qrToken.isNotEmpty ? card.qrToken : card.workerId}';
                  Clipboard.setData(ClipboardData(text: link));
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Verification link copied: $link'),
                      backgroundColor: AppColors.successGreen,
                    ),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}
