import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/kaam_card_provider.dart';
import '../../widgets/kaam_card_widget.dart';

class VerifyScreen extends ConsumerStatefulWidget {
  final String qrToken;

  const VerifyScreen({super.key, required this.qrToken});

  @override
  ConsumerState<VerifyScreen> createState() => _VerifyScreenState();
}

class _VerifyScreenState extends ConsumerState<VerifyScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      ref.read(kaamCardProvider.notifier).verifyQrToken(widget.qrToken);
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(kaamCardProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.primaryTeal,
        title: Text(
          '7 Kaam Verification',
          style: GoogleFonts.poppins(fontWeight: FontWeight.bold, color: Colors.white),
        ),
      ),
      body: SafeArea(
        child: state.isLoading
            ? Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const CircularProgressIndicator(color: AppColors.primaryTeal),
                    const SizedBox(height: 16),
                    Text(
                      'Verifying KaamCard QR token...',
                      style: GoogleFonts.poppins(color: AppColors.primaryTeal, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              )
            : state.verifiedCard == null
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24.0),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.error_outline, size: 70, color: AppColors.errorRed),
                          const SizedBox(height: 16),
                          Text(
                            'Invalid or Expired Certificate',
                            style: GoogleFonts.poppins(fontSize: 20, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'The QR code scanned could not be verified on 7 Kaam official records.',
                            textAlign: TextAlign.center,
                            style: GoogleFonts.poppins(color: AppColors.grayText),
                          ),
                        ],
                      ),
                    ),
                  )
                : SingleChildScrollView(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: AppColors.successGreen.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppColors.successGreen),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.verified, color: AppColors.successGreen, size: 28),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  'Official 7 Kaam Verified Record',
                                  style: GoogleFonts.poppins(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.successGreen,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 20),
                        KaamCardWidget(card: state.verifiedCard!),
                      ],
                    ),
                  ),
      ),
    );
  }
}
