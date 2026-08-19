import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/constants/app_colors.dart';
import '../../models/worker_public_model.dart';
import '../../providers/auth_provider.dart';
import '../../providers/report_provider.dart';
import '../../providers/worker_detail_provider.dart';
import '../../widgets/custom_button.dart';
import '../../widgets/score_bar.dart';
import '../../widgets/tier_badge.dart';
import '../../widgets/unclaimed_badge.dart';

class WorkerDetailScreen extends ConsumerStatefulWidget {
  final String workerId;

  const WorkerDetailScreen({super.key, required this.workerId});

  @override
  ConsumerState<WorkerDetailScreen> createState() => _WorkerDetailScreenState();
}

class _WorkerDetailScreenState extends ConsumerState<WorkerDetailScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(workerDetailProvider.notifier).fetchWorker(widget.workerId));
  }

  void _openLoginSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _LoginBottomSheet(
        onLoggedIn: () => ref.read(workerDetailProvider.notifier).fetchWorker(widget.workerId),
      ),
    );
  }

  void _openReportSheet() {
    final authState = ref.read(authProvider);
    if (authState.status != AuthStatus.authenticated) {
      _openLoginSheet();
      return;
    }
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _ReportBottomSheet(
        workerId: widget.workerId,
        isUnclaimed: ref.read(workerDetailProvider).worker?.isUnclaimed ?? true,
      ),
    );
  }

  /// Claim / removal request for an unclaimed public-directory listing.
  /// Open to anyone — the real owner of a scraped business has no 7 Kaam
  /// account by definition, so requiring a login here would make the opt-out
  /// unreachable for exactly the people it exists for.
  void _openListingRequestSheet(String type) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _ListingRequestBottomSheet(
        workerId: widget.workerId,
        type: type,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(workerDetailProvider);
    final authState = ref.watch(authProvider);
    final isLoggedIn = authState.status == AuthStatus.authenticated;

    if (state.isLoading && state.worker == null) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator(color: AppColors.primaryTeal)),
      );
    }

    if (state.worker == null) {
      return Scaffold(
        appBar: AppBar(
          backgroundColor: Colors.white,
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios_new, color: AppColors.navy),
            onPressed: () => context.pop(),
          ),
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  state.errorMessage ?? 'Worker not found',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.poppins(color: AppColors.grayText),
                ),
                const SizedBox(height: 16),
                CustomButton(
                  text: 'Retry',
                  onPressed: () => ref.read(workerDetailProvider.notifier).fetchWorker(widget.workerId),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final worker = state.worker!;
    final isUnclaimed = worker.isUnclaimed;

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
          isUnclaimed ? UnclaimedCopy.detailAppBarTitle : 'Worker Profile',
          style: GoogleFonts.poppins(color: AppColors.navy, fontWeight: FontWeight.bold, fontSize: 18),
        ),
        centerTitle: true,
        actions: [
          // Sharing is suppressed entirely for unclaimed listings. The share
          // payload asserts "a worker on 7 Kaam" about a real, named business
          // that never joined and never consented; there is no safe rewrite of
          // that sentence, so the affordance goes away.
          if (!isUnclaimed)
          IconButton(
            icon: const Icon(Icons.share_outlined, color: AppColors.navy),
            tooltip: 'Share worker profile',
            onPressed: () {
              final trade = worker.trade.replaceAll('_', ' ');
              final certified = worker.hasKaamCard ? '\u2705 KaamCard Verified' : 'Unverified';
              Share.share(
                '👷 Check out this worker on 7 Kaam!\n'
                '👤 ${worker.fullName}\n'
                '🔧 $trade \u2022 ${worker.city}\n'
                '$certified\n'
                '📱 Download 7 Kaam to see contact details.',
                subject: '${worker.fullName} — 7 Kaam Worker Profile',
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
                  // INVARIANT I4 — the disclosure is the FIRST thing in the
                  // scroll view, above the name. Never behind a scroll, a tab
                  // or an expand.
                  if (isUnclaimed) ...[
                    _buildDisclosureCard(worker),
                    const SizedBox(height: 16),
                  ],
                  _buildHeader(worker),
                  const SizedBox(height: 16),
                  // Never render the score section for an unclaimed listing:
                  // no teal ring, no '—/100', no credibility text, no
                  // "Based on 0 assessments", no "not assessed" score rows.
                  // A slate statement of what is absent goes there instead.
                  if (isUnclaimed)
                    _buildNoVerificationCard()
                  else
                    _buildScoreSection(worker),
                  const SizedBox(height: 16),
                  if (isUnclaimed && worker.isClaimable) ...[
                    _buildClaimCard(),
                    const SizedBox(height: 16),
                  ],
                  if (worker.certificates.isNotEmpty) ...[
                    _buildCertificatesSection(worker),
                    const SizedBox(height: 16),
                  ],
                  if (worker.workHistory.isNotEmpty) ...[
                    _buildExperienceSection(worker),
                    const SizedBox(height: 16),
                  ],
                  _buildReportSection(isUnclaimed),
                  const SizedBox(height: 20),
                ],
              ),
            ),
          ),
          _buildContactBar(worker, isLoggedIn),
        ],
      ),
    );
  }

  Widget _card({required Widget child}) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 12, offset: const Offset(0, 4)),
        ],
      ),
      child: child,
    );
  }

  /// Slate card shell for unclaimed-listing surfaces. Deliberately shares no
  /// colour with the verified / tier / score palette.
  Widget _slateCard({required Widget child, Color background = UnclaimedColors.bg}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: UnclaimedColors.border),
      ),
      child: child,
    );
  }

  /// `detail.disclosure.*` — spec §E.4, verbatim.
  Widget _buildDisclosureCard(WorkerPublicModel worker) {
    final sourceName = worker.sourceName?.trim();
    final sourceAddress = worker.sourceAddress?.trim();
    return _slateCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.info_outline, size: 18, color: UnclaimedColors.accent),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  UnclaimedCopy.detailDisclosureTitle,
                  style: GoogleFonts.poppins(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: UnclaimedColors.text,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            UnclaimedCopy.detailDisclosureBody,
            style: GoogleFonts.poppins(fontSize: 12, height: 1.5, color: UnclaimedColors.text),
          ),
          if (sourceName != null && sourceName.isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(
              'Source: $sourceName',
              style: GoogleFonts.poppins(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: UnclaimedColors.text,
              ),
            ),
          ],
          if (sourceAddress != null && sourceAddress.isNotEmpty)
            Text(
              sourceAddress,
              style: GoogleFonts.poppins(fontSize: 11, color: UnclaimedColors.text),
            ),
        ],
      ),
    );
  }

  /// `detail.novrf.*` — spec §E.4, verbatim. Outline circles only; never a
  /// checkmark, never teal, never a number.
  Widget _buildNoVerificationCard() {
    return _slateCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            UnclaimedCopy.detailNovrfTitle,
            style: GoogleFonts.poppins(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: UnclaimedColors.text,
            ),
          ),
          const SizedBox(height: 12),
          ...UnclaimedCopy.detailNovrfRows.map(
            (row) => Padding(
              padding: const EdgeInsets.only(bottom: 8.0),
              child: Row(
                children: [
                  const Icon(Icons.radio_button_unchecked,
                      size: 14, color: UnclaimedColors.accent),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      row,
                      style: GoogleFonts.poppins(fontSize: 13, color: UnclaimedColors.text),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            UnclaimedCopy.detailNovrfFooter,
            style: GoogleFonts.poppins(fontSize: 11, color: UnclaimedColors.text),
          ),
        ],
      ),
    );
  }

  /// `detail.claim.*` — spec §E.4, verbatim. An OUTLINED slate button, never a
  /// filled teal one: teal is the verified colour.
  Widget _buildClaimCard() {
    return _slateCard(
      background: Colors.white,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            UnclaimedCopy.detailClaimTitle,
            style: GoogleFonts.poppins(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: UnclaimedColors.text,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            UnclaimedCopy.detailClaimBody,
            style: GoogleFonts.poppins(fontSize: 12, height: 1.5, color: UnclaimedColors.text),
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: () => _openListingRequestSheet('CLAIM'),
              style: OutlinedButton.styleFrom(
                foregroundColor: UnclaimedColors.accent,
                side: const BorderSide(color: UnclaimedColors.accent),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
              child: Text(
                UnclaimedCopy.detailClaimPrimary,
                style: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.w600),
              ),
            ),
          ),
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            child: TextButton(
              onPressed: () => _openListingRequestSheet('REMOVAL'),
              style: TextButton.styleFrom(foregroundColor: UnclaimedColors.text),
              child: Text(
                UnclaimedCopy.detailClaimSecondary,
                style: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.w600),
              ),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            UnclaimedCopy.detailClaimFootnote,
            style: GoogleFonts.poppins(fontSize: 11, color: UnclaimedColors.text),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(WorkerPublicModel worker) {
    return _card(
      child: Column(
        children: [
          Center(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(40),
              child: worker.profilePhotoUrl != null
                  ? CachedNetworkImage(imageUrl: worker.profilePhotoUrl!, width: 80, height: 80, fit: BoxFit.cover)
                  : Container(
                      width: 80,
                      height: 80,
                      color: AppColors.borderGray,
                      child: const Icon(Icons.person, size: 40, color: Colors.grey),
                    ),
            ),
          ),
          const SizedBox(height: 12),
          Text(worker.fullName, style: GoogleFonts.poppins(fontSize: 22, fontWeight: FontWeight.bold, color: AppColors.darkText)),
          const SizedBox(height: 6),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                decoration: BoxDecoration(color: AppColors.navy.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(6)),
                child: Text(worker.trade.replaceAll('_', ' '), style: GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.navy)),
              ),
              const SizedBox(width: 8),
              Text('· ${worker.city}', style: GoogleFonts.poppins(fontSize: 13, color: AppColors.grayText)),
            ],
          ),
          const SizedBox(height: 8),
          Wrap(
            alignment: WrapAlignment.center,
            spacing: 8,
            runSpacing: 6,
            children: [
              if (worker.aadhaarVerified)
                _pillChip(Icons.check_circle_outline, 'Aadhaar Verified', Colors.green),
              if (worker.underReview)
                _pillChip(Icons.info_outline, 'Under Review', Colors.orange),
              // Suppressed for unclaimed listings — the disclosure card above
              // already states the absence of verification, and an hourglass
              // implies a process this business never entered.
              if (worker.hasKaamCard)
                _pillChip(Icons.verified, 'KaamCard Certified', AppColors.primaryTeal)
              else if (!worker.isUnclaimed)
                _pillChip(Icons.hourglass_empty, 'Not yet KaamCard certified', Colors.grey),
            ],
          ),
        ],
      ),
    );
  }

  Widget _pillChip(IconData icon, String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(20)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 4),
          Text(label, style: GoogleFonts.poppins(fontSize: 11, fontWeight: FontWeight.w600, color: color)),
        ],
      ),
    );
  }

  Widget _buildScoreSection(WorkerPublicModel worker) {
    final assessmentCount = (worker.totalTestsTaken ?? 0) + (worker.totalVideosTaken ?? 0);
    return _card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('AI Skill Certification Score', style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.navy)),
          const SizedBox(height: 16),
          Row(
            children: [
              Container(
                width: 90,
                height: 90,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: AppColors.primaryTeal, width: 6),
                  color: AppColors.primaryTeal.withValues(alpha: 0.06),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      worker.finalScore != null ? '${worker.finalScore!.toInt()}' : '—',
                      style: GoogleFonts.poppins(fontSize: 26, fontWeight: FontWeight.bold, color: AppColors.primaryTeal),
                    ),
                    Text('/100', style: GoogleFonts.poppins(fontSize: 11, color: AppColors.grayText)),
                  ],
                ),
              ),
              const SizedBox(width: 20),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (worker.tier != null) TierBadge(tier: worker.tier),
                    const SizedBox(height: 8),
                    // credibilityLevel is String? — the server sends null for
                    // any row it has not assessed. Rendering a client-side
                    // default here is how a worker acquires a credibility rung
                    // nobody granted, so there is no `??` fallback.
                    if (worker.credibilityLevel != null)
                      Text(
                        worker.credibilityLevel!,
                        style: GoogleFonts.poppins(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.darkText),
                      ),
                    Text(
                      'Based on $assessmentCount assessment${assessmentCount == 1 ? '' : 's'}',
                      style: GoogleFonts.poppins(fontSize: 11, color: AppColors.grayText),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          const Divider(height: 1, color: AppColors.borderGray),
          const SizedBox(height: 12),
          _scoreRow('🎥', 'Skill Video Practical', worker.videoScore),
          _scoreRow('📝', 'Trade Test Assessment', worker.testScore),
          _scoreRow('💼', 'Verified Work History', worker.workHistoryScore),
        ],
      ),
    );
  }

  Widget _scoreRow(String emoji, String label, double? score) {
    if (score == null) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 6.0),
        child: Row(
          children: [
            Text(emoji, style: const TextStyle(fontSize: 16)),
            const SizedBox(width: 8),
            Text(label, style: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.darkText)),
            const Spacer(),
            Text('Not yet assessed', style: GoogleFonts.poppins(fontSize: 12, color: AppColors.grayText)),
          ],
        ),
      );
    }
    return ScoreBar(label: label, iconEmoji: emoji, score: score.toInt());
  }

  Widget _buildCertificatesSection(WorkerPublicModel worker) {
    return _card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Skill Certificates (${worker.certificates.length})', style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.navy)),
          const SizedBox(height: 12),
          SizedBox(
            height: 84,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: worker.certificates.length,
              itemBuilder: (context, index) {
                final c = worker.certificates[index];
                return Container(
                  width: 180,
                  margin: const EdgeInsets.only(right: 10),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.background,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.borderGray),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(c.title, maxLines: 2, overflow: TextOverflow.ellipsis, style: GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.navy)),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('${c.score.toInt()}/100', style: GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.primaryTeal)),
                          Text(c.difficulty, style: GoogleFonts.poppins(fontSize: 10, color: AppColors.grayText)),
                        ],
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildExperienceSection(WorkerPublicModel worker) {
    return _card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Experience', style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.navy)),
          const SizedBox(height: 12),
          ...worker.workHistory.map((h) => Padding(
                padding: const EdgeInsets.only(bottom: 12.0),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(color: AppColors.primaryTeal.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(10)),
                      child: const Icon(Icons.business_rounded, color: AppColors.primaryTeal),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(h.clientName, style: GoogleFonts.poppins(fontWeight: FontWeight.bold, fontSize: 14)),
                          Text(h.projectTitle, style: GoogleFonts.poppins(fontSize: 12, color: AppColors.grayText)),
                        ],
                      ),
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text('${h.durationMonths} mo', style: GoogleFonts.poppins(fontWeight: FontWeight.bold, fontSize: 12)),
                        Text(h.projectScale, style: GoogleFonts.poppins(fontSize: 10, color: AppColors.grayText)),
                      ],
                    ),
                  ],
                ),
              )),
        ],
      ),
    );
  }

  Widget _buildReportSection(bool isUnclaimed) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.navy.withValues(alpha: 0.04),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.navy.withValues(alpha: 0.12)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            isUnclaimed ? UnclaimedCopy.detailReportHeading : 'Had a bad experience?',
            style: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.navy),
          ),
          const SizedBox(height: 8),
          CustomButton(
            text: isUnclaimed ? 'Report this listing' : 'Report this worker',
            isOutlined: true,
            height: 40,
            icon: Icons.flag_outlined,
            onPressed: _openReportSheet,
          ),
          const SizedBox(height: 8),
          Text(
            isUnclaimed
                ? 'Reported listings are reviewed by the 7 Kaam team.'
                : 'Reported workers are reviewed by the 7 Kaam team.',
            style: GoogleFonts.poppins(fontSize: 11, color: AppColors.grayText),
          ),
        ],
      ),
    );
  }

  Widget _buildContactBar(WorkerPublicModel worker, bool isLoggedIn) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 16, offset: const Offset(0, -4))],
      ),
      child: isLoggedIn && worker.phoneNumber != null
          ? Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CustomButton(
                  text: 'Call ${worker.phoneNumber}',
                  icon: Icons.phone,
                  onPressed: () async {
                    final uri = Uri.parse('tel:${worker.phoneNumber}');
                    if (await canLaunchUrl(uri)) await launchUrl(uri);
                  },
                ),
                const SizedBox(height: 6),
                Text(
                  worker.isUnclaimed
                      ? UnclaimedCopy.detailPhoneNote
                      : 'Contact the worker directly to discuss your requirements.',
                  style: GoogleFonts.poppins(
                    fontSize: 11,
                    color: worker.isUnclaimed ? UnclaimedColors.text : AppColors.grayText,
                  ),
                ),
              ],
            )
          : Row(
              children: [
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    decoration: BoxDecoration(color: AppColors.background, borderRadius: BorderRadius.circular(10)),
                    child: Center(
                      // Was the literal placeholder '98XXXXXX12', which
                      // fabricated the appearance of a stored phone number.
                      child: Text(
                        'Log in to see contact details',
                        textAlign: TextAlign.center,
                        style: GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.grayText),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: CustomButton(text: 'Login to see contact', onPressed: _openLoginSheet),
                ),
              ],
            ),
    );
  }
}

