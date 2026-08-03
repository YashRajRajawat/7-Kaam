import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shimmer/shimmer.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../../providers/worker_provider.dart';
import '../../widgets/score_ring.dart';
import '../../widgets/tier_badge.dart';
import '../../widgets/custom_button.dart';

class DashboardScreen extends ConsumerWidget {
  final Function(int)? onNavigateTab;

  const DashboardScreen({super.key, this.onNavigateTab});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final workerState = ref.watch(workerProvider);

    final worker = workerState.worker ?? authState.currentWorker;

    if (workerState.isLoading && worker == null) {
      return _buildSkeletonLoader();
    }

    final firstName = worker?.name.split(' ').first ?? 'Worker';
    final trade = worker?.trade ?? 'ELECTRICIAN';
    final city = worker?.city ?? 'Bangalore';
    final isCertified = worker?.isCertified ?? false;
    final score = worker?.score ?? 0.0;
    final tier = worker?.tier ?? 'BRONZE';
    final pipelineStep = worker?.pipelineStep ?? 1;
    final completionPct = (pipelineStep / 5.0 * 100).toInt();

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            if (worker != null) {
              await ref.read(workerProvider.notifier).fetchWorkerProfile(worker.id);
            }
          },
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(20.0),
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
                                color: AppColors.primaryTeal.withValues(alpha: 0.15),
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
                const SizedBox(height: 24),

                // Certification Status Card (Most Prominent)
                !isCertified
                    ? _buildUncertifiedCard(context, pipelineStep, completionPct)
                    : _buildCertifiedCard(context, score, tier),

                const SizedBox(height: 24),

                // Quick Stats Row (3 small cards)
                Row(
                  children: [
                    Expanded(
                      child: _buildStatCard(
                        'Current Score',
                        isCertified ? '${score.toInt()}/100' : 'Pending',
                        Icons.speed,
                        AppColors.primaryTeal,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildStatCard(
                        'Tier',
                        isCertified ? tier : 'Not yet',
                        Icons.workspace_premium,
                        AppColors.gold,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildStatCard(
                        'Tests Taken',
                        worker?.testCompleted == true ? '1' : '0',
                        Icons.quiz,
                        AppColors.navy,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 28),

                // Recent Activity Section
                Text(
                  'Recent Activity',
                  style: GoogleFonts.poppins(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: AppColors.darkText,
                  ),
                ),
                const SizedBox(height: 12),

                _buildRecentActivityList(worker),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildUncertifiedCard(BuildContext context, int step, int pct) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 6, offset: Offset(0, 3))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Complete Your Certification',
                style: GoogleFonts.poppins(
                  fontSize: 17,
                  fontWeight: FontWeight.bold,
                  color: AppColors.darkText,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.gold.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '$pct% Complete',
                  style: GoogleFonts.poppins(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: AppColors.gold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          LinearProgressIndicator(
            value: pct / 100.0,
            backgroundColor: Colors.grey.shade200,
            valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primaryTeal),
            minHeight: 8,
          ),
          const SizedBox(height: 16),
          Text(
            'Step $step of 5 in progress. Complete your video upload and trade test to issue your KaamCard.',
            style: GoogleFonts.poppins(fontSize: 13, color: AppColors.grayText),
          ),
          const SizedBox(height: 16),
          CustomButton(
            text: 'Continue Pipeline',
            onPressed: () {
              if (onNavigateTab != null) {
                onNavigateTab!(1); // Go to Certify tab
              }
            },
          ),
        ],
      ),
    );
  }

  Widget _buildCertifiedCard(BuildContext context, double score, String tier) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 6, offset: Offset(0, 3))],
      ),
      child: Column(
        children: [
          Row(
            children: [
              ScoreRing(score: score, size: 70, strokeWidth: 7),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'KaamCard Active 🎉',
                      style: GoogleFonts.poppins(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: AppColors.darkText,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Text(
                          'Verified Level: ',
                          style: GoogleFonts.poppins(fontSize: 13, color: AppColors.grayText),
                        ),
                        TierBadge(tier: tier),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: CustomButton(
                  text: 'View KaamCard',
                  height: 42,
                  onPressed: () {
                    if (onNavigateTab != null) {
                      onNavigateTab!(2); // Go to My Card tab
                    }
                  },
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: CustomButton(
                  text: 'Share',
                  isOutlined: true,
                  height: 42,
                  icon: Icons.share,
                  onPressed: () {
                    if (onNavigateTab != null) {
                      onNavigateTab!(2);
                    }
                  },
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 4)],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 22),
          const SizedBox(height: 8),
          Text(
            value,
            style: GoogleFonts.poppins(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: AppColors.darkText,
            ),
          ),
          Text(
            label,
            style: GoogleFonts.poppins(fontSize: 11, color: AppColors.grayText),
          ),
        ],
      ),
    );
  }

  Widget _buildRecentActivityList(dynamic worker) {
    final activities = worker?.recentActivity ?? [];

    if (activities.isEmpty) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: AppColors.white,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Center(
          child: Text(
            'No recent activity recorded yet',
            style: GoogleFonts.poppins(color: AppColors.grayText, fontSize: 13),
          ),
        ),
      );
    }

    return Column(
      children: List.generate(activities.length > 5 ? 5 : activities.length, (index) {
        final act = activities[index];
        return Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppColors.white,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.primaryTeal.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.bolt, color: AppColors.primaryTeal, size: 18),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      act.signalType.toString().replaceAll('_', ' '),
                      style: GoogleFonts.poppins(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: AppColors.darkText,
                      ),
                    ),
                    Text(
                      act.date,
                      style: GoogleFonts.poppins(fontSize: 11, color: AppColors.grayText),
                    ),
                  ],
                ),
              ),
              Text(
                '+${act.score.toInt()} pts',
                style: GoogleFonts.poppins(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: AppColors.successGreen,
                ),
              ),
            ],
          ),
        );
      }),
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
                const SizedBox(height: 20),
                Row(
                  children: [
                    Expanded(child: Container(height: 80, color: Colors.white)),
                    const SizedBox(width: 10),
                    Expanded(child: Container(height: 80, color: Colors.white)),
                    const SizedBox(width: 10),
                    Expanded(child: Container(height: 80, color: Colors.white)),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
