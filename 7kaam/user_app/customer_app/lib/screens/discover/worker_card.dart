import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/constants/app_colors.dart';
import '../../models/worker_public_model.dart';
import '../../widgets/tier_badge.dart';

class WorkerCard extends StatelessWidget {
  final WorkerPublicModel worker;
  final VoidCallback? onCall;

  const WorkerCard({
    super.key,
    required this.worker,
    this.onCall,
  });

  void _callWorker(BuildContext context, String phoneNumber) async {
    final uri = Uri.parse('tel:$phoneNumber');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    } else {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Calling $phoneNumber...')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () {
        context.push('/worker/${worker.id}', extra: worker);
      },
      borderRadius: BorderRadius.circular(12),
      child: Container(
        margin: const EdgeInsets.only(bottom: 14),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
          border: Border.all(color: AppColors.borderGray.withValues(alpha: 0.6)),
        ),
        child: Column(
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Avatar with Tier Badge Overlay
                Stack(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(28),
                      child: CachedNetworkImage(
                        imageUrl: worker.photoUrl,
                        width: 56,
                        height: 56,
                        fit: BoxFit.cover,
                        placeholder: (context, url) => Container(
                          color: AppColors.borderGray,
                          child: const Icon(Icons.person, color: Colors.grey),
                        ),
                        errorWidget: (context, url, error) => Container(
                          color: AppColors.borderGray,
                          child: const Icon(Icons.person, color: Colors.grey),
                        ),
                      ),
                    ),
                    if (worker.aadhaarVerified)
                      Positioned(
                        bottom: 0,
                        right: 0,
                        child: Container(
                          padding: const EdgeInsets.all(2),
                          decoration: const BoxDecoration(
                            color: Colors.white,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.check_circle,
                            color: AppColors.primaryTeal,
                            size: 16,
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(width: 12),

                // Name, Trade, KaamCard Status & Score
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              worker.name,
                              style: GoogleFonts.poppins(
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                                color: AppColors.darkText,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.navy.withValues(alpha: 0.08),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              worker.trade,
                              style: GoogleFonts.poppins(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: AppColors.navy,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),

                      // KaamCard Status Badge & Score
                      Row(
                        children: [
                          const Icon(Icons.star_rounded, color: AppColors.gold, size: 18),
                          const SizedBox(width: 2),
                          Text(
                            '${worker.score}/100',
                            style: GoogleFonts.poppins(
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                              color: AppColors.darkText,
                            ),
                          ),
                          const SizedBox(width: 6),
                          TierBadge(tier: worker.tier, isSmall: true),
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: worker.hasKaamCard
                                  ? Colors.green.withValues(alpha: 0.12)
                                  : Colors.orange.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              worker.hasKaamCard ? '✓ KaamCard' : 'Listed',
                              style: GoogleFonts.poppins(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: worker.hasKaamCard ? Colors.green : Colors.orange,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),

                      // Location & Distance
                      Row(
                        children: [
                          const Icon(Icons.location_on_outlined, color: AppColors.grayText, size: 14),
                          const SizedBox(width: 2),
                          Expanded(
                            child: Text(
                              '${worker.locality} · ${worker.distanceKm} km away',
                              style: GoogleFonts.poppins(
                                fontSize: 12,
                                color: AppColors.grayText,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),

            const SizedBox(height: 12),
            const Divider(height: 1, color: AppColors.borderGray),
            const SizedBox(height: 10),

            // Bottom Bar: Mini score pills + Call Worker button
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    _buildMiniPill('🎥', '${worker.scoreBreakdown.videoScore}'),
                    const SizedBox(width: 6),
                    _buildMiniPill('📝', '${worker.scoreBreakdown.testScore}'),
                    const SizedBox(width: 6),
                    _buildMiniPill('💼', '${worker.scoreBreakdown.workHistoryScore}'),
                  ],
                ),
                ElevatedButton.icon(
                  onPressed: onCall ?? () => _callWorker(context, worker.phone),
                  icon: const Icon(Icons.phone, size: 14, color: Colors.white),
                  label: Text(
                    'Call Worker',
                    style: GoogleFonts.poppins(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: Colors.white,
                    ),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primaryTeal,
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    minimumSize: const Size(0, 32),
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMiniPill(String emoji, String scoreText) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
      decoration: BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: AppColors.borderGray),
      ),
      child: Row(
        children: [
          Text(emoji, style: const TextStyle(fontSize: 11)),
          const SizedBox(width: 3),
          Text(
            scoreText,
            style: GoogleFonts.poppins(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: AppColors.darkText,
            ),
          ),
        ],
      ),
    );
  }
}
