import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Palette for unclaimed public-directory listings (spec §E.1).
///
/// Deliberately OUTSIDE the tier / score / verified palette.
/// NEVER use primaryTeal, Colors.green, gold, or any tier* colour here:
/// teal == verified, green == KaamCard, gold == score, orange == in-process.
/// Red is also wrong — these are legitimate businesses, not scams.
///
/// These live here rather than in `app_colors.dart` because
/// `lib/core/constants/app_colors.dart` is not owned by this change set.
/// When §E.1 lands in `AppColors`, move these four and re-point the
/// references in this file — the hex values are already the §E.1 values.
class UnclaimedColors {
  const UnclaimedColors._();

  static const Color bg = Color(0xFFF1F5F9); // slate-100
  static const Color border = Color(0xFFCBD5E1); // slate-300
  static const Color text = Color(0xFF475569); // slate-600
  static const Color accent = Color(0xFF64748B); // slate-500
}

/// Verbatim user-facing copy for unclaimed listings (spec §E.4).
///
/// Copy rules: never the word "yet"; never "Listed", "Pending", "Emerging",
/// "Under Review", "Verified"; always name the source and the absence of
/// verification in the same sentence.
class UnclaimedCopy {
  const UnclaimedCopy._();

  static const String cardStrip =
      'Unverified listing · from a public business directory';
  static const String cardChip = 'Not verified by 7 Kaam';
  static const String cardCta = 'View listing →';
  static const String listEmpty = 'No workers found';
  static const String filterChip = 'Verified only';

  static const String detailAppBarTitle = 'Directory Listing';
  static const String detailDisclosureTitle =
      'This business has not joined 7 Kaam';
  static const String detailDisclosureBody =
      'We found this business in a public directory. 7 Kaam has not verified '
      'their identity, their skills or their work history. No skill video, no '
      'trade test and no Aadhaar check has been done.\n\nPlease make your own '
      'checks before hiring. 7 Kaam does not endorse or recommend this business.';
  static const String detailNovrfTitle = 'No 7 Kaam verification';
  static const List<String> detailNovrfRows = <String>[
    'Skill video — not submitted',
    'Trade test — not taken',
    'Work history — not verified',
    'Aadhaar — not verified',
  ];
  static const String detailNovrfFooter =
      'Verified 7 Kaam workers complete all four. Look for the KaamCard badge.';
  static const String detailClaimTitle = 'Is this your business?';
  static const String detailClaimBody =
      'Claim this listing to correct your details and get verified, or ask us '
      'to remove it. Claiming is free.';
  static const String detailClaimPrimary = 'Claim this listing';
  static const String detailClaimSecondary = 'Remove this listing';
  static const String detailClaimFootnote =
      'We will confirm you own this business before making any changes.';
  static const String detailPhoneNote =
      'Public phone number from a business directory. 7 Kaam has not contacted '
      'or verified this business.';
  static const String detailReportHeading = 'Something wrong with this listing?';
  static const List<String> detailReportNewReasons = <String>[
    'This business has closed',
    'Wrong phone number or address',
    'I do not want to be listed',
  ];

  static String listHeader(int n, String city) => '$n results in $city';
  static String listSubheader(int v, int u) =>
      '$v verified by 7 Kaam · $u unverified directory listings';
  static String mapHeader(int n) => '$n results on map';
  static String mapSubheader(int u) => '$u are unverified directory listings';
  static String mapInfoSnippet(String d) => 'Unverified listing · $d km away';
}

/// The one badge that marks a public-directory listing as unverified.
///
/// Icon rule: `Icons.info_outline` only. Never `Icons.verified`,
/// `Icons.check_circle*`, `Icons.hourglass_empty`, `Icons.star*`, or any tick.
class UnclaimedBadge extends StatelessWidget {
  final _UnclaimedBadgeVariant _variant;
  final String? sourceName;

  /// Full-width strip: slate fill, 3px slate left accent bar, info icon.
  const UnclaimedBadge.strip({super.key, required this.sourceName})
      : _variant = _UnclaimedBadgeVariant.strip;

  /// Compact pill for score-row / marker-card slots.
  const UnclaimedBadge.chip({super.key})
      : sourceName = null,
        _variant = _UnclaimedBadgeVariant.chip;

  @override
  Widget build(BuildContext context) {
    switch (_variant) {
      case _UnclaimedBadgeVariant.strip:
        return _buildStrip();
      case _UnclaimedBadgeVariant.chip:
        return _buildChip();
    }
  }

  Widget _buildStrip() {
    final name = sourceName?.trim();
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(10, 7, 10, 7),
      decoration: const BoxDecoration(
        color: UnclaimedColors.bg,
        border: Border(
          left: BorderSide(color: UnclaimedColors.accent, width: 3),
        ),
        borderRadius: BorderRadius.all(Radius.circular(6)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.info_outline, size: 12, color: UnclaimedColors.accent),
          const SizedBox(width: 6),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  UnclaimedCopy.cardStrip,
                  style: GoogleFonts.poppins(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: UnclaimedColors.text,
                  ),
                ),
                if (name != null && name.isNotEmpty)
                  Text(
                    'Source: $name',
                    style: GoogleFonts.poppins(
                      fontSize: 11,
                      color: UnclaimedColors.text,
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildChip() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: UnclaimedColors.bg,
        border: Border.all(color: UnclaimedColors.border, width: 1),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.info_outline, size: 10, color: UnclaimedColors.accent),
          const SizedBox(width: 3),
          Text(
            UnclaimedCopy.cardChip,
            style: GoogleFonts.poppins(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              color: UnclaimedColors.text,
            ),
          ),
        ],
      ),
    );
  }
}

enum _UnclaimedBadgeVariant { strip, chip }
