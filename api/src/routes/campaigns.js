import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireRole, logActivity } from '../middleware/auth.js';
import { asyncHandler, ApiError } from '../utils/http.js';
import { BLOOD_GROUPS } from '../config.js';
import { listCampaigns } from '../services/finance.js';

// Campagnes de don et de sensibilisation.
// Organisateurs : Super Admin, hôpitaux, banques de sang. Participants : donneurs.
const router = Router();
router.use(requireAuth);

const ORGANIZER_ROLES = ['super_admin', 'hospital_admin', 'blood_bank_admin'];

// Identité de l'organisateur selon le rôle de l'utilisateur connecté
async function organizerOf(user) {
  if (user.role === 'super_admin') return { type: 'admin', id: null, name: 'YEDIAM NENE' };
  if (user.role === 'hospital_admin') {
    const { rows } = await query('SELECT id, nom, status FROM hospitals WHERE user_id = $1', [user.id]);
    if (!rows[0]) throw new ApiError(404, 'Aucun hôpital associé à ce compte');
    if (rows[0].status !== 'active') throw new ApiError(403, 'Votre hôpital n’est pas actif');
    return { type: 'hospital', id: rows[0].id, name: rows[0].nom };
  }
  if (user.role === 'blood_bank_admin') {
    const { rows } = await query('SELECT id, nom FROM blood_banks WHERE user_id = $1', [user.id]);
    if (!rows[0]) throw new ApiError(404, 'Aucune banque de sang associée à ce compte');
    return { type: 'blood_bank', id: rows[0].id, name: rows[0].nom };
  }
  throw new ApiError(403, 'Accès refusé pour ce rôle');
}

// L'organisateur peut gérer sa campagne ; le Super Admin peut tout gérer
async function loadManageable(user, id) {
  const { rows } = await query('SELECT * FROM campaigns WHERE id = $1', [id]);
  const c = rows[0];
  if (!c) throw new ApiError(404, 'Campagne introuvable');
  if (user.role === 'super_admin') return c;
  const org = await organizerOf(user);
  if (c.organizer_type !== org.type || c.organizer_id !== org.id) throw new ApiError(403, 'Campagne d’un autre organisateur');
  return c;
}

function validate(body, partial = false) {
  const out = {};
  const { title, description, type, wilaya, location, start_date, end_date, target_donors, target_amount, target_groups } = body;
  if (!partial || title !== undefined) {
    if (!title || String(title).trim().length < 4) throw new ApiError(400, 'Titre requis (4 caractères minimum)');
    out.title = String(title).trim();
  }
  if (type !== undefined) {
    if (!['collecte', 'sensibilisation'].includes(type)) throw new ApiError(400, 'Type invalide');
    out.type = type;
  }
  if (!partial || start_date !== undefined || end_date !== undefined) {
    if (!start_date || !end_date) throw new ApiError(400, 'Dates de début et de fin requises');
    if (new Date(end_date) < new Date(start_date)) throw new ApiError(400, 'La date de fin précède la date de début');
    out.start_date = start_date;
    out.end_date = end_date;
  }
  if (target_groups !== undefined) {
    const groups = Array.isArray(target_groups) ? target_groups.filter((g) => BLOOD_GROUPS.includes(g)) : [];
    out.target_groups = groups.length ? groups : null;
  }
  if (target_donors !== undefined) out.target_donors = Math.max(0, parseInt(target_donors, 10) || 0);
  if (target_amount !== undefined) out.target_amount = Math.max(0, Number(target_amount) || 0);
  if (description !== undefined) out.description = description || null;
  if (wilaya !== undefined) out.wilaya = wilaya || null;
  if (location !== undefined) out.location = location || null;
  return out;
}

// Campagnes gérées par l'utilisateur connecté
router.get(
  '/mine',
  requireRole(...ORGANIZER_ROLES),
  asyncHandler(async (req, res) => {
    if (req.user.role === 'super_admin') return res.json(await listCampaigns());
    const org = await organizerOf(req.user);
    res.json(await listCampaigns({ organizerType: org.type, organizerId: org.id }));
  })
);

router.post(
  '/',
  requireRole(...ORGANIZER_ROLES),
  asyncHandler(async (req, res) => {
    const org = await organizerOf(req.user);
    const v = validate(req.body);
    const { rows } = await query(
      `INSERT INTO campaigns (title, description, type, wilaya, location, start_date, end_date,
         organizer_type, organizer_id, organizer_name, target_donors, target_amount, target_groups, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'active',$14) RETURNING *`,
      [v.title, v.description ?? null, v.type || 'collecte', v.wilaya ?? null, v.location ?? null,
       v.start_date, v.end_date, org.type, org.id, org.name, v.target_donors || 0, v.target_amount || 0,
       v.target_groups ?? null, req.user.id]
    );
    await logActivity(req.user.id, 'campaign_created', 'campaign', rows[0].id);
    res.status(201).json(rows[0]);
  })
);

