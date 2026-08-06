import 'work_history_model.dart';
import 'kaam_card_model.dart';

class ScoringLogItem {
  final String id;
  final String signalType;
  final double score;
  final String date;

  ScoringLogItem({
    required this.id,
    required this.signalType,
    required this.score,
    required this.date,
  });

  factory ScoringLogItem.fromJson(Map<String, dynamic> json) {
    return ScoringLogItem(
      id: json['id']?.toString() ?? '',
      signalType: json['signalType'] ?? json['signal_type'] ?? 'SCORE_EVENT',
      score: (json['score'] ?? 0).toDouble(),
      date: json['date'] ?? json['created_at'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'signalType': signalType,
      'score': score,
      'date': date,
    };
  }
}

class WorkerModel {
  final String id;
  final String name;
  final String phone;
  final String trade;
  final String city;
  final String? locality;
  final String? aadhaarHash;
  final String? profilePhotoUrl;
  final bool isCertified;
  final double? score;
  final String? tier;
  final int pipelineStep;
  final String? videoUrl;
  final String? videoStatus;
  final double? videoScore;
  final bool testCompleted;
  final double? testScore;
  final double? workHistoryScore;
  final List<WorkHistoryModel> workHistory;
  final List<ScoringLogItem> recentActivity;
  final KaamCardModel? kaamCard;

  WorkerModel({
    required this.id,
    required this.name,
    required this.phone,
    required this.trade,
    required this.city,
    this.locality,
    this.aadhaarHash,
    this.profilePhotoUrl,
    this.isCertified = false,
    this.score,
    this.tier,
    this.pipelineStep = 1,
    this.videoUrl,
    this.videoStatus,
    this.videoScore,
    this.testCompleted = false,
    this.testScore,
    this.workHistoryScore,
    this.workHistory = const [],
    this.recentActivity = const [],
    this.kaamCard,
  });

  factory WorkerModel.fromJson(Map<String, dynamic> json) {
    return WorkerModel(
      id: json['id']?.toString() ?? json['_id']?.toString() ?? '',
      name: json['name'] ?? '',
      phone: json['phone'] ?? '',
      trade: json['trade'] ?? 'ELECTRICIAN',
      city: json['city'] ?? 'Bangalore',
      locality: json['locality'],
      aadhaarHash: json['aadhaarHash'] ?? json['aadhaar_hash'],
      profilePhotoUrl: json['profilePhotoUrl'] ?? json['profile_photo_url'],
      isCertified: json['isCertified'] ?? json['is_certified'] ?? false,
      score: json['score'] != null ? (json['score']).toDouble() : null,
      tier: json['tier']?.toString(),
      pipelineStep: json['pipelineStep'] ?? json['pipeline_step'] ?? 1,
      videoUrl: json['videoUrl'] ?? json['video_url'],
      videoStatus: json['videoStatus'] ?? json['video_status'],
      videoScore: json['videoScore'] != null ? (json['videoScore']).toDouble() : (json['kaamCard']?['scoreBreakdown']?['videoScore'] != null ? (json['kaamCard']['scoreBreakdown']['videoScore']).toDouble() : 85.0),
      testCompleted: json['testCompleted'] ?? json['test_completed'] ?? false,
      testScore: json['testScore'] != null ? (json['testScore']).toDouble() : null,
      workHistoryScore: json['workHistoryScore'] != null ? (json['workHistoryScore']).toDouble() : null,
      workHistory: (json['workHistory'] as List<dynamic>?)
              ?.map((e) => WorkHistoryModel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      recentActivity: (json['recentActivity'] as List<dynamic>?)
              ?.map((e) => ScoringLogItem.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      kaamCard: json['kaamCard'] != null ? KaamCardModel.fromJson(json['kaamCard']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'phone': phone,
      'trade': trade,
      'city': city,
      'locality': locality,
      'aadhaarHash': aadhaarHash,
      'profilePhotoUrl': profilePhotoUrl,
      'isCertified': isCertified,
      'score': score,
      'tier': tier,
      'pipelineStep': pipelineStep,
      'videoUrl': videoUrl,
      'videoStatus': videoStatus,
      'videoScore': videoScore,
      'testCompleted': testCompleted,
      'testScore': testScore,
      'workHistoryScore': workHistoryScore,
      'workHistory': workHistory.map((w) => w.toJson()).toList(),
      'recentActivity': recentActivity.map((r) => r.toJson()).toList(),
      'kaamCard': kaamCard?.toJson(),
    };
  }

  WorkerModel copyWith({
    String? name,
    String? phone,
    String? trade,
    String? city,
    String? locality,
    String? aadhaarHash,
    String? profilePhotoUrl,
    bool? isCertified,
    double? score,
    String? tier,
    int? pipelineStep,
    String? videoUrl,
    String? videoStatus,
    double? videoScore,
    bool? testCompleted,
    double? testScore,
    double? workHistoryScore,
    List<WorkHistoryModel>? workHistory,
    List<ScoringLogItem>? recentActivity,
    KaamCardModel? kaamCard,
  }) {
    return WorkerModel(
      id: id,
      name: name ?? this.name,
      phone: phone ?? this.phone,
      trade: trade ?? this.trade,
      city: city ?? this.city,
      locality: locality ?? this.locality,
      aadhaarHash: aadhaarHash ?? this.aadhaarHash,
      profilePhotoUrl: profilePhotoUrl ?? this.profilePhotoUrl,
      isCertified: isCertified ?? this.isCertified,
      score: score ?? this.score,
      tier: tier ?? this.tier,
      pipelineStep: pipelineStep ?? this.pipelineStep,
      videoUrl: videoUrl ?? this.videoUrl,
      videoStatus: videoStatus ?? this.videoStatus,
      videoScore: videoScore ?? this.videoScore,
      testCompleted: testCompleted ?? this.testCompleted,
      testScore: testScore ?? this.testScore,
      workHistoryScore: workHistoryScore ?? this.workHistoryScore,
      workHistory: workHistory ?? this.workHistory,
      recentActivity: recentActivity ?? this.recentActivity,
      kaamCard: kaamCard ?? this.kaamCard,
    );
  }
}
