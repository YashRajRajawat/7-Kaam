const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const { generateQRBuffer } = require('./qrService');
const { uploadBuffer } = require('./supabaseStorage');
const { v4: uuidv4 } = require('uuid');

const TEAL = rgb(0.059, 0.431, 0.337);       // #0F6E56
const TEAL_LIGHT = rgb(0.878, 0.961, 0.937); // #E0F5EF
const DARK = rgb(0.1, 0.1, 0.1);
const GREY = rgb(0.45, 0.45, 0.45);
const WHITE = rgb(1, 1, 1);

const TIER_COLORS = {
  EXPERT: rgb(0.502, 0.251, 0.753), // Purple
  GOLD: rgb(0.855, 0.647, 0.125),   // Gold
  SILVER: rgb(0.45, 0.45, 0.45),    // Silver Grey
  BRONZE: rgb(0.804, 0.498, 0.196), // Bronze
};

function tierLabel(tier) {
  const map = { EXPERT: 'EXPERT', GOLD: 'GOLD', SILVER: 'SILVER', BRONZE: 'BRONZE' };
  return map[tier] || tier || 'GOLD';
}

/**
 * Generate a perfectly aligned KaamCard PDF and upload to Supabase.
 * Returns { pdfUrl, qrToken, kaamCardId }
 */
