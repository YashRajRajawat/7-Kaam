class WorkHistoryModel {
  final String? id;
  final String employerName;
  final String jobRole;
  final String startDate;
  final String? endDate;
  final double rating;
  final String? feedback;

  WorkHistoryModel({
    this.id,
    required this.employerName,
    required this.jobRole,
    required this.startDate,
    this.endDate,
    required this.rating,
    this.feedback,
  });

  factory WorkHistoryModel.fromJson(Map<String, dynamic> json) {
    return WorkHistoryModel(
      id: json['id']?.toString() ?? json['_id']?.toString(),
      employerName: json['employerName'] ?? json['employer_name'] ?? '',
      jobRole: json['jobRole'] ?? json['job_role'] ?? '',
      startDate: json['startDate'] ?? json['start_date'] ?? '',
      endDate: json['endDate'] ?? json['end_date'],
      rating: (json['rating'] ?? 5.0).toDouble(),
      feedback: json['feedback']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'employerName': employerName,
      'jobRole': jobRole,
      'startDate': startDate,
      'endDate': endDate,
      'rating': rating,
      'feedback': feedback,
    };
  }
}
