import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireRole, logActivity } from '../middleware/auth.js';
import { asyncHandler, ApiError } from '../utils/http.js';
import { BLOOD_GROUPS, PRICES } from '../config.js';
import { notifyMatchingDonors, checkTargetReached } from '../services/notifications.js';

const router = Router();
router.use(requireAuth, requireRole('hospital_admin'));

// L'hôpital de l'admin connecté (séparation stricte des données)
async function getOwnHospital(userId) {
  const { rows } = await query('SELECT * FROM hospitals WHERE user_id = $1', [userId]);
  return rows[0] || null;
}

router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const hospital = await getOwnHospital(req.user.id);
    if (!hospital) throw new ApiError(404, 'Aucun hôpital associé à ce compte');
    const one = async (sql, params = []) => (await query(sql, params)).rows[0].n;

    const [activeRequests, fiveReached, positiveResponses, bloodBanks] = await Promise.all([
      one(`SELECT COUNT(*)::int AS n FROM blood_requests WHERE hospital_id = $1 AND status = 'active'`, [hospital.id]),
      one(`SELECT COUNT(*)::int AS n FROM blood_requests WHERE hospital_id = $1 AND status = 'five_reached'`, [hospital.id]),
      one(`SELECT COUNT(*)::int AS n FROM notifications n JOIN blood_requests r ON r.id = n.request_id
           WHERE r.hospital_id = $1 AND n.response = 'positive'`, [hospital.id]),
      one('SELECT COUNT(*)::int AS n FROM blood_banks WHERE status = $1', ['active']),
    ]);
    const recent = (await query(
      `SELECT r.*, COUNT(n.id) FILTER (WHERE n.response = 'positive')::int AS positives,
              COUNT(n.id) FILTER (WHERE n.response = 'negative')::int AS negatives
       FROM blood_requests r LEFT JOIN notifications n ON n.request_id = r.id
       WHERE r.hospital_id = $1 AND r.requester_type = 'hospital' AND r.status IN ('active','five_reached')
       GROUP BY r.id ORDER BY r.created_at DESC LIMIT 5`,
      [hospital.id]
    )).rows;

    res.json({ hospital, counts: { activeRequests, fiveReached, positiveResponses, bloodBanks }, recent });
  })
);

// Création d'une demande de sang → notification automatique des donneurs compatibles
router.post(
  '/requests',
  asyncHandler(async (req, res) => {
    const hospital = await getOwnHospital(req.user.id);
    if (!hospital) throw new ApiError(404, 'Aucun hôpital associé à ce compte');
    if (hospital.status !== 'active') throw new ApiError(403, 'Votre hôpital n’est pas actif');
    if (hospital.subscription_status !== 'active') throw new ApiError(403, 'Abonnement requis pour créer une demande');

    const { blood_group, quantity, urgency, wilaya, moughataa, service, contact_number, additional_info } = req.body;
    if (!blood_group || !quantity || !urgency) throw new ApiError(400, 'Groupe, quantité et urgence requis');
    if (!BLOOD_GROUPS.includes(blood_group)) throw new ApiError(400, 'Groupe sanguin invalide');

    const { rows } = await query(
      `INSERT INTO blood_requests
       (requester_type, requester_id, hospital_id, blood_group, quantity, urgency, status,
        wilaya, moughataa, service, contact_number, additional_info)
       VALUES ('hospital', $1, $1, $2, $3, $4, 'active', $5, $6, $7, $8, $9) RETURNING *`,
      [hospital.id, blood_group, Number(quantity), urgency,
       wilaya || hospital.wilaya, moughataa || hospital.moughataa, service || null,
       contact_number || hospital.telephone, additional_info || null]
    );
    const result = await notifyMatchingDonors(rows[0].id);
    await logActivity(req.user.id, 'request_created', 'blood_request', rows[0].id);
    res.status(201).json({ request: rows[0], ...result });
  })
);

