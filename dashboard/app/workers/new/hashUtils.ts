import crypto from 'crypto';

export function hashAadhaar(aadhaar: string): string {
  return crypto.createHash('sha256').update(aadhaar.replace(/\s/g, '')).digest('hex');
}