class _LoginBottomSheet extends ConsumerStatefulWidget {
  final VoidCallback onLoggedIn;
  const _LoginBottomSheet({required this.onLoggedIn});

  @override
  ConsumerState<_LoginBottomSheet> createState() => _LoginBottomSheetState();
}

class _LoginBottomSheetState extends ConsumerState<_LoginBottomSheet> {
  final _phoneController = TextEditingController();
  final _otpController = TextEditingController();
  bool _otpSent = false;
  String? _error;

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Login to see contact details', style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.navy)),
            const SizedBox(height: 16),
            TextField(
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              enabled: !_otpSent,
              decoration: const InputDecoration(prefixText: '+91 ', labelText: 'Mobile Number'),
            ),
            if (_otpSent) ...[
              const SizedBox(height: 12),
              TextField(
                controller: _otpController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Enter OTP'),
              ),
            ],
            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(_error!, style: GoogleFonts.poppins(color: Colors.red, fontSize: 12)),
            ],
            const SizedBox(height: 16),
            CustomButton(
              text: _otpSent ? 'Verify & Continue' : 'Send OTP',
              isLoading: authState.status == AuthStatus.loading,
              onPressed: () async {
                if (!_otpSent) {
                  if (_phoneController.text.trim().length < 10) {
                    setState(() => _error = 'Enter a valid 10-digit phone number');
                    return;
                  }
                  setState(() {
                    _otpSent = true;
                    _error = null;
                  });
                  return;
                }
                final nav = Navigator.of(context);
                final success = await ref.read(authProvider.notifier).login(
                      _phoneController.text.trim(),
                      _otpController.text.trim(),
                    );
                if (success && mounted) {
                  widget.onLoggedIn();
                  nav.pop();
                } else if (mounted) {
                  setState(() => _error = ref.read(authProvider).errorMessage ?? 'Login failed');
                }
              },
            ),
          ],
        ),
      ),
    );
  }
}

