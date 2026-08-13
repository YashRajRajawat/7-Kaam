import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../core/constants/app_colors.dart';
import '../../models/kaam_card_model.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/custom_button.dart';
import '../../widgets/tier_badge.dart';

class QrScanScreen extends ConsumerStatefulWidget {
  const QrScanScreen({super.key});

  @override
  ConsumerState<QrScanScreen> createState() => _QrScanScreenState();
}

class _QrScanScreenState extends ConsumerState<QrScanScreen> {
  final MobileScannerController _scannerController = MobileScannerController();
  final TextEditingController _testTokenController = TextEditingController();
  bool _isProcessing = false;
  KaamCardModel? _verificationResult;

  void _onDetect(BarcodeCapture capture) async {
    if (_isProcessing) return;
    final List<Barcode> barcodes = capture.barcodes;
    for (final barcode in barcodes) {
      if (barcode.rawValue != null) {
        _verifyToken(barcode.rawValue!);
        break;
      }
    }
  }

  Future<void> _verifyToken(String token) async {
    setState(() {
      _isProcessing = true;
      _verificationResult = null;
    });

    final apiService = ref.read(apiServiceProvider);
    try {
      final response = await apiService.verifyKaamCard(token);
      final result = KaamCardModel.fromJson(Map<String, dynamic>.from(response.data));
      setState(() {
        _verificationResult = result;
        _isProcessing = false;
      });
    } catch (e) {
      // A 404 (or any other failure) means this token isn't a real,
      // registered KaamCard — show that honestly instead of a fake result.
      setState(() {
        _verificationResult = KaamCardModel(
          status: 'NOT_FOUND',
          qrToken: token,
          workerName: 'Unknown',
          trade: 'N/A',
          score: 0,
          tier: 'NONE',
          validUntil: 'N/A',
        );
        _isProcessing = false;
      });
    }
  }

  @override
  void dispose() {
    _scannerController.dispose();
    _testTokenController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white),
          onPressed: () => context.pop(),
        ),
        title: Text(
          'Verify KaamCard',
          style: GoogleFonts.poppins(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18),
        ),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.keyboard_alt_outlined, color: Colors.white),
            onPressed: _showManualTokenDialog,
          ),
        ],
      ),
      body: Stack(
        children: [
          // Live Camera Feed
          MobileScanner(
            controller: _scannerController,
            onDetect: _onDetect,
          ),

          // QR Scanner Overlay Frame
          Center(
            child: Container(
              width: 260,
              height: 260,
              decoration: BoxDecoration(
                border: Border.all(color: AppColors.primaryTeal, width: 3),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Stack(
                children: [
                  Positioned(
                    top: 12,
                    left: 12,
                    child: Text(
                      '7 KAAM',
                      style: GoogleFonts.poppins(
                        color: AppColors.primaryTeal,
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Instructions at top
          Positioned(
            top: 30,
            left: 20,
            right: 20,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.7),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                'Point camera at worker\'s KaamCard QR code',
                textAlign: TextAlign.center,
                style: GoogleFonts.poppins(
                  color: Colors.white,
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ),

          // Verification Result Sheet Overlay (Shows inline)
          if (_verificationResult != null)
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: _buildResultCard(_verificationResult!),
            ),
        ],
      ),
    );
  }

  Widget _buildResultCard(KaamCardModel res) {
    Color cardColor;
    IconData icon;
    String titleText;

    switch (res.status) {
      case 'VALID':
        cardColor = Colors.green;
        icon = Icons.verified_user_rounded;
        titleText = '✓ KAAMCARD VERIFIED';
        break;
      case 'REVOKED':
        cardColor = Colors.red;
        icon = Icons.cancel_rounded;
        titleText = '✗ CERTIFICATE REVOKED';
        break;
      case 'EXPIRED':
        cardColor = Colors.orange;
        icon = Icons.warning_amber_rounded;
        titleText = '✗ CERTIFICATE EXPIRED';
        break;
      case 'NOT_FOUND':
      default:
        cardColor = Colors.grey;
        icon = Icons.help_outline_rounded;
        titleText = '✗ INVALID QR TOKEN';
        break;
    }

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        boxShadow: [
          BoxShadow(
            color: Colors.black26,
            blurRadius: 16,
            offset: Offset(0, -4),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Banner Status
          Row(
            children: [
              Icon(icon, color: cardColor, size: 28),
              const SizedBox(width: 10),
              Text(
                titleText,
                style: GoogleFonts.poppins(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: cardColor,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          if (res.status == 'VALID') ...[
            Text(
              res.workerName,
              style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.navy),
            ),
            const SizedBox(height: 4),
            Row(
              children: [
                Text(
                  '${res.trade} · Score ${res.score}/100',
                  style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.w600),
                ),
                const SizedBox(width: 8),
                // TierBadge renders NOTHING for a tier outside the four real
                // ones — including the 'NONE' sentinel this screen builds for
                // a NOT_FOUND card, which previously painted a bronze "NONE"
                // badge. Say so in words rather than leave the row empty.
                if (TierBadge.isRealTier(res.tier))
                  TierBadge(tier: res.tier, isSmall: true)
                else
                  Text(
                    'Not a valid KaamCard',
                    style: GoogleFonts.poppins(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: AppColors.grayText,
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              'Valid until: ${res.validUntil}',
              style: GoogleFonts.poppins(fontSize: 12, color: AppColors.grayText),
            ),
          ] else if (res.status == 'REVOKED') ...[
            Text(
              'Worker: ${res.workerName} (${res.trade})',
              style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            Text(
              'Reason: ${res.revocationReason ?? "License revoked by platform admin"}',
              style: GoogleFonts.poppins(fontSize: 13, color: Colors.red),
            ),
          ] else if (res.status == 'EXPIRED') ...[
            Text(
              'Expired on: ${res.validUntil}',
              style: GoogleFonts.poppins(fontSize: 13, color: Colors.orange),
            ),
          ] else ...[
            Text(
              'Token "${res.qrToken}" not registered in 7 Kaam database.',
              style: GoogleFonts.poppins(fontSize: 13, color: AppColors.grayText),
            ),
          ],
          const SizedBox(height: 16),

          CustomButton(
            text: 'Scan Another Code',
            onPressed: () {
              setState(() {
                _verificationResult = null;
              });
            },
          ),
        ],
      ),
    );
  }

  void _showManualTokenDialog() {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: Text('Enter QR Token Manually', style: GoogleFonts.poppins(fontWeight: FontWeight.bold)),
          content: TextField(
            controller: _testTokenController,
            decoration: const InputDecoration(
              hintText: 'e.g. KC-7K-94821 or REVOKED',
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.pop(context);
                _verifyToken(_testTokenController.text.trim());
              },
              child: const Text('Verify'),
            ),
          ],
        );
      },
    );
  }
}
