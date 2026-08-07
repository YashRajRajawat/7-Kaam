import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shimmer/shimmer.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../../providers/worker_provider.dart';
import '../../providers/kaam_card_provider.dart';
import '../../providers/certificate_provider.dart';
import '../../providers/catalogue_provider.dart';
import '../../widgets/score_ring.dart';
import '../../widgets/custom_button.dart';

class DashboardScreen extends ConsumerWidget {
  final Function(int)? onNavigateTab;

  const DashboardScreen({super.key, this.onNavigateTab});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final workerState = ref.watch(workerProvider);
    final kaamCardState = ref.watch(kaamCardProvider);
    final certState = ref.watch(certificateProvider);
    final catalogueState = ref.watch(catalogueProvider);

    final worker = workerState.worker ?? authState.currentWorker;
    final card = kaamCardState.kaamCard ?? worker?.kaamCard;
    final certificates = certState.certificates;

    if (workerState.isLoading && worker == null) {
      return _buildSkeletonLoader();
    }

    final firstName = worker?.fullName.split(' ').first ?? 'Worker';
    final trade = worker?.trade ?? 'ELECTRICIAN';
    final city = worker?.city ?? 'Bangalore';
    final isCertified = worker?.hasKaamCard == true || card != null;
    final score = card?.score ?? worker?.finalScore ?? 0.0;
    final cred = card?.credibilityLevel ?? 'EMERGING';
    final tTests = card?.totalTestsTaken ?? (worker?.testScore != null ? 1 : 0);
    final tVideos = card?.totalVideosTaken ?? (worker?.videoUrl != null ? 1 : 0);
    final tCerts = certificates.length;