/// Claim or removal request for an unclaimed public-directory listing.
///
/// Posts to `POST /public/workers/:id/listing-request`. Neither type grants
/// anything: CLAIM records a pending claim for a human to confirm, REMOVAL
/// suppresses the listing. Nothing here sets a score, a tier or a
/// verification state, and nothing here logs anybody in.
class _ListingRequestBottomSheet extends ConsumerStatefulWidget {
  final String workerId;
  final String type; // 'CLAIM' | 'REMOVAL'
  const _ListingRequestBottomSheet({required this.workerId, required this.type});

  @override
  ConsumerState<_ListingRequestBottomSheet> createState() =>
      _ListingRequestBottomSheetState();
}

class _ListingRequestBottomSheetState extends ConsumerState<_ListingRequestBottomSheet> {
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _noteController = TextEditingController();
  bool _submitting = false;
  String? _error;

  bool get _isRemoval => widget.type == 'REMOVAL';

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final name = _nameController.text.trim();
    final phone = _phoneController.text.trim();
    if (name.isEmpty) {
      setState(() => _error = 'Enter your name');
      return;
    }
    if (phone.length < 10) {
      setState(() => _error = 'Enter a valid 10-digit phone number');
      return;
    }

    setState(() {
      _submitting = true;
      _error = null;
    });

