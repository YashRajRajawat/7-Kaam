import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:share_plus/share_plus.dart';
import '../../core/constants/app_colors.dart';
import '../../models/skill_certificate_model.dart';
import '../../providers/certificate_provider.dart';
import '../../widgets/custom_button.dart';

class CertificatesScreen extends ConsumerStatefulWidget {
  const CertificatesScreen({super.key});

  @override
  ConsumerState<CertificatesScreen> createState() => _CertificatesScreenState();
}

class _CertificatesScreenState extends ConsumerState<CertificatesScreen> {
  String _selectedCategoryFilter = 'All';
  String _selectedTradeFilter = 'All';

  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      ref.read(certificateProvider.notifier).fetchCertificates();
    });
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
    final certState = ref.watch(certificateProvider);
    final allCerts = certState.certificates;

    final certs = allCerts.where((c) {
      final matchCat = _selectedCategoryFilter == 'All' || c.category.toUpperCase() == _selectedCategoryFilter.toUpperCase();
      final matchTrade = _selectedTradeFilter == 'All' || c.trade.toUpperCase() == _selectedTradeFilter.toUpperCase();
      return matchCat && matchTrade;
    }).toList();

    int begCount = 0, intCount = 0, advCount = 0;
    for (final c in allCerts) {
      if (c.difficulty.toUpperCase() == 'BEGINNER') begCount++;
      else if (c.difficulty.toUpperCase() == 'INTERMEDIATE') intCount++;
      else if (c.difficulty.toUpperCase() == 'ADVANCED') advCount++;
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.primaryTeal,
        title: Text(
          'Skill Certificates Wallet',
          style: GoogleFonts.poppins(fontWeight: FontWeight.bold, color: Colors.white),
        ),
        elevation: 0,
      ),
      body: SafeArea(
        child: certState.isLoading
            ? const Center(child: CircularProgressIndicator(color: AppColors.primaryTeal))
            : RefreshIndicator(
                onRefresh: () => ref.read(certificateProvider.notifier).fetchCertificates(),
                color: AppColors.primaryTeal,
                child: SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Header Stats Card
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(18),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [AppColors.primaryTeal, AppColors.navy],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          borderRadius: BorderRadius.circular(16),
                          boxShadow: [
                            BoxShadow(color: AppColors.primaryTeal.withOpacity(0.3), blurRadius: 10, offset: const Offset(0, 4)),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const Icon(Icons.workspace_premium, color: AppColors.gold, size: 40),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        '${allCerts.length} Certificate${allCerts.length == 1 ? '' : 's'} Earned',
                                        style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        '$begCount Beginner · $intCount Intermediate · $advCount Advanced',
                                        style: GoogleFonts.poppins(fontSize: 11, color: Colors.white70),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 16),

                      // Category Filter Chips
                      SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Row(
                          children: ['All', 'Safety', 'Installation', 'Maintenance', 'Theory'].map((cat) {
                            final selected = _selectedCategoryFilter == cat;
                            return Padding(
                              padding: const EdgeInsets.only(right: 8.0),
                              child: ChoiceChip(
                                label: Text(cat),
                                labelStyle: GoogleFonts.poppins(fontSize: 11, fontWeight: FontWeight.w600, color: selected ? Colors.white : AppColors.darkText),
                                selected: selected,
                                selectedColor: AppColors.primaryTeal,
                                backgroundColor: Colors.white,
                                onSelected: (val) {
                                  if (val) setState(() => _selectedCategoryFilter = cat);
                                },
                              ),
                            );
                          }).toList(),
                        ),
                      ),

                      const SizedBox(height: 8),

                      // Trade Filter Chips
                      SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Row(
                          children: ['All', 'ELECTRICIAN', 'PLUMBER', 'CARPENTER', 'AC_TECHNICIAN'].map((trade) {
                            final selected = _selectedTradeFilter == trade;
                            return Padding(
                              padding: const EdgeInsets.only(right: 8.0),
                              child: ChoiceChip(
                                label: Text(trade),
                                labelStyle: GoogleFonts.poppins(fontSize: 10, fontWeight: FontWeight.bold, color: selected ? Colors.white : AppColors.darkText),
                                selected: selected,
                                selectedColor: AppColors.navy,
                                backgroundColor: Colors.white,
                                onSelected: (val) {
                                  if (val) setState(() => _selectedTradeFilter = trade);
                                },
                              ),
                            );
                          }).toList(),
                        ),
                      ),

                      const SizedBox(height: 18),

                      if (certs.isEmpty)
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(32),
                          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
                          child: Center(
                            child: Text(
                              allCerts.isEmpty ? 'No certificates yet — pass an assessment to earn your first one.' : 'No certificates found for this filter.',
                              textAlign: TextAlign.center,
                              style: GoogleFonts.poppins(color: Colors.grey.shade600),
                            ),
                          ),
                        )
                      else
                        _buildCertificateGrid(certs),
                    ],
                  ),
                ),
              ),
      ),
    );
  }

  Widget _buildCertificateGrid(List<SkillCertificateModel> certsList) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        childAspectRatio: 0.78,
      ),
      itemCount: certsList.length,
      itemBuilder: (context, index) {
        final cert = certsList[index];
        return _buildCertificateCard(cert);
      },
    );
  }

  Widget _buildCertificateCard(SkillCertificateModel cert) {
    final diffColor = _getDifficultyColor(cert.difficulty);

    return GestureDetector(
      onTap: () => _showCertificateDetailBottomSheet(cert),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [AppColors.navy, AppColors.primaryTeal],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(color: Colors.black.withOpacity(0.12), blurRadius: 8, offset: const Offset(0, 3)),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '7 KAAM',
                  style: GoogleFonts.poppins(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.gold),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(color: diffColor, borderRadius: BorderRadius.circular(4)),
                  child: Text(
                    cert.difficulty,
                    style: GoogleFonts.poppins(fontSize: 8, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                ),
              ],
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  cert.title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                const SizedBox(height: 4),
                Text(
                  'Score: ${cert.score.toInt()}/100',
                  style: GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.gold),
                ),
              ],
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '#${cert.certificateNo.isNotEmpty ? cert.certificateNo : cert.id}',
                  style: GoogleFonts.poppins(fontSize: 8, color: Colors.white54),
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(cert.issuedAt, style: GoogleFonts.poppins(fontSize: 9, color: Colors.white70)),
                    Row(
                      children: [
                        InkWell(
                          onTap: () {
                            Share.share('Check out my official verified 7 Kaam Skill Certificate for ${cert.title}! Score: ${cert.score.toInt()}/100. Verification link: 7kaam.in/cert/${cert.certificateNo}');
                          },
                          child: const Icon(Icons.share, size: 16, color: Colors.white),
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _showCertificateDetailBottomSheet(SkillCertificateModel cert) {
    final certNo = cert.certificateNo.isNotEmpty ? cert.certificateNo : '7K-ELEC-2026-00142';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        padding: const EdgeInsets.all(20),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2))),
              ),
              const SizedBox(height: 16),

              // Large Certificate Visual
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(colors: [AppColors.primaryTeal, AppColors.navy]),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('OFFICIAL SKILL CERTIFICATE', style: GoogleFonts.poppins(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.gold)),
                        const Icon(Icons.verified, color: Colors.white, size: 22),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(cert.title, style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
                    const SizedBox(height: 4),
                    Text('Trade: ${cert.trade} · Category: ${cert.category} · ${cert.difficulty}', style: GoogleFonts.poppins(fontSize: 12, color: Colors.white70)),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Score: ${cert.score.toInt()}/100 (Pass: ${cert.passingScore})', style: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.gold)),
                        Text('#$certNo', style: GoogleFonts.poppins(fontSize: 10, color: Colors.white54)),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // AI Performance Breakdown Accordion
              Text('AI Evaluation & Performance Summary', style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.navy)),
              const SizedBox(height: 6),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: AppColors.background, borderRadius: BorderRadius.circular(10)),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Demonstrated strong mastery of safety protocols, tool handling, and core trade execution standard principles.',
                      style: GoogleFonts.poppins(fontSize: 12, color: AppColors.darkText, height: 1.4),
                    ),
                    const SizedBox(height: 8),
                    Text('Verification Link: 7kaam.in/cert/$certNo', style: GoogleFonts.poppins(fontSize: 11, fontStyle: FontStyle.italic, color: AppColors.primaryTeal)),
                  ],
                ),
              ),

              const SizedBox(height: 24),
              CustomButton(
                text: 'Download PDF',
                icon: Icons.picture_as_pdf,
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Downloading Certificate PDF #$certNo...'), backgroundColor: AppColors.successGreen),
                  );
                },
              ),
              const SizedBox(height: 12),
              CustomButton(
                text: 'Share on WhatsApp',
                isOutlined: true,
                icon: Icons.share,
                onPressed: () {
                  Share.share('Check out my official 7 Kaam Skill Certificate for ${cert.title}! Score: ${cert.score.toInt()}/100. Verification link: https://7kaam.in/cert/$certNo');
                },
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}
