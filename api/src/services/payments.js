import { makeReference } from '../utils/ref.js';

// Passerelle de paiement — PROTOTYPE.
// Les paiements réels (Bankily, Masrivi, Sedad, virement, carte) seront branchés
// via les API des partenaires après accord et intégration autorisée.
// Ici, toute transaction est simulée et immédiatement confirmée.
export const PAYMENT_PROVIDERS = {
  bankily: { label: 'Bankily', kind: 'mobile_money' },
  masrivi: { label: 'Masrivi', kind: 'mobile_money' },
  sedad: { label: 'Sedad', kind: 'mobile_money' },
  bank_transfer: { label: 'Virement bancaire', kind: 'bank' },
  card: { label: 'Carte bancaire', kind: 'card' },
};

export async function chargeSimulated({ method, amount }) {
  if (!PAYMENT_PROVIDERS[method]) {
    return { ok: false, error: 'Moyen de paiement non pris en charge' };
  }
  if (!(amount > 0)) return { ok: false, error: 'Montant invalide' };
  return {
    ok: true,
    provider: method,
    providerReference: makeReference(method.toUpperCase().slice(0, 3)),
    simulated: true,
  };
}
