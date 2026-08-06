class SkillCertificateModel {
  final String id;
  final String workerId;
  final String testId;
  final String testTitle;
  final String title;
  final String trade;
  final String category;
  final String difficulty;
  final double score;
  final int passingScore;
  final String issuedAt;
  final String certificateNo;
  final String? pdfUrl;

  SkillCertificateModel({
    required this.id,
    required this.workerId,
    required this.testId,
    required this.testTitle,
    String? title,
    required this.trade,
    this.category = 'General',
    this.difficulty = 'BEGINNER',
    required this.score,
    this.passingScore = 60,
    required this.issuedAt,
    String? certificateNo,
    this.pdfUrl,
  })  : title = title ?? testTitle,
        certificateNo = certificateNo ?? id;

  factory SkillCertificateModel.fromJson(Map<String, dynamic> json) {
    final tTitle = json['title'] ?? json['testTitle'] ?? json['test']?['title'] ?? 'Skill Certificate';
    final certNo = json['certificateNo'] ?? json['certificate_no'] ?? json['id']?.toString() ?? '7K-CERT';

    return SkillCertificateModel(
      id: json['id']?.toString() ?? '',
      workerId: json['workerId']?.toString() ?? '',
      testId: json['testId']?.toString() ?? '',
      testTitle: tTitle.toString(),
      title: tTitle.toString(),
      trade: json['trade']?.toString() ?? json['test']?['trade']?.toString() ?? 'ELECTRICIAN',
      category: json['category']?.toString() ?? json['test']?['category']?.toString() ?? 'General',
      difficulty: json['difficulty']?.toString() ?? json['test']?['difficulty']?.toString() ?? 'BEGINNER',
      score: (json['score'] ?? 0.0).toDouble(),
      passingScore: json['passingScore'] is int ? json['passingScore'] : 60,
      issuedAt: json['issuedAt']?.toString() ?? DateTime.now().toIso8601String().substring(0, 10),
      certificateNo: certNo.toString(),
      pdfUrl: json['pdfUrl']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'workerId': workerId,
      'testId': testId,
      'testTitle': testTitle,
      'title': title,
      'trade': trade,
      'category': category,
      'difficulty': difficulty,
      'score': score,
      'passingScore': passingScore,
      'issuedAt': issuedAt,
      'certificateNo': certificateNo,
      'pdfUrl': pdfUrl,
    };
  }
}
