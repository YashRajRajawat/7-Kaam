import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/constants/app_colors.dart';
import '../../models/worker_public_model.dart';
import '../../widgets/tier_badge.dart';

class WorkerCard extends StatelessWidget {
  final WorkerPublicModel worker;

  const WorkerCard({
    super.key,
    required this.worker,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () {
        context.push('/worker/${worker.id}');
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
                // Avatar
                ClipRRect(
                  borderRadius: BorderRadius.circular(28),
                  child: worker.profilePhotoUrl != null
                      ? CachedNetworkImage(
                          imageUrl: worker.profilePhotoUrl!,
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
                        )
                      : Container(
                          width: 56,
                          height: 56,
                          color: AppColors.borderGray,
                          child: const Icon(Icons.person, color: Colors.grey),
                        ),
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
                              worker.fullName,
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
                              worker.trade.replaceAll('_', ' '),
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
                            worker.finalScore != null ? '${worker.finalScore!.toInt()}/100' : 'Not scored yet',
                            style: GoogleFonts.poppins(
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                              color: AppColors.darkText,
                            ),
                          ),
                          if (worker.tier != null) ...[
                            const SizedBox(width: 6),
                            TierBadge(tier: worker.tier!, isSmall: true),
                          ],
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
                              [
                                if (worker.locality != null) worker.locality!,
                                worker.city,
                                if (worker.distanceKm != null) '${worker.distanceKm!.toStringAsFixed(1)} km away',
                              ].join(' · '),
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

            // Bottom Bar: real list-level signals only (no phone/score-breakdown at list level)
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    _buildMiniPill('📜', '${worker.certificatesEarned} certs'),
                    const SizedBox(width: 6),
                    _buildMiniPill('👤', worker.credibilityLevel),
                  ],
                ),
                Text(
                  'View Profile →',
                  style: GoogleFonts.poppins(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primaryTeal,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMiniPill(String emoji, String text) {
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
            text,
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
