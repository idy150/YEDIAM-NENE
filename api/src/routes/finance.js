import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireRole, logActivity } from '../middleware/auth.js';
import { asyncHandler, ApiError } from '../utils/http.js';
import { makeReference } from '../utils/ref.js';
import { fundSummary, forecastNeeds } from '../services/finance.js';

// Couche FinTech — pilotage financier par le Super Admin.
// Le sang reste gratuit : les fonds financent la logistique, le transport et les campagnes.
const router = Router();
router.use(requireAuth, requireRole('super_admin'));

const CATEGORIES = ['transport', 'collation', 'logistique', 'communication', 'materiel', 'autre'];

router.get(
  '/overview',
  asyncHandler(async (req, res) => {
    const [summary, pendingTransport] = await Promise.all([
      fundSummary(),
      query(`SELECT COUNT(*)::int AS n, COALESCE(SUM(amount),0)::float AS total FROM transport_requests WHERE status = 'pending'`),
    ]);
    res.json({ summary, pending_transport: pendingTransport.rows[0] });
  })
);

router.get(
  '/contributions',
  asyncHandler(async (req, res) => {
    const params = [];
    let where = 'WHERE TRUE';
    if (req.query.status) { params.push(req.query.status); where += ` AND k.status = $${params.length}`; }
    if (req.query.campaign_id) { params.push(req.query.campaign_id); where += ` AND k.campaign_id = $${params.length}`; }
    const { rows } = await query(
      `SELECT k.*, c.title AS campaign_title FROM contributions k
       LEFT JOIN campaigns c ON c.id = k.campaign_id ${where}
       ORDER BY k.created_at DESC LIMIT 300`,
      params
    );
    res.json(rows.map((r) => ({ ...r, amount: Number(r.amount) })));
  })
);

router.get(
  '/expenses',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT e.*, c.title AS campaign_title, u.nom AS recorded_by_name
       FROM fund_expenses e
       LEFT JOIN campaigns c ON c.id = e.campaign_id
       LEFT JOIN users u ON u.id = e.recorded_by
       ORDER BY e.spent_at DESC, e.id DESC LIMIT 300`
    );
    res.json(rows.map((r) => ({ ...r, amount: Number(r.amount) })));
  })
);

async function availableBalance() {
  const s = await fundSummary();
  return s.balance;
}

router.post(
  '/expenses',
  asyncHandler(async (req, res) => {
    const { campaign_id, category, amount, description, beneficiary, spent_at } = req.body;
    const value = Math.round(Number(amount) * 100) / 100;
    if (!CATEGORIES.includes(category)) throw new ApiError(400, 'Catégorie invalide');
    if (!(value > 0)) throw new ApiError(400, 'Montant invalide');
    if (!description || String(description).trim().length < 4) throw new ApiError(400, 'Description requise');
    if (value > (await availableBalance())) throw new ApiError(400, 'Solde insuffisant pour cette dépense');

    const reference = makeReference('DEP');
    const { rows } = await query(
      `INSERT INTO fund_expenses (reference, campaign_id, category, amount, description, beneficiary, spent_at, recorded_by)
       VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7::date, CURRENT_DATE),$8) RETURNING *`,
      [reference, campaign_id || null, category, value, String(description).trim(), beneficiary || null, spent_at || null, req.user.id]
    );
    await logActivity(req.user.id, 'expense_recorded', 'fund_expense', rows[0].id);
    res.status(201).json(rows[0]);
  })
);

router.get(
  '/transport-requests',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT t.*, d.nom AS donor_name, d.blood_group, d.wilaya, d.telephone,
              h.nom AS hospital_name, c.title AS campaign_title
       FROM transport_requests t
       JOIN donors d ON d.id = t.donor_id
       LEFT JOIN blood_requests r ON r.id = t.request_id
       LEFT JOIN hospitals h ON h.id = r.hospital_id
       LEFT JOIN campaigns c ON c.id = t.campaign_id
       ORDER BY (t.status = 'pending') DESC, t.created_at DESC LIMIT 300`
    );
    res.json(rows.map((r) => ({ ...r, amount: Number(r.amount) })));
  })
);

// Décision sur une demande de soutien transport.
// « paid » enregistre automatiquement la dépense correspondante (traçabilité).
router.post(
  '/transport-requests/:id/decision',
  asyncHandler(async (req, res) => {
    const { decision } = req.body;
    if (!['approved', 'refused', 'paid'].includes(decision)) throw new ApiError(400, 'Décision invalide');
    const { rows } = await query(
      `SELECT t.*, d.nom AS donor_name FROM transport_requests t JOIN donors d ON d.id = t.donor_id WHERE t.id = $1`,
      [req.params.id]
    );
    const t = rows[0];
    if (!t) throw new ApiError(404, 'Demande introuvable');
    if (t.status === 'paid' || t.status === 'refused') throw new ApiError(409, 'Demande déjà traitée');

    if (decision === 'paid') {
      const amount = Number(t.amount);
      if (amount > (await availableBalance())) throw new ApiError(400, 'Solde insuffisant');
      await query(
        `INSERT INTO fund_expenses (reference, campaign_id, transport_request_id, category, amount, description, beneficiary, recorded_by)
         VALUES ($1, $2, $3, 'transport', $4, $5, $6, $7)`,
        [makeReference('DEP'), t.campaign_id, t.id, amount, 'Soutien transport donneur', t.donor_name, req.user.id]
      );
    }
    await query(
      `UPDATE transport_requests SET status = $1, decided_by = $2, decided_at = now() WHERE id = $3`,
      [decision, req.user.id, t.id]
    );
    await logActivity(req.user.id, `transport_${decision}`, 'transport_request', t.id);
    res.json({ message: 'Décision enregistrée' });
  })
);

// Prévision des besoins en sang (aide à la décision)
router.get(
  '/forecast',
  asyncHandler(async (req, res) => {
    res.json(await forecastNeeds());
  })
);

export default router;
