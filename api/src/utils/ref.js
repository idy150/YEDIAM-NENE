import crypto from 'node:crypto';

// Référence lisible et non devinable : PREFIX-AAAAMMJJ-XXXXXX
export function makeReference(prefix) {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = crypto.randomBytes(4).toString('hex').slice(0, 6).toUpperCase();
  return `${prefix}-${ymd}-${rand}`;
}

// Code de suivi court pour les familles (sans caractères ambigus)
export function makeTrackingCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(8);
  let code = '';
  for (let i = 0; i < 8; i++) code += alphabet[bytes[i] % alphabet.length];
  return `YN-${code.slice(0, 4)}-${code.slice(4)}`;
}
