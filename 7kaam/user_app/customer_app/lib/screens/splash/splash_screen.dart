import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/constants/app_colors.dart';
import '../../core/storage/secure_storage.dart';
import '../../providers/auth_provider.dart';

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _checkAuthAndNavigate();
  }

  Future<void> _checkAuthAndNavigate() async {
    await Future.delayed(const Duration(seconds: 2));
    if (!mounted) return;

    final storage = SecureStorageService();
    final onboardingDone = await storage.isOnboardingComplete();
    final authState = ref.read(authProvider);

    if (authState.status == AuthStatus.authenticated) {
      context.go('/home');
    } else if (!onboardingDone) {
      context.go('/onboarding');
    } else {
      context.go('/login');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.primaryTeal,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Logo container
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.15),
                    blurRadius: 20,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: const Icon(
                Icons.verified_user_rounded,
                size: 64,
                color: AppColors.primaryTeal,
              ),
            )
                .animate()
                .scale(duration: 600.ms, curve: Curves.easeOutBack)
                .fadeIn(duration: 600.ms),
            const SizedBox(height: 24),
            Text(
              '7 Kaam',
              style: GoogleFonts.poppins(
                fontSize: 36,
                fontWeight: FontWeight.bold,
                color: Colors.white,
                letterSpacing: 1.2,
              ),
            )
                .animate()
                .slideY(begin: 0.3, end: 0, duration: 600.ms, delay: 200.ms)
                .fadeIn(duration: 600.ms, delay: 200.ms),
            const SizedBox(height: 8),
            Text(
              'AI-Powered Skill Certification Platform',
              style: GoogleFonts.poppins(
                fontSize: 14,
                fontWeight: FontWeight.w400,
                color: Colors.white.withOpacity(0.9),
              ),
            )
                .animate()
                .slideY(begin: 0.3, end: 0, duration: 600.ms, delay: 400.ms)
                .fadeIn(duration: 600.ms, delay: 400.ms),
          ],
        ),
      ),
    );
  }
}
