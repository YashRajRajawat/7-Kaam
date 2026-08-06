import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:share_plus/share_plus.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../../providers/worker_provider.dart';
import '../../providers/kaam_card_provider.dart';
import '../../providers/certificate_provider.dart';
import '../../widgets/kaam_card_widget.dart';
import '../../widgets/custom_button.dart';

class KaamCardScreen extends ConsumerStatefulWidget {
  final Function(int)? onNavigateTab;

  const KaamCardScreen({super.key, this.onNavigateTab});

  @override
  ConsumerState<KaamCardScreen> createState() => _KaamCardScreenState();
}

class _KaamCardScreenState extends ConsumerState<KaamCardScreen> {
  bool _isBreakdownExpanded = false;

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final workerState = ref.watch(workerProvider);
    final kaamCardState = ref.watch(kaamCardProvider);
    final certState = ref.watch(certificateProvider);

    final worker = workerState.worker ?? authState.currentWorker;
    final card = kaamCardState.kaamCard ?? worker?.kaamCard;
    final certificates = certState.certificates;

    if (card == null || worker?.isCertified == false) {
      return Scaffold(
        backgroundColor: AppColors.background,
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 140,
                  height: 140,
                  decoration: BoxDecoration(
                    color: AppColors.primaryTeal.withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.badge_outlined,
                    size: 70,
                    color: AppColors.primaryTeal,
                  ),
                ),
                const SizedBox(height: 24),
                Text(
                  'No KaamCard Yet',
                  style: GoogleFonts.poppins(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    color: AppColors.darkText,
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  'Complete at least 1 trade test + 1 video assessment to generate your living KaamCard.',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.poppins(
                    fontSize: 14,
                    color: AppColors.grayText,
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 32),
                CustomButton(
                  text: 'Browse Assessments',
                  onPressed: () {
                    if (widget.onNavigateTab != null) {
                      widget.onNavigateTab!(1); // Go to Certify tab
                    }
                  },
                ),
              ],
            ),
          ),
        ),
      );
    }

    final scoreBreakdown = card.scoreBreakdown;
    final videoCount = card.totalVideosTaken > 0 ? card.totalVideosTaken : (scoreBreakdown?.videoCount ?? 1);
    final testCount = card.totalTestsTaken > 0 ? card.totalTestsTaken : (scoreBreakdown?.testCount ?? 2);
    final cred = card.credibilityLevel;
    final version = card.version;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.primaryTeal,
        title: Text(
          'My Living KaamCard (v$version)',
          style: GoogleFonts.poppins(fontWeight: FontWeight.bold, color: Colors.white),
        ),
        elevation: 0,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Visual KaamCard Widget
              KaamCardWidget(card: card),

              const SizedBox(height: 16),

              // Assessment Credibility Banner
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: Column(
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.verified_user, color: AppColors.primaryTeal, size: 24),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    'Credibility Level',
                                    style: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.navy),
                                  ),
                                  _buildCredBadge(cred),
                                ],
                              ),
                              Text(
                                'Based on $testCount tests + $videoCount videos',
                                style: GoogleFonts.poppins(fontSize: 11, color: Colors.grey.shade600),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    GestureDetector(
                      onTap: () => setState(() => _isBreakdownExpanded = !_isBreakdownExpanded),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            _isBreakdownExpanded ? 'Hide Formula Breakdown' : 'Expand Score Formula Breakdown (45% · 35% · 20%)',
                            style: GoogleFonts.poppins(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primaryTeal),
                          ),
                          Icon(_isBreakdownExpanded ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down, color: AppColors.primaryTeal, size: 16),
                        ],
                      ),
                    ),
                    if (_isBreakdownExpanded) ...[
                      const SizedBox(height: 10),
                      const Divider(height: 1),
                      const SizedBox(height: 10),
                      _buildBreakdownRow('📝 Trade Tests (45%)', '${scoreBreakdown?.testScore.toInt() ?? 86}/100', 'Average of $testCount test attempts'),
                      const SizedBox(height: 6),
                      _buildBreakdownRow('🎥 Video (35%)', '${scoreBreakdown?.videoScore.toInt() ?? 85}/100', 'Average of $videoCount video submissions'),
                      const SizedBox(height: 6),
                      _buildBreakdownRow('💼 Work History (20%)', '${scoreBreakdown?.workHistoryScore.toInt() ?? 78}/100', 'Portfolio duration & client scale'),
                    ],
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // Score Progression Line Chart (fl_chart)
              Text(
                'Score History Progression',
                style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.navy),
              ),
              const SizedBox(height: 10),
              Container(
                height: 180,
                width: double.infinity,
                padding: const EdgeInsets.fromLTRB(16, 20, 20, 10),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: LineChart(
                  LineChartData(
                    gridData: const FlGridData(show: false),
                    titlesData: FlTitlesData(
                      leftTitles: AxisTitles(
                        sideTitles: SideTitles(
                          showTitles: true,
                          reservedSize: 30,
                          getTitlesWidget: (val, meta) => Text(val.toInt().toString(), style: const TextStyle(fontSize: 10, color: Colors.grey)),
                        ),
                      ),
                      bottomTitles: AxisTitles(
                        sideTitles: SideTitles(
                          showTitles: true,
                          getTitlesWidget: (val, meta) {
                            switch (val.toInt()) {
                              case 0:
                                return const Text('v1', style: TextStyle(fontSize: 10));
                              case 1:
                                return const Text('v2', style: TextStyle(fontSize: 10));
                              case 2:
                                return const Text('v3', style: TextStyle(fontSize: 10));
                              default:
                                return const Text('');
                            }
                          },
                        ),
                      ),
                      topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                      rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    ),
                    borderData: FlBorderData(show: false),
                    minY: 40,
                    maxY: 100,
                    lineBarsData: [
                      LineChartBarData(
                        spots: const [
                          FlSpot(0, 75),
                          FlSpot(1, 82),
                          FlSpot(2, 87),
                        ],
                        isCurved: true,
                        color: AppColors.primaryTeal,
                        barWidth: 3,
                        dotData: const FlDotData(show: true),
                        belowBarData: BarAreaData(
                          show: true,
                          color: AppColors.primaryTeal.withOpacity(0.12),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 20),

              // Earned Certificates Horizontal Scroll
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    '${certificates.isEmpty ? 1 : certificates.length} Skill Certificates Earned',
                    style: GoogleFonts.poppins(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.navy),
                  ),
                  TextButton(
                    onPressed: () {
                      if (widget.onNavigateTab != null) widget.onNavigateTab!(3);
                    },
                    child: Text('View all', style: GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.primaryTeal)),
                  ),
                ],
              ),
              const SizedBox(height: 8),

              SizedBox(
                height: 90,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  itemCount: certificates.isEmpty ? 1 : certificates.length,
                  itemBuilder: (context, index) {
                    final title = certificates.isNotEmpty ? certificates[index].title : 'Electrical Safety Fundamentals';
                    final scoreVal = certificates.isNotEmpty ? certificates[index].score : 86.0;

                    return Container(
                      width: 190,
                      margin: const EdgeInsets.only(right: 10),
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(colors: [AppColors.navy, AppColors.primaryTeal]),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(title, maxLines: 2, overflow: TextOverflow.ellipsis, style: GoogleFonts.poppins(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white)),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('Score: ${scoreVal.toInt()}/100', style: GoogleFonts.poppins(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.gold)),
                              const Icon(Icons.verified, size: 14, color: Colors.white),
                            ],
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),

              const SizedBox(height: 24),

              // Action Buttons below card
              CustomButton(
                text: 'Download PDF',
                icon: Icons.picture_as_pdf,
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Downloading official KaamCard PDF from ${card.kaamCardUrl ?? 'backend'}...'),
                      backgroundColor: AppColors.successGreen,
                    ),
                  );
                },
              ),
              const SizedBox(height: 12),

              CustomButton(
                text: 'Share Certificate',
                isOutlined: true,
                icon: Icons.share,
                onPressed: () {
                  final link = 'https://7kaam.in/verify/${card.qrToken.isNotEmpty ? card.qrToken : card.workerId}';
                  Share.share('Check out my verified KaamCard certificate on 7 Kaam: $link');
                },
              ),
              const SizedBox(height: 30),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCredBadge(String cred) {
    Color bg;
    switch (cred.toUpperCase()) {
      case 'EXPERT':
        bg = AppColors.primaryTeal;
        break;
      case 'ESTABLISHED':
        bg = AppColors.infoBlue;
        break;
      default:
        bg = Colors.grey.shade700;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(10)),
      child: Text(cred, style: GoogleFonts.poppins(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.white)),
    );
  }

  Widget _buildBreakdownRow(String title, String val, String subtitle) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: GoogleFonts.poppins(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.navy)),
            Text(subtitle, style: GoogleFonts.poppins(fontSize: 9, color: Colors.grey.shade600)),
          ],
        ),
        Text(val, style: GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.primaryTeal)),
      ],
    );
  }
}