    final nav = Navigator.of(context);
    final messenger = ScaffoldMessenger.of(context);
    try {
      await ref.read(apiServiceProvider).submitListingRequest(
            workerId: widget.workerId,
            type: widget.type,
            contactName: name,
            contactPhone: phone,
            note: _noteController.text.trim(),
          );
      if (!mounted) return;
      nav.pop();
      messenger.showSnackBar(
        SnackBar(
          content: Text(_isRemoval
              ? 'Removal request received. This listing will no longer be shown.'
              : 'Claim request received. The 7 Kaam team will contact you to confirm you own this business.'),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _submitting = false;
        _error = 'Could not send your request. Please try again.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: const BoxDecoration(
            color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              _isRemoval
                  ? UnclaimedCopy.detailClaimSecondary
                  : UnclaimedCopy.detailClaimPrimary,
              style: GoogleFonts.poppins(
                  fontSize: 18, fontWeight: FontWeight.bold, color: UnclaimedColors.text),
            ),
            const SizedBox(height: 8),
            Text(
              _isRemoval
                  ? 'Tell us who you are and we will stop showing this listing.'
                  : UnclaimedCopy.detailClaimBody,
              style: GoogleFonts.poppins(fontSize: 12, color: UnclaimedColors.text),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _nameController,
              textCapitalization: TextCapitalization.words,
              decoration: const InputDecoration(labelText: 'Your name'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(prefixText: '+91 ', labelText: 'Your phone number'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _noteController,
              maxLines: 2,
              decoration: const InputDecoration(labelText: 'Anything else? (optional)'),
            ),
            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(_error!, style: GoogleFonts.poppins(color: Colors.red, fontSize: 12)),
            ],
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: _submitting ? null : _submit,
                style: OutlinedButton.styleFrom(
                  foregroundColor: UnclaimedColors.accent,
                  side: const BorderSide(color: UnclaimedColors.accent),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
                child: _submitting
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: UnclaimedColors.accent),
                      )
                    : Text(
                        'Send request',
                        style: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.w600),
                      ),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              UnclaimedCopy.detailClaimFootnote,
              style: GoogleFonts.poppins(fontSize: 11, color: UnclaimedColors.text),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }
}

