import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../core/constants/app_colors.dart';

class TierBadge extends StatelessWidget {
  final String tier;
  final bool isSmall;

  const TierBadge({
    super.key,
    required this.tier,
    this.isSmall = false,
  });

  @override
  Widget build(BuildContext context) {
    Color badgeColor;
    Color textColor = Colors.white;

    switch (tier.toUpperCase()) {
      case 'EXPERT':
        badgeColor = AppColors.tierExpert;
        break;
      case 'GOLD':
        badgeColor = AppColors.tierGold;
        break;
      case 'SILVER':
        badgeColor = AppColors.tierSilver;
        break;
      case 'BRONZE':
      default:
        badgeColor = AppColors.tierBronze;
        break;
    }

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: isSmall ? 6 : 10,
        vertical: isSmall ? 2 : 4,
      ),
      decoration: BoxDecoration(
        color: badgeColor,
        borderRadius: BorderRadius.circular(6),
        boxShadow: [
          BoxShadow(
            color: badgeColor.withValues(alpha: 0.3),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Text(
        tier.toUpperCase(),
        style: GoogleFonts.poppins(
          color: textColor,
          fontWeight: FontWeight.w700,
          fontSize: isSmall ? 10 : 12,
          letterSpacing: 0.5,
        ),
      ),
    );
  }
}
