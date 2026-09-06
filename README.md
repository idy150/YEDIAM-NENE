# 🩸 YEDIAM NENE

> **« Donne ton sang »** — Plateforme mauritanienne de coordination du don de sang.
> *Un geste simple. Une vie sauvée.*

YEDIAM NENE met en relation les **donneurs volontaires**, les **hôpitaux**, les **banques de sang**, les **familles** confrontées à une urgence et l'**administration centrale**, afin de réduire le temps nécessaire pour trouver un donneur compatible lorsqu'un établissement de santé a besoin de sang.

Ce dépôt contient le **MVP complet** : application web React (mobile-first, installable en PWA), API REST Node.js/Express, base PostgreSQL, authentification JWT par rôles et données de démonstration mauritaniennes.

---

## 🏗️ Architecture

```
              YEDIAM NENE
                   │
        ┌──────────┴──────────┐
    React + Vite          (Mobile Flutter — prévu)
        (Web + PWA)               │
        └──────────┬──────────────┘
                   │
            REST API (Express)
                   │
              PostgreSQL
                   │
      Donneurs · Hôpitaux · Banques de sang
       Demandes · Notifications · Dons
       Paiements · Abonnements · Journaux
```

| Partie | Technologie |
|---|---|
| 🌐 Web | React 18 + Vite + React Router (PWA) |
| ⚙️ API | Node.js + Express |
| 🗄️ Base de données | PostgreSQL 16 (Docker) |
| 🔐 Authentification | JWT + bcrypt |
| 📊 Graphiques | Recharts |

## 📁 Structure

```
├── db/schema.sql          # Schéma complet (13 tables + index + triggers)
├── api/                   # Backend Express
│   ├── src/routes/        # auth · public · admin · hospital · donor · bloodbank
│   ├── src/services/      # Logique de notification intelligente
│   └── scripts/seed.js    # Données de démonstration
├── web/                   # Frontend React (mobile-first, PWA)
│   └── src/pages/         # Espaces : Super Admin · Hôpital · Donneur · Banque de sang
└── scripts/smoke.mjs      # Test de fumée navigateur (Chrome headless)
```

## 🚀 Installation

**Prérequis :** Node.js ≥ 20, Docker Desktop (pour PostgreSQL).

```bash
# 1. Démarrer PostgreSQL (Docker)
docker compose up -d db

# 2. Installer les dépendances
npm run api:install
npm run web:install

# 3. Initialiser la base (schéma + données de démonstration)
npm run api:seed

# 4. Lancer l'API (port 4000)
npm run api:dev

# 5. Lancer le web (port 5173)
npm run web:dev
```

Ouvrir **http://localhost:5173** — le frontend redirige `/api/*` vers l'API (proxy Vite).

> 💡 `npm run db:schema` applique le schéma seul ; `npm run api:seed` le réapplique et recharge les données de démo (base réinitialisée).

## 🔑 Comptes de démonstration

| Rôle | Identifiant | Mot de passe |
|---|---|---|
| 🛡️ Super Admin | `admin@yediam.mr` | `Admin123!` |
| 🏥 Hôpital (Hôpital National) | `admin.hnn@yediam.mr` | `Hopital123!` |
| 🏦 Banque de sang (CNTS) | `cnts@yediam.mr` | `Banque123!` |
| 🩸 Donneur | `donneur1@yediam.mr` | `Donneur123!` |

Configuration : copier `api/.env.example` vers `api/.env` et adapter si besoin (par défaut : base `postgres://yediam:yediam@localhost:5432/yediam`, clé JWT de dev).

## 🎯 Fonctionnalités par rôle

### 🛡️ Super Admin (web, dashboard professionnel)
Dashboard national + statistiques (graphiques : dons/demandes par mois, groupes recherchés, wilayas, satisfaction), gestion des hôpitaux (approbation d'adhésion → création automatique du compte admin + abonnement, refus, suspension, modification), gestion des donneurs (recherche, filtres, ajout manuel, suspension), toutes les demandes (validation et diffusion des demandes famille, arrêt, relance), lancer une urgence, paiements, abonnements, journal d'activité.

### 🏥 Hôpital (web)
Tableau de bord, **nouvelle demande urgente** (formulaire simple : groupe, poches, urgence, wilaya, service, contact), demandes en cours avec compteur de réponses (`x / 5`), réponses des donneurs, banques de sang (stocks visibles), donneurs contacts, historique, abonnement (1 000 MRU/mois, renouvellement simulé), profil. **Séparation stricte** : un hôpital ne voit jamais les données d'un autre.

### 🩸 Donneur (mobile-first, navigation basse : Accueil · Urgences · Historique · Profil)
Inscription avec groupe sanguin, disponibilité (🟢/⚫), notification d'urgence avec deux gros boutons **« JE PEUX DONNER » / « JE NE SUIS PAS DISPONIBLE »**, historique des dons et réponses, profil.

### 🏦 Banque de sang (web)
Stocks par groupe (ajout/retrait, alerte stock critique), historique des mouvements, réponse aux demandes actives (poches disponibles), profil.

### 👨‍👩‍👧 Famille (public)
Formulaire court « Besoin urgent pour un proche » (100 MRU, **paiement simulé**), soumis à validation du Super Admin avant diffusion aux donneurs.

## 🤖 Logique automatique des demandes

1. Un hôpital (ou le Super Admin) crée une demande.
2. Le système sélectionne les donneurs **compatibles** (même groupe sanguin, disponibles, comptes actifs — priorité à la même wilaya) et crée les notifications.
3. Chaque donneur reçoit l'alerte : 🔴 URGENCE — « Pouvez-vous donner votre sang ? » avec les deux boutons.
4. Les réponses remontent à l'hôpital en temps réel ; **à 5 réponses positives, la campagne s'arrête automatiquement** (`five_reached`).
5. L'hôpital ou le Super Admin peut arrêter manuellement, relancer les donneurs non répondants, ou clôturer la demande.

## 🔒 Sécurité (MVP)

- Mots de passe hashés (bcrypt), JWT avec expiration, contrôle des rôles sur chaque route.
- Séparation des données entre hôpitaux (requêtes scopées par `hospital_id`).
- Journalisation des actions importantes (`activity_logs`).
- **Prototype** : paiements et notifications simulés. Pour une mise en production réelle, il faudra traiter confidentialité médicale, autorisations institutionnelles, intégration des banques de sang et moyens de paiement (cf. cahier des charges §47).

## 🧪 Tests

```bash
# Test de fumée navigateur (Chrome headless) : rendu de chaque rôle + pages publiques
node scripts/smoke.mjs
```

L'API et le web doivent tourner (`npm run api:dev` + `npm run web:dev`).

## 🗺️ Prochaines phases

- **Phase 2 — MVP réel** : notifications push (FCM), emails transactionnels, paiements réels.
- **Phase 3 — Pilote** : une banque de sang + quelques hôpitaux + un groupe limité de donneurs.
- **Phase 4 — Déploiement** : extension géographique, hébergement (Vercel + Render/Railway).
- **Phase 5 — National** : partenariat Ministère de la Santé, intégration des établissements.
- **Mobile Flutter** : application Android/iOS dédiée aux donneurs et familles, branchée sur la même API.

---

**YEDIAM NENE** — *Un geste simple. Une vie sauvée.* 💛