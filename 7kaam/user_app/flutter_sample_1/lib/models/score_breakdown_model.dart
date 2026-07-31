class ScoreBreakdownModel {
  final double videoScore;
  final double testScore;
  final double workHistoryScore;
  final double overallScore;
  final String tier;
  final String? feedback;

  ScoreBreakdownModel({
    required this.videoScore,
    required this.testScore,
    required this.workHistoryScore,
    required this.overallScore,
    required this.tier,
    this.feedback,
  });

  factory ScoreBreakdownModel.fromJson(Map<String, dynamic> json) {
    return ScoreBreakdownModel(
      videoScore: (json['videoScore'] ?? json['video_score'] ?? 0).toDouble(),
      testScore: (json['testScore'] ?? json['test_score'] ?? 0).toDouble(),
      workHistoryScore: (json['workHistoryScore'] ?? json['work_history_score'] ?? 0).toDouble(),
      overallScore: (json['overallScore'] ?? json['overall_score'] ?? 0).toDouble(),
      tier: json['tier']?.toString() ?? 'BRONZE',
      feedback: json['feedback']?.toString(),
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
    };
  }
}
