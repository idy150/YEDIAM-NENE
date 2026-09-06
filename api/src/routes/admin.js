import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { requireAuth, requireRole, logActivity } from '../middleware/auth.js';
import { asyncHandler, ApiError } from '../utils/http.js';
import { PRICES, BLOOD_GROUPS } from '../config.js';
import { notifyMatchingDonors, checkTargetReached, relaunchRequest } from '../services/notifications.js';

const router = Router();
router.use(requireAuth, requireRole('super_admin'));

const tempPassword = () =>
  Math.random().toString(36).slice(2, 8) + Math.floor(Math.random() * 90 + 10);

// ---------- Dashboard ----------
router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const one = async (sql, params = []) => (await query(sql, params)).rows[0].n;
    const [
      donors, hospitals, bloodBanks, activeRequests, completedRequests,
      urgentRequests, subscriptionsActive, revenue,
    ] = await Promise.all([
      one('SELECT COUNT(*)::int AS n FROM donors'),
      one('SELECT COUNT(*)::int AS n FROM hospitals'),
      one('SELECT COUNT(*)::int AS n FROM blood_banks'),
      one("SELECT COUNT(*)::int AS n FROM blood_requests WHERE status IN ('active','pending')"),
      one("SELECT COUNT(*)::int AS n FROM blood_requests WHERE status IN ('completed','five_reached')"),
      one("SELECT COUNT(*)::int AS n FROM blood_requests WHERE urgency = 'immediate' AND status IN ('active','pending')"),
      one("SELECT COUNT(*)::int AS n FROM subscriptions WHERE status = 'active'"),
      one("SELECT COALESCE(SUM(amount),0)::float AS n FROM payments WHERE status = 'paid'"),
    ]);
    res.json({ donors, hospitals, bloodBanks, activeRequests, completedRequests, urgentRequests, subscriptionsActive, revenue });
  })
);

// ---------- Hôpitaux ----------
router.get(
  '/hospitals',
  asyncHandler(async (req, res) => {
    const { status, q } = req.query;
    const params = [];
    let sql = `SELECT h.*, u.email AS admin_email FROM hospitals h
               LEFT JOIN users u ON u.id = h.user_id WHERE 1=1`;
    if (status) { params.push(status); sql += ` AND h.status = $${params.length}`; }
    if (q) { params.push(`%${q}%`); sql += ` AND (h.nom ILIKE $${params.length} OR h.wilaya ILIKE $${params.length})`; }
    sql += ' ORDER BY h.created_at DESC LIMIT 200';
    const { rows } = await query(sql, params);
    res.json(rows);
  })
);

