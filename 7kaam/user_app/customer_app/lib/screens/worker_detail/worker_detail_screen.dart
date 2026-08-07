import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/constants/app_colors.dart';
import '../../models/worker_public_model.dart';
import '../../widgets/custom_button.dart';
import '../../widgets/score_bar.dart';
import '../../widgets/tier_badge.dart';

class WorkerDetailScreen extends ConsumerWidget {
  final WorkerPublicModel worker;

  const WorkerDetailScreen({
    super.key,
    required this.worker,
  });



  void _openCertificate(BuildContext context, String qrToken) async {
    final url = Uri.parse('http://localhost:8000/api/v1/verify/$qrToken');
    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Opening verification link: $qrToken')),
      );
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: AppColors.navy),
          onPressed: () => context.pop(),
        ),
        title: Text(
          'Worker Profile',
          style: GoogleFonts.poppins(
            color: AppColors.navy,
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.share_outlined, color: AppColors.navy),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Profile link copied to clipboard')),
              );
            },
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // HEADER SECTION
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.04),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Column(
                      children: [
                        Center(
                          child: Stack(
                            children: [
                              ClipRRect(
                                borderRadius: BorderRadius.circular(40),
                                child: CachedNetworkImage(
                                  imageUrl: worker.photoUrl,
                                  width: 80,
                                  height: 80,
                                  fit: BoxFit.cover,
                                ),
                              ),
                              Positioned(
                                bottom: 0,
                                right: 0,
                                child: Container(
                                  padding: const EdgeInsets.all(3),
                                  decoration: const BoxDecoration(
                                    color: Colors.white,
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(
                                    Icons.verified,
                                    color: AppColors.primaryTeal,
                                    size: 22,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          worker.name,
                          style: GoogleFonts.poppins(
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                            color: AppColors.darkText,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                              decoration: BoxDecoration(
                                color: AppColors.navy.withOpacity(0.08),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                worker.trade,
                                style: GoogleFonts.poppins(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.navy,
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              '· ${worker.city}',
                              style: GoogleFonts.poppins(
                                fontSize: 13,
                                color: AppColors.grayText,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        if (worker.aadhaarVerified)
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.check_circle_outline, color: Colors.green, size: 16),
                              const SizedBox(width: 4),
                              Text(
                                'Aadhaar Verified',
                                style: GoogleFonts.poppins(
                                  color: Colors.green,
                                  fontWeight: FontWeight.w600,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // SCORE SECTION
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.04),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'AI Skill Certification Score',
                          style: GoogleFonts.poppins(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: AppColors.navy,
                          ),
                        ),
                        const SizedBox(height: 16),

                        // Score Ring & Tier Display
                        Row(
                          children: [
                            // Circular Score Ring
                            Container(
                              width: 90,
                              height: 90,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                border: Border.all(color: AppColors.primaryTeal, width: 6),
                                color: AppColors.primaryTeal.withOpacity(0.06),
                              ),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text(
                                    '${worker.score}',
                                    style: GoogleFonts.poppins(
                                      fontSize: 26,
                                      fontWeight: FontWeight.bold,
                                      color: AppColors.primaryTeal,
                                    ),
                                  ),
                                  Text(
                                    '/100',
                                    style: GoogleFonts.poppins(
                                      fontSize: 11,
                                      color: AppColors.grayText,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 20),

                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  TierBadge(tier: worker.tier),
                                  const SizedBox(height: 8),
                                  Text(
                                    'Certified ${worker.tier} Worker',
                                    style: GoogleFonts.poppins(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 14,
                                      color: AppColors.darkText,
                                    ),
                                  ),
                                  Text(
                                    'Verified via 3-Signal AI Fusion Engine',
                                    style: GoogleFonts.poppins(
                                      fontSize: 11,
                                      color: AppColors.grayText,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 20),
                        const Divider(height: 1, color: AppColors.borderGray),
                        const SizedBox(height: 12),

                        // 3 Sub-score Progress Bars
                        ScoreBar(
                          label: 'Skill Video Practical',
                          iconEmoji: '🎥',
                          score: worker.scoreBreakdown.videoScore,
                        ),
                        ScoreBar(
                          label: 'Trade Test Assessment',
                          iconEmoji: '📝',
                          score: worker.scoreBreakdown.testScore,
                        ),
                        ScoreBar(
                          label: 'Verified Work History',
                          iconEmoji: '💼',
                          score: worker.scoreBreakdown.workHistoryScore,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // ABOUT SECTION
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.04),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Worker Details',
                          style: GoogleFonts.poppins(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: AppColors.navy,
                          ),
                        ),
                        const SizedBox(height: 12),
                        _buildInfoRow(Icons.construction_rounded, 'Trade', worker.trade),
                        _buildInfoRow(Icons.location_on_outlined, 'Location', '${worker.locality}, ${worker.city}'),
                        _buildInfoRow(Icons.event_available_outlined, 'Certificate Valid Until', worker.validUntil),
                        _buildInfoRow(Icons.verified_user_outlined, 'Platform Member Since', worker.memberSince),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // WORK HISTORY SECTION
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.04),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Verified Work History',
                          style: GoogleFonts.poppins(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: AppColors.navy,
                          ),
                        ),
                        const SizedBox(height: 12),
                        ...worker.workHistories.map((h) => Padding(
                              padding: const EdgeInsets.only(bottom: 12.0),
                              child: Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(10),
                                    decoration: BoxDecoration(
                                      color: AppColors.primaryTeal.withOpacity(0.08),
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: const Icon(Icons.business_rounded, color: AppColors.primaryTeal),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          children: [
                                            Text(
                                              h.employerName,
                                              style: GoogleFonts.poppins(
                                                fontWeight: FontWeight.bold,
                                                fontSize: 14,
                                              ),
                                            ),
                                            if (h.isVerified) ...[
                                              const SizedBox(width: 4),
                                              const Icon(Icons.verified, color: AppColors.primaryTeal, size: 14),
                                            ],
                                          ],
                                        ),
                                        Text(
                                          h.role,
                                          style: GoogleFonts.poppins(
                                            fontSize: 12,
                                            color: AppColors.grayText,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Row(
                                    children: [
                                      const Icon(Icons.star_rounded, color: AppColors.gold, size: 16),
                                      const SizedBox(width: 2),
                                      Text(
                                        '${h.rating}',
                                        style: GoogleFonts.poppins(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 13,
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            )),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // VERIFY CERTIFICATE SECTION
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.navy.withOpacity(0.04),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.navy.withOpacity(0.12)),
                    ),
                    child: Column(
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.qr_code_scanner_rounded, color: AppColors.navy, size: 28),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'KaamCard Digital Certificate',
                                    style: GoogleFonts.poppins(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 14,
                                      color: AppColors.navy,
                                    ),
                                  ),
                                  Text(
                                    'QR Token: ${worker.qrToken}',
                                    style: GoogleFonts.poppins(
                                      fontSize: 12,
                                      color: AppColors.grayText,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: CustomButton(
                                text: 'Scan QR Code',
                                icon: Icons.qr_code_2_rounded,
                                height: 40,
                                isOutlined: true,
                                onPressed: () {
                                  context.push('/qr_scan');
                                },
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: CustomButton(
                                text: 'View Card',
                                icon: Icons.launch_rounded,
                                height: 40,
                                onPressed: () {
                                  _openCertificate(context, worker.qrToken);
                                },
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                ],
              ),
            ),
          ),

          // STICKY BOTTOM DIRECT CONTACT BAR
          Container(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.08),
                  blurRadius: 16,
                  offset: const Offset(0, -4),
                ),
              ],
            ),
            child: Row(
              children: [
                Expanded(
                  child: CustomButton(
                    text: 'Call ${worker.phone}',
                    icon: Icons.phone,
                    onPressed: () async {
                      final uri = Uri.parse('tel:${worker.phone}');
                      if (await canLaunchUrl(uri)) {
                        await launchUrl(uri);
                      }
                    },
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: CustomButton(
                    text: 'WhatsApp',
                    icon: Icons.chat_bubble_outline_rounded,
                    isOutlined: true,
                    onPressed: () async {
                      final cleanPhone = worker.phone.replaceAll(RegExp(r'\D'), '');
                      final uri = Uri.parse('https://wa.me/91$cleanPhone?text=Hi%20${worker.name},%20I%20found%20your%20verified%20profile%20on%207%20Kaam!');
                      if (await canLaunchUrl(uri)) {
                        await launchUrl(uri, mode: LaunchMode.externalApplication);
                      }
                    },
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6.0),
      child: Row(
        children: [
          Icon(icon, size: 18, color: AppColors.primaryTeal),
          const SizedBox(width: 10),
          Text(
            '$label: ',
            style: GoogleFonts.poppins(fontSize: 13, color: AppColors.grayText),
          ),
          Expanded(
            child: Text(
              value,
              style: GoogleFonts.poppins(
                fontSize: 13,
                fontWeight: FontWeight.bold,
                color: AppColors.darkText,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}
