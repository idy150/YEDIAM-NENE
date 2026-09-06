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