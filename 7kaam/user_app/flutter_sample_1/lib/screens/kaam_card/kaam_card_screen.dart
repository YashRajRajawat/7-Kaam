import 'dart:html' as html;
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
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
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final worker = ref.read(workerProvider).worker ?? ref.read(authProvider).currentWorker;
      if (worker != null) {
        ref.read(kaamCardProvider.notifier).fetchKaamCard(worker.id);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final workerState = ref.watch(workerProvider);
    final kaamCardState = ref.watch(kaamCardProvider);
    final certState = ref.watch(certificateProvider);

    final worker = workerState.worker ?? authState.currentWorker;
    final card = kaamCardState.kaamCard ?? worker?.kaamCard;
    final certificates = certState.certificates;
    final isCardActive = card != null && !card.isRevoked;

    if (!isCardActive) {
      final assessmentCount = (worker?.testScore != null ? 1 : 0) + (worker?.videoScore != null ? 1 : 0);
      final scoreEstimate = worker?.finalScore;

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
              padding: const EdgeInsets.all(24.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const SizedBox(height: 24),
                  Container(
                    width: 140,
                    height: 140,
                    decoration: BoxDecoration(
                      color: AppColors.primaryTeal.withValues(alpha: 0.1),
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
                    'Awaiting Admin Review',
                    style: GoogleFonts.poppins(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: AppColors.darkText,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Our team reviews your assessments and issues your KaamCard. Keep taking tests to improve your chances!',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.poppins(
                      fontSize: 14,
                      color: AppColors.grayText,
                      height: 1.5,
                    ),
                  ),
                  const SizedBox(height: 20),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.grey.shade200),
                    ),
                    child: Text(
                      scoreEstimate != null
                          ? '$assessmentCount assessment${assessmentCount == 1 ? '' : 's'} completed · current score estimate: ${scoreEstimate.toInt()}/100'
                          : 'No assessments completed yet',
                      style: GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.navy),
                      textAlign: TextAlign.center,
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
                      _buildBreakdownRow('📝 Trade Tests (45%)', _fmtScore(scoreBreakdown?.testScore ?? worker?.testScore), 'Average of $testCount test attempts'),
                      const SizedBox(height: 6),
                      _buildBreakdownRow('🎥 Video (35%)', _fmtScore(scoreBreakdown?.videoScore ?? worker?.videoScore), 'Average of $videoCount video submissions'),
                      const SizedBox(height: 6),
                      _buildBreakdownRow('💼 Work History (20%)', _fmtScore(scoreBreakdown?.workHistoryScore ?? worker?.workHistoryScore), 'Portfolio duration & client scale'),
                    ],
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // Score Progression Line Chart (fl_chart) — real KaamCard version history
              Text(
                'Score History Progression',
                style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.navy),
              ),
              const SizedBox(height: 10),
              if (kaamCardState.history.length < 2)
                Container(
                  padding: const EdgeInsets.all(16),
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.grey.shade200),
                  ),
                  child: Text(
                    'Not enough history yet — this chart fills in as your score is recomputed over time.',
                    style: GoogleFonts.poppins(fontSize: 12, color: Colors.grey.shade600),
                    textAlign: TextAlign.center,
                  ),
                )
              else
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
                            getTitlesWidget: (val, meta) => Text('v${val.toInt() + 1}', style: const TextStyle(fontSize: 10)),
                          ),
                        ),
                        topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                        rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                      ),
                      borderData: FlBorderData(show: false),
                      minY: 0,
                      maxY: 100,
                      lineBarsData: [
                        LineChartBarData(
                          spots: [
                            for (int i = 0; i < kaamCardState.history.length; i++)
                              FlSpot(i.toDouble(), kaamCardState.history[i].finalScore),
                          ],
                          isCurved: true,
                          color: AppColors.primaryTeal,
                          barWidth: 3,
                          dotData: const FlDotData(show: true),
                          belowBarData: BarAreaData(
                            show: true,
                            color: AppColors.primaryTeal.withValues(alpha: 0.12),
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
                    '${certificates.length} Skill Certificate${certificates.length == 1 ? '' : 's'} Earned',
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

              if (certificates.isEmpty)
                Text('No certificates yet.', style: GoogleFonts.poppins(fontSize: 12, color: Colors.grey.shade600))
              else
                SizedBox(
                  height: 90,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    itemCount: certificates.length,
                    itemBuilder: (context, index) {
                      final title = certificates[index].title;
                      final scoreVal = certificates[index].score;

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
                  final pdfUrl = 'http://localhost:8000/api/v1/kaamcards/${card.workerId}/pdf?force=true';
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Downloading official KaamCard PDF certificate...'),
                      backgroundColor: AppColors.successGreen,
                    ),
                  );
                  if (kIsWeb) {
                    html.window.open(pdfUrl, '_blank');
                  }
                },
              ),
              const SizedBox(height: 12),

              CustomButton(
                text: 'Share Certificate',
                isOutlined: true,
                icon: Icons.share,
                onPressed: () {
                  final link = 'http://192.168.1.6:8000/api/v1/verify/${card.qrToken.isNotEmpty ? card.qrToken : card.workerId}';
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

  String _fmtScore(double? score) => score != null ? '${score.toInt()}/100' : '—';

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
