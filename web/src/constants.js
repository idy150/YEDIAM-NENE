export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const WILAYAS = [
  'Nouakchott Ouest',
  'Nouakchott Nord',
  'Nouakchott Sud',
  'Dakhlet Nouadhibou',
  'Trarza',
  'Brakna',
  'Gorgol',
  'Guidimaka',
  'Assaba',
  'Tagant',
  'Hodh El Chargui',
  'Hodh El Gharbi',
  'Adrar',
  'Inchiri',
  'Tiris Zemmour',
];

export const URGENCY = {
  immediate: { label: '🔴 IMMÉDIAT', color: 'var(--red)' },
  urgent: { label: '🟠 URGENT', color: 'var(--orange)' },
  normal: { label: '🟢 NORMAL', color: 'var(--green)' },
};

export const REQUEST_STATUS = {
  pending: { label: 'En attente', color: 'var(--gold)' },
  active: { label: 'En cours', color: 'var(--red)' },
  five_reached: { label: '5 réponses atteintes', color: 'var(--green)' },
  completed: { label: 'Terminée', color: 'var(--green)' },
  cancelled: { label: 'Annulée', color: 'var(--gray)' },
  refused: { label: 'Refusée', color: 'var(--gray)' },
};

export const SUBSCRIPTION_STATUS = {
  active: { label: 'Actif', color: 'var(--green)' },
  pending: { label: 'En attente', color: 'var(--gold)' },
  expired: { label: 'Expiré', color: 'var(--orange)' },
  suspended: { label: 'Suspendu', color: 'var(--red)' },
};

export const HOSPITAL_STATUS = {
  pending: { label: 'En attente', color: 'var(--gold)' },
  active: { label: 'Actif', color: 'var(--green)' },
  suspended: { label: 'Suspendu', color: 'var(--red)' },
  refused: { label: 'Refusé', color: 'var(--gray)' },
};

export const PAYMENT_STATUS = {
  pending: { label: 'En attente', color: 'var(--gold)' },
  paid: { label: 'Payé', color: 'var(--green)' },
  failed: { label: 'Échoué', color: 'var(--red)' },
};

export const ROLE_LABELS = {
  super_admin: 'Super Admin',
  hospital_admin: 'Admin Hôpital',
  donor: 'Donneur',
  blood_bank_admin: 'Banque de Sang',
};

export const TARGET = 5;
export const CAMPAIGN_STATUS = {
  draft: { label: 'Brouillon', color: 'var(--gray)' },
  active: { label: 'En cours', color: 'var(--green)' },
  completed: { label: 'Terminée', color: 'var(--ink-2)' },
  cancelled: { label: 'Annulée', color: 'var(--gray)' },
};

export const CAMPAIGN_TYPES = {
  collecte: 'Collecte de sang',
  sensibilisation: 'Sensibilisation',
};

// Couche FinTech solidaire
export const CONTRIBUTION_PURPOSES = {
  general: { label: 'Fonds solidaire', sub: 'Affecté là où le besoin est le plus fort' },
  campaign: { label: 'Une campagne', sub: 'Soutenir une collecte précise' },
  transport: { label: 'Transport des donneurs', sub: 'Rembourser les déplacements' },
  sponsoring: { label: 'Sponsoring', sub: 'Entreprise partenaire d’une campagne' },
};

export const CONTRIBUTOR_TYPES = {
  individual: 'Particulier',
  company: 'Entreprise',
  ngo: 'ONG / Institution',
};

export const PAYMENT_LABELS = {
  bankily: 'Bankily',
  masrivi: 'Masrivi',
  sedad: 'Sedad',
  bank_transfer: 'Virement bancaire',
  card: 'Carte bancaire',
};

export const EXPENSE_CATEGORIES = {
  transport: { label: 'Transport donneurs', color: '#2f6fde' },
  collation: { label: 'Collations', color: '#c99a2e' },
  logistique: { label: 'Logistique', color: '#d7262e' },
  communication: { label: 'Communication', color: '#7b5cd6' },
  materiel: { label: 'Matériel', color: '#17945a' },
  autre: { label: 'Autre', color: '#7b7f8c' },
};

export const TRANSPORT_STATUS = {
  pending: { label: 'En attente', color: 'var(--gold)' },
  approved: { label: 'Approuvé', color: 'var(--blue)' },
  paid: { label: 'Versé', color: 'var(--green)' },
  refused: { label: 'Refusé', color: 'var(--gray)' },
};

// Compatibilité (globules rouges) : receveur → donneurs compatibles
export const COMPATIBLE_DONORS = {
  'O-': ['O-'],
  'O+': ['O+', 'O-'],
  'A-': ['A-', 'O-'],
  'A+': ['A+', 'A-', 'O+', 'O-'],
  'B-': ['B-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'],
  'AB-': ['AB-', 'A-', 'B-', 'O-'],
  'AB+': ['AB+', 'AB-', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-'],
};

export const homeFor = (role) =>
  ({ super_admin: '/admin', hospital_admin: '/hopital', donor: '/donneur', blood_bank_admin: '/banque' }[role] || '/');
