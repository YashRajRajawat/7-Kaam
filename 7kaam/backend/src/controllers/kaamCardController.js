const prisma = require('../utils/prisma');

// GET /api/v1/kaamcards
async function listKaamCards(req, res) {
  try {
    const cards = await prisma.kaamCard.findMany({
      include: { worker: { select: { fullName: true, trade: true, finalScore: true, tier: true } } },
      orderBy: { issuedAt: 'desc' },
    });
    res.json(cards);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/v1/kaamcards/:workerId
async function getKaamCardByWorker(req, res) {
  try {
    const card = await prisma.kaamCard.findFirst({
      where: { workerId: req.params.workerId },
      orderBy: { issuedAt: 'desc' },
      include: { worker: true },
    });
    if (!card) return res.status(404).json({ error: 'No KaamCard found for this worker' });
    res.json(card);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/v1/kaamcards/:workerId/pdf
async function downloadKaamCardPdf(req, res) {
  try {
    const card = await prisma.kaamCard.findFirst({
      where: { workerId: req.params.workerId },
      orderBy: { issuedAt: 'desc' },
      include: { worker: true },
    });

    if (!card) return res.status(404).json({ error: 'No KaamCard found for this worker' });

    const { generateKaamCard } = require('../services/kaamCardGenerator');
    const { pdfUrl } = await generateKaamCard({
      worker: card.worker,
      videoScore: card.worker.videoScore ?? 0,
      testScore: card.worker.testScore ?? 0,
      workHistoryScore: card.worker.workHistoryScore ?? 0,
      finalScore: card.worker.finalScore ?? 80,
      tier: card.worker.tier ?? 'GOLD',
      existingQrToken: card.qrToken,
    });

    await prisma.kaamCard.update({
      where: { id: card.id },
      data: { pdfUrl },
    });
    if (pdfUrl && pdfUrl.startsWith('data:application/pdf;base64,')) {
      const base64Data = pdfUrl.replace(/^data:application\/pdf;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="KaamCard_${card.worker?.fullName?.replace(/\s+/g, '_') || 'Certificate'}.pdf"`);
      res.setHeader('Content-Length', buffer.length);
      return res.end(buffer);
    }

    res.redirect(pdfUrl);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/v1/kaamcards/:id/revoke
async function revokeKaamCard(req, res) {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: 'Revocation reason is required' });

    const card = await prisma.kaamCard.update({
      where: { id: req.params.id },
      data: { isRevoked: true, revokedReason: reason },
    });
    res.json(card);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'KaamCard not found' });
    res.status(500).json({ error: err.message });
  }
}

// GET /api/v1/verify/:qrToken  (PUBLIC — no auth)
async function verifyKaamCard(req, res) {
  try {
    const token = (req.params.qrToken || '').trim();
    let card = await prisma.kaamCard.findUnique({
      where: { qrToken: token },
      include: { worker: { select: { fullName: true, phoneNumber: true, trade: true, city: true, locality: true, aadhaarVerified: true, profilePhotoUrl: true } } },
    });

    if (!card) {
      card = await prisma.kaamCard.findFirst({
        where: { workerId: token },
        include: { worker: { select: { fullName: true, phoneNumber: true, trade: true, city: true, locality: true, aadhaarVerified: true, profilePhotoUrl: true } } },
      });
    }

    if (!card) {
      if (req.headers.accept?.includes('text/html')) {
        return res.status(404).send(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>7 Kaam — Certificate Not Found</title>
              <script src="https://cdn.tailwindcss.com"></script>
            </head>
            <body class="bg-slate-900 text-white min-h-screen flex items-center justify-center p-4">
              <div class="bg-slate-800 border border-slate-700 rounded-2xl p-6 text-center max-w-md w-full shadow-2xl">
                <div class="w-16 h-16 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">✕</div>
                <h1 class="text-xl font-black text-white">Invalid Certificate Token</h1>
                <p class="text-slate-400 text-xs mt-2">The scanned QR code is either invalid or does not match any record in 7 Kaam database.</p>
              </div>
            </body>
          </html>
        `);
      }
      return res.status(404).json({ error: 'KaamCard not found' });
    }

    const now = new Date();
    const status = card.isRevoked
      ? 'REVOKED'
      : new Date(card.expiresAt) < now
      ? 'EXPIRED'
      : 'VALID';

    // If request comes from a browser or smartphone camera, render HTML Verification Portal
    if (req.headers.accept?.includes('text/html') || req.query.html === 'true') {
      const html = renderVerificationHtml(card, status, now);
      return res.send(html);
    }

    res.json({ ...card, verificationStatus: status, verifiedAt: now });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function renderVerificationHtml(card, status, now) {
  const worker = card.worker || {};
  const breakdown = card.scoreBreakdown || {};
  const finalScore = Math.round(breakdown.finalScore || 80);
  const videoScore = Math.round(breakdown.videoScore || 85);
  const testScore = Math.round(breakdown.testScore || 80);
  const workHistoryScore = Math.round(breakdown.workHistoryScore || 85);
  const tier = breakdown.tier || 'GOLD';
  const phone = worker.phoneNumber || '9876543210';

  const statusBadge = status === 'VALID'
    ? '<span class="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">✓ VALID CERTIFIED</span>'
    : status === 'REVOKED'
    ? '<span class="bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">✕ REVOKED</span>'
    : '<span class="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">⚠ EXPIRED</span>';

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>7 Kaam — Official Verification Portal</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
        <style>body { font-family: 'Plus Jakarta Sans', sans-serif; }</style>
      </head>
      <body class="bg-slate-950 text-slate-100 min-h-screen pb-12">
        <!-- Header Bar -->
        <header class="bg-emerald-950/80 border-b border-emerald-800/40 backdrop-blur-md sticky top-0 z-50 py-3.5 px-4">
          <div class="max-w-md mx-auto flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 font-black text-sm shadow-md">7</div>
              <div>
                <h1 class="text-sm font-extrabold tracking-tight text-white leading-none">7 Kaam Verification</h1>
                <p class="text-[10px] text-emerald-400 font-semibold mt-0.5">Government & Workforce Registry</p>
              </div>
            </div>
            ${statusBadge}
          </div>
        </header>

        <main class="max-w-md mx-auto px-4 pt-6 space-y-4">
          <!-- Worker Profile Hero -->
          <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div class="flex items-center gap-4">
              <div class="w-16 h-16 rounded-2xl bg-emerald-900/60 border border-emerald-500/30 flex items-center justify-center font-black text-2xl text-emerald-400 overflow-hidden shadow-inner flex-shrink-0">
                ${worker.profilePhotoUrl ? `<img src="${worker.profilePhotoUrl}" class="w-full h-full object-cover">` : worker.fullName ? worker.fullName[0] : 'W'}
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <h2 class="text-lg font-black text-white truncate">${worker.fullName || 'Worker Name'}</h2>
                  ${worker.aadhaarVerified !== false ? '<span class="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-md font-bold border border-emerald-500/30">✓ Aadhaar Verified</span>' : ''}
                </div>
                <p class="text-xs text-slate-400 font-semibold mt-0.5">${(worker.trade || 'ELECTRICIAN').replace(/_/g, ' ')} · ${worker.city || 'Bangalore'}</p>
                <p class="text-xs font-mono text-emerald-400 mt-1">${phone}</p>
              </div>
            </div>

            <!-- Score Display -->
            <div class="bg-slate-950/60 rounded-xl p-4 border border-slate-800 flex items-center justify-between">
              <div>
                <p class="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Verified Skill Score</p>
                <div class="flex items-baseline gap-1 mt-0.5">
                  <span class="text-3xl font-black text-white">${finalScore}</span>
                  <span class="text-xs text-slate-400 font-bold">/ 100</span>
                </div>
              </div>
              <div class="text-right">
                <span class="px-3 py-1 rounded-lg text-xs font-black bg-purple-500/20 text-purple-300 border border-purple-500/30 tracking-wider">${tier}</span>
                <p class="text-[10px] text-slate-400 mt-1 font-semibold">Tier Certification</p>
              </div>
            </div>

            <!-- Sub-Scores Breakdown -->
            <div class="grid grid-cols-3 gap-2 pt-1">
              <div class="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 text-center">
                <p class="text-[10px] font-bold text-slate-400">Video</p>
                <p class="text-sm font-black text-emerald-400 mt-0.5">${videoScore}/100</p>
                <p class="text-[9px] text-slate-400">35% weight</p>
              </div>
              <div class="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 text-center">
                <p class="text-[10px] font-bold text-slate-400">Test</p>
                <p class="text-sm font-black text-emerald-400 mt-0.5">${testScore}/100</p>
                <p class="text-[9px] text-slate-400">45% weight</p>
              </div>
              <div class="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 text-center">
                <p class="text-[10px] font-bold text-slate-400">Work History</p>
                <p class="text-sm font-black text-emerald-400 mt-0.5">${workHistoryScore}/100</p>
                <p class="text-[9px] text-slate-400">20% weight</p>
              </div>
            </div>
          </div>

          <!-- Direct Contact & Action Bar -->
          <div class="grid grid-cols-2 gap-2.5">
            <a href="tel:${phone}" class="flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg transition-all">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
              Call Worker
            </a>
            <a href="https://wa.me/91${phone.replace(/\D/g,'')}?text=Hi%20${encodeURIComponent(worker.fullName || '')},%20I%20verified%20your%207%20Kaam%20KaamCard!" target="_blank" class="flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-400 font-extrabold text-xs transition-all">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-1.099 4.019 4.142-1.087z"/></svg>
              WhatsApp
            </a>
          </div>

          <!-- Download PDF Certificate Button -->
          <a href="/api/v1/kaamcards/${card.workerId}/pdf?force=true" target="_blank" class="block w-full text-center py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs shadow-lg transition-all">
            📄 Download Official PDF Certificate
          </a>

          <!-- Certificate Metadata -->
          <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 text-[11px] text-slate-400 space-y-1.5 font-mono">
            <div class="flex justify-between"><span>KaamCard ID:</span><span class="text-white font-bold">${card.id.substring(0,8).toUpperCase()}</span></div>
            <div class="flex justify-between"><span>QR Token:</span><span class="text-emerald-400">${card.qrToken}</span></div>
            <div class="flex justify-between"><span>Issued Date:</span><span class="text-slate-300">${new Date(card.issuedAt).toLocaleDateString('en-IN')}</span></div>
            <div class="flex justify-between"><span>Expiration:</span><span class="text-slate-300">${new Date(card.expiresAt).toLocaleDateString('en-IN')}</span></div>
          </div>
        </main>
      </body>
    </html>
  `;
}

module.exports = { listKaamCards, getKaamCardByWorker, downloadKaamCardPdf, revokeKaamCard, verifyKaamCard };
