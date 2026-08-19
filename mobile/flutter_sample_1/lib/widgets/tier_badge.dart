import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../core/constants/app_colors.dart';

class TierBadge extends StatelessWidget {
  final String? tier;
  final bool isLarge;

  const TierBadge({
    super.key,
    this.tier,
    this.isLarge = false,
  });

  @override
  Widget build(BuildContext context) {
    final t = (tier ?? 'BRONZE').toUpperCase();

    Color bgColor;
    Color fgColor;
    IconData icon;

    switch (t) {
      case 'EXPERT':
        bgColor = const Color(0xFF4A148C);
        fgColor = Colors.white;
        icon = Icons.workspace_premium;
        break;
      case 'GOLD':
        bgColor = AppColors.gold;
        fgColor = Colors.white;
        icon = Icons.military_tech;
        break;
      case 'SILVER':
        bgColor = const Color(0xFF78909C);
        fgColor = Colors.white;
        icon = Icons.verified;
        break;
      case 'BRONZE':
      default:
        bgColor = const Color(0xFFA1887F);
        fgColor = Colors.white;
        icon = Icons.star_border;
        break;
    }

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: isLarge ? 16 : 10,
        vertical: isLarge ? 8 : 4,
      ),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(20),
        boxShadow: isLarge
            ? [
                BoxShadow(
                  color: bgColor.withValues(alpha: 0.4),
                  blurRadius: 6,
                  offset: const Offset(0, 3),
                )
              ]
            : null,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: fgColor, size: isLarge ? 18 : 14),
          const SizedBox(width: 4),
          Text(
            t,
            style: GoogleFonts.poppins(
              color: fgColor,
              fontSize: isLarge ? 14 : 12,
              fontWeight: FontWeight.bold,
              letterSpacing: 0.8,
            ),
          ),
        ],
      ),
    );
  }
}
