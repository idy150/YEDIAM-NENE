import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT || 4000),
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgres://yediam:yediam@localhost:5432/yediam',
  jwtSecret: process.env.JWT_SECRET || 'yediam-nene-dev-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
};

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// Modèle économique (prototype)
export const PRICES = {
  hospitalSubscription: 1000, // MRU / mois
  familyRequest: 100, // MRU / demande urgente
};

// Nombre de réponses positives avant arrêt automatique de la campagne
export const POSITIVE_TARGET = 5;
// Délai minimal entre deux dons de sang total (jours)
export const DONATION_INTERVAL_DAYS = 90;

// Compatibilité globules rouges : receveur → groupes donneurs compatibles
// (le groupe identique est toujours prioritaire dans la sélection).
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

// Couche FinTech (prototype) — moyens de paiement des partenaires,
// activés uniquement après intégration autorisée.
export const PAYMENT_METHODS = ['bankily', 'masrivi', 'sedad', 'bank_transfer', 'card'];
export const CONTRIBUTION_LIMITS = { min: 50, max: 5_000_000 }; // MRU
export const TRANSPORT_SUPPORT_MAX = 2000; // MRU par déplacement
