import { query } from '../db.js';
import { POSITIVE_TARGET } from '../config.js';
import { logActivity } from '../middleware/auth.js';

// Sélectionne les donneurs compatibles : même groupe sanguin, disponibles,
// comptes actifs (si compte lié), priorité à la même wilaya.
async function findMatchingDonors(request, limit = 60) {
  const { rows } = await query(
    `SELECT d.* FROM donors d
     LEFT JOIN users u ON u.id = d.user_id
     WHERE d.blood_group = $1
       AND d.available = TRUE
       AND (d.user_id IS NULL OR u.status = 'active')
     ORDER BY (d.wilaya = $2) DESC, d.last_donation_date IS NULL DESC, d.id
     LIMIT $3`,
    [request.blood_group, request.wilaya || '', limit]
  );
  return rows;
}

// Envoie la notification initiale aux donneurs compatibles non encore notifiés.
export async function notifyMatchingDonors(requestId) {
  const { rows: reqRows } = await query('SELECT * FROM blood_requests WHERE id = $1', [requestId]);
  const request = reqRows[0];
  if (!request) return { notified: 0 };

  const donors = await findMatchingDonors(request);
  let notified = 0;
  for (const donor of donors) {
    const existing = await query(
      'SELECT 1 FROM notifications WHERE donor_id = $1 AND request_id = $2',
      [donor.id, requestId]
    );
    if (existing.rowCount > 0) continue;
    await query(
      'INSERT INTO notifications (donor_id, request_id, type) VALUES ($1, $2, $3)',
      [donor.id, requestId, 'urgent']
    );
    notified += 1;
  }
  return { notified, totalTargeted: donors.length };
}

export const countPositive = async (requestId) => {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS n FROM notifications
     WHERE request_id = $1 AND response = 'positive'`,
    [requestId]
  );
  return rows[0].n;
};

// Arrêt automatique quand 5 réponses positives sont atteintes.
export async function checkTargetReached(requestId, actorUserId = null) {
  const { rows } = await query('SELECT status FROM blood_requests WHERE id = $1', [requestId]);
  if (!rows[0] || !['active', 'pending'].includes(rows[0].status)) return false;

  const n = await countPositive(requestId);
  if (n >= POSITIVE_TARGET) {
    await query(
      `UPDATE blood_requests SET status = 'five_reached', closed_at = now() WHERE id = $1`,
      [requestId]
    );
    await logActivity(
      actorUserId,
      'auto_stop',
      'blood_request',
      requestId
    );
    return true;
  }
  return false;
}

// Relance automatique : re-notifie les donneurs qui n'ont pas encore répondu.
export async function relaunchRequest(requestId) {
  const { rows } = await query('SELECT * FROM blood_requests WHERE id = $1', [requestId]);
  const request = rows[0];
  if (!request || !['active', 'five_reached'].includes(request.status)) return { relaunched: 0 };

  const donors = await findMatchingDonors(request);
  let relaunched = 0;
  for (const donor of donors) {
    const responded = await query(
      'SELECT 1 FROM notifications WHERE donor_id = $1 AND request_id = $2 AND status = $3',
      [donor.id, requestId, 'responded']
    );
    if (responded.rowCount > 0) continue;
    const exists = await query(
      'SELECT 1 FROM notifications WHERE donor_id = $1 AND request_id = $2',
      [donor.id, requestId]
    );
    if (exists.rowCount > 0) {
      // relance : on met à jour la date d'envoi
      await query(
        'UPDATE notifications SET sent_at = now() WHERE donor_id = $1 AND request_id = $2',
        [donor.id, requestId]
      );
    } else {
      await query(
        'INSERT INTO notifications (donor_id, request_id, type) VALUES ($1, $2, $3)',
        [donor.id, requestId, 'relaunch']
      );
    }
    relaunched += 1;
  }
  return { relaunched };
}

export const URGENCY_LABELS = {
  immediate: '🔴 IMMÉDIAT',
  urgent: '🟠 URGENT',
  normal: '🟢 NORMAL',
};