// Approbation d'une adhésion : crée le compte admin hôpital + abonnement + paiement simulé
router.post(
  '/hospitals/:id/approve',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { rows } = await query('SELECT * FROM hospitals WHERE id = $1', [id]);
    const hospital = rows[0];
    if (!hospital) throw new ApiError(404, 'Hôpital introuvable');
    if (hospital.status !== 'pending') throw new ApiError(400, 'Seule une demande en attente peut être approuvée');

    const slug = hospital.nom.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 24) || 'hopital';
    const email = req.body.email || `admin.${slug}@yediam.mr`;
    const password = req.body.password || tempPassword();

    const existing = await query('SELECT 1 FROM users WHERE email = $1', [email]);
    if (existing.rowCount > 0) throw new ApiError(409, 'Cet email administrateur existe déjà');

    const hash = await bcrypt.hash(password, 10);
    const { rows: userRows } = await query(
      `INSERT INTO users (nom, email, telephone, password_hash, role, status)
       VALUES ($1, $2, $3, $4, 'hospital_admin', 'active') RETURNING *`,
      [hospital.nom_responsable || hospital.nom, email, hospital.telephone_responsable || hospital.telephone, hash]
    );
    const admin = userRows[0];

    await query(`UPDATE hospitals SET status = 'active', user_id = $1, subscription_status = 'active' WHERE id = $2`,
      [admin.id, id]);

    // Abonnement : 1 000 MRU / mois (paiement simulé)
    const { rows: subRows } = await query(
      `INSERT INTO subscriptions (hospital_id, amount, start_date, end_date, status)
       VALUES ($1, $2, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 month', 'active') RETURNING *`,
      [id, PRICES.hospitalSubscription]
    );
    const ref = `SUB-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;
    await query(
      `INSERT INTO payments (user_id, hospital_id, amount, type, status, transaction_reference, payment_date)
       VALUES ($1, $2, $3, 'subscription', 'paid', $4, now())`,
      [req.user.id, id, PRICES.hospitalSubscription, ref]
    );
    await logActivity(req.user.id, 'hospital_approved', 'hospital', id);

    res.json({
      message: 'Hôpital approuvé. Compte administrateur créé.',
      admin: { email, password },
      subscription: subRows[0],
    });
  })
);

router.post(
  '/hospitals/:id/refuse',
  asyncHandler(async (req, res) => {
    await query(`UPDATE hospitals SET status = 'refused' WHERE id = $1`, [req.params.id]);
    await logActivity(req.user.id, 'hospital_refused', 'hospital', Number(req.params.id));
    res.json({ message: 'Demande refusée' });
  })
);

router.post(
  '/hospitals/:id/suspend',
  asyncHandler(async (req, res) => {
    await query(`UPDATE hospitals SET status = 'suspended', subscription_status = 'suspended' WHERE id = $1`, [req.params.id]);
    await logActivity(req.user.id, 'hospital_suspended', 'hospital', Number(req.params.id));
    res.json({ message: 'Hôpital suspendu' });
  })
);

router.post(
  '/hospitals/:id/reactivate',
  asyncHandler(async (req, res) => {
    await query(`UPDATE hospitals SET status = 'active' WHERE id = $1`, [req.params.id]);
    await logActivity(req.user.id, 'hospital_reactivated', 'hospital', Number(req.params.id));
    res.json({ message: 'Hôpital réactivé' });
  })
);

router.put(
  '/hospitals/:id',
  asyncHandler(async (req, res) => {
    const { nom, wilaya, moughataa, commune, adresse, telephone, email, nom_responsable, telephone_responsable } = req.body;
    const { rows } = await query(
      `UPDATE hospitals SET nom = COALESCE($1, nom), wilaya = COALESCE($2, wilaya),
        moughataa = COALESCE($3, moughataa), commune = COALESCE($4, commune),
        adresse = COALESCE($5, adresse), telephone = COALESCE($6, telephone),
        email = COALESCE($7, email), nom_responsable = COALESCE($8, nom_responsable),
        telephone_responsable = COALESCE($9, telephone_responsable)
       WHERE id = $10 RETURNING *`,
      [nom, wilaya, moughataa, commune, adresse, telephone, email, nom_responsable, telephone_responsable, req.params.id]
    );
    await logActivity(req.user.id, 'hospital_updated', 'hospital', Number(req.params.id));
    res.json(rows[0]);
  })
);

// ---------- Donneurs ----------
router.get(
  '/donors',
  asyncHandler(async (req, res) => {
    const { blood_group, wilaya, q, available } = req.query;
    const params = [];
    let sql = `SELECT d.*, u.status AS user_status FROM donors d
               LEFT JOIN users u ON u.id = d.user_id WHERE 1=1`;
    if (blood_group) { params.push(blood_group); sql += ` AND d.blood_group = $${params.length}`; }
    if (wilaya) { params.push(wilaya); sql += ` AND d.wilaya = $${params.length}`; }
    if (q) { params.push(`%${q}%`); sql += ` AND (d.nom ILIKE $${params.length} OR d.telephone ILIKE $${params.length})`; }
    if (available === 'true') sql += ' AND d.available = TRUE';
    if (available === 'false') sql += ' AND d.available = FALSE';
    sql += ' ORDER BY d.id DESC LIMIT 300';
    const { rows } = await query(sql, params);
    res.json(rows);
  })
);

// Ajout manuel d'un donneur (avec ou sans compte)
router.post(
  '/donors',
  asyncHandler(async (req, res) => {
    const { nom, telephone, email, blood_group, wilaya, moughataa, quartier, available, password } = req.body;
    if (!nom || !blood_group || !wilaya) throw new ApiError(400, 'Nom, groupe sanguin et wilaya requis');
    if (!BLOOD_GROUPS.includes(blood_group)) throw new ApiError(400, 'Groupe sanguin invalide');

    let user_id = null;
    if (email || password) {
      const hash = await bcrypt.hash(password || tempPassword(), 10);
      const { rows } = await query(
        `INSERT INTO users (nom, email, telephone, password_hash, role, status)
         VALUES ($1, $2, $3, $4, 'donor', 'active') RETURNING *`,
        [nom, email || null, telephone || null, hash]
      );
      user_id = rows[0].id;
    }
    const { rows } = await query(
      `INSERT INTO donors (user_id, nom, telephone, email, blood_group, wilaya, moughataa, quartier, available)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [user_id, nom, telephone || null, email || null, blood_group, wilaya, moughataa || null, quartier || null, available !== false]
    );
    await logActivity(req.user.id, 'donor_created_manually', 'donor', rows[0].id);
    res.status(201).json(rows[0]);
  })
);

