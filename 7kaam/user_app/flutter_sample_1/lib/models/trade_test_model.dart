class QuestionModel {
  final String id;
  final String question;
  final List<String> options;
  int? selectedOption;

  QuestionModel({
    required this.id,
    required this.question,
    required this.options,
    this.selectedOption,
  });

  factory QuestionModel.fromJson(Map<String, dynamic> json) {
    return QuestionModel(
      id: json['id']?.toString() ?? json['_id']?.toString() ?? '',
      question: json['question']?.toString() ?? '',
      options: (json['options'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      selectedOption: json['selectedOption'] as int?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'question': question,
      'options': options,
      'selectedOption': selectedOption,
    };
  }
}

class QuestionResultModel {
  final String questionId;
  final String questionText;
  final String selectedAnswer;
  final double score;
  final String feedback;

  QuestionResultModel({
    required this.questionId,
    required this.questionText,
    required this.selectedAnswer,
    required this.score,
    required this.feedback,
  });

  factory QuestionResultModel.fromJson(Map<String, dynamic> json) {
    return QuestionResultModel(
      questionId: json['questionId']?.toString() ?? json['question_id']?.toString() ?? '',
      questionText: json['questionText']?.toString() ?? json['question']?.toString() ?? '',
      selectedAnswer: json['selectedAnswer']?.toString() ?? json['selected_answer']?.toString() ?? '',
      score: (json['score'] ?? 0).toDouble(),
      feedback: json['feedback']?.toString() ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'questionId': questionId,
      'questionText': questionText,
      'selectedAnswer': selectedAnswer,
      'score': score,
      'feedback': feedback,
    };
  }
}

class TradeTestModel {
  final String id;
  final String title;
  final String description;
  final String category;
  final String trade;
  final String language;
  final List<QuestionModel> questions;
  final String difficulty; // BEGINNER / INTERMEDIATE / ADVANCED
  final int estimatedMinutes;
  final int passingScore;
  final int totalAttempts;
  final bool isVideoAssessment;
  final Map<String, dynamic>? rubrics;
  final String? prerequisiteTestId;
  final bool isFirstTest;
  final double? bestScore;
  final double? workerBestScore;
  final int workerAttempts;
  final bool hasEarnedCertificate;
  final bool certificateEarned;
  final int attemptsCount;

  TradeTestModel({
    required this.id,
    required this.title,
    this.description = '',
    this.category = 'General',
    required this.trade,
    required this.language,
    required this.questions,
    this.difficulty = 'BEGINNER',
    this.estimatedMinutes = 15,
    this.passingScore = 60,
    this.totalAttempts = 0,
    this.isVideoAssessment = false,
    this.rubrics,
    this.prerequisiteTestId,
    this.isFirstTest = false,
    this.bestScore,
    this.workerBestScore,
    this.workerAttempts = 0,
    this.hasEarnedCertificate = false,
    this.certificateEarned = false,
    this.attemptsCount = 0,
  });

  factory TradeTestModel.fromJson(Map<String, dynamic> json) {
    final wScore = json['workerBestScore'] != null
        ? (json['workerBestScore'] as num).toDouble()
        : (json['bestScore'] != null ? (json['bestScore'] as num).toDouble() : null);
    final cert = (json['certificateEarned'] ?? json['hasEarnedCertificate'] ?? false) as bool;
    final wAttempts = (json['workerAttempts'] ?? json['attemptsCount'] ?? 0) as int;

    return TradeTestModel(
      id: json['id']?.toString() ?? json['_id']?.toString() ?? '',
      title: json['title']?.toString() ?? 'Skill Test',
      description: json['description']?.toString() ?? '',
      category: json['category']?.toString() ?? 'General',
      trade: json['trade']?.toString() ?? 'ELECTRICIAN',
      language: json['language']?.toString() ?? 'ENGLISH',
      questions: (json['questions'] as List<dynamic>?)
              ?.map((q) => QuestionModel.fromJson(q as Map<String, dynamic>))
              .toList() ??
          [],
      difficulty: json['difficulty']?.toString() ?? 'BEGINNER',
      estimatedMinutes: json['estimatedMinutes'] is int ? json['estimatedMinutes'] : 15,
      passingScore: json['passingScore'] is int ? json['passingScore'] : 60,
      totalAttempts: json['totalAttempts'] is int ? json['totalAttempts'] : 0,
      isVideoAssessment: json['isVideoAssessment'] ?? false,
      rubrics: json['rubrics'] is Map ? Map<String, dynamic>.from(json['rubrics']) : null,
      prerequisiteTestId: json['prerequisiteTestId']?.toString(),
      isFirstTest: json['isFirstTest'] ?? false,
      bestScore: wScore,
      workerBestScore: wScore,
      workerAttempts: wAttempts,
      hasEarnedCertificate: cert,
      certificateEarned: cert,
      attemptsCount: wAttempts,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'category': category,
      'trade': trade,
      'language': language,
      'questions': questions.map((q) => q.toJson()).toList(),
      'difficulty': difficulty,
      'estimatedMinutes': estimatedMinutes,
      'passingScore': passingScore,
      'totalAttempts': totalAttempts,
      'isVideoAssessment': isVideoAssessment,
      'rubrics': rubrics,
      'prerequisiteTestId': prerequisiteTestId,
      'isFirstTest': isFirstTest,
      'bestScore': bestScore,
      'workerBestScore': workerBestScore,
      'workerAttempts': workerAttempts,
      'hasEarnedCertificate': hasEarnedCertificate,
      'certificateEarned': certificateEarned,
      'attemptsCount': attemptsCount,
    };
  }
}

class TradeTestResultModel {
  final double totalScore;
  final String overallFeedback;
  final List<QuestionResultModel> questionBreakdown;

  TradeTestResultModel({
    required this.totalScore,
    required this.overallFeedback,
    required this.questionBreakdown,
  });

  factory TradeTestResultModel.fromJson(Map<String, dynamic> json) {
    return TradeTestResultModel(
      totalScore: (json['totalScore'] ?? json['score'] ?? 0).toDouble(),
      overallFeedback: json['overallFeedback'] ?? json['feedback'] ?? '',
      questionBreakdown: (json['questionBreakdown'] ?? json['breakdown'] as List<dynamic>?)
              ?.map((q) => QuestionResultModel.fromJson(q as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'totalScore': totalScore,
      'overallFeedback': overallFeedback,
      'questionBreakdown': questionBreakdown.map((q) => q.toJson()).toList(),
    };
  }
}
