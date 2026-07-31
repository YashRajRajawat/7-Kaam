import 'score_breakdown_model.dart';

class KaamCardModel {
  final String id;
  final String workerId;
  final String workerName;
  final String trade;
  final String city;
  final String? profilePhotoUrl;
  final double score;
  final String tier;
  final ScoreBreakdownModel? scoreBreakdown;
  final bool aadhaarVerified;
  final DateTime issueDate;
  final DateTime expiryDate;
  final String qrToken;
  final String certificateId;
  final String? kaamCardUrl;

  KaamCardModel({
    required this.id,
    required this.workerId,
    required this.workerName,
    required this.trade,
    required this.city,
    this.profilePhotoUrl,
    required this.score,
    required this.tier,
    this.scoreBreakdown,
    required this.aadhaarVerified,
    required this.issueDate,
    required this.expiryDate,
    required this.qrToken,
    required this.certificateId,
    this.kaamCardUrl,
  });

  factory KaamCardModel.fromJson(Map<String, dynamic> json) {
    return KaamCardModel(
      id: json['id']?.toString() ?? json['_id']?.toString() ?? '',
      workerId: json['workerId']?.toString() ?? json['worker_id']?.toString() ?? '',
      workerName: json['workerName'] ?? json['worker_name'] ?? 'Worker',
      trade: json['trade'] ?? 'ELECTRICIAN',
      city: json['city'] ?? 'Bangalore',
      profilePhotoUrl: json['profilePhotoUrl'] ?? json['profile_photo_url'],
      score: (json['score'] ?? 0).toDouble(),
      tier: json['tier'] ?? 'BRONZE',
      scoreBreakdown: json['scoreBreakdown'] != null
          ? ScoreBreakdownModel.fromJson(json['scoreBreakdown'])
          : (json['score_breakdown'] != null
              ? ScoreBreakdownModel.fromJson(json['score_breakdown'])
              : null),
      aadhaarVerified: json['aadhaarVerified'] ?? json['aadhaar_verified'] ?? true,
      issueDate: json['issueDate'] != null
          ? DateTime.parse(json['issueDate'])
          : (json['issue_date'] != null ? DateTime.parse(json['issue_date']) : DateTime.now()),
      expiryDate: json['expiryDate'] != null
          ? DateTime.parse(json['expiryDate'])
          : (json['expiry_date'] != null
              ? DateTime.parse(json['expiry_date'])
              : DateTime.now().add(const Duration(days: 365))),
      qrToken: json['qrToken'] ?? json['qr_token'] ?? '',
      certificateId: json['certificateId'] ?? json['certificate_id'] ?? '',
      kaamCardUrl: json['kaamCardUrl'] ?? json['kaam_card_url'],
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
      'scoreBreakdown': scoreBreakdown?.toJson(),
      'aadhaarVerified': aadhaarVerified,
      'issueDate': issueDate.toIso8601String(),
      'expiryDate': expiryDate.toIso8601String(),
      'qrToken': qrToken,
      'certificateId': certificateId,
      'kaamCardUrl': kaamCardUrl,
    };
  }
}
