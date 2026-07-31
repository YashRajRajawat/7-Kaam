import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'core/constants/app_colors.dart';
import 'core/router/app_router.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const ProviderScope(child: SevenKaamWorkerApp()));
}

class SevenKaamWorkerApp extends StatelessWidget {
  const SevenKaamWorkerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: '7 Kaam — Worker App',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        scaffoldBackgroundColor: AppColors.background,
        colorScheme: ColorScheme.fromSeed(
          seedColor: AppColors.primaryTeal,
          primary: AppColors.primaryTeal,
          secondary: AppColors.gold,
          surface: AppColors.background,
        ),
        textTheme: GoogleFonts.poppinsTextTheme(
          Theme.of(context).textTheme,
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: AppColors.primaryTeal,
          elevation: 0,
          centerTitle: false,
        ),
      ),
      routerConfig: AppRouter.router,
    );
  }
}
