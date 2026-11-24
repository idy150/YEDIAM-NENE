import { Router } from 'express';
import { query } from '../db.js';
import { asyncHandler, ApiError } from '../utils/http.js';
import { logActivity } from '../middleware/auth.js';
import { PRICES, BLOOD_GROUPS, PAYMENT_METHODS, CONTRIBUTION_LIMITS, POSITIVE_TARGET } from '../config.js';
import { makeReference, makeTrackingCode } from '../utils/ref.js';
import { chargeSimulated, PAYMENT_PROVIDERS } from '../services/payments.js';
import { fundSummary, listCampaigns, publicName } from '../services/finance.js';

const router = Router();

// Étape 1-3 : un hôpital demande son adhésion → statut EN ATTENTE chez le Super Admin
router.post(
  '/hospital-join',
  asyncHandler(async (req, res) => {
    const {
      nom, wilaya, moughataa, commune, adresse, telephone, email,
      nom_responsable, telephone_responsable, infos_administratives, motif_adhesion,
    } = req.body;
    if (!nom || !wilaya || !telephone || !nom_responsable) {
      throw new ApiError(400, 'Champs obligatoires : nom, wilaya, téléphone, nom du responsable');
    }
    const { rows } = await query(
      `INSERT INTO hospitals
       (nom, wilaya, moughataa, commune, adresse, telephone, email,
        nom_responsable, telephone_responsable, infos_administratives, motif_adhesion,
        status, subscription_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending','pending')
       RETURNING *`,
      [nom, wilaya, moughataa || null, commune || null, adresse || null, telephone,
       email || null, nom_responsable, telephone_responsable || null,
       infos_administratives || null, motif_adhesion || null]
    );
    await logActivity(null, 'hospital_join_request', 'hospital', rows[0].id);
    res.status(201).json({ message: 'Demande envoyée. Elle sera examinée par l’administration.', hospital: rows[0] });
  })
);

