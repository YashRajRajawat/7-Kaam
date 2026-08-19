class KaamCardHistoryModel {
  final String id;
  final String kaamCardId;
  final int version;
  final double finalScore;
  final double videoScore;
  final double testScore;
  final double workHistoryScore;
  final String recordedAt;

  KaamCardHistoryModel({
    required this.id,
    required this.kaamCardId,
    required this.version,
    required this.finalScore,
    required this.videoScore,
    required this.testScore,
    required this.workHistoryScore,
    required this.recordedAt,
  });

  factory KaamCardHistoryModel.fromJson(Map<String, dynamic> json) {
    return KaamCardHistoryModel(
      id: json['id']?.toString() ?? '',
      kaamCardId: json['kaamCardId']?.toString() ?? '',
      version: json['version'] is int ? json['version'] : int.tryParse(json['version']?.toString() ?? '1') ?? 1,
      finalScore: (json['finalScore'] ?? 0.0).toDouble(),
      videoScore: (json['videoScore'] ?? 0.0).toDouble(),
      testScore: (json['testScore'] ?? 0.0).toDouble(),
      workHistoryScore: (json['workHistoryScore'] ?? 0.0).toDouble(),
      recordedAt: json['recordedAt']?.toString() ?? DateTime.now().toIso8601String(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'kaamCardId': kaamCardId,
      'version': version,
      'finalScore': finalScore,
      'videoScore': videoScore,
      'testScore': testScore,
      'workHistoryScore': workHistoryScore,
      'recordedAt': recordedAt,
    };
  }
}