// Demandes en cours (avec compteurs de réponses)
router.get(
  '/requests',
  asyncHandler(async (req, res) => {
    const hospital = await getOwnHospital(req.user.id);
    if (!hospital) throw new ApiError(404, 'Aucun hôpital associé à ce compte');
    const { status } = req.query;
    const params = [hospital.id];
    let sql = `SELECT r.*,
        COUNT(n.id) FILTER (WHERE n.response = 'positive')::int AS positives,
        COUNT(n.id) FILTER (WHERE n.response = 'negative')::int AS negatives,
        COUNT(n.id)::int AS notified
      FROM blood_requests r LEFT JOIN notifications n ON n.request_id = r.id
      WHERE r.hospital_id = $1 AND r.requester_type = 'hospital'`;
    if (status) { params.push(status); sql += ` AND r.status = $${params.length}`; }
    sql += ' GROUP BY r.id ORDER BY r.created_at DESC LIMIT 200';
    const { rows } = await query(sql, params);
    res.json(rows);
  })
);

// Détail d'une demande + réponses des donneurs
router.get(
  '/requests/:id',
  asyncHandler(async (req, res) => {
    const hospital = await getOwnHospital(req.user.id);
    if (!hospital) throw new ApiError(404, 'Aucun hôpital associé à ce compte');

    const { rows } = await query(
      `SELECT r.*,
        COUNT(n.id) FILTER (WHERE n.response = 'positive')::int AS positives,
        COUNT(n.id)::int AS notified
       FROM blood_requests r LEFT JOIN notifications n ON n.request_id = r.id
       WHERE r.id = $1 AND r.hospital_id = $2 AND r.requester_type = 'hospital' GROUP BY r.id`,
      [req.params.id, hospital.id]
    );
    if (!rows[0]) throw new ApiError(404, 'Demande introuvable');

    const responses = (await query(
      `SELECT n.id, n.response, n.responded_at, n.status AS notification_status,
              d.nom AS donor_name, d.blood_group, d.blood_group AS donor_group, d.wilaya, d.telephone, d.quartier,
              dn.status AS donation_status
       FROM notifications n JOIN donors d ON d.id = n.donor_id
       LEFT JOIN donations dn ON dn.donor_id = n.donor_id AND dn.request_id = n.request_id
       WHERE n.request_id = $1 AND n.response IS NOT NULL
       ORDER BY n.responded_at DESC`,
      [req.params.id]
    )).rows;

    res.json({ request: rows[0], responses });
  })
);

// Arrêt manuel de la demande
router.post(
  '/requests/:id/stop',
  asyncHandler(async (req, res) => {
    const hospital = await getOwnHospital(req.user.id);
    if (!hospital) throw new ApiError(404, 'Aucun hôpital associé à ce compte');
    const { rows } = await query(
      `UPDATE blood_requests SET status = 'cancelled', closed_at = now()
       WHERE id = $1 AND hospital_id = $2 AND requester_type = 'hospital' RETURNING *`,
      [req.params.id, hospital.id]
    );
    if (!rows[0]) throw new ApiError(404, 'Demande introuvable');
    await logActivity(req.user.id, 'request_stopped', 'blood_request', rows[0].id);
    res.json({ message: 'Demande arrêtée' });
  })
);

// Clôturer (marquer comme satisfaite)
router.post(
  '/requests/:id/complete',
  asyncHandler(async (req, res) => {
    const hospital = await getOwnHospital(req.user.id);
    if (!hospital) throw new ApiError(404, 'Aucun hôpital associé à ce compte');
    const { rows } = await query(
      `UPDATE blood_requests SET status = 'completed', closed_at = now()
       WHERE id = $1 AND hospital_id = $2 AND requester_type = 'hospital' RETURNING *`,
      [req.params.id, hospital.id]
    );
    if (!rows[0]) throw new ApiError(404, 'Demande introuvable');
    await logActivity(req.user.id, 'request_completed', 'blood_request', rows[0].id);
    res.json({ message: 'Demande clôturée' });
  })
);