router.put(
  '/donors/:id',
  asyncHandler(async (req, res) => {
    const { nom, telephone, email, blood_group, wilaya, moughataa, quartier, available, last_donation_date } = req.body;
    const { rows } = await query(
      `UPDATE donors SET nom = COALESCE($1, nom), telephone = COALESCE($2, telephone),
        email = COALESCE($3, email), blood_group = COALESCE($4, blood_group),
        wilaya = COALESCE($5, wilaya), moughataa = COALESCE($6, moughataa),
        quartier = COALESCE($7, quartier), available = COALESCE($8, available),
        last_donation_date = COALESCE($9, last_donation_date)
       WHERE id = $10 RETURNING *`,
      [nom, telephone, email, blood_group, wilaya, moughataa, quartier, available, last_donation_date, req.params.id]
    );
    await logActivity(req.user.id, 'donor_updated', 'donor', Number(req.params.id));
    res.json(rows[0]);
  })
);

router.post(
  '/donors/:id/suspend',
  asyncHandler(async (req, res) => {
    const { rows } = await query('SELECT user_id FROM donors WHERE id = $1', [req.params.id]);
    if (rows[0]?.user_id) await query('UPDATE users SET status = $1 WHERE id = $2', ['suspended', rows[0].user_id]);
    await query('UPDATE donors SET available = FALSE WHERE id = $1', [req.params.id]);
    await logActivity(req.user.id, 'donor_suspended', 'donor', Number(req.params.id));
    res.json({ message: 'Donneur suspendu' });
  })
);

router.post(
  '/donors/:id/reactivate',
  asyncHandler(async (req, res) => {
    const { rows } = await query('SELECT user_id FROM donors WHERE id = $1', [req.params.id]);
    if (rows[0]?.user_id) await query('UPDATE users SET status = $1 WHERE id = $2', ['active', rows[0].user_id]);
    await query('UPDATE donors SET available = TRUE WHERE id = $1', [req.params.id]);
    await logActivity(req.user.id, 'donor_reactivated', 'donor', Number(req.params.id));
    res.json({ message: 'Donneur réactivé' });
  })
);

// ---------- Demandes ----------
router.get(
  '/requests',
  asyncHandler(async (req, res) => {
    const { status, blood_group, hospital_id, wilaya, urgency } = req.query;
    const params = [];
    let sql = `SELECT r.*, h.nom AS hospital_name FROM blood_requests r
               LEFT JOIN hospitals h ON h.id = r.hospital_id WHERE 1=1`;
    if (status) { params.push(status); sql += ` AND r.status = $${params.length}`; }
    if (blood_group) { params.push(blood_group); sql += ` AND r.blood_group = $${params.length}`; }
    if (hospital_id) { params.push(hospital_id); sql += ` AND r.hospital_id = $${params.length}`; }
    if (wilaya) { params.push(wilaya); sql += ` AND r.wilaya = $${params.length}`; }
    if (urgency) { params.push(urgency); sql += ` AND r.urgency = $${params.length}`; }
    sql += ' ORDER BY r.created_at DESC LIMIT 300';
    const { rows } = await query(sql, params);
    res.json(rows);
  })
);

// Diffusion d'une demande famille validée
router.post(
  '/requests/:id/approve',
  asyncHandler(async (req, res) => {
    const { rows } = await query('SELECT * FROM blood_requests WHERE id = $1', [req.params.id]);
    const request = rows[0];
    if (!request) throw new ApiError(404, 'Demande introuvable');
    if (request.status !== 'pending') throw new ApiError(400, 'Seule une demande en attente peut être diffusée');
    await query(`UPDATE blood_requests SET status = 'active' WHERE id = $1`, [request.id]);
    const result = await notifyMatchingDonors(request.id);
    await logActivity(req.user.id, 'request_approved', 'blood_request', request.id);
    res.json({ message: 'Demande diffusée', ...result });
  })
);

router.post(
  '/requests/:id/refuse',
  asyncHandler(async (req, res) => {
    await query(`UPDATE blood_requests SET status = 'refused', closed_at = now() WHERE id = $1`, [req.params.id]);
    await logActivity(req.user.id, 'request_refused', 'blood_request', Number(req.params.id));
    res.json({ message: 'Demande refusée' });
  })
);

