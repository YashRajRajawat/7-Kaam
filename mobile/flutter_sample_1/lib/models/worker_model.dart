import 'work_history_model.dart';
import 'kaam_card_model.dart';

class ScoringLogItem {
  final String id;
  final String signalType;
  final double score;
  final String date;
  final String? notes;

  ScoringLogItem({
    required this.id,
    required this.signalType,
    required this.score,
    required this.date,
    this.notes,
  });

  factory ScoringLogItem.fromJson(Map<String, dynamic> json) {
    return ScoringLogItem(
      id: json['id']?.toString() ?? '',
      signalType: json['signalType']?.toString() ?? 'SCORE_EVENT',
      score: (json['outputScore'] ?? json['score'] ?? 0).toDouble(),
      date: json['scoredAt']?.toString() ?? json['date']?.toString() ?? '',
      notes: json['notes']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'signalType': signalType,
      'outputScore': score,
      'scoredAt': date,
      'notes': notes,
    };
  }
}

class WorkerModel {
  final String id;
  final String fullName;
  final String phoneNumber;
  final String trade;
  final String city;
  final String? locality;
  final String? aadhaarHash;
  final String? profilePhotoUrl;
  final bool aadhaarVerified;
  final String status; // PENDING / ACTIVE / SUSPENDED
  final bool underReview;
  final double? finalScore;
  final String? tier;
  final String? videoUrl;
  final double? videoScore;
  final double? testScore;
  final double? workHistoryScore;
  final String? kaamCardUrl;
  final String? qrCodeUrl;
  final String? kaamCardIssuedAt;
  final List<WorkHistoryModel> workHistory;
  final List<ScoringLogItem> recentActivity;
  final KaamCardModel? kaamCard;
  final String? createdAt;

  WorkerModel({
    required this.id,
    required this.fullName,
    required this.phoneNumber,
    required this.trade,
    required this.city,
    this.locality,
    this.aadhaarHash,
    this.profilePhotoUrl,
    this.aadhaarVerified = false,
    this.status = 'PENDING',
    this.underReview = false,
    this.finalScore,
    this.tier,
    this.videoUrl,
    this.videoScore,
    this.testScore,
    this.workHistoryScore,
    this.kaamCardUrl,
    this.qrCodeUrl,
    this.kaamCardIssuedAt,
    this.workHistory = const [],
    this.recentActivity = const [],
    this.kaamCard,
    this.createdAt,
  });

  // Derived state — the backend has no "pipeline step" concept, it's
  // computed here from the real fields the worker actually has.
  bool get hasVideo => videoUrl != null;
  bool get hasKaamCard => (kaamCard != null && !kaamCard!.isRevoked) || kaamCardUrl != null;
  bool get isSuspended => status == 'SUSPENDED';

