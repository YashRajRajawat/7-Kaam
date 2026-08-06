class WorkHistoryModel {
  final String? id;
  final String clientName;
  final String clientType; // HOUSEHOLD / SHOP / COMPANY / CONTRACTOR
  final String? clientPhone;
  final String clientCity;
  final String projectTitle;
  final String projectDescription;
  final String trade;
  final String startDate;
  final String? endDate;
  final int durationMonths;
  final String projectScale; // SMALL / MEDIUM / LARGE
  final List<String> photoUrls;
  final bool isVerified;
  final String? createdAt;

  WorkHistoryModel({
    this.id,
    required this.clientName,
    this.clientType = 'HOUSEHOLD',
    this.clientPhone,
    required this.clientCity,
    required this.projectTitle,
    required this.projectDescription,
    required this.trade,
    required this.startDate,
    this.endDate,
    this.durationMonths = 0,
    this.projectScale = 'SMALL',
    this.photoUrls = const [],
    this.isVerified = false,
    this.createdAt,
  });

  factory WorkHistoryModel.fromJson(Map<String, dynamic> json) {
    List<String> photos = [];
    if (json['photoUrls'] != null && json['photoUrls'] is List) {
      photos = List<String>.from(json['photoUrls']);
    }

    return WorkHistoryModel(
      id: json['id']?.toString() ?? json['_id']?.toString(),
      clientName: json['clientName'] ?? json['employerName'] ?? json['employer_name'] ?? 'Client',
      clientType: json['clientType'] ?? 'HOUSEHOLD',
      clientPhone: json['clientPhone'] ?? json['employerPhone'],
      clientCity: json['clientCity'] ?? json['city'] ?? '',
      projectTitle: json['projectTitle'] ?? json['jobRole'] ?? json['role'] ?? 'Project',
      projectDescription: json['projectDescription'] ?? json['feedback'] ?? '',
      trade: json['trade'] ?? 'ELECTRICIAN',
      startDate: json['startDate'] ?? json['start_date'] ?? '',
      endDate: json['endDate'] ?? json['end_date'],
      durationMonths: (json['durationMonths'] ?? json['duration_months'] ?? 0) is int
          ? (json['durationMonths'] ?? json['duration_months'] ?? 0)
          : int.tryParse(json['durationMonths']?.toString() ?? '') ?? 0,
      projectScale: json['projectScale'] ?? 'SMALL',
      photoUrls: photos,
      isVerified: json['isVerified'] ?? json['verified'] ?? false,
      createdAt: json['createdAt']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'clientName': clientName,
      'clientType': clientType,
      'clientPhone': clientPhone,
      'clientCity': clientCity,
      'projectTitle': projectTitle,
      'projectDescription': projectDescription,
      'trade': trade,
      'startDate': startDate,
      'endDate': endDate,
      'durationMonths': durationMonths,
      'projectScale': projectScale,
      'photoUrls': photoUrls,
      'isVerified': isVerified,
      'createdAt': createdAt,
    };
  }
}
