import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../core/constants/app_colors.dart';

/// A tier a worker has actually earned. Renders NOTHING for null or for any
/// value outside the four real tiers.
///
/// The previous `default:` branch painted BRONZE for any unknown string — so
/// a `tier: 'NONE'` sentinel (the QR scanner's NOT-FOUND result) rendered as a
/// bronze "NONE" badge, i.e. a credential the platform never issued. There is
/// deliberately no `default:` and no fallback colour below.
class TierBadge extends StatelessWidget {
  static const Set<String> validTiers = {'EXPERT', 'GOLD', 'SILVER', 'BRONZE'};

  /// Nullable on purpose — never give this a default.
  final String? tier;
  final bool isSmall;

  const TierBadge({
    super.key,
    required this.tier,
    this.isSmall = false,
  });

  /// True when [tier] is a real, earned tier this widget will actually paint.
  static bool isRealTier(String? tier) =>
      tier != null && validTiers.contains(tier.toUpperCase());

  @override
  Widget build(BuildContext context) {
    final t = tier?.toUpperCase();
    if (t == null || !validTiers.contains(t)) {
      return const SizedBox.shrink();
    }

    final Color badgeColor;
    switch (t) {
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
        badgeColor = AppColors.tierBronze;
        break;
      default:
        // Unreachable — guarded by the validTiers check above. Present only
        // because Dart's definite-assignment analysis requires it. Must never
        // paint a tier colour.
        return const SizedBox.shrink();
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
        t,
        style: GoogleFonts.poppins(
          color: Colors.white,
          fontWeight: FontWeight.w700,
          fontSize: isSmall ? 10 : 12,
          letterSpacing: 0.5,
        ),
      ),
    );
  }
}