// Confirmation du don par l'hôpital (don réalisé ou donneur absent).
// Le dernier don du donneur n'est mis à jour qu'une fois le don réellement effectué.
router.post(
  '/notifications/:id/donation',
  asyncHandler(async (req, res) => {
    const hospital = await getOwnHospital(req.user.id);
    if (!hospital) throw new ApiError(404, 'Aucun hôpital associé à ce compte');
    const { outcome } = req.body;
    if (!['completed', 'cancelled'].includes(outcome)) throw new ApiError(400, 'Résultat invalide');

    const { rows } = await query(
      `SELECT n.donor_id, n.request_id, r.blood_group FROM notifications n
       JOIN blood_requests r ON r.id = n.request_id
       WHERE n.id = $1 AND r.hospital_id = $2 AND n.response = 'positive'`,
      [req.params.id, hospital.id]
    );
    if (!rows[0]) throw new ApiError(404, 'Réponse introuvable');
    const { donor_id, request_id, blood_group } = rows[0];

    const upd = await query(
      `UPDATE donations SET status = $1, confirmed_at = now(), donation_date = CURRENT_DATE
       WHERE donor_id = $2 AND request_id = $3 RETURNING id`,
      [outcome, donor_id, request_id]
    );
    if (!upd.rowCount) {
      await query(
        `INSERT INTO donations (donor_id, hospital_id, request_id, blood_group, status, confirmed_at)
         VALUES ($1, $2, $3, $4, $5, now())`,
        [donor_id, hospital.id, request_id, blood_group, outcome]
      );
    }
    if (outcome === 'completed') {
      await query('UPDATE donors SET last_donation_date = CURRENT_DATE WHERE id = $1', [donor_id]);
    }
    await logActivity(req.user.id, outcome === 'completed' ? 'donation_confirmed' : 'donation_no_show', 'blood_request', request_id);
    res.json({ message: outcome === 'completed' ? 'Don confirmé. Merci au donneur !' : 'Absence enregistrée.' });
  })
);

// Toutes les réponses positives reçues par l'hôpital
router.get(
  '/responses',
  asyncHandler(async (req, res) => {
    const hospital = await getOwnHospital(req.user.id);
    if (!hospital) throw new ApiError(404, 'Aucun hôpital associé à ce compte');
    const { rows } = await query(
      `SELECT n.id, n.response, n.responded_at, r.blood_group, r.quantity, r.urgency, r.id AS request_id,
              d.nom AS donor_name, d.telephone, d.wilaya, d.blood_group AS donor_group,
              dn.status AS donation_status
       FROM notifications n
       JOIN blood_requests r ON r.id = n.request_id
       JOIN donors d ON d.id = n.donor_id
       LEFT JOIN donations dn ON dn.donor_id = n.donor_id AND dn.request_id = n.request_id
       WHERE r.hospital_id = $1 AND r.requester_type = 'hospital' AND n.response = 'positive'
       ORDER BY n.responded_at DESC LIMIT 200`,
      [hospital.id]
    );
    res.json(rows);
  })
);

