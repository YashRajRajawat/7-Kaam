import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../core/constants/app_colors.dart';
import '../../models/trade_test_model.dart';
import '../../models/kaam_card_history_model.dart';
import '../../providers/auth_provider.dart';
import '../../providers/worker_provider.dart';
import '../../providers/kaam_card_provider.dart';
import '../../providers/catalogue_provider.dart';
import '../../providers/certificate_provider.dart';
import '../../widgets/score_ring.dart';
import 'test_detail_screen.dart';

class PipelineScreen extends ConsumerStatefulWidget {
  const PipelineScreen({super.key});

  @override
  ConsumerState<PipelineScreen> createState() => _PipelineScreenState();
}

class _PipelineScreenState extends ConsumerState<PipelineScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _isBreakdownExpanded = false;
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    Future.microtask(() {
      ref.read(catalogueProvider.notifier).fetchCatalogue();
      ref.read(certificateProvider.notifier).fetchCertificates();
      final workerId = ref.read(authProvider).currentWorker?.id;
      if (workerId != null) {
        ref.read(kaamCardProvider.notifier).fetchKaamCardHistory(workerId);
      }
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  Color _getDifficultyColor(String diff) {
    switch (diff.toUpperCase()) {
      case 'BEGINNER':
        return AppColors.successGreen;
      case 'INTERMEDIATE':
        return AppColors.gold;
      case 'ADVANCED':
        return AppColors.errorRed;
      default:
        return AppColors.primaryTeal;
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final workerState = ref.watch(workerProvider);
    final kaamCardState = ref.watch(kaamCardProvider);
    final catalogueState = ref.watch(catalogueProvider);
    final certState = ref.watch(certificateProvider);

    final worker = workerState.worker ?? authState.currentWorker;
    final kaamCard = kaamCardState.kaamCard ?? worker?.kaamCard;
    final certificates = certState.certificates;

    final double score = kaamCard?.score ?? worker?.finalScore ?? 0.0;
    final int tTests = kaamCard?.totalTestsTaken ?? (worker?.testScore != null ? 1 : 0);
    final int tVideos = kaamCard?.totalVideosTaken ?? (worker?.videoScore != null ? 1 : 0);
    final int tCerts = certificates.isNotEmpty ? certificates.length : (kaamCard?.certificatesEarned ?? 0);
    final String cred = kaamCard?.credibilityLevel ?? ((tTests + tVideos) >= 9 ? 'EXPERT' : ((tTests + tVideos) >= 4 ? 'ESTABLISHED' : 'EMERGING'));

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.primaryTeal,
        title: Text(
          'Certify & Learn',
          style: GoogleFonts.poppins(fontWeight: FontWeight.bold, color: Colors.white),
        ),
        elevation: 0,
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Top Section — Large KaamCard GPA Card (Teal gradient)
            _buildTopGpaCard(score, cred, tTests, tVideos, tCerts, worker, kaamCardState.history),

            // 3 Sub-tabs
            Container(
              color: Colors.white,
              child: TabBar(
                controller: _tabController,
                indicatorColor: AppColors.primaryTeal,
                indicatorWeight: 3,
                labelColor: AppColors.primaryTeal,
                unselectedLabelColor: Colors.grey.shade600,
                labelStyle: GoogleFonts.poppins(fontWeight: FontWeight.bold, fontSize: 12),
                tabs: const [
                  Tab(text: 'ALL TESTS'),
                  Tab(text: 'VIDEO ASSESSMENTS'),
                  Tab(text: 'MY PROGRESS'),
                ],
              ),
            ),

            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  // Sub-tab 1: ALL TESTS (Coursera catalogue)
                  _buildAllTestsSubTab(catalogueState),

                  // Sub-tab 2: VIDEO ASSESSMENTS
                  _buildVideoAssessmentsSubTab(catalogueState),

                  // Sub-tab 3: MY PROGRESS
                  _buildMyProgressSubTab(worker, catalogueState, tTests, tCerts, score, certificates),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTopGpaCard(double score, String cred, int tTests, int tVideos, int tCerts, dynamic worker, List<KaamCardHistoryModel> histories) {
    final hasTrend = histories.length >= 2;
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppColors.primaryTeal, AppColors.navy],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(color: AppColors.primaryTeal.withValues(alpha: 0.3), blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              ScoreRing(score: score, size: 66, strokeWidth: 6),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'KaamCard Score',
                          style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                        _buildCredibilityBadge(cred),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '$tTests tests · $tVideos videos · $tCerts certificates',
                      style: GoogleFonts.poppins(fontSize: 11, color: Colors.white70),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Living GPA updates with every assessment',
                      style: GoogleFonts.poppins(fontSize: 10, fontStyle: FontStyle.italic, color: AppColors.gold),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 10),

          // Accordion Toggle
          GestureDetector(
            onTap: () => setState(() => _isBreakdownExpanded = !_isBreakdownExpanded),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  _isBreakdownExpanded ? 'Hide Breakdown' : 'View Score Breakdown & Trend',
                  style: GoogleFonts.poppins(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white70),
                ),
                Icon(
                  _isBreakdownExpanded ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                  color: Colors.white70,
                  size: 18,
                ),
              ],
            ),
          ),

          if (_isBreakdownExpanded) ...[
            const SizedBox(height: 12),
            const Divider(color: Colors.white24, height: 1),
            const SizedBox(height: 12),

            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildBreakdownCol('📝 Test (45%)', worker?.testScore != null ? '${(worker.testScore as double).toInt()}/100' : '—'),
                _buildBreakdownCol('🎥 Video (35%)', worker?.videoScore != null ? '${(worker.videoScore as double).toInt()}/100' : '—'),
                _buildBreakdownCol('💼 History (20%)', worker?.workHistoryScore != null ? '${(worker.workHistoryScore as double).toInt()}/100' : '—'),
              ],
            ),

            const SizedBox(height: 12),
            if (hasTrend) ...[
              // Mini Line Chart — real KaamCard score history
              Container(
                height: 90,
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.black26,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: LineChart(
                  LineChartData(
                    gridData: const FlGridData(show: false),
                    titlesData: const FlTitlesData(show: false),
                    borderData: FlBorderData(show: false),
                    minY: 0,
                    maxY: 100,
                    lineBarsData: [
                      LineChartBarData(
                        spots: [
                          for (int i = 0; i < histories.length; i++)
                            FlSpot(i.toDouble(), histories[i].finalScore),
                        ],
                        isCurved: true,
                        color: AppColors.gold,
                        barWidth: 2.5,
                        dotData: const FlDotData(show: true),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                histories.last.finalScore >= histories.first.finalScore ? 'Your score is trending ↑' : 'Your score is trending ↓',
                style: GoogleFonts.poppins(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.greenAccent),
              ),
            ] else
              Text(
                'Not enough history yet to show a trend — keep taking assessments.',
                style: GoogleFonts.poppins(fontSize: 10, color: Colors.white70),
              ),
          ],
        ],
      ),
    );
  }

  Widget _buildCredibilityBadge(String cred) {
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
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.white30)),
      child: Text(
        cred,
        style: GoogleFonts.poppins(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.white),
      ),
    );
  }

  Widget _buildBreakdownCol(String label, String scoreVal) {
    return Column(
      children: [
        Text(scoreVal, style: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.gold)),
        Text(label, style: GoogleFonts.poppins(fontSize: 10, color: Colors.white70)),
      ],
    );
  }

  // ── SUB-TAB 1: ALL TESTS (Coursera Catalogue) ───────────────────────────────
  Widget _buildAllTestsSubTab(CatalogueState catalogueState) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Search Bar
          TextField(
            controller: _searchController,
            onChanged: (val) => ref.read(catalogueProvider.notifier).setSearchQuery(val),
            decoration: InputDecoration(
              hintText: 'Search assessments by title or topic...',
              hintStyle: GoogleFonts.poppins(fontSize: 12),
              prefixIcon: const Icon(Icons.search, size: 20, color: AppColors.primaryTeal),
              filled: true,
              fillColor: Colors.white,
              contentPadding: const EdgeInsets.symmetric(vertical: 10),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade300)),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade300)),
            ),
          ),

          const SizedBox(height: 12),

          // Filter Chips: Category
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: ['All', 'Safety', 'Installation', 'Maintenance', 'Theory'].map((cat) {
                final selected = catalogueState.selectedCategory == cat;
                return Padding(
                  padding: const EdgeInsets.only(right: 8.0),
                  child: ChoiceChip(
                    label: Text(cat),
                    labelStyle: GoogleFonts.poppins(fontSize: 11, fontWeight: FontWeight.w600, color: selected ? Colors.white : AppColors.darkText),
                    selected: selected,
                    selectedColor: AppColors.primaryTeal,
                    backgroundColor: Colors.white,
                    onSelected: (val) {
                      if (val) ref.read(catalogueProvider.notifier).setCategory(cat);
                    },
                  ),
                );
              }).toList(),
            ),
          ),

          const SizedBox(height: 8),

          // Filter Chips: Difficulty
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: ['All', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED'].map((diff) {
                final selected = catalogueState.selectedDifficulty == diff;
                return Padding(
                  padding: const EdgeInsets.only(right: 8.0),
                  child: ChoiceChip(
                    label: Text(diff),
                    labelStyle: GoogleFonts.poppins(fontSize: 10, fontWeight: FontWeight.bold, color: selected ? Colors.white : AppColors.darkText),
                    selected: selected,
                    selectedColor: _getDifficultyColor(diff),
                    backgroundColor: Colors.white,
                    onSelected: (val) {
                      if (val) ref.read(catalogueProvider.notifier).setDifficulty(diff);
                    },
                  ),
                );
              }).toList(),
            ),
          ),

          const SizedBox(height: 16),

          if (catalogueState.isLoading)
            const Center(child: Padding(padding: EdgeInsets.all(40), child: CircularProgressIndicator(color: AppColors.primaryTeal)))
          else if (catalogueState.categoryGroups.isEmpty)
            Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Text('No assessments matching your criteria.', style: GoogleFonts.poppins(color: Colors.grey.shade600)),
              ),
            )
          else
            ...catalogueState.categoryGroups.map((group) {
              // Filter out video assessments in this sub-tab
              final testsOnly = group.tests.where((t) => !t.isVideoAssessment).toList();
              if (testsOnly.isEmpty) return const SizedBox.shrink();

              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Text('⚡ ', style: TextStyle(fontSize: 14)),
                      Text(
                        '${group.category}  ·  ${testsOnly.length} assessments',
                        style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.navy),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  ...testsOnly.map((t) => _buildTestCatalogueCard(t)),
                  const SizedBox(height: 16),
                ],
              );
            }),
        ],
      ),
    );
  }

  Widget _buildTestCatalogueCard(TradeTestModel test) {
    final diffColor = _getDifficultyColor(test.difficulty);

    return GestureDetector(
      onTap: () {
        Navigator.of(context).push(MaterialPageRoute(builder: (context) => TestDetailScreen(test: test)));
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.grey.shade200),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 6, offset: const Offset(0, 2))],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(color: diffColor.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(6), border: Border.all(color: diffColor.withValues(alpha: 0.4))),
                  child: Text(test.difficulty, style: GoogleFonts.poppins(fontSize: 10, fontWeight: FontWeight.bold, color: diffColor)),
                ),
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(color: AppColors.background, borderRadius: BorderRadius.circular(6)),
                  child: Text(test.category, style: GoogleFonts.poppins(fontSize: 10, fontWeight: FontWeight.w600, color: AppColors.navy)),
                ),
                const Spacer(),
                if (test.certificateEarned)
                  Row(
                    children: [
                      const Icon(Icons.verified, color: AppColors.gold, size: 16),
                      const SizedBox(width: 4),
                      Text('Certified', style: GoogleFonts.poppins(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.gold)),
                    ],
                  ),
              ],
            ),
            const SizedBox(height: 8),
            Text(test.title, style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.navy)),
            if (test.description.isNotEmpty) ...[
              const SizedBox(height: 3),
              Text(test.description, maxLines: 1, overflow: TextOverflow.ellipsis, style: GoogleFonts.poppins(fontSize: 11, color: Colors.grey.shade600)),
            ],
            const SizedBox(height: 10),
            Row(
              children: [
                Text('⏱ ${test.estimatedMinutes} min', style: GoogleFonts.poppins(fontSize: 11, color: Colors.grey.shade600)),
                const SizedBox(width: 12),
                Text('👥 ${test.totalAttempts} attempted', style: GoogleFonts.poppins(fontSize: 11, color: Colors.grey.shade600)),
                const SizedBox(width: 12),
                Text('📊 Pass: ${test.passingScore}/100', style: GoogleFonts.poppins(fontSize: 11, color: Colors.grey.shade600)),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  test.workerAttempts > 0
                      ? 'Best: ${test.workerBestScore?.toInt() ?? 0}/100 · Attempted ${test.workerAttempts}x'
                      : 'Not attempted yet',
                  style: GoogleFonts.poppins(fontSize: 11, fontStyle: FontStyle.italic, color: test.workerAttempts > 0 ? AppColors.primaryTeal : Colors.grey),
                ),
                ElevatedButton(
                  onPressed: () {
                    Navigator.of(context).push(MaterialPageRoute(builder: (context) => TestDetailScreen(test: test)));
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primaryTeal,
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  child: Text(
                    test.workerAttempts > 0 ? 'Retake' : 'Start Test',
                    style: GoogleFonts.poppins(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // ── SUB-TAB 2: VIDEO ASSESSMENTS ─────────────────────────────────────────────
  Widget _buildVideoAssessmentsSubTab(CatalogueState catalogueState) {
    final videoAssessments = catalogueState.categoryGroups
        .expand((g) => g.tests)
        .where((t) => t.isVideoAssessment)
        .toList();

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Video Rubric Assessments', style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.navy)),
          const SizedBox(height: 4),
          Text('Record practical demonstrations evaluated by admin master tradesmen.', style: GoogleFonts.poppins(fontSize: 11, color: Colors.grey.shade600)),
          const SizedBox(height: 14),

          if (catalogueState.isLoading)
            const Center(child: Padding(padding: EdgeInsets.all(40), child: CircularProgressIndicator(color: AppColors.primaryTeal)))
          else if (videoAssessments.isEmpty)
            Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Text('No video assessments available for your trade yet.', style: GoogleFonts.poppins(color: Colors.grey.shade600)),
              ),
            )
          else
            ...videoAssessments.map((v) => _buildVideoAssessmentCard(v)),
        ],
      ),
    );
  }

  Widget _buildVideoAssessmentCard(TradeTestModel v) {
    final diffColor = _getDifficultyColor(v.difficulty);
    final isScored = v.workerBestScore != null;

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.videocam, color: AppColors.primaryTeal, size: 20),
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(color: diffColor.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(6)),
                child: Text(v.difficulty, style: GoogleFonts.poppins(fontSize: 10, fontWeight: FontWeight.bold, color: diffColor)),
              ),
              const Spacer(),
              Text('👥 ${v.totalAttempts} submitted', style: GoogleFonts.poppins(fontSize: 10, color: Colors.grey.shade600)),
            ],
          ),
          const SizedBox(height: 8),
          Text(v.title, style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.navy)),
          Text(v.description, style: GoogleFonts.poppins(fontSize: 11, color: Colors.grey.shade600)),
          const SizedBox(height: 10),

          // Scoring Rubric Breakdown Chips
          if (v.rubrics != null) ...[
            Text('Scoring Rubric Criteria:', style: GoogleFonts.poppins(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.navy)),
            const SizedBox(height: 4),
            Wrap(
              spacing: 6,
              runSpacing: 4,
              children: v.rubrics!.entries.map((e) {
                return Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(color: AppColors.background, borderRadius: BorderRadius.circular(6)),
                  child: Text('${e.key}: ${e.value}%', style: GoogleFonts.poppins(fontSize: 9, fontWeight: FontWeight.w600, color: AppColors.darkText)),
                );
              }).toList(),
            ),
            const SizedBox(height: 12),
          ],

          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                isScored ? 'Your score: ${v.workerBestScore!.toInt()}/100' : 'Not submitted yet',
                style: GoogleFonts.poppins(fontSize: 11, fontWeight: FontWeight.bold, color: isScored ? AppColors.primaryTeal : Colors.grey),
              ),
              ElevatedButton.icon(
                onPressed: () => context.push('/pipeline/video-upload'),
                icon: const Icon(Icons.videocam, size: 16, color: Colors.white),
                label: Text(isScored ? 'Resubmit' : 'Record Video', style: GoogleFonts.poppins(fontSize: 11, fontWeight: FontWeight.bold)),
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.primaryTeal, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ── SUB-TAB 3: MY PROGRESS ────────────────────────────────────────────────────
  Widget _buildMyProgressSubTab(dynamic worker, CatalogueState catalogueState, int tTests, int tCerts, double avgScore, List<dynamic> certificates) {
    // Real per-category completion, derived from the already-fetched catalogue.
    final categoryRows = catalogueState.categoryGroups.map((g) {
      final nonVideo = g.tests.where((t) => !t.isVideoAssessment).toList();
      final completed = nonVideo.where((t) => t.certificateEarned).length;
      final total = nonVideo.length;
      return (
        category: g.category,
        fraction: total > 0 ? completed / total : 0.0,
        label: '$completed/$total completed',
      );
    }).where((r) => r.label != '0/0 completed').toList();

    final activity = (worker?.recentActivity as List<dynamic>? ?? [])
        .toList()
        .reversed
        .take(5)
        .toList();

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Stats Row
          Row(
            children: [
              Expanded(child: _buildProgressStatBox('$tTests', 'Tests Attempted', AppColors.primaryTeal)),
              const SizedBox(width: 10),
              Expanded(child: _buildProgressStatBox('$tCerts', 'Certificates Earned', AppColors.gold)),
              const SizedBox(width: 10),
              Expanded(child: _buildProgressStatBox('${avgScore.toInt()}', 'Avg Score', AppColors.navy)),
            ],
          ),

          const SizedBox(height: 20),

          // Category Progress Bars
          Text('Progress by Category', style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.navy)),
          const SizedBox(height: 10),
          if (categoryRows.isEmpty)
            Text('No categories loaded yet.', style: GoogleFonts.poppins(fontSize: 12, color: Colors.grey.shade600))
          else
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
              child: Column(
                children: [
                  for (int i = 0; i < categoryRows.length; i++) ...[
                    if (i > 0) const SizedBox(height: 10),
                    _buildCategoryProgressRow(categoryRows[i].category, categoryRows[i].fraction, categoryRows[i].label),
                  ],
                ],
              ),
            ),

          const SizedBox(height: 20),

          // Recent Activity Log
          Text('Recent Learning Activity', style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.navy)),
          const SizedBox(height: 10),

          if (activity.isEmpty)
            Text('No activity yet — take an assessment to get started.', style: GoogleFonts.poppins(fontSize: 12, color: Colors.grey.shade600))
          else
            ...activity.map((a) => _buildActivityItem(
                  a.signalType.toString().replaceAll('_', ' '),
                  '${a.score.toInt()}/100',
                  a.date.toString().isNotEmpty ? a.date.toString().substring(0, 10) : '',
                  a.signalType == 'TEST',
                )),
        ],
      ),
    );
  }

  Widget _buildProgressStatBox(String val, String label, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey.shade200)),
      child: Column(
        children: [
          Text(val, style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.bold, color: color)),
          const SizedBox(height: 2),
          Text(label, textAlign: TextAlign.center, style: GoogleFonts.poppins(fontSize: 10, color: Colors.grey.shade600)),
        ],
      ),
    );
  }

  Widget _buildCategoryProgressRow(String label, double val, String textVal) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.navy)),
            Text(textVal, style: GoogleFonts.poppins(fontSize: 11, color: Colors.grey.shade600)),
          ],
        ),
        const SizedBox(height: 4),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(value: val, minHeight: 6, backgroundColor: Colors.grey.shade200, valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primaryTeal)),
        ),
      ],
    );
  }

  Widget _buildActivityItem(String title, String scoreStr, String date, bool isCert) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey.shade200)),
      child: Row(
        children: [
          Text(isCert ? '📝' : '🎥', style: const TextStyle(fontSize: 20)),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.navy)),
                Text(date, style: GoogleFonts.poppins(fontSize: 10, color: Colors.grey.shade600)),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(scoreStr, style: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.primaryTeal)),
              if (isCert)
                Text('Certificate ✓', style: GoogleFonts.poppins(fontSize: 9, fontWeight: FontWeight.bold, color: AppColors.gold)),
            ],
          ),
        ],
      ),
    );
  }
}
