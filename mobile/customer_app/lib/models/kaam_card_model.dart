/// GET /api/v1/verify/:qrToken response — used only by the QR scanner flow.
class KaamCardModel {
  final String status; // VALID, REVOKED, EXPIRED, NOT_FOUND
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
    final worker = json['worker'] as Map<String, dynamic>?;
    final scoreBreakdown = json['scoreBreakdown'] as Map<String, dynamic>?;

    return KaamCardModel(
      status: (json['verificationStatus'] ?? json['status'] ?? 'VALID').toString().toUpperCase(),
      qrToken: json['qrToken']?.toString() ?? '',
      workerName: worker?['fullName']?.toString() ?? 'Worker',
      trade: worker?['trade']?.toString() ?? 'ELECTRICIAN',
      score: ((scoreBreakdown?['finalScore'] ?? json['score'] ?? 0) as num).toInt(),
      tier: scoreBreakdown?['tier']?.toString() ?? json['tier']?.toString() ?? 'BRONZE',
      validUntil: json['expiresAt']?.toString() ?? json['validUntil']?.toString() ?? '',
      revocationReason: json['revokedReason']?.toString() ?? json['revocationReason']?.toString(),
      kaamCardUrl: json['pdfUrl']?.toString() ?? json['kaamCardUrl']?.toString(),
    );
  }
}
