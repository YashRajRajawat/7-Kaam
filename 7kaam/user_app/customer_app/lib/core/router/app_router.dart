import 'package:go_router/go_router.dart';
import '../../models/worker_public_model.dart';
import '../../screens/auth/login_screen.dart';
import '../../screens/auth/register_screen.dart';
import '../../screens/home/home_screen.dart';
import '../../screens/onboarding/onboarding_screen.dart';
import '../../screens/splash/splash_screen.dart';
import '../../screens/verify/qr_scan_screen.dart';
import '../../screens/worker_detail/worker_detail_screen.dart';

final GoRouter appRouter = GoRouter(
  initialLocation: '/',
  routes: [
    GoRoute(
      path: '/',
      builder: (context, state) => const SplashScreen(),
    ),
    GoRoute(
      path: '/onboarding',
      builder: (context, state) => const OnboardingScreen(),
    ),
    GoRoute(
      path: '/login',
      builder: (context, state) => const LoginScreen(),
    ),
    GoRoute(
      path: '/register',
      builder: (context, state) => const RegisterScreen(),
    ),
    GoRoute(
      path: '/home',
      builder: (context, state) {
        final initialTab = (state.extra as int?) ?? 0;
        return HomeScreen(initialTab: initialTab);
      },
    ),
    GoRoute(
      path: '/worker/:id',
      builder: (context, state) {
        final worker = state.extra as WorkerPublicModel;
        return WorkerDetailScreen(worker: worker);
      },
    ),
    GoRoute(
      path: '/qr_scan',
      builder: (context, state) => const QrScanScreen(),
    ),
  ],
);
