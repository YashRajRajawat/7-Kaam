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
  final String trade;
  final String language;
  final List<QuestionModel> questions;

  TradeTestModel({
    required this.id,
    required this.title,
    required this.trade,
    required this.language,
    required this.questions,
  });

  factory TradeTestModel.fromJson(Map<String, dynamic> json) {
    return TradeTestModel(
      id: json['id']?.toString() ?? json['_id']?.toString() ?? '',
      title: json['title']?.toString() ?? 'Skill Test',
      trade: json['trade']?.toString() ?? '',
      language: json['language']?.toString() ?? 'HINDI',
      questions: (json['questions'] as List<dynamic>?)
              ?.map((q) => QuestionModel.fromJson(q as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'trade': trade,
      'language': language,
      'questions': questions.map((q) => q.toJson()).toList(),
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