class _ReportBottomSheet extends ConsumerStatefulWidget {
  final String workerId;
  final bool isUnclaimed;
  const _ReportBottomSheet({required this.workerId, required this.isUnclaimed});

  @override
  ConsumerState<_ReportBottomSheet> createState() => _ReportBottomSheetState();
}

class _ReportBottomSheetState extends ConsumerState<_ReportBottomSheet> {
  final _descController = TextEditingController();
  late String _reason = _reasons.first;

  static const List<String> _baseReasons = [
    'Unprofessional behavior',
    'Poor quality work',
    'No response / unreachable',
    'Fraud or scam',
    'Other',
  ];

  /// An unclaimed listing was never hired by anyone, so the "bad experience"
  /// reasons are mostly inapplicable. The three data-accuracy / opt-out
  /// reasons come first because they are the ones its real owner needs.
  List<String> get _reasons => widget.isUnclaimed
      ? [...UnclaimedCopy.detailReportNewReasons, ..._baseReasons]
      : _baseReasons;

  @override
  Widget build(BuildContext context) {
    final reportState = ref.watch(reportProvider);
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.isUnclaimed ? 'Report this listing' : 'Report this worker',
              style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.navy),
            ),
            const SizedBox(height: 16),
            Text('Reason', style: GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.darkText)),
            const SizedBox(height: 6),
            DropdownButtonFormField<String>(
              initialValue: _reason,
              items: _reasons.map((r) => DropdownMenuItem(value: r, child: Text(r, style: GoogleFonts.poppins(fontSize: 13)))).toList(),
              onChanged: (val) {
                if (val != null) setState(() => _reason = val);
              },
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _descController,
              maxLines: 3,
              decoration: const InputDecoration(labelText: 'Description (optional)'),
            ),
            if (reportState.errorMessage != null) ...[
              const SizedBox(height: 8),
              Text(reportState.errorMessage!, style: GoogleFonts.poppins(color: Colors.red, fontSize: 12)),
            ],
            const SizedBox(height: 16),
            CustomButton(
              text: 'Submit Report',
              isLoading: reportState.isSubmitting,
              onPressed: () async {
                final nav = Navigator.of(context);
                final messenger = ScaffoldMessenger.of(context);
                final success = await ref.read(reportProvider.notifier).submitReport(
                      workerId: widget.workerId,
                      reason: _reason,
                      description: _descController.text.trim(),
                    );
                if (success && mounted) {
                  nav.pop();
                  messenger.showSnackBar(
                    const SnackBar(content: Text('Report submitted — the 7 Kaam team will review it.')),
                  );
                }
              },
            ),
          ],
        ),
      ),
    );
  }
}
