class CertificateSummary {
  final String title;
  final String category;
  final String difficulty;
  final double score;
  final String issuedAt;

  CertificateSummary({
    required this.title,
    required this.category,
    required this.difficulty,
    required this.score,
    required this.issuedAt,
  });

  factory CertificateSummary.fromJson(Map<String, dynamic> json) {
    return CertificateSummary(
      title: json['title']?.toString() ?? 'Skill Certificate',
      category: json['category']?.toString() ?? 'General',
      difficulty: json['difficulty']?.toString() ?? 'BEGINNER',
      score: (json['score'] ?? 0).toDouble(),
      issuedAt: json['issuedAt']?.toString() ?? '',
    );
  }
}

class WorkHistorySummary {
  final String clientName;
  final String projectTitle;
  final int durationMonths;
  final String projectScale;

  WorkHistorySummary({
    required this.clientName,
    required this.projectTitle,
    required this.durationMonths,
    required this.projectScale,
  });

  factory WorkHistorySummary.fromJson(Map<String, dynamic> json) {
    return WorkHistorySummary(
      clientName: json['clientName']?.toString() ?? 'Client',
      projectTitle: json['projectTitle']?.toString() ?? 'Project',
      durationMonths: json['durationMonths'] is int ? json['durationMonths'] : int.tryParse(json['durationMonths']?.toString() ?? '') ?? 0,
      projectScale: json['projectScale']?.toString() ?? 'SMALL',
    );
  }
}

/// Backs both the discovery-list item (GET /public/workers) and the
/// profile-detail response (GET /public/workers/:id) — the two payloads are
/// genuinely different shapes, so most fields below are nullable depending
/// on which endpoint produced this instance rather than defaulted to fake
/// placeholder values.
class WorkerPublicModel {
  final String id;
  final String fullName;
  final String trade;
  final String city;
  final String? locality;
  final String? profilePhotoUrl;
  final double? finalScore;
  final String? tier;
  final int certificatesEarned;
  final String credibilityLevel;
  final bool hasKaamCard;
  final String? kaamCardTier;
  final double? distanceKm;
  final String status;
  final bool underReview;

  // Detail-only fields
  final double? videoScore;
  final double? testScore;
  final double? workHistoryScore;
  final int? totalTestsTaken;
  final int? totalVideosTaken;
  final String? kaamCardIssuedAt;
  final String? kaamCardExpiresAt;
  final bool aadhaarVerified;
  final List<CertificateSummary> certificates;
  final List<WorkHistorySummary> workHistory;

  // Only present when the caller is authenticated as a customer.
  final String? phoneNumber;

  // Map markers only — absent unless a lat/lng discovery search was used.
  final double? latitude;
  final double? longitude;

  WorkerPublicModel({
    required this.id,
    required this.fullName,
    required this.trade,
    required this.city,
    this.locality,
    this.profilePhotoUrl,
    this.finalScore,
    this.tier,
    this.certificatesEarned = 0,
    this.credibilityLevel = 'EMERGING',
    this.hasKaamCard = false,
    this.kaamCardTier,
    this.distanceKm,
    this.status = 'ACTIVE',
    this.underReview = false,
    this.videoScore,
    this.testScore,
    this.workHistoryScore,
    this.totalTestsTaken,
    this.totalVideosTaken,
    this.kaamCardIssuedAt,
    this.kaamCardExpiresAt,
    this.aadhaarVerified = false,
    this.certificates = const [],
    this.workHistory = const [],
    this.phoneNumber,
    this.latitude,
    this.longitude,
  });

  factory WorkerPublicModel.fromJson(Map<String, dynamic> json) {
    final kaamCard = json['kaamCard'] as Map<String, dynamic>?;

    return WorkerPublicModel(
      id: json['id']?.toString() ?? '',
      fullName: json['fullName']?.toString() ?? 'Worker',
      trade: json['trade']?.toString() ?? 'ELECTRICIAN',
      city: json['city']?.toString() ?? '',
      locality: json['locality']?.toString(),
      profilePhotoUrl: json['profilePhotoUrl']?.toString(),
      finalScore: json['finalScore'] != null ? (json['finalScore'] as num).toDouble() : null,
      tier: json['tier']?.toString(),
      certificatesEarned: json['certificatesEarned'] is int ? json['certificatesEarned'] : (json['certificates'] as List?)?.length ?? 0,
      credibilityLevel: json['credibilityLevel']?.toString() ?? 'EMERGING',
      hasKaamCard: json['hasKaamCard'] == true || kaamCard != null,
      kaamCardTier: json['kaamCardTier']?.toString() ?? kaamCard?['tier']?.toString(),
      distanceKm: json['distanceKm'] != null ? (json['distanceKm'] as num).toDouble() : null,
      status: json['status']?.toString() ?? 'ACTIVE',
      underReview: json['underReview'] == true,
      videoScore: json['videoScore'] != null ? (json['videoScore'] as num).toDouble() : null,
      testScore: json['testScore'] != null ? (json['testScore'] as num).toDouble() : null,
      workHistoryScore: json['workHistoryScore'] != null ? (json['workHistoryScore'] as num).toDouble() : null,
      totalTestsTaken: json['totalTestsTaken'] as int?,
      totalVideosTaken: json['totalVideosTaken'] as int?,
      kaamCardIssuedAt: kaamCard?['issuedAt']?.toString(),
      kaamCardExpiresAt: kaamCard?['expiresAt']?.toString(),
      aadhaarVerified: json['aadhaarVerified'] == true,
      certificates: (json['certificates'] as List<dynamic>?)
              ?.map((c) => CertificateSummary.fromJson(Map<String, dynamic>.from(c)))
              .toList() ??
          [],
      workHistory: (json['workHistory'] as List<dynamic>?)
              ?.map((h) => WorkHistorySummary.fromJson(Map<String, dynamic>.from(h)))
              .toList() ??
          [],
      phoneNumber: json['phoneNumber']?.toString(),
      latitude: json['latitude'] != null ? (json['latitude'] as num).toDouble() : null,
      longitude: json['longitude'] != null ? (json['longitude'] as num).toDouble() : null,
    );
  }
}
