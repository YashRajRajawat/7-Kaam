import 'score_breakdown_model.dart';
import 'kaam_card_history_model.dart';

class KaamCardModel {
  final String id;
  final String workerId;
  final String workerName;
  final String trade;
  final String city;
  final String? profilePhotoUrl;
  final double score;
  final String tier;
  final int version;
  final List<KaamCardHistoryModel> histories;
  final ScoreBreakdownModel? scoreBreakdown;
  final bool aadhaarVerified;
  final DateTime issueDate;
  final DateTime expiryDate;
  final String qrToken;
  final String certificateId;
  final String? kaamCardUrl;
  final int totalTestsTaken;
  final int totalVideosTaken;
  final int certificatesEarned;
  final String credibilityLevel; // EMERGING (1-3) / ESTABLISHED (4-8) / EXPERT (9+)
  final bool isRevoked;

  KaamCardModel({
    required this.id,
    required this.workerId,
    required this.workerName,
    required this.trade,
    required this.city,
    this.profilePhotoUrl,
    required this.score,
    required this.tier,
    this.version = 1,
    this.histories = const [],
    this.scoreBreakdown,
    this.totalTestsTaken = 0,
    this.totalVideosTaken = 0,
    this.certificatesEarned = 0,
    this.credibilityLevel = 'EMERGING',
    this.isRevoked = false,
    required this.aadhaarVerified,
    required this.issueDate,
    required this.expiryDate,
    required this.qrToken,
    required this.certificateId,
    this.kaamCardUrl,
  });

  factory KaamCardModel.fromJson(Map<String, dynamic> json) {
    final worker = json['worker'] is Map<String, dynamic> ? json['worker'] : null;
    final workerName = json['workerName'] ?? json['worker_name'] ?? worker?['fullName'] ?? 'Worker';
    final trade = json['trade'] ?? worker?['trade'] ?? 'ELECTRICIAN';
    final city = json['city'] ?? worker?['city'] ?? 'Bangalore';
    final photo = json['profilePhotoUrl'] ?? json['profile_photo_url'] ?? worker?['profilePhotoUrl'];

    ScoreBreakdownModel? breakdown;
    if (json['scoreBreakdown'] != null) {
      breakdown = ScoreBreakdownModel.fromJson(Map<String, dynamic>.from(json['scoreBreakdown']));
    } else if (json['score_breakdown'] != null) {
      breakdown = ScoreBreakdownModel.fromJson(Map<String, dynamic>.from(json['score_breakdown']));
    }

    final double finalScore = breakdown?.compositeScore ??
        (json['score'] != null
            ? (json['score'] as num).toDouble()
            : (worker?['finalScore'] != null ? (worker!['finalScore'] as num).toDouble() : 0.0));

    final String tier = breakdown?.tier ?? json['tier'] ?? worker?['tier'] ?? 'BRONZE';

    List<KaamCardHistoryModel> historyList = [];
    if (json['histories'] != null && json['histories'] is List) {
      historyList = (json['histories'] as List)
          .map((h) => KaamCardHistoryModel.fromJson(Map<String, dynamic>.from(h)))
          .toList();
    }

    final int tTests = json['totalTestsTaken'] ?? json['total_tests_taken'] ?? breakdown?.testCount ?? 1;
    final int tVideos = json['totalVideosTaken'] ?? json['total_videos_taken'] ?? breakdown?.videoCount ?? 1;
    final int certs = json['certificatesEarned'] ?? json['certificates_earned'] ?? 1;

    final int totalAssessments = tTests + tVideos;
    String cred = json['credibilityLevel'] ?? json['credibility_level'] ?? 'EMERGING';
    if (json['credibilityLevel'] == null) {
      if (totalAssessments >= 9) {
        cred = 'EXPERT';
      } else if (totalAssessments >= 4) {
        cred = 'ESTABLISHED';
      } else {
        cred = 'EMERGING';
      }
    }

    return KaamCardModel(
      id: json['id']?.toString() ?? json['_id']?.toString() ?? '',
      workerId: json['workerId']?.toString() ?? json['worker_id']?.toString() ?? worker?['id']?.toString() ?? '',
      workerName: workerName,
      trade: trade,
      city: city,
      profilePhotoUrl: photo,
      score: finalScore,
      tier: tier,
      version: json['version'] is int ? json['version'] : (int.tryParse(json['version']?.toString() ?? '1') ?? 1),
      histories: historyList,
      scoreBreakdown: breakdown,
      totalTestsTaken: tTests,
      totalVideosTaken: tVideos,
      certificatesEarned: certs,
      credibilityLevel: cred,
      isRevoked: json['isRevoked'] == true || json['is_revoked'] == true,
      aadhaarVerified: json['aadhaarVerified'] ?? json['aadhaar_verified'] ?? worker?['aadhaarVerified'] ?? true,
      issueDate: json['issuedAt'] != null
          ? DateTime.parse(json['issuedAt'])
          : (json['issueDate'] != null ? DateTime.parse(json['issueDate']) : DateTime.now()),
      expiryDate: json['expiresAt'] != null
          ? DateTime.parse(json['expiresAt'])
          : (json['expiryDate'] != null ? DateTime.parse(json['expiryDate']) : DateTime.now().add(const Duration(days: 365))),
      qrToken: json['qrToken'] ?? json['qr_token'] ?? '',
      certificateId: json['id']?.toString() ?? 'KC-7K',
      kaamCardUrl: json['pdfUrl'] ?? json['kaamCardUrl'] ?? json['kaam_card_url'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'workerId': workerId,
      'workerName': workerName,
      'trade': trade,
      'city': city,
      'profilePhotoUrl': profilePhotoUrl,
      'score': score,
      'tier': tier,
      'version': version,
      'histories': histories.map((h) => h.toJson()).toList(),
      'scoreBreakdown': scoreBreakdown?.toJson(),
      'totalTestsTaken': totalTestsTaken,
      'totalVideosTaken': totalVideosTaken,
      'certificatesEarned': certificatesEarned,
      'credibilityLevel': credibilityLevel,
      'aadhaarVerified': aadhaarVerified,
      'issueDate': issueDate.toIso8601String(),
      'expiryDate': expiryDate.toIso8601String(),
      'qrToken': qrToken,
      'certificateId': certificateId,
      'kaamCardUrl': kaamCardUrl,
    };
  }
}
