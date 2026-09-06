import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireRole, logActivity } from '../middleware/auth.js';
import { asyncHandler, ApiError } from '../utils/http.js';
import { checkTargetReached } from '../services/notifications.js';
import { POSITIVE_TARGET } from '../config.js';

const router = Router();
router.use(requireAuth, requireRole('donor'));

async function getOwnDonor(userId) {
  const { rows } = await query('SELECT * FROM donors WHERE user_id = $1', [userId]);
  return rows[0] || null;
}

router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const donor = await getOwnDonor(req.user.id);
    if (!donor) throw new ApiError(404, 'Profil donneur introuvable');

    const [urgentCount, positiveCount, donationCount] = await Promise.all([
      query(
        `SELECT COUNT(*)::int AS n FROM notifications n
         JOIN blood_requests r ON r.id = n.request_id
         WHERE n.donor_id = $1 AND n.status = 'sent' AND r.status = 'active'`,
        [donor.id]
      ),
      query(
        `SELECT COUNT(*)::int AS n FROM notifications WHERE donor_id = $1 AND response = 'positive'`,
        [donor.id]
      ),
      query(
        `SELECT COUNT(*)::int AS n FROM donations WHERE donor_id = $1 AND status = 'completed'`,
        [donor.id]
      ),
    ]);

    const history = (await query(
      `SELECT r.id AS request_id, r.blood_group, r.quantity, r.urgency, r.status AS request_status,
              n.response, n.responded_at, h.nom AS hospital_name
       FROM notifications n
       JOIN blood_requests r ON r.id = n.request_id
       LEFT JOIN hospitals h ON h.id = r.hospital_id
       WHERE n.donor_id = $1 ORDER BY n.responded_at DESC NULLS LAST LIMIT 10`,
      [donor.id]
    )).rows;

    res.json({
      donor,
      counts: {
        urgent: urgentCount.rows[0].n,
        responded: positiveCount.rows[0].n,
        donations: donationCount.rows[0].n,
      },
      history,
    });
  })
);

// Notifications d'urgence actives (pour le donneur connecté)
router.get(
  '/notifications',
  asyncHandler(async (req, res) => {
    const donor = await getOwnDonor(req.user.id);
    if (!donor) throw new ApiError(404, 'Profil donneur introuvable');
    const { rows } = await query(
      `SELECT n.id AS notification_id, n.status AS notification_status, n.response, n.sent_at, n.type,
              r.id AS request_id, r.blood_group, r.quantity, r.urgency, r.status AS request_status,
              r.additional_info, r.service,
              h.nom AS hospital_name, h.wilaya AS hospital_wilaya, h.telephone AS hospital_telephone
       FROM notifications n
       JOIN blood_requests r ON r.id = n.request_id
       LEFT JOIN hospitals h ON h.id = r.hospital_id
       WHERE n.donor_id = $1
       ORDER BY (n.status = 'sent') DESC, n.sent_at DESC LIMIT 50`,
      [donor.id]
    );
    res.json(rows);
  })
);

// Réponse du donneur : JE PEUX DONNER / JE NE SUIS PAS DISPONIBLE
router.post(
  '/notifications/:id/respond',
  asyncHandler(async (req, res) => {
    const donor = await getOwnDonor(req.user.id);
    if (!donor) throw new ApiError(404, 'Profil donneur introuvable');
    const { response } = req.body;
    if (!['positive', 'negative'].includes(response)) throw new ApiError(400, 'Réponse invalide');

    const { rows } = await query(
      `UPDATE notifications SET status = 'responded', response = $1, responded_at = now()
       WHERE id = $2 AND donor_id = $3 RETURNING *`,
      [response, req.params.id, donor.id]
    );
    if (!rows[0]) throw new ApiError(404, 'Notification introuvable');
    const notification = rows[0];

    // Si le donneur accepte, on enregistre un don planifié
    if (response === 'positive') {
      const { rows: reqRows } = await query(
        'SELECT hospital_id, blood_group FROM blood_requests WHERE id = $1',
        [notification.request_id]
      );
      if (reqRows[0]) {
        await query(
          `INSERT INTO donations (donor_id, hospital_id, request_id, blood_group, status)
           VALUES ($1, $2, $3, $4, 'planned')`,
          [donor.id, reqRows[0].hospital_id, notification.request_id, reqRows[0].blood_group]
        );
      }
      await query('UPDATE donors SET last_donation_date = CURRENT_DATE WHERE id = $1', [donor.id]);
    }

    await logActivity(req.user.id, 'donor_responded', 'notification', notification.id);

    // Arrêt automatique si 5 réponses positives atteintes
    const stopped = await checkTargetReached(notification.request_id, req.user.id);

    res.json({
      message: response === 'positive' ? 'Merci ! L’hôpital a reçu votre réponse.' : 'Réponse enregistrée.',
      stopped,
      target: POSITIVE_TARGET,
    });
  })
);

// Historique des dons et réponses
router.get(
  '/history',
  asyncHandler(async (req, res) => {
    const donor = await getOwnDonor(req.user.id);
    if (!donor) throw new ApiError(404, 'Profil donneur introuvable');
    const donations = (await query(
      `SELECT d.*, h.nom AS hospital_name, b.nom AS blood_bank_name
       FROM donations d
       LEFT JOIN hospitals h ON h.id = d.hospital_id
       LEFT JOIN blood_banks b ON b.id = d.blood_bank_id
       WHERE d.donor_id = $1 ORDER BY d.created_at DESC LIMIT 50`,
      [donor.id]
    )).rows;
    const responses = (await query(
      `SELECT n.response, n.responded_at, r.blood_group, r.quantity, r.urgency, h.nom AS hospital_name
       FROM notifications n
       JOIN blood_requests r ON r.id = n.request_id
       LEFT JOIN hospitals h ON h.id = r.hospital_id
       WHERE n.donor_id = $1 ORDER BY n.responded_at DESC NULLS LAST LIMIT 50`,
      [donor.id]
    )).rows;
    res.json({ donations, responses });
  })
);

// Profil du donneur (disponibilité, dernier don, coordonnées)
router.put(
  '/profile',
  asyncHandler(async (req, res) => {
    const donor = await getOwnDonor(req.user.id);
    if (!donor) throw new ApiError(404, 'Profil donneur introuvable');
    const { available, wilaya, moughataa, quartier, telephone, email, last_donation_date } = req.body;
    const { rows } = await query(
      `UPDATE donors SET available = COALESCE($1, available), wilaya = COALESCE($2, wilaya),
        moughataa = COALESCE($3, moughataa), quartier = COALESCE($4, quartier),
        telephone = COALESCE($5, telephone), email = COALESCE($6, email),
        last_donation_date = COALESCE($7, last_donation_date)
       WHERE id = $8 RETURNING *`,
      [available, wilaya, moughataa, quartier, telephone, email, last_donation_date, donor.id]
    );
    await logActivity(req.user.id, 'donor_profile_updated', 'donor', donor.id);
    res.json(rows[0]);
  })
);

export default router;