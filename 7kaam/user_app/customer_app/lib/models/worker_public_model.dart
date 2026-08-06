class EmployerHistory {
  final String employerName;
  final String role;
  final double rating;
  final bool isVerified;

  EmployerHistory({
    required this.employerName,
    required this.role,
    required this.rating,
    this.isVerified = true,
  });

  factory EmployerHistory.fromJson(Map<String, dynamic> json) {
    return EmployerHistory(
      employerName: json['employerName'] ?? json['employer'] ?? 'Employer',
      role: json['role'] ?? 'Technician',
      rating: (json['rating'] ?? 5.0).toDouble(),
      isVerified: json['isVerified'] ?? json['verified'] ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'employerName': employerName,
      'role': role,
      'rating': rating,
      'isVerified': isVerified,
    };
  }
}

class ScoreBreakdown {
  final int videoScore;
  final int testScore;
  final int workHistoryScore;

  ScoreBreakdown({
    required this.videoScore,
    required this.testScore,
    required this.workHistoryScore,
  });

  factory ScoreBreakdown.fromJson(Map<String, dynamic> json) {
    return ScoreBreakdown(
      videoScore: (json['videoScore'] ?? json['video'] ?? 80).toInt(),
      testScore: (json['testScore'] ?? json['test'] ?? 85).toInt(),
      workHistoryScore: (json['workHistoryScore'] ?? json['workHistory'] ?? 90).toInt(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'videoScore': videoScore,
      'testScore': testScore,
      'workHistoryScore': workHistoryScore,
    };
  }
}

class WorkerPublicModel {
  final String id;
  final String name;
  final String trade;
  final String city;
  final String locality;
  final String photoUrl;
  final int score;
  final String tier;
  final ScoreBreakdown scoreBreakdown;
  final String kaamCardUrl;
  final String qrToken;
  final double distanceKm;
  final double latitude;
  final double longitude;
  final String validUntil;
  final String memberSince;
  final bool aadhaarVerified;
  final List<EmployerHistory> workHistories;

  WorkerPublicModel({
    required this.id,
    required this.name,
    required this.trade,
    required this.city,
    required this.locality,
    required this.photoUrl,
    required this.score,
    required this.tier,
    required this.scoreBreakdown,
    required this.kaamCardUrl,
    required this.qrToken,
    required this.distanceKm,
    required this.latitude,
    required this.longitude,
    required this.validUntil,
    required this.memberSince,
    this.aadhaarVerified = true,
    required this.workHistories,
  });

  factory WorkerPublicModel.fromJson(Map<String, dynamic> json) {
    var rawHistories = json['workHistories'] as List? ?? [];
    List<EmployerHistory> histories = rawHistories
        .map((h) => EmployerHistory.fromJson(h as Map<String, dynamic>))
        .toList();

    return WorkerPublicModel(
      id: json['id'] ?? json['_id'] ?? '',
      name: json['name'] ?? 'Worker Name',
      trade: json['trade'] ?? 'Electrician',
      city: json['city'] ?? 'Bangalore',
      locality: json['locality'] ?? 'Koramangala',
      photoUrl: json['photoUrl'] ?? json['photo'] ?? 'https://i.pravatar.cc/150?img=12',
      score: (json['score'] ?? json['finalScore'] ?? 85).toInt(),
      tier: json['tier'] ?? 'EXPERT',
      scoreBreakdown: ScoreBreakdown.fromJson(
        json['scoreBreakdown'] ?? json['breakdown'] ?? {},
      ),
      kaamCardUrl: json['kaamCardUrl'] ?? '',
      qrToken: json['qrToken'] ?? '',
      distanceKm: (json['distanceKm'] ?? json['distance'] ?? 2.4).toDouble(),
      latitude: (json['latitude'] ?? json['lat'] ?? 12.9352).toDouble(),
      longitude: (json['longitude'] ?? json['lng'] ?? 77.6245).toDouble(),
      validUntil: json['validUntil'] ?? 'Dec 2026',
      memberSince: json['memberSince'] ?? 'Jan 2025',
      aadhaarVerified: json['aadhaarVerified'] ?? true,
      workHistories: histories,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'trade': trade,
      'city': city,
      'locality': locality,
      'photoUrl': photoUrl,
      'score': score,
      'tier': tier,
      'scoreBreakdown': scoreBreakdown.toJson(),
      'kaamCardUrl': kaamCardUrl,
      'qrToken': qrToken,
      'distanceKm': distanceKm,
      'latitude': latitude,
      'longitude': longitude,
      'validUntil': validUntil,
      'memberSince': memberSince,
      'aadhaarVerified': aadhaarVerified,
      'workHistories': workHistories.map((h) => h.toJson()).toList(),
    };
  }
}