  factory WorkerModel.fromJson(Map<String, dynamic> json) {
    double? asDouble(dynamic v) => v != null ? (v as num).toDouble() : null;

    List<KaamCardModel> cards = [];
    if (json['kaamCards'] is List) {
      cards = (json['kaamCards'] as List)
          .map((c) => KaamCardModel.fromJson(Map<String, dynamic>.from(c)))
          .toList();
    }
    KaamCardModel? latestCard;
    if (cards.isNotEmpty) {
      cards.sort((a, b) => b.issueDate.compareTo(a.issueDate));
      latestCard = cards.first;
    } else if (json['kaamCard'] != null) {
      latestCard = KaamCardModel.fromJson(Map<String, dynamic>.from(json['kaamCard']));
    }

    return WorkerModel(
      id: json['id']?.toString() ?? '',
      fullName: json['fullName']?.toString() ?? '',
      phoneNumber: json['phoneNumber']?.toString() ?? '',
      trade: json['trade']?.toString() ?? 'ELECTRICIAN',
      city: json['city']?.toString() ?? '',
      locality: json['locality']?.toString(),
      aadhaarHash: json['aadhaarHash']?.toString(),
      profilePhotoUrl: json['profilePhotoUrl']?.toString(),
      aadhaarVerified: json['aadhaarVerified'] == true,
      status: json['status']?.toString() ?? 'PENDING',
      underReview: json['underReview'] == true,
      finalScore: asDouble(json['finalScore']),
      tier: json['tier']?.toString(),
      videoUrl: json['videoUrl']?.toString(),
      videoScore: asDouble(json['videoScore']),
      testScore: asDouble(json['testScore']),
      workHistoryScore: asDouble(json['workHistoryScore']),
      kaamCardUrl: json['kaamCardUrl']?.toString(),
      qrCodeUrl: json['qrCodeUrl']?.toString(),
      kaamCardIssuedAt: json['kaamCardIssuedAt']?.toString(),
      workHistory: (json['workHistories'] as List<dynamic>?)
              ?.map((e) => WorkHistoryModel.fromJson(Map<String, dynamic>.from(e)))
              .toList() ??
          [],
      recentActivity: (json['scoringLogs'] as List<dynamic>?)
              ?.map((e) => ScoringLogItem.fromJson(Map<String, dynamic>.from(e)))
              .toList() ??
          [],
      kaamCard: latestCard,
      createdAt: json['createdAt']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'fullName': fullName,
      'phoneNumber': phoneNumber,
      'trade': trade,
      'city': city,
      'locality': locality,
      'aadhaarHash': aadhaarHash,
      'profilePhotoUrl': profilePhotoUrl,
      'aadhaarVerified': aadhaarVerified,
      'status': status,
      'underReview': underReview,
      'finalScore': finalScore,
      'tier': tier,
      'videoUrl': videoUrl,
      'videoScore': videoScore,
      'testScore': testScore,
      'workHistoryScore': workHistoryScore,
      'kaamCardUrl': kaamCardUrl,
      'qrCodeUrl': qrCodeUrl,
      'kaamCardIssuedAt': kaamCardIssuedAt,
      'workHistories': workHistory.map((w) => w.toJson()).toList(),
      'scoringLogs': recentActivity.map((r) => r.toJson()).toList(),
      'kaamCard': kaamCard?.toJson(),
      'createdAt': createdAt,
    };
  }

  WorkerModel copyWith({
    String? fullName,
    String? phoneNumber,
    String? trade,
    String? city,
    String? locality,
    String? aadhaarHash,
    String? profilePhotoUrl,
    bool? aadhaarVerified,
    String? status,
    bool? underReview,
    double? finalScore,
    String? tier,
    String? videoUrl,
    double? videoScore,
    double? testScore,
    double? workHistoryScore,
    String? kaamCardUrl,
    String? qrCodeUrl,
    String? kaamCardIssuedAt,
    List<WorkHistoryModel>? workHistory,
    List<ScoringLogItem>? recentActivity,
    KaamCardModel? kaamCard,
  }) {
    return WorkerModel(
      id: id,
      fullName: fullName ?? this.fullName,
      phoneNumber: phoneNumber ?? this.phoneNumber,
      trade: trade ?? this.trade,
      city: city ?? this.city,
      locality: locality ?? this.locality,
      aadhaarHash: aadhaarHash ?? this.aadhaarHash,
      profilePhotoUrl: profilePhotoUrl ?? this.profilePhotoUrl,
      aadhaarVerified: aadhaarVerified ?? this.aadhaarVerified,
      status: status ?? this.status,
      underReview: underReview ?? this.underReview,
      finalScore: finalScore ?? this.finalScore,
      tier: tier ?? this.tier,
      videoUrl: videoUrl ?? this.videoUrl,
      videoScore: videoScore ?? this.videoScore,
      testScore: testScore ?? this.testScore,
      workHistoryScore: workHistoryScore ?? this.workHistoryScore,
      kaamCardUrl: kaamCardUrl ?? this.kaamCardUrl,
      qrCodeUrl: qrCodeUrl ?? this.qrCodeUrl,
      kaamCardIssuedAt: kaamCardIssuedAt ?? this.kaamCardIssuedAt,
      workHistory: workHistory ?? this.workHistory,
      recentActivity: recentActivity ?? this.recentActivity,
      kaamCard: kaamCard ?? this.kaamCard,
      createdAt: createdAt,
    );
  }
}