// Arrêt manuel d'une campagne de notification
router.post(
  '/requests/:id/stop',
  asyncHandler(async (req, res) => {
    await query(`UPDATE blood_requests SET status = 'cancelled', closed_at = now() WHERE id = $1`, [req.params.id]);
    await logActivity(req.user.id, 'request_stopped', 'blood_request', Number(req.params.id));
    res.json({ message: 'Demande arrêtée' });
  })
);

router.post(
  '/requests/:id/relaunch',
  asyncHandler(async (req, res) => {
    const result = await relaunchRequest(Number(req.params.id));
    await logActivity(req.user.id, 'request_relaunched', 'blood_request', Number(req.params.id));
    res.json({ message: 'Donneurs relancés', ...result });
  })
);

// Le Super Admin peut lancer lui-même une demande urgente
router.post(
  '/launch-request',
  asyncHandler(async (req, res) => {
    const { hospital_id, blood_group, quantity, urgency, wilaya, service, additional_info } = req.body;
    if (!hospital_id || !blood_group || !quantity) throw new ApiError(400, 'Hôpital, groupe sanguin et quantité requis');
    if (!BLOOD_GROUPS.includes(blood_group)) throw new ApiError(400, 'Groupe sanguin invalide');

    const { rows: hosRows } = await query('SELECT * FROM hospitals WHERE id = $1', [hospital_id]);
    if (!hosRows[0]) throw new ApiError(404, 'Hôpital introuvable');

    const { rows } = await query(
      `INSERT INTO blood_requests (requester_type, requester_id, hospital_id, blood_group, quantity,
        urgency, status, wilaya, service, additional_info, contact_number)
       VALUES ('hospital', $1, $1, $2, $3, $4, 'active', $5, $6, $7, $8) RETURNING *`,
      [hospital_id, blood_group, Number(quantity), urgency || 'urgent', wilaya || hosRows[0].wilaya, service || null, additional_info || null, hosRows[0].telephone]
    );
    const result = await notifyMatchingDonors(rows[0].id);
    await logActivity(req.user.id, 'request_launched', 'blood_request', rows[0].id);
    res.status(201).json({ request: rows[0], ...result });
  })
);

// ---------- Paiements & Abonnements ----------
router.get(
  '/payments',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT p.*, h.nom AS hospital_name, r.patient_name
       FROM payments p
       LEFT JOIN hospitals h ON h.id = p.hospital_id
       LEFT JOIN blood_requests r ON r.id = p.request_id
       ORDER BY p.payment_date DESC NULLS LAST LIMIT 200`
    );
    res.json(rows);
  })
);

router.get(
  '/subscriptions',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT s.*, h.nom AS hospital_name FROM subscriptions s
       JOIN hospitals h ON h.id = s.hospital_id
       ORDER BY s.created_at DESC LIMIT 200`
    );
    res.json(rows);
  })
);

// ---------- Statistiques ----------
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const donorsPerMonth = (await query(
      `SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month, COUNT(*)::int AS n
       FROM donors GROUP BY 1 ORDER BY 1`
    )).rows;
    const requestsPerMonth = (await query(
      `SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month, COUNT(*)::int AS n
       FROM blood_requests GROUP BY 1 ORDER BY 1`
    )).rows;
    const topBloodGroups = (await query(
      `SELECT blood_group, COUNT(*)::int AS n FROM blood_requests GROUP BY 1 ORDER BY n DESC`
    )).rows;
    const byWilaya = (await query(
      `SELECT wilaya, COUNT(*)::int AS n FROM blood_requests WHERE wilaya IS NOT NULL GROUP BY 1 ORDER BY n DESC`
    )).rows;
    const satisfied = (await query(
      `SELECT COUNT(*)::int AS n FROM blood_requests WHERE status IN ('completed','five_reached')`
    )).rows[0].n;
    const unsatisfied = (await query(
      `SELECT COUNT(*)::int AS n FROM blood_requests WHERE status IN ('cancelled','refused')`
    )).rows[0].n;
    const donorsByGroup = (await query(
      `SELECT blood_group, COUNT(*)::int AS n FROM donors GROUP BY 1 ORDER BY 1`
    )).rows;
    res.json({ donorsPerMonth, requestsPerMonth, topBloodGroups, byWilaya, satisfied, unsatisfied, donorsByGroup });
  })
);

// ---------- Journaux d'activité ----------
router.get(
  '/activity-logs',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT l.*, u.nom AS user_name FROM activity_logs l
       LEFT JOIN users u ON u.id = l.user_id
       ORDER BY l.created_at DESC LIMIT 200`
    );
    res.json(rows);
  })
);

export default router;