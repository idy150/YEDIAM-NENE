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

## ✨ Nouveautés v0.2 — UI/UX, campagnes et couche FinTech solidaire

### 🎨 Refonte UI/UX
- Nouveau design system (police Inter, palette rouge sang / encre / or, cartes, badges, barres de progression, animations sobres, `prefers-reduced-motion`).
- **Site public** avec navigation, pied de page et page d'accueil repensée : hero, chiffres clés en direct, workflow en 6 étapes, espaces par acteur, campagnes en cours, section « Le sang reste gratuit ».
- Espaces pros : barre latérale regroupée par sections avec icônes, carte utilisateur ; espace donneur : navigation basse flottante à 5 onglets.

### 🩸 Workflow d'urgence renforcé
- **Compatibilité sanguine** : un besoin A+ alerte aussi A-, O+ et O- (groupe identique en priorité, puis même wilaya).
- **Délai entre deux dons (90 jours)** : seuls les donneurs éligibles sont alertés ; le donneur voit sa date de prochain don.
- Le dernier don n'est plus mis à jour au simple « Je peux donner » : l'**hôpital confirme le don** (« Don réalisé » / « Absent »).
- Un donneur ne peut plus répondre à une demande déjà couverte ou clôturée.
- **Suivi famille sans compte** : code de suivi (`/suivi/:code`) avec chronologie et actualisation automatique.

### 📣 Campagnes
- Création/gestion par le Super Admin, les hôpitaux et les banques de sang (collecte ou sensibilisation, groupes prioritaires, objectifs donneurs et budget).
- Pages publiques `/campagnes` et `/campagnes/:id`, inscription des donneurs (« Je participe »), confirmation des dons de campagne, partage WhatsApp.

### 💳 FinTech solidaire (Fintech Mauritanie Hackathon 2026)
- **Contributions volontaires** (`/soutenir`) : particuliers, entreprises, ONG ; fonds général, campagne, transport ou sponsoring ; Bankily / Masrivi / Sedad / virement / carte (**simulés**, branchés après accord des partenaires).
- **Reçus numériques** (`/recu/:reference`) imprimables, vérifiables, données personnelles masquées.
- **Transparence** (`/transparence`) : collecté, utilisé, solde, par mois, par catégorie, par campagne, dernières opérations.
- **Soutien transport des donneurs** : demande depuis l'espace donneur, validation et versement par l'admin (dépense tracée automatiquement).
- **Pilotage financier** (`/admin/finances`) : contributions, dépenses (contrôle du solde), soutiens transport.
- **Prévision des besoins** (tableau de bord admin) : moyenne pondérée des 3 derniers mois par groupe vs stocks, niveau de risque.

> Le sang reste gratuit : aucune transaction ne porte sur le sang ou les poches.

Nouvelles tables : `campaigns`, `campaign_participants`, `contributions`, `transport_requests`, `fund_expenses` (+ `blood_requests.tracking_code`, `donations.confirmed_at`). Nouvelles routes API : `/api/campaigns/*`, `/api/finance/*`, `/api/public/{stats,campaigns,contributions,receipts,transparency,track}`.

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
# Linux/macOS : CHROME_PATH=/usr/bin/google-chrome node scripts/smoke.mjs
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