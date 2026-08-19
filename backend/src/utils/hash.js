const crypto = require('crypto');

/**
 * Hash Aadhaar number using SHA-256 (one-way, no salt needed for lookup).
 * We never store the raw Aadhaar number.
 */
function hashAadhaar(aadhaar) {
  return crypto.createHash('sha256').update(aadhaar.trim()).digest('hex');
}

module.exports = { hashAadhaar };
