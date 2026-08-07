import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:intl/intl.dart';
import '../core/constants/app_colors.dart';
import '../models/kaam_card_model.dart';
import 'tier_badge.dart';

class KaamCardWidget extends StatelessWidget {
  final KaamCardModel card;
  final bool isCompact;

  const KaamCardWidget({
    super.key,
    required this.card,
    this.isCompact = false,
  });

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat('dd MMM yyyy');

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF1A3557), Color(0xFF0F6E56)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [
          BoxShadow(
            color: Colors.black26,
            blurRadius: 10,
            offset: Offset(0, 4),
          ),
        ],
      ),
      padding: EdgeInsets.all(isCompact ? 14 : 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Row: 7 Kaam logo & Verified Skill Certificate tag
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppColors.gold,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      '7',
                      style: GoogleFonts.poppins(
                        fontSize: isCompact ? 16 : 20,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    'Kaam',
                    style: GoogleFonts.poppins(
                      fontSize: isCompact ? 16 : 20,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                      letterSpacing: 0.5,
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.white30),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.verified, color: AppColors.gold, size: 14),
                    const SizedBox(width: 4),
                    Text(
                      'Verified Certificate',
                      style: GoogleFonts.poppins(
                        color: Colors.white,
                        fontSize: isCompact ? 10 : 12,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          SizedBox(height: isCompact ? 12 : 16),

          // Worker Details Row
          Row(
            children: [
              // Photo
              ClipRRect(
                borderRadius: BorderRadius.circular(40),
                child: SizedBox(
                  width: isCompact ? 50 : 64,
                  height: isCompact ? 50 : 64,
                  child: card.profilePhotoUrl != null && card.profilePhotoUrl!.isNotEmpty
                      ? CachedNetworkImage(
                          imageUrl: card.profilePhotoUrl!,
                          fit: BoxFit.cover,
                          placeholder: (context, url) => Container(color: Colors.white24),
                          errorWidget: (context, url, error) => const Icon(Icons.person, color: Colors.white),
                        )
                      : Container(
                          color: Colors.white24,
                          child: Icon(Icons.person, color: Colors.white, size: isCompact ? 30 : 40),
                        ),
                ),
              ),
              const SizedBox(width: 14),
              // Name, Trade, City
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      card.workerName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.poppins(
                        fontSize: isCompact ? 16 : 19,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            card.trade.replaceAll('_', ' '),
                            style: GoogleFonts.poppins(
                              fontSize: isCompact ? 10 : 11,
                              fontWeight: FontWeight.w600,
                              color: Colors.white,
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),
                        Icon(Icons.location_on, color: Colors.white70, size: isCompact ? 12 : 14),
                        const SizedBox(width: 2),
                        Expanded(
                          child: Text(
                            card.city,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: GoogleFonts.poppins(
                              fontSize: isCompact ? 11 : 12,
                              color: Colors.white70,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              // Tier Badge
              TierBadge(tier: card.tier, isLarge: !isCompact),
            ],
          ),
          SizedBox(height: isCompact ? 12 : 16),

          // Score Section
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'SKILL SCORE',
                    style: GoogleFonts.poppins(
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                      color: Colors.white60,
                      letterSpacing: 1.0,
                    ),
                  ),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.baseline,
                    textBaseline: TextBaseline.alphabetic,
                    children: [
                      Text(
                        card.score.toInt().toString(),
                        style: GoogleFonts.poppins(
                          fontSize: isCompact ? 28 : 36,
                          fontWeight: FontWeight.bold,
                          color: AppColors.gold,
                        ),
                      ),
                      Text(
                        '/100',
                        style: GoogleFonts.poppins(
                          fontSize: isCompact ? 12 : 14,
                          color: Colors.white70,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              if (card.aadhaarVerified)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.successGreen.withValues(alpha: 0.25),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppColors.successGreen),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.check_circle, color: Colors.greenAccent, size: 14),
                      const SizedBox(width: 4),
                      Text(
                        'Aadhaar Verified',
                        style: GoogleFonts.poppins(
                          color: Colors.greenAccent,
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),

          if (!isCompact && card.scoreBreakdown != null) ...[
            const SizedBox(height: 12),
            const Divider(color: Colors.white24),
            const SizedBox(height: 8),

            // 3 Sub-score bars
            _buildSubScoreBar('Video Test', card.scoreBreakdown!.videoScore),
            const SizedBox(height: 6),
            _buildSubScoreBar('Trade Exam', card.scoreBreakdown!.testScore),
            const SizedBox(height: 6),
            _buildSubScoreBar('Work History', card.scoreBreakdown!.workHistoryScore),
          ],

          const SizedBox(height: 12),
          const Divider(color: Colors.white24),
          const SizedBox(height: 8),

          // Footer: Issue/Expiry date + QR Code + Certificate ID
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'CERTIFICATE ID',
                      style: GoogleFonts.poppins(
                        fontSize: 9,
                        color: Colors.white60,
                        letterSpacing: 0.8,
                      ),
                    ),
                    Text(
                      card.certificateId.isNotEmpty
                          ? card.certificateId
                          : (card.id.length > 8 ? card.id.substring(0, 8).toUpperCase() : card.id),
                      style: GoogleFonts.poppins(
                        fontSize: isCompact ? 11 : 12,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Issued: ${dateFormat.format(card.issueDate)}',
                      style: GoogleFonts.poppins(fontSize: 10, color: Colors.white70),
                    ),
                    Text(
                      'Expires: ${dateFormat.format(card.expiryDate)}',
                      style: GoogleFonts.poppins(fontSize: 10, color: Colors.white70),
                    ),
                  ],
                ),
              ),

              // QR Code
              Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: QrImageView(
                  data: 'http://192.168.1.6:8000/api/v1/verify/${card.qrToken.isNotEmpty ? card.qrToken : card.workerId}',
                  version: QrVersions.auto,
                  size: isCompact ? 50 : 64,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSubScoreBar(String title, double value) {
    final pct = (value.clamp(0, 100)) / 100.0;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              title,
              style: GoogleFonts.poppins(fontSize: 11, color: Colors.white70),
            ),
            Text(
              '${value.toInt()}%',
              style: GoogleFonts.poppins(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.gold),
            ),
          ],
        ),
        const SizedBox(height: 3),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: pct,
            backgroundColor: Colors.white24,
            valueColor: const AlwaysStoppedAnimation<Color>(AppColors.gold),
            minHeight: 5,
          ),
        ),
      ],
    );
  }
}
