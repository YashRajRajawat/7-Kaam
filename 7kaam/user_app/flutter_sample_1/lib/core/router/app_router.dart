import 'package:go_router/go_router.dart';

import '../storage/secure_storage.dart';
import '../../screens/splash/splash_screen.dart';
import '../../screens/onboarding/onboarding_screen.dart';
import '../../screens/auth/login_screen.dart';
import '../../screens/auth/register_screen.dart';
import '../../screens/home/home_screen.dart';
import '../../screens/pipeline/video_upload_screen.dart';
import '../../screens/pipeline/trade_test_screen.dart';
import '../../screens/profile/work_history_screen.dart';
import '../../screens/verify/verify_screen.dart';

const _publicPaths = ['/', '/onboarding', '/login', '/register'];

class AppRouter {
  static final GoRouter router = GoRouter(
    initialLocation: '/',
    redirect: (context, state) async {
      final loc = state.matchedLocation;
      final isPublic = _publicPaths.contains(loc) || loc.startsWith('/verify/');
      if (isPublic) return null;

      final token = await SecureStorage.instance.getJwtToken();
      if (token == null) return '/login';
      return null;
    },
    routes: [
      GoRoute(
        path: '/',
        name: 'splash',
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: '/onboarding',
        name: 'onboarding',
        builder: (context, state) => const OnboardingScreen(),
      ),
      GoRoute(
        path: '/login',
        name: 'login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/register',
        name: 'register',
        builder: (context, state) => const RegisterScreen(),
      ),
      GoRoute(
        path: '/home',
        name: 'home',
        builder: (context, state) {
          final tabIndexStr = state.uri.queryParameters['tab'];
          final initialTab = int.tryParse(tabIndexStr ?? '0') ?? 0;
          return HomeScreen(initialTab: initialTab);
        },
      ),
      GoRoute(
        path: '/pipeline/video-upload',
        name: 'video-upload',
        builder: (context, state) => const VideoUploadScreen(),
      ),
      GoRoute(
        path: '/pipeline/trade-test/:testId',
        name: 'trade-test',
        builder: (context, state) {
          final testId = state.pathParameters['testId'] ?? '';
          return TradeTestScreen(testId: testId);
        },
      ),
      GoRoute(
        path: '/profile/work-history',
        name: 'work-history',
        builder: (context, state) => const WorkHistoryScreen(),
      ),
      GoRoute(
        path: '/verify/:qrToken',
        name: 'verify',
        builder: (context, state) {
          final qrToken = state.pathParameters['qrToken'] ?? '';
          return VerifyScreen(qrToken: qrToken);
        },
      ),
    ],
  );
}
