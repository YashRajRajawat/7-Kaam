class CustomerModel {
  final String id;
  final String name;
  final String phone;
  final String city;

  CustomerModel({
    required this.id,
    required this.name,
    required this.phone,
    required this.city,
  });

  factory CustomerModel.fromJson(Map<String, dynamic> json) {
    return CustomerModel(
      id: json['id'] ?? json['_id'] ?? '',
      name: json['name'] ?? '',
      phone: json['phone'] ?? '',
      city: json['city'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'phone': phone,
      'city': city,
    };
  }
}
