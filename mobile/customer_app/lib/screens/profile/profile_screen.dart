import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/constants/app_colors.dart';
import '../../models/customer_model.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/custom_button.dart';

void _showEditProfileDialog(BuildContext context, WidgetRef ref, CustomerModel customer) {
  final nameController = TextEditingController(text: customer.fullName);
  final cityController = TextEditingController(text: customer.city);

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
            final success = await ref.read(authProvider.notifier).updateProfile(
                  fullName: nameController.text.trim(),
                  city: cityController.text.trim(),
                );
            if (context.mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text(success ? 'Profile updated' : 'Could not update profile')),
              );
            }
          },
          style: ElevatedButton.styleFrom(backgroundColor: AppColors.primaryTeal),
          child: Text('Save', style: GoogleFonts.poppins(color: Colors.white)),
        ),
      ],
    ),
  );
}

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final customer = authState.customer;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: Text(
          'My Profile',
          style: GoogleFonts.poppins(
            color: AppColors.navy,
            fontWeight: FontWeight.bold,
            fontSize: 20,
          ),
        ),
        centerTitle: false,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            children: [
              // User Card Header
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.04),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Container(
                      width: 60,
                      height: 60,
                      decoration: const BoxDecoration(
                        color: AppColors.primaryTeal,
                        shape: BoxShape.circle,
                      ),
                      child: Center(
                        child: Text(
                          customer != null && customer.fullName.isNotEmpty
                              ? customer.fullName[0].toUpperCase()
                              : 'C',
                          style: GoogleFonts.poppins(
                            fontSize: 26,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            customer?.fullName ?? 'Guest',
                            style: GoogleFonts.poppins(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: AppColors.navy,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            customer?.phoneNumber.isNotEmpty == true
                                ? '+91 ${customer!.phoneNumber}'
                                : 'Not logged in',
                            style: GoogleFonts.poppins(
                              fontSize: 13,
                              color: AppColors.grayText,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              const Icon(Icons.location_on, size: 14, color: AppColors.primaryTeal),
                              const SizedBox(width: 4),
                              Text(
                                customer?.city ?? 'Not set',
                                style: GoogleFonts.poppins(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.primaryTeal,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Account Actions Container
              Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.04),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    _buildListTile(
                      icon: Icons.qr_code_scanner_rounded,
                      title: 'Scan KaamCard QR',
                      subtitle: 'Verify worker credentials instantly',
                      onTap: () {
                        context.push('/qr_scan');
                      },
                    ),
                    const Divider(height: 1, indent: 50, color: AppColors.borderGray),
                    _buildListTile(
                      icon: Icons.edit_note_rounded,
                      title: 'Edit Profile',
                      subtitle: 'Update name or city',
                      onTap: customer == null ? null : () => _showEditProfileDialog(context, ref, customer),
                    ),
                    const Divider(height: 1, indent: 50, color: AppColors.borderGray),
                    _buildListTile(
                      icon: Icons.help_outline_rounded,
                      title: 'Support & Help',
                      subtitle: '24x7 Customer support center',
                      onTap: () {},
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),

              // Logout Button
              CustomButton(
                text: 'Logout',
                isOutlined: true,
                icon: Icons.logout_rounded,
                onPressed: () async {
                  await ref.read(authProvider.notifier).logout();
                  if (context.mounted) {
                    context.go('/login');
                  }
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildListTile({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback? onTap,
  }) {
    return ListTile(
      onTap: onTap,
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: AppColors.primaryTeal.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(icon, color: AppColors.primaryTeal),
      ),
      title: Text(
        title,
        style: GoogleFonts.poppins(
          fontWeight: FontWeight.bold,
          fontSize: 14,
          color: AppColors.darkText,
        ),
      ),
      subtitle: Text(
        subtitle,
        style: GoogleFonts.poppins(
          fontSize: 12,
          color: AppColors.grayText,
        ),
      ),
      trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: AppColors.grayText),
    );
  }
}
