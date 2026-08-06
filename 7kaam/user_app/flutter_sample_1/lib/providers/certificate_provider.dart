import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/network/api_service.dart';
import '../models/skill_certificate_model.dart';
import 'auth_provider.dart';

class CertificateState {
  final bool isLoading;
  final String? errorMessage;
  final List<SkillCertificateModel> certificates;

  CertificateState({
    this.isLoading = false,
    this.errorMessage,
    this.certificates = const [],
  });

  CertificateState copyWith({
    bool? isLoading,
    String? errorMessage,
    List<SkillCertificateModel>? certificates,
  }) {
    return CertificateState(
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
      certificates: certificates ?? this.certificates,
    );
  }
}

class CertificateNotifier extends StateNotifier<CertificateState> {
  final Ref ref;
  final ApiService _apiService = ApiService();

  CertificateNotifier(this.ref) : super(CertificateState());

  Future<void> fetchCertificates() async {
    final workerId = ref.read(authProvider).currentWorker?.id ?? 'worker-ravi-001';

    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final response = await _apiService.getWorkerCertificates(workerId);

      if (response.statusCode == 200 && response.data != null && response.data is List) {
        final certs = (response.data as List)
            .map((c) => SkillCertificateModel.fromJson(Map<String, dynamic>.from(c)))
            .toList();
        state = state.copyWith(isLoading: false, certificates: certs);
      } else {
        state = state.copyWith(isLoading: false, certificates: []);
      }
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
    }
  }

  Future<SkillCertificateModel?> getCertificateDetail(String certId) async {
    try {
      final response = await ApiService().getCertificateDetail(certId);
      if (response.statusCode == 200 && response.data != null) {
        return SkillCertificateModel.fromJson(Map<String, dynamic>.from(response.data));
      }
    } catch (e) {
      // Fallback
    }
    return null;
  }
}

final certificateProvider = StateNotifierProvider<CertificateNotifier, CertificateState>((ref) {
  return CertificateNotifier(ref);
});