// Demande urgente d'une famille → 100 MRU (paiement simulé) puis validation avant diffusion
router.post(
  '/family-request',
  asyncHandler(async (req, res) => {
    const {
      patient_name, blood_group, hospital_id, wilaya, contact, quantity, urgency,
    } = req.body;
    if (!patient_name || !blood_group || !wilaya || !contact || !quantity) {
      throw new ApiError(400, 'Tous les champs essentiels sont requis');
    }
    if (!BLOOD_GROUPS.includes(blood_group)) throw new ApiError(400, 'Groupe sanguin invalide');
    if (!['immediate', 'urgent', 'normal'].includes(urgency)) throw new ApiError(400, 'Niveau d’urgence invalide');

    const trackingCode = makeTrackingCode();
    const { rows } = await query(
      `INSERT INTO blood_requests
       (requester_type, patient_name, family_contact, hospital_id, blood_group, quantity, urgency,
        wilaya, status, contact_number, tracking_code)
       VALUES ('family', $1, $2, $3, $4, $5, $6, $7, 'pending', $2, $8)
       RETURNING *`,
      [patient_name, contact, hospital_id || null, blood_group, Number(quantity), urgency, wilaya, trackingCode]
    );
    const request = rows[0];

    // Paiement simulé : 100 MRU
    const ref = `FAM-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;
    await query(
      `INSERT INTO payments (request_id, amount, type, status, transaction_reference, payment_date)
       VALUES ($1, $2, 'family_request', 'paid', $3, now())`,
      [request.id, PRICES.familyRequest, ref]
    );
    await logActivity(null, 'family_request_created', 'blood_request', request.id);

    res.status(201).json({
      message: 'Demande enregistrée. Paiement de 100 MRU simulé avec succès. Elle sera diffusée après validation.',
      request,
      payment_reference: ref,
      tracking_code: trackingCode,
    });
  })
);

// Liste des hôpitaux actifs (pour le formulaire famille)
router.get(
  '/hospitals',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      "SELECT id, nom, wilaya FROM hospitals WHERE status = 'active' ORDER BY nom"
    );
    res.json(rows);
  })
);

// ---------------------------------------------------------------------------
// Suivi public d'une demande famille (code de suivi, sans compte)
// ---------------------------------------------------------------------------
router.get(
  '/track/:code',
  asyncHandler(async (req, res) => {
    const code = String(req.params.code || '').trim().toUpperCase();
    const { rows } = await query(
      `SELECT r.id, r.blood_group, r.quantity, r.urgency, r.status, r.wilaya, r.created_at, r.closed_at,
              r.tracking_code, h.nom AS hospital_name,
              COUNT(n.id)::int AS notified,
              COUNT(n.id) FILTER (WHERE n.response = 'positive')::int AS positives
       FROM blood_requests r
       LEFT JOIN hospitals h ON h.id = r.hospital_id
       LEFT JOIN notifications n ON n.request_id = r.id
       WHERE r.tracking_code = $1
       GROUP BY r.id, h.nom`,
      [code]
    );
    if (!rows[0]) throw new ApiError(404, 'Aucune demande ne correspond à ce code');
    res.json({ ...rows[0], target: POSITIVE_TARGET });
  })
);

// ---------------------------------------------------------------------------
// Chiffres clés pour la page d'accueil
// ---------------------------------------------------------------------------
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const one = async (sql) => (await query(sql)).rows[0].n;
    const [donors, available, hospitals, covered, active, campaigns] = await Promise.all([
      one('SELECT COUNT(*)::int AS n FROM donors'),
      one('SELECT COUNT(*)::int AS n FROM donors WHERE available = TRUE'),
      one("SELECT COUNT(*)::int AS n FROM hospitals WHERE status = 'active'"),
      one("SELECT COUNT(*)::int AS n FROM blood_requests WHERE status IN ('five_reached','completed')"),
      one("SELECT COUNT(*)::int AS n FROM blood_requests WHERE status = 'active'"),
      one("SELECT COUNT(*)::int AS n FROM campaigns WHERE status = 'active'"),
    ]);
    const funds = await fundSummary();
    res.json({
      donors, available, hospitals, covered, active, campaigns,
      collected: funds.collected, spent: funds.spent, contributions: funds.contributions_count,
    });
  })
);

// ---------------------------------------------------------------------------
// Campagnes (lecture publique)
// ---------------------------------------------------------------------------
router.get(
  '/campaigns',
  asyncHandler(async (req, res) => {
    const status = ['active', 'completed'].includes(req.query.status) ? req.query.status : null;
    const items = await listCampaigns({ status });
    res.json(items.filter((c) => c.status !== 'draft'));
  })
);

router.get(
  '/campaigns/:id',
  asyncHandler(async (req, res) => {
    const [campaign] = await listCampaigns({ id: Number(req.params.id) });
    if (!campaign || campaign.status === 'draft') throw new ApiError(404, 'Campagne introuvable');
    const contributions = (await query(
      `SELECT reference, contributor_name, contributor_type, anonymous, amount, message, paid_at
       FROM contributions WHERE campaign_id = $1 AND status = 'paid' ORDER BY paid_at DESC LIMIT 20`,
      [campaign.id]
    )).rows.map((c) => ({
      contributor: publicName(c),
      contributor_type: c.contributor_type,
      amount: Number(c.amount),
      message: c.message,
      paid_at: c.paid_at,
    }));
    const expenses = (await query(
      `SELECT reference, category, amount, description, spent_at FROM fund_expenses
       WHERE campaign_id = $1 ORDER BY spent_at DESC LIMIT 20`,
      [campaign.id]
    )).rows.map((e) => ({ ...e, amount: Number(e.amount) }));
    res.json({ campaign, contributions, expenses, summary: await fundSummary(campaign.id) });
  })
);

// ---------------------------------------------------------------------------
// Contributions solidaires (paiement simulé — partenaires après accord)
// ---------------------------------------------------------------------------
router.get('/payment-methods', (req, res) => {
  res.json(
    PAYMENT_METHODS.map((id) => ({ id, ...PAYMENT_PROVIDERS[id] }))
  );
});

router.post(
  '/contributions',
  asyncHandler(async (req, res) => {
    const {
      campaign_id, purpose = 'general', contributor_type = 'individual', contributor_name,
      contributor_phone, contributor_email, anonymous = false, amount, payment_method, message,
    } = req.body;

    const value = Math.round(Number(amount) * 100) / 100;
    if (!contributor_name || String(contributor_name).trim().length < 2) throw new ApiError(400, 'Nom du contributeur requis');
    if (!contributor_phone && !contributor_email) throw new ApiError(400, 'Téléphone ou email requis pour le reçu');
    if (!(value >= CONTRIBUTION_LIMITS.min) || value > CONTRIBUTION_LIMITS.max) {
      throw new ApiError(400, `Montant entre ${CONTRIBUTION_LIMITS.min} et ${CONTRIBUTION_LIMITS.max} MRU`);
    }
    if (!PAYMENT_METHODS.includes(payment_method)) throw new ApiError(400, 'Moyen de paiement invalide');
    if (!['general', 'campaign', 'transport', 'sponsoring'].includes(purpose)) throw new ApiError(400, 'Affectation invalide');
    if (!['individual', 'company', 'ngo'].includes(contributor_type)) throw new ApiError(400, 'Type de contributeur invalide');

    let campaignId = null;
    if (campaign_id) {
      const c = await query(`SELECT id, status FROM campaigns WHERE id = $1`, [campaign_id]);
      if (!c.rows[0] || c.rows[0].status !== 'active') throw new ApiError(400, 'Cette campagne n’accepte plus de contributions');
      campaignId = c.rows[0].id;
    }
    if (['campaign', 'sponsoring'].includes(purpose) && !campaignId) {
      throw new ApiError(400, 'Choisissez la campagne à soutenir');
    }

    const reference = makeReference('YN');
    const { rows } = await query(
      `INSERT INTO contributions (reference, campaign_id, purpose, contributor_type, contributor_name,
         contributor_phone, contributor_email, anonymous, amount, payment_method, message, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending') RETURNING id`,
      [reference, campaignId, purpose, contributor_type, String(contributor_name).trim(),
       contributor_phone || null, contributor_email || null, !!anonymous, value, payment_method,
       message ? String(message).slice(0, 280) : null]
    );

    const charge = await chargeSimulated({ method: payment_method, amount: value });
    await query(
      `UPDATE contributions SET status = $1, provider_reference = $2, paid_at = CASE WHEN $1 = 'paid' THEN now() END
       WHERE id = $3`,
      [charge.ok ? 'paid' : 'failed', charge.providerReference || null, rows[0].id]
    );
    await logActivity(null, charge.ok ? 'contribution_paid' : 'contribution_failed', 'contribution', rows[0].id);
    if (!charge.ok) throw new ApiError(402, charge.error || 'Paiement refusé');

    res.status(201).json({
      message: 'Merci pour votre contribution ! Votre reçu est disponible.',
      reference,
      simulated: true,
    });
  })
);

