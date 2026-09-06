import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireRole, logActivity } from '../middleware/auth.js';
import { asyncHandler, ApiError } from '../utils/http.js';
import { BLOOD_GROUPS } from '../config.js';

const router = Router();
router.use(requireAuth, requireRole('blood_bank_admin'));

async function getOwnBank(userId) {
  const { rows } = await query('SELECT * FROM blood_banks WHERE user_id = $1', [userId]);
  return rows[0] || null;
}

router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const bank = await getOwnBank(req.user.id);
    if (!bank) throw new ApiError(404, 'Aucune banque de sang associée à ce compte');

    const stocks = (await query(
      `SELECT s.* FROM blood_stocks s WHERE s.blood_bank_id = $1 ORDER BY s.blood_group`,
      [bank.id]
    )).rows;
    const total = stocks.reduce((acc, s) => acc + s.quantity, 0);
    const critical = stocks.filter((s) => s.quantity <= 5);
    const activeRequests = (await query(
      `SELECT COUNT(*)::int AS n FROM blood_requests WHERE status = 'active'`
    )).rows[0].n;
    const myResponses = (await query(
      `SELECT COUNT(*)::int AS n FROM blood_bank_responses WHERE blood_bank_id = $1`,
      [bank.id]
    )).rows[0].n;

    res.json({ bank, stocks, total, critical, counts: { activeRequests, myResponses } });
  })
);

// Mise à jour des stocks : ajout / retrait / correction
router.put(
  '/stocks',
  asyncHandler(async (req, res) => {
    const bank = await getOwnBank(req.user.id);
    if (!bank) throw new ApiError(404, 'Aucune banque de sang associée à ce compte');
    const { blood_group, delta, reason } = req.body; // delta : +5 ajoute, -3 retire, ou valeur absolue avec mode
    const mode = req.body.mode || 'adjust'; // 'adjust' | 'set'
    if (!BLOOD_GROUPS.includes(blood_group)) throw new ApiError(400, 'Groupe sanguin invalide');
    if (!Number.isInteger(delta) || delta === 0) throw new ApiError(400, 'Quantité invalide');

    let newQty;
    const { rows: stockRows } = await query(
      'SELECT * FROM blood_stocks WHERE blood_bank_id = $1 AND blood_group = $2',
      [bank.id, blood_group]
    );

    if (mode === 'set') {
      newQty = delta;
      if (stockRows[0]) {
        await query(
          'UPDATE blood_stocks SET quantity = $1 WHERE id = $2',
          [newQty, stockRows[0].id]
        );
      } else {
        await query(
          'INSERT INTO blood_stocks (blood_bank_id, blood_group, quantity) VALUES ($1, $2, $3)',
          [bank.id, blood_group, newQty]
        );
      }
    } else {
      newQty = (stockRows[0]?.quantity || 0) + delta;
      if (newQty < 0) throw new ApiError(400, 'Le stock ne peut pas être négatif');
      if (stockRows[0]) {
        await query(
          'UPDATE blood_stocks SET quantity = $1 WHERE id = $2',
          [newQty, stockRows[0].id]
        );
      } else {
        await query(
          'INSERT INTO blood_stocks (blood_bank_id, blood_group, quantity) VALUES ($1, $2, $3)',
          [bank.id, blood_group, newQty]
        );
      }
    }

    await query(
      `INSERT INTO stock_movements (blood_bank_id, blood_group, delta, reason)
       VALUES ($1, $2, $3, $4)`,
      [bank.id, blood_group, mode === 'set' ? newQty - (stockRows[0]?.quantity || 0) : delta, reason || (delta > 0 ? 'Ajout de poches' : 'Retrait de poches')]
    );
    await logActivity(req.user.id, 'stock_updated', 'blood_stock', blood_group);

    res.json({ blood_group, quantity: newQty });
  })
);

// Historique des mouvements
router.get(
  '/movements',
  asyncHandler(async (req, res) => {
    const bank = await getOwnBank(req.user.id);
    if (!bank) throw new ApiError(404, 'Aucune banque de sang associée à ce compte');
    const { rows } = await query(
      `SELECT * FROM stock_movements WHERE blood_bank_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [bank.id]
    );
    res.json(rows);
  })
);

// Signaler un stock critique
router.post(
  '/stocks/:bloodGroup/alert',
  asyncHandler(async (req, res) => {
    const bank = await getOwnBank(req.user.id);
    if (!bank) throw new ApiError(404, 'Aucune banque de sang associée à ce compte');
    await logActivity(req.user.id, 'stock_critical_alert', 'blood_stock', req.params.bloodGroup);
    res.json({ message: `Alerte critique signalée pour le groupe ${req.params.bloodGroup}` });
  })
);

// Demandes actives (toutes, pour le prototype)
router.get(
  '/requests',
  asyncHandler(async (req, res) => {
    const bank = await getOwnBank(req.user.id);
    if (!bank) throw new ApiError(404, 'Aucune banque de sang associée à ce compte');
    const { rows } = await query(
      `SELECT r.*, h.nom AS hospital_name,
              (SELECT COUNT(*)::int FROM blood_bank_responses br WHERE br.request_id = r.id AND br.blood_bank_id = $1) AS already_responded
       FROM blood_requests r LEFT JOIN hospitals h ON h.id = r.hospital_id
       WHERE r.status = 'active'
       ORDER BY (r.urgency = 'immediate') DESC, r.created_at DESC LIMIT 100`,
      [bank.id]
    );
    res.json(rows);
  })
);

// Répondre à une demande (poches disponibles)
router.post(
  '/requests/:id/respond',
  asyncHandler(async (req, res) => {
    const bank = await getOwnBank(req.user.id);
    if (!bank) throw new ApiError(404, 'Aucune banque de sang associée à ce compte');
    const { available_pockets, message } = req.body;
    if (!Number.isInteger(available_pockets) || available_pockets < 0) {
      throw new ApiError(400, 'Nombre de poches invalide');
    }
    const { rows } = await query(
      `INSERT INTO blood_bank_responses (request_id, blood_bank_id, available_pockets, message)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.params.id, bank.id, available_pockets, message || null]
    );
    await logActivity(req.user.id, 'blood_bank_responded', 'blood_request', Number(req.params.id));
    res.status(201).json(rows[0]);
  })
);

// Profil de la banque de sang
router.put(
  '/profile',
  asyncHandler(async (req, res) => {
    const bank = await getOwnBank(req.user.id);
    if (!bank) throw new ApiError(404, 'Aucune banque de sang associée à ce compte');
    const { adresse, telephone, email } = req.body;
    const { rows } = await query(
      `UPDATE blood_banks SET adresse = COALESCE($1, adresse), telephone = COALESCE($2, telephone),
        email = COALESCE($3, email) WHERE id = $4 RETURNING *`,
      [adresse, telephone, email, bank.id]
    );
    await logActivity(req.user.id, 'blood_bank_profile_updated', 'blood_bank', bank.id);
    res.json(rows[0]);
  })
);

export default router;