    final recommended = catalogueState.categoryGroups
        .expand((g) => g.tests)
        .where((t) => !t.isVideoAssessment && t.workerAttempts == 0)
        .take(2)
        .toList();

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            if (worker != null) {
              await ref.read(workerProvider.notifier).fetchWorkerProfile(worker.id);
              await ref.read(certificateProvider.notifier).fetchCertificates();
            }
          },
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header Row
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Namaste, $firstName 👋',
                          style: GoogleFonts.poppins(
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                            color: AppColors.darkText,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppColors.primaryTeal.withOpacity(0.15),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                trade.replaceAll('_', ' '),
                                style: GoogleFonts.poppins(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.primaryTeal,
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            const Icon(Icons.location_on, size: 14, color: AppColors.grayText),
                            const SizedBox(width: 2),
                            Text(
                              city,
                              style: GoogleFonts.poppins(
                                fontSize: 13,
                                color: AppColors.grayText,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    IconButton(
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('No new notifications')),
                        );
                      },
                      icon: const Icon(Icons.notifications_outlined, size: 28),
                      color: AppColors.navy,
                    ),
                  ],
                ),

                const SizedBox(height: 20),

                // Certification Section
                !isCertified
                    ? _buildUncertifiedSection(context)
                    : _buildCertifiedSection(context, score, cred, tTests, tVideos, tCerts),

                const SizedBox(height: 20),

                // Quick Stats Row (4 small cards)
                Row(
                  children: [
                    Expanded(child: _buildStatCard('Score', isCertified ? '${score.toInt()}' : 'Pending', Icons.speed, AppColors.primaryTeal)),
                    const SizedBox(width: 8),
                    Expanded(child: _buildStatCard('Tests', '$tTests', Icons.quiz, AppColors.navy)),
                    const SizedBox(width: 8),
                    Expanded(child: _buildStatCard('Videos', '$tVideos', Icons.videocam, AppColors.infoBlue)),
                    const SizedBox(width: 8),
                    Expanded(child: _buildStatCard('Certs', '$tCerts', Icons.workspace_premium, AppColors.gold)),
                  ],
                ),

                const SizedBox(height: 24),

                // "Keep Improving" Recommendations Section
                Text(
                  'Keep Improving Your Score',
                  style: GoogleFonts.poppins(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: AppColors.darkText,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Attempt more assessments to increase your score & credibility',
                  style: GoogleFonts.poppins(fontSize: 11, color: Colors.grey.shade600),
                ),
                const SizedBox(height: 12),

                if (recommended.isEmpty)
                  Text(
                    catalogueState.isLoading ? 'Loading assessments...' : "You've attempted everything in the catalogue — nice work!",
                    style: GoogleFonts.poppins(fontSize: 11, color: Colors.grey.shade600),
                  )
                else
                  for (int i = 0; i < recommended.length; i++) ...[
                    if (i > 0) const SizedBox(height: 8),
                    _buildRecommendedTestCard(
                      recommended[i].title,
                      '${recommended[i].difficulty} · ${recommended[i].category} · ${recommended[i].estimatedMinutes} min',
                      '👥 ${recommended[i].totalAttempts} attempted',
                    ),
                  ],

                const SizedBox(height: 12),
                CustomButton(
                  text: 'Browse All Assessments',
                  isOutlined: true,
                  onPressed: () {
                    if (onNavigateTab != null) onNavigateTab!(1); // Go to Certify tab
                  },
                ),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildUncertifiedSection(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 6)],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Start Your Certification Journey',
            style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.navy),
          ),
          const SizedBox(height: 4),
          Text(
            'Complete at least 1 trade test + 1 video assessment to generate your living KaamCard.',
            style: GoogleFonts.poppins(fontSize: 12, color: Colors.grey.shade700),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _buildCtaCard(
                  '📝 Take a Trade Test',
                  'Choose from available assessments',
                  'Browse Tests',
                  () => onNavigateTab?.call(1),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _buildCtaCard(
                  '🎥 Submit a Video',
                  'Record yourself doing your work',
                  'Record Video',
                  () => context.push('/pipeline/video-upload'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCtaCard(String title, String subtitle, String btnText, VoidCallback onTap) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.navy)),
          const SizedBox(height: 2),
          Text(subtitle, style: GoogleFonts.poppins(fontSize: 10, color: Colors.grey.shade600)),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            height: 34,
            child: ElevatedButton(
              onPressed: onTap,
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.primaryTeal, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
              child: Text(btnText, style: GoogleFonts.poppins(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCertifiedSection(BuildContext context, double score, String cred, int tTests, int tVideos, int tCerts) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: [AppColors.primaryTeal, AppColors.navy]),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          ScoreRing(score: score, size: 60, strokeWidth: 6),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Living KaamCard Active 🎉', style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white)),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(color: AppColors.gold, borderRadius: BorderRadius.circular(6)),
                      child: Text(cred, style: GoogleFonts.poppins(fontSize: 9, fontWeight: FontWeight.bold, color: AppColors.navy)),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text('$tTests tests · $tVideos videos · $tCerts certificates', style: GoogleFonts.poppins(fontSize: 11, color: Colors.white70)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 18),
          const SizedBox(height: 4),
          Text(value, style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.darkText)),
          Text(label, style: GoogleFonts.poppins(fontSize: 9, color: AppColors.grayText)),
        ],
      ),
    );
  }

  Widget _buildRecommendedTestCard(String title, String meta, String attempts) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey.shade200)),
      child: Row(
        children: [
          const Icon(Icons.quiz, color: AppColors.primaryTeal, size: 28),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.navy)),
                Text(meta, style: GoogleFonts.poppins(fontSize: 10, color: Colors.grey.shade600)),
              ],
            ),
          ),
          Text(attempts, style: GoogleFonts.poppins(fontSize: 10, fontStyle: FontStyle.italic, color: AppColors.primaryTeal)),
        ],
      ),
    );
  }

  Widget _buildSkeletonLoader() {
    return Scaffold(
      body: SafeArea(
        child: Shimmer.fromColors(
          baseColor: Colors.grey.shade300,
          highlightColor: Colors.grey.shade100,
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                Container(height: 40, color: Colors.white),
                const SizedBox(height: 20),
                Container(height: 180, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16))),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
