import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../../providers/worker_provider.dart';
import '../../providers/certificate_provider.dart';
import '../../providers/kaam_card_provider.dart';
import '../../providers/test_provider.dart';
import '../../widgets/tier_badge.dart';
import '../../widgets/custom_button.dart';

class ProfileScreen extends ConsumerWidget {
  final Function(int)? onNavigateTab;

  const ProfileScreen({super.key, this.onNavigateTab});

  void _showEditProfileDialog(BuildContext context, WidgetRef ref, dynamic worker) {
    final nameController = TextEditingController(text: worker?.fullName ?? '');
    final cityController = TextEditingController(text: worker?.city ?? '');
    final localityController = TextEditingController(text: worker?.locality ?? '');

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text('Edit Profile', style: GoogleFonts.poppins(fontWeight: FontWeight.bold)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameController,
              decoration: const InputDecoration(labelText: 'Full Name'),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: cityController,
              decoration: const InputDecoration(labelText: 'City'),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: localityController,
              decoration: const InputDecoration(labelText: 'Locality'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text('Cancel', style: GoogleFonts.poppins(color: AppColors.grayText)),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.of(ctx).pop();
              await ref.read(workerProvider.notifier).updateProfile({
                'fullName': nameController.text.trim(),
                'city': cityController.text.trim(),
                'locality': localityController.text.trim(),
              });
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primaryTeal),
            child: Text('Save', style: GoogleFonts.poppins(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final workerState = ref.watch(workerProvider);
    final certState = ref.watch(certificateProvider);

    final worker = workerState.worker ?? authState.currentWorker;
    final workHistory = worker?.workHistory ?? [];
    final certificates = certState.certificates;

    // Profile completeness calculation
    final hasPhoto = worker?.profilePhotoUrl != null && worker!.profilePhotoUrl!.isNotEmpty;
    final hasAadhaar = worker?.aadhaarHash != null && worker!.aadhaarHash!.isNotEmpty;
    final hasHistory = workHistory.isNotEmpty;
    final hasKaamCard = worker?.hasKaamCard == true || worker?.kaamCard != null;

    int completedCount = 0;
    if (hasPhoto) completedCount++;
    if (hasAadhaar) completedCount++;
    if (hasHistory) completedCount++;
    if (hasKaamCard) completedCount++;
    final double completeness = completedCount / 4.0;

    int totalMonths = 0;
    for (final h in workHistory) {
      totalMonths += h.durationMonths > 0 ? h.durationMonths : 6;
    }
    final expYears = (totalMonths / 12).toStringAsFixed(1);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.primaryTeal,
        title: Text(
          'My Profile',
          style: GoogleFonts.poppins(fontWeight: FontWeight.bold, color: Colors.white),
        ),
        elevation: 0,
        actions: [
          IconButton(
            onPressed: () async {
              await ref.read(authProvider.notifier).logout();
              if (context.mounted) {
                context.go('/login');
              }
            },
            icon: const Icon(Icons.logout, color: Colors.white),
            tooltip: 'Logout',
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Photo + Details Header Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AppColors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 6)],
                ),
                child: Column(
                  children: [
                    CircleAvatar(
                      radius: 45,
                      backgroundColor: AppColors.primaryTeal.withValues(alpha: 0.1),
                      child: worker?.profilePhotoUrl != null && worker!.profilePhotoUrl!.isNotEmpty
                          ? ClipRRect(
                              borderRadius: BorderRadius.circular(45),
                              child: CachedNetworkImage(
                                imageUrl: worker.profilePhotoUrl!,
                                fit: BoxFit.cover,
                                width: 90,
                                height: 90,
                                errorWidget: (context, url, error) => const Icon(Icons.person, size: 50, color: AppColors.primaryTeal),
                              ),
                            )
                          : const Icon(Icons.person, size: 50, color: AppColors.primaryTeal),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      worker?.fullName ?? 'Worker Name',
                      style: GoogleFonts.poppins(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: AppColors.darkText,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        TierBadge(tier: worker?.tier),
                        const SizedBox(width: 8),
                        Text(
                          worker?.trade.replaceAll('_', ' ') ?? 'ELECTRICIAN',
                          style: GoogleFonts.poppins(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppColors.primaryTeal,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      '${worker?.city ?? 'Bangalore'} • ${worker?.phoneNumber ?? ''}',
                      style: GoogleFonts.poppins(fontSize: 13, color: AppColors.grayText),
                    ),
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        Expanded(
                          child: CustomButton(
                            text: 'Edit Profile',
                            isOutlined: true,
                            height: 38,
                            onPressed: () => _showEditProfileDialog(context, ref, worker),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: CustomButton(
                            text: 'Logout',
                            isOutlined: true,
                            height: 38,
                            icon: Icons.logout,
                            onPressed: () async {
                              ref.read(kaamCardProvider.notifier).clearKaamCard();
                              ref.read(testProvider.notifier).resetTestState();
                              await ref.read(authProvider.notifier).logout();
                              if (context.mounted) context.go('/login');
                            },
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // Experience Summary Card (New)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '$expYears Years Experience · ${workHistory.length} Projects · ${certificates.length} Certificates',
                      style: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.navy),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Profile Completeness', style: GoogleFonts.poppins(fontSize: 12, color: Colors.grey.shade600)),
                        Text('${(completeness * 100).toInt()}%', style: GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.primaryTeal)),
                      ],
                    ),
                    const SizedBox(height: 6),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(6),
                      child: LinearProgressIndicator(
                        value: completeness,
                        minHeight: 8,
                        backgroundColor: Colors.grey.shade200,
                        valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primaryTeal),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 8,
                      runSpacing: 6,
                      children: [
                        _buildCheckBadge('Photo', hasPhoto),
                        _buildCheckBadge('Aadhaar', hasAadhaar),
                        _buildCheckBadge('Work History', hasHistory),
                        _buildCheckBadge('KaamCard', hasKaamCard),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // Skill Certificates Section Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Skill Certificates',
                    style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.navy),
                  ),
                  TextButton(
                    onPressed: () {
                      if (onNavigateTab != null) onNavigateTab!(3); // Navigate to Certificates tab (Tab index 3)
                    },
                    child: Text('View all (${certificates.length})', style: GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.primaryTeal)),
                  ),
                ],
              ),
              const SizedBox(height: 8),

              // Certificates Horizontal Scroll
              if (certificates.isEmpty)
                Text('No certificates yet.', style: GoogleFonts.poppins(fontSize: 12, color: Colors.grey.shade600))
              else
              SizedBox(
                height: 100,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  itemCount: certificates.length,
                  itemBuilder: (context, index) {
                    final title = certificates[index].testTitle;
                    final score = certificates[index].score;

                    return Container(
                      width: 200,
                      margin: const EdgeInsets.only(right: 12),
                      padding: const EdgeInsets.all(12),
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
                              Text('Score: ${score.toInt()}/100', style: GoogleFonts.poppins(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.gold)),
                              const Icon(Icons.verified, size: 14, color: Colors.white),
                            ],
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),

              const SizedBox(height: 20),

              // Work History Section Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Work History',
                    style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.navy),
                  ),
                  ElevatedButton.icon(
                    onPressed: () => context.push('/profile/work-history'),
                    icon: const Icon(Icons.add, size: 16, color: Colors.white),
                    label: Text('Add Experience', style: GoogleFonts.poppins(fontSize: 11, fontWeight: FontWeight.bold)),
                    style: ElevatedButton.styleFrom(backgroundColor: AppColors.primaryTeal, padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4)),
                  ),
                ],
              ),
              const SizedBox(height: 10),

              if (workHistory.isEmpty)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12)),
                  child: Center(
                    child: Text(
                      'No past employer entries added yet. Tap Add Experience to build your portfolio.',
                      textAlign: TextAlign.center,
                      style: GoogleFonts.poppins(color: AppColors.grayText, fontSize: 12),
                    ),
                  ),
                )
              else
                Column(
                  children: workHistory.map((item) {
                    return Container(
                      margin: const EdgeInsets.only(bottom: 10),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.grey.shade200),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.business_center, color: AppColors.primaryTeal, size: 28),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(item.clientName, style: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.navy)),
                                Text(item.projectTitle, style: GoogleFonts.poppins(fontSize: 11, color: AppColors.primaryTeal)),
                                Text('${item.startDate} ${item.endDate != null ? '- ${item.endDate}' : '(Present)'}', style: GoogleFonts.poppins(fontSize: 10, color: Colors.grey.shade600)),
                              ],
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(color: AppColors.background, borderRadius: BorderRadius.circular(6)),
                            child: Text(item.projectScale, style: GoogleFonts.poppins(fontSize: 9, fontWeight: FontWeight.bold, color: AppColors.navy)),
                          ),
                        ],
                      ),
                    );
                  }).toList(),
                ),
              const SizedBox(height: 30),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCheckBadge(String label, bool isDone) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: isDone ? AppColors.successGreen.withValues(alpha: 0.12) : Colors.grey.shade100,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(isDone ? Icons.check : Icons.close, size: 12, color: isDone ? AppColors.successGreen : Colors.grey),
          const SizedBox(width: 4),
          Text(label, style: GoogleFonts.poppins(fontSize: 10, fontWeight: FontWeight.w600, color: isDone ? AppColors.successGreen : Colors.grey)),
        ],
      ),
    );
  }
}
