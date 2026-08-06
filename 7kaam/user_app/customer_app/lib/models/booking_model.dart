class BookingModel {
  final String id;
  final String workerId;
  final String workerName;
  final String workerTrade;
  final String workerPhoto;
  final String serviceDate;
  final String serviceTime;
  final String serviceAddress;
  final String? notes;
  final String status;
  final String priceEstimate;
  final String createdAt;

  BookingModel({
    required this.id,
    required this.workerId,
    required this.workerName,
    required this.workerTrade,
    required this.workerPhoto,
    required this.serviceDate,
    required this.serviceTime,
    required this.serviceAddress,
    this.notes,
    required this.status,
    required this.priceEstimate,
    required this.createdAt,
  });

  factory BookingModel.fromJson(Map<String, dynamic> json) {
    final workerObj = json['worker'] as Map<String, dynamic>?;
    return BookingModel(
      id: json['id'] ?? json['_id'] ?? '',
      workerId: json['workerId'] ?? workerObj?['id'] ?? '',
      workerName: json['workerName'] ?? workerObj?['name'] ?? 'Worker',
      workerTrade: json['trade'] ?? workerObj?['trade'] ?? 'Electrician',
      workerPhoto: json['workerPhoto'] ?? workerObj?['photoUrl'] ?? 'https://i.pravatar.cc/150?img=12',
      serviceDate: json['serviceDate'] ?? json['date'] ?? '',
      serviceTime: json['serviceTime'] ?? json['time'] ?? '',
      serviceAddress: json['serviceAddress'] ?? json['address'] ?? '',
      notes: json['notes'],
      status: json['status'] ?? 'PENDING',
      priceEstimate: json['priceEstimate'] ?? '₹400–₹800',
      createdAt: json['createdAt'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'workerId': workerId,
      'workerName': workerName,
      'workerTrade': workerTrade,
      'workerPhoto': workerPhoto,
      'serviceDate': serviceDate,
      'serviceTime': serviceTime,
      'serviceAddress': serviceAddress,
      'notes': notes,
      'status': status,
      'priceEstimate': priceEstimate,
      'createdAt': createdAt,
    };
  }
}
