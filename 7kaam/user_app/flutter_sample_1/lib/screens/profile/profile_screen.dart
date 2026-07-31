import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../../providers/worker_provider.dart';
import '../../widgets/tier_badge.dart';
import '../../widgets/custom_button.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  void _showEditProfileDialog(BuildContext context, WidgetRef ref, dynamic worker) {
    final nameController = TextEditingController(text: worker?.name ?? '');
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
                'name': nameController.text.trim(),
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

    final worker = workerState.worker ?? authState.currentWorker;
    final workHistory = worker?.workHistory ?? [];

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
          padding: const EdgeInsets.all(20.0),
          child: Column(
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
                    Stack(
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
                                    errorWidget: (context, url, error) =>
                                        const Icon(Icons.person, size: 50, color: AppColors.primaryTeal),
                                  ),
                                )
                              : const Icon(Icons.person, size: 50, color: AppColors.primaryTeal),
                        ),
                        Positioned(
                          bottom: 0,
                          right: 0,
                          child: Container(
                            padding: const EdgeInsets.all(6),
                            decoration: const BoxDecoration(
                              color: AppColors.primaryTeal,
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.camera_alt, color: Colors.white, size: 14),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(
                      worker?.name ?? 'Worker Name',
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
                      '${worker?.city ?? 'Bangalore'} • ${worker?.phone ?? ''}',
                      style: GoogleFonts.poppins(fontSize: 13, color: AppColors.grayText),
                    ),
                    const SizedBox(height: 16),
                    CustomButton(
                      text: 'Edit Profile',
                      isOutlined: true,
                      height: 40,
                      onPressed: () => _showEditProfileDialog(context, ref, worker),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Work History Section Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Work History & Ratings',
                    style: GoogleFonts.poppins(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: AppColors.darkText,
                    ),
                  ),
                  TextButton.icon(
                    onPressed: () => context.push('/profile/work-history'),
                    icon: const Icon(Icons.add, size: 18, color: AppColors.primaryTeal),
                    label: Text(
                      'Add Entry',
                      style: GoogleFonts.poppins(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primaryTeal,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Work History List
              if (workHistory.isEmpty)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: AppColors.white,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Center(
                    child: Text(
                      'No past employer entries added yet. Tap Add Entry to include your work experience.',
                      textAlign: TextAlign.center,
                      style: GoogleFonts.poppins(color: AppColors.grayText, fontSize: 13),
                    ),
                  ),
                )
              else
                Column(
                  children: workHistory.map((item) {
                    return Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppColors.white,
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 4)],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                item.employerName,
                                style: GoogleFonts.poppins(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.darkText,
                                ),
                              ),
                              Row(
                                children: [
                                  const Icon(Icons.star, color: AppColors.gold, size: 18),
                                  const SizedBox(width: 4),
                                  Text(
                                    item.rating.toStringAsFixed(1),
                                    style: GoogleFonts.poppins(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 14,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            item.jobRole,
                            style: GoogleFonts.poppins(
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                              color: AppColors.primaryTeal,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${item.startDate} ${item.endDate != null ? '- ${item.endDate}' : '(Present)'}',
                            style: GoogleFonts.poppins(fontSize: 11, color: AppColors.grayText),
                          ),
                          if (item.feedback != null && item.feedback!.isNotEmpty) ...[
                            const SizedBox(height: 8),
                            Text(
                              '"${item.feedback}"',
                              style: GoogleFonts.poppins(
                                fontSize: 12,
                                fontStyle: FontStyle.italic,
                                color: AppColors.grayText,
                              ),
                            ),
                          ],
                        ],
                      ),
                    );
                  }).toList(),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
