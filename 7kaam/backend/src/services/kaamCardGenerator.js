const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const { generateQRBuffer } = require('./qrService');
const { uploadBuffer } = require('./supabaseStorage');
const { v4: uuidv4 } = require('uuid');

const TEAL = rgb(0.059, 0.431, 0.337);       // #0F6E56
const TEAL_LIGHT = rgb(0.878, 0.961, 0.937); // #E0F5EF
const DARK = rgb(0.1, 0.1, 0.1);
const GREY = rgb(0.5, 0.5, 0.5);
const WHITE = rgb(1, 1, 1);

const TIER_COLORS = {
  EXPERT: rgb(0.502, 0.251, 0.753), // purple
  GOLD: rgb(0.855, 0.647, 0.125),   // gold
  SILVER: rgb(0.502, 0.502, 0.502), // grey
  BRONZE: rgb(0.804, 0.498, 0.196), // bronze
};

function tierEmoji(tier) {
  const map = { EXPERT: 'EXPERT', GOLD: 'GOLD', SILVER: 'SILVER', BRONZE: 'BRONZE' };
  return map[tier] || tier;
}

/**
 * Generate a KaamCard PDF and upload to Supabase.
 * Returns { pdfUrl, qrToken, kaamCardId }
 */
async function generateKaamCard({ worker, videoScore, testScore, workHistoryScore, finalScore, tier }) {
  const kaamCardId = uuidv4();
  const qrToken = uuidv4();
  const qrUrl = `https://7kaam.in/verify/${qrToken}`;

  // ── Generate QR PNG ──────────────────────────────────────────────────────────
  const qrBuffer = await generateQRBuffer(qrUrl);

  // ── Create PDF ───────────────────────────────────────────────────────────────
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();

  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await doc.embedFont(StandardFonts.Helvetica);

  // ── Header Bar ───────────────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: TEAL });
  page.drawText('7 Kaam — Verified Skill Certificate', {
    x: 40, y: height - 50,
    size: 22, font: boldFont, color: WHITE,
  });
  page.drawText('AI-Powered Certification for India\'s Skilled Workforce', {
    x: 40, y: height - 68,
    size: 9, font: regularFont, color: rgb(0.8, 1, 0.94),
  });

  // ── Light background section ─────────────────────────────────────────────────
  page.drawRectangle({ x: 30, y: height - 230, width: width - 60, height: 140, color: TEAL_LIGHT, borderRadius: 8 });

  // Worker Name
  page.drawText(worker.fullName, { x: 50, y: height - 115, size: 20, font: boldFont, color: DARK });

  // Trade + City
  page.drawText(`${worker.trade.replace('_', ' ')}  ·  ${worker.city}`, {
    x: 50, y: height - 138, size: 12, font: regularFont, color: GREY,
  });

  // Aadhaar verified badge
  if (worker.aadhaarVerified) {
    page.drawRectangle({ x: 50, y: height - 165, width: 120, height: 20, color: TEAL, borderRadius: 4 });
    page.drawText('Aadhaar Verified', { x: 60, y: height - 159, size: 9, font: boldFont, color: WHITE });
  }

  // ── Score Section ─────────────────────────────────────────────────────────────
  const scoreStr = `${Math.round(finalScore)} / 100`;
  page.drawText(scoreStr, { x: 40, y: height - 290, size: 48, font: boldFont, color: TEAL });

  // Tier badge
  const tierColor = TIER_COLORS[tier] || GREY;
  page.drawRectangle({ x: 200, y: height - 295, width: 90, height: 28, color: tierColor, borderRadius: 5 });
  page.drawText(tierEmoji(tier), { x: 215, y: height - 284, size: 13, font: boldFont, color: WHITE });

  // ── Sub-scores Bar ────────────────────────────────────────────────────────────
  const subScoreY = height - 340;
  const labels = [
    { label: 'Video Score', value: videoScore, weight: '35%' },
    { label: 'Test Score', value: testScore, weight: '45%' },
    { label: 'Work History', value: workHistoryScore, weight: '20%' },
  ];
  labels.forEach((s, i) => {
    const x = 40 + i * 175;
    page.drawRectangle({ x, y: subScoreY - 40, width: 160, height: 50, color: rgb(0.95, 0.97, 0.96), borderRadius: 6 });
    page.drawText(s.label, { x: x + 8, y: subScoreY - 12, size: 9, font: boldFont, color: DARK });
    page.drawText(`${Math.round(s.value || 0)}/100  (${s.weight})`, { x: x + 8, y: subScoreY - 26, size: 10, font: regularFont, color: TEAL });
    // Mini progress bar
    const barW = 144;
    const fillW = ((s.value || 0) / 100) * barW;
    page.drawRectangle({ x: x + 8, y: subScoreY - 40, width: barW, height: 6, color: rgb(0.9, 0.9, 0.9), borderRadius: 3 });
    page.drawRectangle({ x: x + 8, y: subScoreY - 40, width: fillW, height: 6, color: TEAL, borderRadius: 3 });
  });

  // ── Identity Section ──────────────────────────────────────────────────────────
  const idY = height - 430;
  page.drawLine({ start: { x: 40, y: idY + 20 }, end: { x: width - 40, y: idY + 20 }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });
  const now = new Date();
  const issued = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const expires = new Date(now.setFullYear(now.getFullYear() + 1))
    .toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  page.drawText(`KaamCard ID: ${kaamCardId.substring(0, 8).toUpperCase()}`, { x: 40, y: idY, size: 9, font: regularFont, color: GREY });
  page.drawText(`Issued: ${issued}`, { x: 40, y: idY - 16, size: 9, font: regularFont, color: GREY });
  page.drawText(`Expires: ${expires}`, { x: 40, y: idY - 32, size: 9, font: regularFont, color: GREY });

  // ── QR Code ───────────────────────────────────────────────────────────────────
  const qrImage = await doc.embedPng(qrBuffer);
  page.drawImage(qrImage, { x: width - 160, y: idY - 50, width: 120, height: 120 });
  page.drawText('Scan to verify', { x: width - 148, y: idY - 62, size: 8, font: regularFont, color: GREY });

  // ── Footer ────────────────────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: 0, width, height: 40, color: TEAL });
  page.drawText('Verified by 7 Kaam  |  7kaam.in', { x: 40, y: 14, size: 10, font: regularFont, color: WHITE });
  page.drawText(`QR Token: ${qrToken.substring(0, 8)}...`, { x: width - 220, y: 14, size: 8, font: regularFont, color: rgb(0.8, 1, 0.94) });

  // ── Serialize and Upload ──────────────────────────────────────────────────────
  const pdfBytes = await doc.save();
  const pdfBuffer = Buffer.from(pdfBytes);

  const storagePath = `kaamcards/${worker.id}/${kaamCardId}.pdf`;
  const pdfUrl = await uploadBuffer(pdfBuffer, storagePath, 'application/pdf');

  return { pdfUrl, qrToken, kaamCardId };
}

module.exports = { generateKaamCard };