// Reçu public (accessible avec la référence, données personnelles masquées)
router.get(
  '/receipts/:reference',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT k.*, c.title AS campaign_title, c.organizer_name
       FROM contributions k LEFT JOIN campaigns c ON c.id = k.campaign_id
       WHERE k.reference = $1`,
      [String(req.params.reference).trim().toUpperCase()]
    );
    const k = rows[0];
    if (!k) throw new ApiError(404, 'Reçu introuvable');
    const mask = (v) => (v ? v.replace(/.(?=.{3})/g, '•') : null);
    res.json({
      reference: k.reference,
      status: k.status,
      amount: Number(k.amount),
      purpose: k.purpose,
      contributor_name: k.contributor_name,
      contributor_type: k.contributor_type,
      contributor_phone: mask(k.contributor_phone),
      contributor_email: k.contributor_email ? k.contributor_email.replace(/^(.).*(@.*)$/, '$1•••$2') : null,
      anonymous: k.anonymous,
      payment_method: PAYMENT_PROVIDERS[k.payment_method]?.label || k.payment_method,
      provider_reference: k.provider_reference,
      campaign_title: k.campaign_title,
      organizer_name: k.organizer_name,
      created_at: k.created_at,
      paid_at: k.paid_at,
      simulated: true,
    });
  })
);

// Tableau de transparence : sommes collectées et leur utilisation
router.get(
  '/transparency',
  asyncHandler(async (req, res) => {
    const summary = await fundSummary();
    const recentContributions = (await query(
      `SELECT k.contributor_name, k.contributor_type, k.anonymous, k.amount, k.purpose, k.paid_at, c.title AS campaign_title
       FROM contributions k LEFT JOIN campaigns c ON c.id = k.campaign_id
       WHERE k.status = 'paid' ORDER BY k.paid_at DESC LIMIT 12`
    )).rows.map((c) => ({
      contributor: publicName(c), contributor_type: c.contributor_type, amount: Number(c.amount),
      purpose: c.purpose, campaign_title: c.campaign_title, paid_at: c.paid_at,
    }));
    const recentExpenses = (await query(
      `SELECT e.reference, e.category, e.amount, e.description, e.spent_at, c.title AS campaign_title
       FROM fund_expenses e LEFT JOIN campaigns c ON c.id = e.campaign_id
       ORDER BY e.spent_at DESC, e.id DESC LIMIT 12`
    )).rows.map((e) => ({ ...e, amount: Number(e.amount) }));
    const monthly = (await query(
      `SELECT m.month,
         COALESCE((SELECT SUM(amount) FROM contributions WHERE status = 'paid' AND to_char(paid_at, 'YYYY-MM') = m.month), 0)::float AS collected,
         COALESCE((SELECT SUM(amount) FROM fund_expenses WHERE to_char(spent_at, 'YYYY-MM') = m.month), 0)::float AS spent
       FROM (SELECT to_char(generate_series(date_trunc('month', now()) - interval '5 months', date_trunc('month', now()), interval '1 month'), 'YYYY-MM') AS month) m
       ORDER BY m.month`
    )).rows;
    const campaigns = (await listCampaigns()).filter((c) => c.status !== 'draft' && (c.collected > 0 || c.target_amount > 0));
    res.json({ summary, monthly, recentContributions, recentExpenses, campaigns });
  })
);

export default router;