router.put(
  '/:id',
  requireRole(...ORGANIZER_ROLES),
  asyncHandler(async (req, res) => {
    const c = await loadManageable(req.user, req.params.id);
    const v = validate(req.body, true);
    const keys = Object.keys(v);
    if (!keys.length) return res.json(c);
    const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    const { rows } = await query(
      `UPDATE campaigns SET ${sets} WHERE id = $${keys.length + 1} RETURNING *`,
      [...keys.map((k) => v[k]), c.id]
    );
    await logActivity(req.user.id, 'campaign_updated', 'campaign', c.id);
    res.json(rows[0]);
  })
);

router.post(
  '/:id/status',
  requireRole(...ORGANIZER_ROLES),
  asyncHandler(async (req, res) => {
    const c = await loadManageable(req.user, req.params.id);
    const { status } = req.body;
    if (!['active', 'completed', 'cancelled'].includes(status)) throw new ApiError(400, 'Statut invalide');
    await query('UPDATE campaigns SET status = $1 WHERE id = $2', [status, c.id]);
    await logActivity(req.user.id, `campaign_${status}`, 'campaign', c.id);
    res.json({ message: 'Statut mis à jour' });
  })
);

// Participants d'une campagne (organisateur)
router.get(
  '/:id/participants',
  requireRole(...ORGANIZER_ROLES),
  asyncHandler(async (req, res) => {
    const c = await loadManageable(req.user, req.params.id);
    const { rows } = await query(
      `SELECT p.id, p.status, p.created_at, d.nom, d.blood_group, d.wilaya, d.telephone
       FROM campaign_participants p JOIN donors d ON d.id = p.donor_id
       WHERE p.campaign_id = $1 ORDER BY p.created_at DESC`,
      [c.id]
    );
    res.json(rows);
  })
);

// Marquer un participant comme ayant donné
router.post(
  '/:id/participants/:pid/donated',
  requireRole(...ORGANIZER_ROLES),
  asyncHandler(async (req, res) => {
    const c = await loadManageable(req.user, req.params.id);
    const { rows } = await query(
      `UPDATE campaign_participants SET status = 'donated' WHERE id = $1 AND campaign_id = $2 RETURNING donor_id`,
      [req.params.pid, c.id]
    );
    if (!rows[0]) throw new ApiError(404, 'Participant introuvable');
    await query(
      `INSERT INTO donations (donor_id, hospital_id, blood_bank_id, blood_group, status, confirmed_at)
       SELECT d.id, $2, $3, d.blood_group, 'completed', now() FROM donors d WHERE d.id = $1`,
      [rows[0].donor_id, c.organizer_type === 'hospital' ? c.organizer_id : null, c.organizer_type === 'blood_bank' ? c.organizer_id : null]
    );
    await query('UPDATE donors SET last_donation_date = CURRENT_DATE WHERE id = $1', [rows[0].donor_id]);
    await logActivity(req.user.id, 'campaign_donation_confirmed', 'campaign', c.id);
    res.json({ message: 'Don enregistré' });
  })
);

// ---------------------------------------------------------------------------
// Donneur : s'inscrire / se désinscrire d'une collecte
// ---------------------------------------------------------------------------
async function ownDonor(userId) {
  const { rows } = await query('SELECT * FROM donors WHERE user_id = $1', [userId]);
  if (!rows[0]) throw new ApiError(404, 'Profil donneur introuvable');
  return rows[0];
}

router.get(
  '/donor/joined',
  requireRole('donor'),
  asyncHandler(async (req, res) => {
    const donor = await ownDonor(req.user.id);
    const { rows } = await query(
      `SELECT campaign_id, status FROM campaign_participants WHERE donor_id = $1 AND status <> 'cancelled'`,
      [donor.id]
    );
    res.json(rows);
  })
);

router.post(
  '/:id/join',
  requireRole('donor'),
  asyncHandler(async (req, res) => {
    const donor = await ownDonor(req.user.id);
    const { rows } = await query('SELECT * FROM campaigns WHERE id = $1', [req.params.id]);
    const c = rows[0];
    if (!c || c.status !== 'active') throw new ApiError(400, 'Campagne fermée');
    if (c.type !== 'collecte') throw new ApiError(400, 'Cette campagne de sensibilisation ne nécessite pas d’inscription');
    await query(
      `INSERT INTO campaign_participants (campaign_id, donor_id) VALUES ($1, $2)
       ON CONFLICT (campaign_id, donor_id) DO UPDATE SET status = 'registered'
       WHERE campaign_participants.status = 'cancelled'`,
      [c.id, donor.id]
    );
    await logActivity(req.user.id, 'campaign_joined', 'campaign', c.id);
    res.json({ message: 'Inscription confirmée. Merci !' });
  })
);

router.post(
  '/:id/leave',
  requireRole('donor'),
  asyncHandler(async (req, res) => {
    const donor = await ownDonor(req.user.id);
    await query(
      `UPDATE campaign_participants SET status = 'cancelled'
       WHERE campaign_id = $1 AND donor_id = $2 AND status = 'registered'`,
      [req.params.id, donor.id]
    );
    res.json({ message: 'Inscription annulée' });
  })
);

export default router;
