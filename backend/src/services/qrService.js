const QRCode = require('qrcode');

/**
 * Generate a QR code as a PNG Buffer.
 * @param {string} text - The URL to encode
 * @returns {Buffer}
 */
async function generateQRBuffer(text) {
  const buffer = await QRCode.toBuffer(text, {
    type: 'png',
    width: 200,
    margin: 1,
    color: { dark: '#0F6E56', light: '#FFFFFF' },
  });
  return buffer;
}

module.exports = { generateQRBuffer };
