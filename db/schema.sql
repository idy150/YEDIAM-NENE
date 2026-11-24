-- ============================================================
-- YEDIAM NENE — Schéma PostgreSQL
-- « Donne ton sang » — Plateforme mauritanienne de don de sang
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  nom           TEXT NOT NULL,
  email         TEXT UNIQUE,
  telephone     TEXT UNIQUE,
  password_hash TEXT,
  role          TEXT NOT NULL CHECK (role IN ('super_admin', 'hospital_admin', 'donor', 'blood_bank_admin')),
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hospitals (
  id                   SERIAL PRIMARY KEY,
  user_id              INT REFERENCES users(id) ON DELETE SET NULL,
  nom                  TEXT NOT NULL,
  wilaya               TEXT NOT NULL,
  moughataa            TEXT,
  commune              TEXT,
  adresse              TEXT,
  telephone            TEXT NOT NULL,
  email                TEXT,
  nom_responsable      TEXT,
  telephone_responsable TEXT,
  infos_administratives TEXT,
  motif_adhesion       TEXT,
  status               TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'refused')),
  subscription_status  TEXT NOT NULL DEFAULT 'pending' CHECK (subscription_status IN ('active', 'pending', 'expired', 'suspended')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS donors (
  id                 SERIAL PRIMARY KEY,
  user_id            INT REFERENCES users(id) ON DELETE SET NULL,
  nom                TEXT NOT NULL,
  telephone          TEXT,
  email              TEXT,
  blood_group        TEXT NOT NULL CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  wilaya             TEXT NOT NULL,
  moughataa          TEXT,
  quartier           TEXT,
  available          BOOLEAN NOT NULL DEFAULT TRUE,
  last_donation_date DATE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS blood_banks (
  id         SERIAL PRIMARY KEY,
  user_id    INT REFERENCES users(id) ON DELETE SET NULL,
  nom        TEXT NOT NULL,
  adresse    TEXT,
  wilaya     TEXT,
  telephone  TEXT,
  email      TEXT,
  status     TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS blood_stocks (
  id            SERIAL PRIMARY KEY,
  blood_bank_id INT NOT NULL REFERENCES blood_banks(id) ON DELETE CASCADE,
  blood_group   TEXT NOT NULL CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  quantity      INT NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (blood_bank_id, blood_group)
);

CREATE TABLE IF NOT EXISTS blood_requests (
  id             SERIAL PRIMARY KEY,
  requester_type TEXT NOT NULL CHECK (requester_type IN ('hospital', 'family')),
  requester_id   INT,             -- id de l'hôpital si requester_type = 'hospital'
  patient_name   TEXT,            -- pour les demandes familiales
  family_contact TEXT,            -- téléphone de la famille
  hospital_id    INT REFERENCES hospitals(id) ON DELETE SET NULL,
  blood_group    TEXT NOT NULL CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  quantity       INT NOT NULL CHECK (quantity > 0),
  urgency        TEXT NOT NULL CHECK (urgency IN ('immediate', 'urgent', 'normal')),
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'five_reached', 'completed', 'cancelled', 'refused')),
  wilaya         TEXT,
  moughataa      TEXT,
  service        TEXT,
  contact_number TEXT,
  additional_info TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at      TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS notifications (
  id           SERIAL PRIMARY KEY,
  donor_id     INT NOT NULL REFERENCES donors(id) ON DELETE CASCADE,
  request_id   INT NOT NULL REFERENCES blood_requests(id) ON DELETE CASCADE,
  type         TEXT NOT NULL DEFAULT 'urgent',
  status       TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'responded')),
  response     TEXT CHECK (response IN ('positive', 'negative')),
  sent_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS donations (
  id            SERIAL PRIMARY KEY,
  donor_id      INT REFERENCES donors(id) ON DELETE SET NULL,
  hospital_id   INT REFERENCES hospitals(id) ON DELETE SET NULL,
  blood_bank_id INT REFERENCES blood_banks(id) ON DELETE SET NULL,
  request_id    INT REFERENCES blood_requests(id) ON DELETE SET NULL,
  donation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  blood_group   TEXT,
  status        TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'completed', 'cancelled')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
  id                   SERIAL PRIMARY KEY,
  user_id              INT REFERENCES users(id) ON DELETE SET NULL,
  hospital_id          INT REFERENCES hospitals(id) ON DELETE SET NULL,
  request_id           INT REFERENCES blood_requests(id) ON DELETE SET NULL,
  amount               NUMERIC(10,2) NOT NULL,
  type                 TEXT NOT NULL CHECK (type IN ('subscription', 'family_request')),
  status               TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
  transaction_reference TEXT,
  payment_date         TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id          SERIAL PRIMARY KEY,
  hospital_id INT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  amount      NUMERIC(10,2) NOT NULL,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'expired', 'suspended')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS blood_bank_responses (
  id               SERIAL PRIMARY KEY,
  request_id       INT NOT NULL REFERENCES blood_requests(id) ON DELETE CASCADE,
  blood_bank_id    INT NOT NULL REFERENCES blood_banks(id) ON DELETE CASCADE,
  available_pockets INT NOT NULL DEFAULT 0,
  message          TEXT,
  status           TEXT NOT NULL DEFAULT 'offered' CHECK (status IN ('offered', 'accepted', 'rejected')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id            SERIAL PRIMARY KEY,
  blood_bank_id INT NOT NULL REFERENCES blood_banks(id) ON DELETE CASCADE,
  blood_group   TEXT NOT NULL,
  delta         INT NOT NULL,
  reason        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id         SERIAL PRIMARY KEY,
  user_id    INT REFERENCES users(id) ON DELETE SET NULL,
  action     TEXT NOT NULL,
  entity     TEXT,
  entity_id  INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index utiles
CREATE INDEX IF NOT EXISTS idx_donors_blood_group   ON donors (blood_group);
CREATE INDEX IF NOT EXISTS idx_donors_wilaya        ON donors (wilaya);
CREATE INDEX IF NOT EXISTS idx_donors_available     ON donors (available);
CREATE INDEX IF NOT EXISTS idx_requests_status      ON blood_requests (status);
CREATE INDEX IF NOT EXISTS idx_requests_blood_group ON blood_requests (blood_group);
CREATE INDEX IF NOT EXISTS idx_notifications_donor  ON notifications (donor_id);
CREATE INDEX IF NOT EXISTS idx_notifications_request ON notifications (request_id);
CREATE INDEX IF NOT EXISTS idx_hospitals_status     ON hospitals (status);
CREATE INDEX IF NOT EXISTS idx_logs_created         ON activity_logs (created_at);

-- Trigger : mise à jour automatique de updated_at
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated ON users;
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_hospitals_updated ON hospitals;
CREATE TRIGGER trg_hospitals_updated BEFORE UPDATE ON hospitals FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_donors_updated ON donors;
CREATE TRIGGER trg_donors_updated BEFORE UPDATE ON donors FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_blood_banks_updated ON blood_banks;
CREATE TRIGGER trg_blood_banks_updated BEFORE UPDATE ON blood_banks FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_blood_stocks_updated ON blood_stocks;
CREATE TRIGGER trg_blood_stocks_updated BEFORE UPDATE ON blood_stocks FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- v0.2 — Suivi famille, campagnes, couche FinTech solidaire
-- Le sang reste gratuit : les fonds servent à la logistique et aux campagnes.
-- ============================================================

-- Code de suivi public pour les demandes (familles sans compte)
ALTER TABLE blood_requests ADD COLUMN IF NOT EXISTS tracking_code TEXT UNIQUE;
-- Confirmation du don par l'hôpital
ALTER TABLE donations ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;

-- Campagnes de don et de sensibilisation
CREATE TABLE IF NOT EXISTS campaigns (
  id             SERIAL PRIMARY KEY,
  title          TEXT NOT NULL,
  description    TEXT,
  type           TEXT NOT NULL DEFAULT 'collecte' CHECK (type IN ('collecte', 'sensibilisation')),
  wilaya         TEXT,
  location       TEXT,
  start_date     DATE NOT NULL,
  end_date       DATE NOT NULL,
  organizer_type TEXT NOT NULL CHECK (organizer_type IN ('admin', 'hospital', 'blood_bank')),
  organizer_id   INT,
  organizer_name TEXT NOT NULL,
  target_donors  INT NOT NULL DEFAULT 0,
  target_amount  NUMERIC(12,2) NOT NULL DEFAULT 0,
  target_groups  TEXT[],
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  created_by     INT REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inscriptions des donneurs aux collectes
CREATE TABLE IF NOT EXISTS campaign_participants (
  id          SERIAL PRIMARY KEY,
  campaign_id INT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  donor_id    INT NOT NULL REFERENCES donors(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'donated', 'cancelled')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, donor_id)
);

-- Contributions financières volontaires (particuliers, entreprises, ONG)
CREATE TABLE IF NOT EXISTS contributions (
  id                SERIAL PRIMARY KEY,
  reference         TEXT NOT NULL UNIQUE,
  campaign_id       INT REFERENCES campaigns(id) ON DELETE SET NULL,
  purpose           TEXT NOT NULL DEFAULT 'general' CHECK (purpose IN ('general', 'campaign', 'transport', 'sponsoring')),
  contributor_type  TEXT NOT NULL DEFAULT 'individual' CHECK (contributor_type IN ('individual', 'company', 'ngo')),
  contributor_name  TEXT NOT NULL,
  contributor_phone TEXT,
  contributor_email TEXT,
  anonymous         BOOLEAN NOT NULL DEFAULT FALSE,
  amount            NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  payment_method    TEXT NOT NULL CHECK (payment_method IN ('bankily', 'masrivi', 'sedad', 'bank_transfer', 'card')),
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  provider_reference TEXT,
  message           TEXT,
  user_id           INT REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at           TIMESTAMPTZ
);

-- Demandes de soutien transport des donneurs
CREATE TABLE IF NOT EXISTS transport_requests (
  id           SERIAL PRIMARY KEY,
  donor_id     INT NOT NULL REFERENCES donors(id) ON DELETE CASCADE,
  request_id   INT REFERENCES blood_requests(id) ON DELETE SET NULL,
  campaign_id  INT REFERENCES campaigns(id) ON DELETE SET NULL,
  amount       NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  note         TEXT,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'refused')),
  decided_by   INT REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at   TIMESTAMPTZ
);

