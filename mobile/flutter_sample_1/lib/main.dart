import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'core/constants/app_colors.dart';
import 'core/router/app_router.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  // Global Flutter error boundary — replaces the red crash screen with
  // a friendly error card so uncaught widget errors never show raw stack.
  FlutterError.onError = (FlutterErrorDetails details) {
    FlutterError.presentError(details);
    debugPrint('[7Kaam Worker] UI Error: ${details.exceptionAsString()}');
  };
  ErrorWidget.builder = (FlutterErrorDetails details) {
    return Scaffold(
      backgroundColor: const Color(0xFFF7F9FB),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline_rounded, size: 64, color: Color(0xFFEF4444)),
              const SizedBox(height: 16),
              const Text(
                'Something went wrong',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF191C1E)),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                details.exceptionAsString(),
                style: const TextStyle(fontSize: 12, color: Color(0xFF565E74)),
                textAlign: TextAlign.center,
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  };

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
