class CustomerModel {
  final String id;
  final String fullName;
  final String phoneNumber;
  final String city;

  CustomerModel({
    required this.id,
    required this.fullName,
    required this.phoneNumber,
    required this.city,
  });

  factory CustomerModel.fromJson(Map<String, dynamic> json) {
    return CustomerModel(
      id: json['id']?.toString() ?? '',
      fullName: json['fullName']?.toString() ?? '',
      phoneNumber: json['phoneNumber']?.toString() ?? '',
      city: json['city']?.toString() ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'fullName': fullName,
      'phoneNumber': phoneNumber,
      'city': city,
    };
  }
}
