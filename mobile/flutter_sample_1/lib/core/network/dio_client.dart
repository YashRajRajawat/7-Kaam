import 'package:dio/dio.dart';
import '../constants/api_constants.dart';
import '../storage/secure_storage.dart';

class DioClient {
  static final DioClient _instance = DioClient._internal();
  factory DioClient() => _instance;

  late final Dio dio;
  bool _isRefreshing = false;

  DioClient._internal() {
    dio = Dio(
      BaseOptions(
        baseUrl: ApiConstants.baseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await SecureStorage.instance.getJwtToken();
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (DioException error, handler) async {
          final isAuthEndpoint = error.requestOptions.path.contains('/auth/');
          if (error.response?.statusCode == 401 && !isAuthEndpoint && !_isRefreshing) {
            final refreshed = await _tryRefresh();
            if (refreshed != null) {
              final retryOptions = error.requestOptions;
              retryOptions.headers['Authorization'] = 'Bearer $refreshed';
              try {
                final response = await dio.fetch(retryOptions);
                return handler.resolve(response);
              } catch (_) {
                // fall through to the original error below
              }
            } else {
              await SecureStorage.instance.clearAll();
            }
          }
          return handler.next(error);
        },
      ),
    );
  }

  Future<String?> _tryRefresh() async {
    _isRefreshing = true;
    try {
      final refreshToken = await SecureStorage.instance.getRefreshToken();
      if (refreshToken == null) return null;

      // Bare Dio instance — avoids re-entering this client's interceptors.
      final response = await Dio(BaseOptions(baseUrl: ApiConstants.baseUrl)).post(
        ApiConstants.refreshToken,
        data: {'refreshToken': refreshToken},
      );
      final newAccessToken = response.data?['accessToken']?.toString();
      if (newAccessToken == null) return null;

      await SecureStorage.instance.saveTokens(jwtToken: newAccessToken);
      return newAccessToken;
    } catch (_) {
      return null;
    } finally {
      _isRefreshing = false;
    }
  }
}
