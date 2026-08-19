class ScoreBreakdownModel {
  final double videoScore;
  final double testScore;
  final double workHistoryScore;
  final double overallScore;
  final String tier;
  final String? feedback;
  final int videoCount;
  final int testCount;

  ScoreBreakdownModel({
    required this.videoScore,
    required this.testScore,
    required this.workHistoryScore,
    required this.overallScore,
    required this.tier,
    this.feedback,
    this.videoCount = 1,
    this.testCount = 1,
  });

  double get compositeScore => overallScore > 0 ? overallScore : (videoScore * 0.35 + testScore * 0.45 + workHistoryScore * 0.2);

  factory ScoreBreakdownModel.fromJson(Map<String, dynamic> json) {
    final overall = (json['finalScore'] ?? json['compositeScore'] ?? json['overallScore'] ?? json['overall_score'] ?? 0).toDouble();
    return ScoreBreakdownModel(
      videoScore: (json['videoScore'] ?? json['video_score'] ?? 0).toDouble(),
      testScore: (json['testScore'] ?? json['test_score'] ?? 0).toDouble(),
      workHistoryScore: (json['workHistoryScore'] ?? json['work_history_score'] ?? 0).toDouble(),
      overallScore: overall,
      tier: json['tier']?.toString() ?? 'BRONZE',
      feedback: json['feedback']?.toString(),
      videoCount: json['videoCount'] is int ? json['videoCount'] : 1,
      testCount: json['testCount'] is int ? json['testCount'] : 1,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'videoScore': videoScore,
      'testScore': testScore,
      'workHistoryScore': workHistoryScore,
      'overallScore': overallScore,
      'tier': tier,
      'feedback': feedback,
      'videoCount': videoCount,
      'testCount': testCount,
    };
  }
}