async function generateKaamCard({ worker, videoScore, testScore, workHistoryScore, finalScore, tier, existingQrToken }) {
  const kaamCardId = uuidv4();
  const qrToken = existingQrToken || uuidv4();
  const host = process.env.HOST_IP || '192.168.1.6';
  const qrUrl = `http://${host}:8000/api/v1/verify/${qrToken}`;

  // ── Generate QR PNG ──────────────────────────────────────────────────────────
  const qrBuffer = await generateQRBuffer(qrUrl);

  // ── Create PDF Document ──────────────────────────────────────────────────────
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // Standard A4 Page
  const { width, height } = page.getSize();

  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await doc.embedFont(StandardFonts.Helvetica);

  // ── 1. Top Header Banner ─────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: height - 75, width, height: 75, color: TEAL });
  page.drawText('7 Kaam — Verified Skill Certificate', {
    x: 40, y: height - 45,
    size: 20, font: boldFont, color: WHITE,
  });
  page.drawText('AI-Powered Skill Certification for India\'s Blue-Collar Workforce', {
    x: 40, y: height - 63,
    size: 9, font: regularFont, color: rgb(0.82, 0.98, 0.92),
  });

  // ── 2. Worker Identity & Profile Box ──────────────────────────────────────────
  const profileY = height - 215;
  const profileH = 125;
  page.drawRectangle({
    x: 35, y: profileY,
    width: width - 70, height: profileH,
    color: TEAL_LIGHT, borderRadius: 10,
  });

  // Worker Full Name
  page.drawText(worker.fullName, {
    x: 55, y: profileY + profileH - 35,
    size: 22, font: boldFont, color: DARK,
  });

  // Trade & City
  const tradeStr = (worker.trade || 'ELECTRICIAN').replace(/_/g, ' ');
  const cityStr = worker.city || 'Bangalore';
  page.drawText(`${tradeStr}  ·  ${cityStr}`, {
    x: 55, y: profileY + profileH - 58,
    size: 12, font: regularFont, color: GREY,
  });

  // Aadhaar Verified Badge — `=== true`, not `!== false`. An undefined or null
  // aadhaarVerified (which the PostgREST proxy can return when the column is not
  // selected) previously satisfied `!== false` and stamped "Aadhaar Verified"
  // onto the card of someone who had never been verified.
  if (worker.aadhaarVerified === true) {
    page.drawRectangle({
      x: 55, y: profileY + profileH - 92,
      width: 125, height: 22,
      color: TEAL, borderRadius: 5,
    });
    page.drawText('Aadhaar Verified', {
      x: 65, y: profileY + profileH - 84,
      size: 9, font: boldFont, color: WHITE,
    });
  }

  // Embedded QR Code (Top-Right inside profile container)
  const qrImage = await doc.embedPng(qrBuffer);
  const qrSize = 95;
  const qrX = width - 35 - qrSize - 20;
  const qrY = profileY + (profileH - qrSize) / 2 + 5;

  page.drawRectangle({
    x: qrX - 5, y: qrY - 5,
    width: qrSize + 10, height: qrSize + 10,
    color: WHITE, borderRadius: 6,
  });
  page.drawImage(qrImage, {
    x: qrX, y: qrY,
    width: qrSize, height: qrSize,
  });
  page.drawText('Scan to verify', {
    x: qrX + 15, y: qrY - 14,
    size: 8, font: regularFont, color: GREY,
  });

  // ── 3. Final Composite Score & Tier Section ──────────────────────────────────
  const scoreY = height - 280;
  // `finalScore || 80` turned a genuine score of 0 into 80, and printed 80 for a
  // worker who had never been scored at all.
  const scoreText = finalScore == null ? '— / 100' : `${Math.round(finalScore)} / 100`;

  // Draw Score Text
  page.drawText(scoreText, {
    x: 40, y: scoreY,
    size: 42, font: boldFont, color: TEAL,
  });

  // Calculate width of score text to place Tier Badge without overlap
  const scoreTextWidth = boldFont.widthOfTextAtSize(scoreText, 42);
  const tierX = 40 + scoreTextWidth + 25;
  const tierColor = TIER_COLORS[tier] || TIER_COLORS.GOLD;
  const tierStr = tierLabel(tier);
  const tierWidth = boldFont.widthOfTextAtSize(tierStr, 12) + 24;

  page.drawRectangle({
    x: tierX, y: scoreY + 4,
    width: tierWidth, height: 26,
    color: tierColor, borderRadius: 5,
  });
  page.drawText(tierStr, {
    x: tierX + 12, y: scoreY + 12,
    size: 12, font: boldFont, color: WHITE,
  });

  // ── 4. Sub-Scores Grid ────────────────────────────────────────────────────────
  const subY = height - 370;
  const subBoxW = 160;
  const subBoxH = 55;
  const subGap = 16;
  const subMetrics = [
    { label: 'Video Score', value: videoScore, weight: '35%' },
    { label: 'Test Score', value: testScore, weight: '45%' },
    { label: 'Work History', value: workHistoryScore, weight: '20%' },
  ];

  subMetrics.forEach((m, i) => {
    const boxX = 40 + i * (subBoxW + subGap);
    page.drawRectangle({
      x: boxX, y: subY,
      width: subBoxW, height: subBoxH,
      color: rgb(0.96, 0.97, 0.98), borderRadius: 6,
      borderColor: rgb(0.88, 0.90, 0.92), borderWidth: 1,
    });

    page.drawText(m.label, {
      x: boxX + 10, y: subY + 36,
      size: 9, font: boldFont, color: DARK,
    });

    const scoreVal = Math.round(m.value || 0);
    page.drawText(`${scoreVal}/100  (${m.weight})`, {
      x: boxX + 10, y: subY + 22,
      size: 10, font: regularFont, color: TEAL,
    });

    // Mini Progress Bar
    const barW = subBoxW - 20;
    const fillW = Math.max(4, Math.min(barW, (scoreVal / 100) * barW));
    page.drawRectangle({
      x: boxX + 10, y: subY + 8,
      width: barW, height: 6,
      color: rgb(0.88, 0.90, 0.92), borderRadius: 3,
    });
    page.drawRectangle({
      x: boxX + 10, y: subY + 8,
      width: fillW, height: 6,
      color: TEAL, borderRadius: 3,
    });
  });

  // ── 5. Metadata & Identity Line ────────────────────────────────────────────────
  const metaY = height - 425;
  page.drawLine({
    start: { x: 40, y: metaY + 25 },
    end: { x: width - 40, y: metaY + 25 },
    thickness: 0.8, color: rgb(0.85, 0.87, 0.89),
  });

  const now = new Date();
  const issuedDate = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const expiresDate = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
    .toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  page.drawText(`KaamCard ID: ${kaamCardId.substring(0, 8).toUpperCase()}`, {
    x: 40, y: metaY, size: 9, font: regularFont, color: GREY,
  });
  page.drawText(`Issued: ${issuedDate}`, {
    x: 40, y: metaY - 16, size: 9, font: regularFont, color: GREY,
  });
  page.drawText(`Expires: ${expiresDate}`, {
    x: 40, y: metaY - 32, size: 9, font: regularFont, color: GREY,
  });

  page.drawText(`Version: 1.0 (Authenticated)`, {
    x: width - 200, y: metaY, size: 9, font: regularFont, color: GREY,
  });
  page.drawText(`Status: ACTIVE & VERIFIED`, {
    x: width - 200, y: metaY - 16, size: 9, font: boldFont, color: TEAL,
  });

  // ── 6. Bottom Brand Footer Bar ───────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: 0, width, height: 36, color: TEAL });
  page.drawText('Verified by 7 Kaam Platform  |  https://7kaam.in', {
    x: 40, y: 13, size: 9, font: regularFont, color: WHITE,
  });
  page.drawText(`QR Token: ${qrToken.substring(0, 12)}...`, {
    x: width - 200, y: 13, size: 8, font: regularFont, color: rgb(0.82, 0.98, 0.92),
  });

  // ── Serialize and Upload PDF Buffer ─────────────────────────────────────────
  const pdfBytes = await doc.save();
  const pdfBuffer = Buffer.from(pdfBytes);

  const storagePath = `kaamcards/${worker.id}/${kaamCardId}.pdf`;
  const pdfUrl = await uploadBuffer(pdfBuffer, storagePath, 'application/pdf');

  return { pdfUrl, qrToken, kaamCardId };
}

module.exports = { generateKaamCard };