// Banques de sang disponibles
router.get(
  '/blood-banks',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT b.*, json_agg(json_build_object('blood_group', s.blood_group, 'quantity', s.quantity)) AS stocks
       FROM blood_banks b LEFT JOIN blood_stocks s ON s.blood_bank_id = b.id
       WHERE b.status = 'active'
       GROUP BY b.id ORDER BY b.nom`
    );
    res.json(rows);
  })
);

// Donneurs ayant répondu aux demandes de cet hôpital (menu « Utilisateurs »)
router.get(
  '/users',
  asyncHandler(async (req, res) => {
    const hospital = await getOwnHospital(req.user.id);
    if (!hospital) throw new ApiError(404, 'Aucun hôpital associé à ce compte');
    const { rows } = await query(
      `SELECT DISTINCT d.id, d.nom, d.telephone, d.blood_group, d.wilaya, d.quartier, d.available,
              MAX(n.responded_at) AS last_response
       FROM notifications n
       JOIN blood_requests r ON r.id = n.request_id
       JOIN donors d ON d.id = n.donor_id
       WHERE r.hospital_id = $1 AND r.requester_type = 'hospital'
       GROUP BY d.id ORDER BY last_response DESC LIMIT 200`,
      [hospital.id]
    );
    res.json(rows);
  })
);

// Historique des demandes closes
router.get(
  '/history',
  asyncHandler(async (req, res) => {
    const hospital = await getOwnHospital(req.user.id);
    if (!hospital) throw new ApiError(404, 'Aucun hôpital associé à ce compte');
    const { rows } = await query(
      `SELECT r.*, COUNT(n.id) FILTER (WHERE n.response = 'positive')::int AS positives
       FROM blood_requests r LEFT JOIN notifications n ON n.request_id = r.id
       WHERE r.hospital_id = $1 AND r.requester_type = 'hospital' AND r.status IN ('completed','cancelled','five_reached','refused')
       GROUP BY r.id ORDER BY r.closed_at DESC NULLS LAST LIMIT 200`,
      [hospital.id]
    );
    res.json(rows);
  })
);

// Abonnement de l'hôpital
router.get(
  '/subscription',
  asyncHandler(async (req, res) => {
    const hospital = await getOwnHospital(req.user.id);
    if (!hospital) throw new ApiError(404, 'Aucun hôpital associé à ce compte');
    const subscriptions = (await query(
      `SELECT * FROM subscriptions WHERE hospital_id = $1 ORDER BY created_at DESC LIMIT 10`,
      [hospital.id]
    )).rows;
    const payments = (await query(
      `SELECT * FROM payments WHERE hospital_id = $1 ORDER BY payment_date DESC NULLS LAST LIMIT 10`,
      [hospital.id]
    )).rows;
    res.json({ hospital, subscriptions, payments });
  })
);

// Renouvellement simulé de l'abonnement (1 000 MRU)
router.post(
  '/subscribe',
  asyncHandler(async (req, res) => {
    const hospital = await getOwnHospital(req.user.id);
    if (!hospital) throw new ApiError(404, 'Aucun hôpital associé à ce compte');

    const ref = `SUB-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;
    const { rows } = await query(
      `INSERT INTO subscriptions (hospital_id, amount, start_date, end_date, status)
       VALUES ($1, $2, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 month', 'active') RETURNING *`,
      [hospital.id, PRICES.hospitalSubscription]
    );
    await query(
      `INSERT INTO payments (user_id, hospital_id, amount, type, status, transaction_reference, payment_date)
       VALUES ($1, $2, $3, 'subscription', 'paid', $4, now())`,
      [req.user.id, hospital.id, PRICES.hospitalSubscription, ref]
    );
    await query(`UPDATE hospitals SET subscription_status = 'active' WHERE id = $1`, [hospital.id]);
    await logActivity(req.user.id, 'subscription_renewed', 'hospital', hospital.id);

    res.json({ message: 'Abonnement renouvelé (1 000 MRU, paiement simulé).', subscription: rows[0] });
  })
);

// Profil de l'hôpital
router.put(
  '/profile',
  asyncHandler(async (req, res) => {
    const hospital = await getOwnHospital(req.user.id);
    if (!hospital) throw new ApiError(404, 'Aucun hôpital associé à ce compte');
    const { adresse, telephone, email, nom_responsable, telephone_responsable } = req.body;
    const { rows } = await query(
      `UPDATE hospitals SET adresse = COALESCE($1, adresse), telephone = COALESCE($2, telephone),
        email = COALESCE($3, email), nom_responsable = COALESCE($4, nom_responsable),
        telephone_responsable = COALESCE($5, telephone_responsable)
       WHERE id = $6 RETURNING *`,
      [adresse, telephone, email, nom_responsable, telephone_responsable, hospital.id]
    );
    await logActivity(req.user.id, 'hospital_profile_updated', 'hospital', hospital.id);
    res.json(rows[0]);
  })
);

export default router;