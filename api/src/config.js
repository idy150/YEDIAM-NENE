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