class KaamCardModel {
  final String status; // VERIFIED, REVOKED, EXPIRED, NOT_FOUND
  final String qrToken;
  final String workerName;
  final String trade;
  final int score;
  final String tier;
  final String validUntil;
  final String? revocationReason;
  final String? kaamCardUrl;

  KaamCardModel({
    required this.status,
    required this.qrToken,
    required this.workerName,
    required this.trade,
    required this.score,
    required this.tier,
    required this.validUntil,
    this.revocationReason,
    this.kaamCardUrl,
  });

  factory KaamCardModel.fromJson(Map<String, dynamic> json) {
    return KaamCardModel(
      status: (json['status'] ?? json['verificationStatus'] ?? 'VERIFIED').toString().toUpperCase(),
      qrToken: json['qrToken'] ?? json['token'] ?? '',
      workerName: json['workerName'] ?? json['name'] ?? 'Worker',
      trade: json['trade'] ?? 'Electrician',
      score: (json['score'] ?? json['finalScore'] ?? 85).toInt(),
      tier: json['tier'] ?? 'EXPERT',
      validUntil: json['validUntil'] ?? 'Dec 2026',
      revocationReason: json['revocationReason'] ?? json['reason'],
      kaamCardUrl: json['kaamCardUrl'] ?? json['pdfUrl'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'status': status,
      'qrToken': qrToken,
      'workerName': workerName,
      'trade': trade,
      'score': score,
      'tier': tier,
      'validUntil': validUntil,
      'revocationReason': revocationReason,
      'kaamCardUrl': kaamCardUrl,
    };
  }
}