-- Utilisation des fonds (transparence)
CREATE TABLE IF NOT EXISTS fund_expenses (
  id                   SERIAL PRIMARY KEY,
  reference            TEXT NOT NULL UNIQUE,
  campaign_id          INT REFERENCES campaigns(id) ON DELETE SET NULL,
  transport_request_id INT REFERENCES transport_requests(id) ON DELETE SET NULL,
  category             TEXT NOT NULL CHECK (category IN ('transport', 'collation', 'logistique', 'communication', 'materiel', 'autre')),
  amount               NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  description          TEXT NOT NULL,
  beneficiary          TEXT,
  spent_at             DATE NOT NULL DEFAULT CURRENT_DATE,
  recorded_by          INT REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_status        ON campaigns (status);
CREATE INDEX IF NOT EXISTS idx_contributions_campaign  ON contributions (campaign_id);
CREATE INDEX IF NOT EXISTS idx_contributions_status    ON contributions (status);
CREATE INDEX IF NOT EXISTS idx_expenses_campaign       ON fund_expenses (campaign_id);
CREATE INDEX IF NOT EXISTS idx_transport_status        ON transport_requests (status);

DROP TRIGGER IF EXISTS trg_campaigns_updated ON campaigns;
CREATE TRIGGER trg_campaigns_updated BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;