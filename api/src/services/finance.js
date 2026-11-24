import { query } from '../db.js';

const num = (v) => Number(v || 0);

// Résumé financier global ou par campagne (transparence).
export async function fundSummary(campaignId = null) {
  const where = campaignId ? 'AND campaign_id = $1' : '';
  const params = campaignId ? [campaignId] : [];
  const [collected, spent, byPurpose, byCategory, contributors] = await Promise.all([
    query(`SELECT COALESCE(SUM(amount),0) AS s FROM contributions WHERE status = 'paid' ${where}`, params),
    query(`SELECT COALESCE(SUM(amount),0) AS s FROM fund_expenses WHERE TRUE ${where}`, params),
    query(
      `SELECT purpose, COALESCE(SUM(amount),0) AS total, COUNT(*)::int AS n
       FROM contributions WHERE status = 'paid' ${where} GROUP BY purpose ORDER BY total DESC`,
      params
    ),
    query(
      `SELECT category, COALESCE(SUM(amount),0) AS total, COUNT(*)::int AS n
       FROM fund_expenses WHERE TRUE ${where} GROUP BY category ORDER BY total DESC`,
      params
    ),
    query(
      `SELECT COUNT(*)::int AS n,
              COUNT(*) FILTER (WHERE contributor_type <> 'individual')::int AS organisations
       FROM contributions WHERE status = 'paid' ${where}`,
      params
    ),
  ]);
  const totalCollected = num(collected.rows[0].s);
  const totalSpent = num(spent.rows[0].s);
  return {
    collected: totalCollected,
    spent: totalSpent,
    balance: totalCollected - totalSpent,
    usage_rate: totalCollected > 0 ? Math.round((totalSpent / totalCollected) * 100) : 0,
    contributions_count: contributors.rows[0].n,
    organisations_count: contributors.rows[0].organisations,
    by_purpose: byPurpose.rows.map((r) => ({ ...r, total: num(r.total) })),
    by_category: byCategory.rows.map((r) => ({ ...r, total: num(r.total) })),
  };
}

// Nom public d'un contributeur (respect de l'anonymat).
export const publicName = (c) => (c.anonymous ? 'Contributeur anonyme' : c.contributor_name);

// Campagnes avec progression (donneurs inscrits + fonds collectés)
export async function listCampaigns({ status, organizerType, organizerId, id } = {}) {
  const params = [];
  const cond = [];
  if (id) { params.push(id); cond.push(`c.id = $${params.length}`); }
  if (status) { params.push(status); cond.push(`c.status = $${params.length}`); }
  if (organizerType) { params.push(organizerType); cond.push(`c.organizer_type = $${params.length}`); }
  if (organizerId) { params.push(organizerId); cond.push(`c.organizer_id = $${params.length}`); }
  const { rows } = await query(
    `SELECT c.*,
       (SELECT COUNT(*)::int FROM campaign_participants p WHERE p.campaign_id = c.id AND p.status <> 'cancelled') AS participants,
       (SELECT COUNT(*)::int FROM campaign_participants p WHERE p.campaign_id = c.id AND p.status = 'donated') AS donations,
       (SELECT COALESCE(SUM(amount),0) FROM contributions k WHERE k.campaign_id = c.id AND k.status = 'paid') AS collected,
       (SELECT COUNT(*)::int FROM contributions k WHERE k.campaign_id = c.id AND k.status = 'paid') AS contributors,
       (SELECT COALESCE(SUM(amount),0) FROM fund_expenses e WHERE e.campaign_id = c.id) AS spent
     FROM campaigns c
     ${cond.length ? 'WHERE ' + cond.join(' AND ') : ''}
     ORDER BY (c.status = 'active') DESC, c.start_date DESC
     LIMIT 200`,
    params
  );
  return rows.map((r) => ({
    ...r,
    target_amount: num(r.target_amount),
    collected: num(r.collected),
    spent: num(r.spent),
  }));
}

const GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// Prévision simple des besoins : moyenne pondérée des 3 derniers mois par groupe,
// comparée aux stocks disponibles. Indicateur d'aide à la décision, pas une prédiction médicale.
export async function forecastNeeds() {
  const { rows } = await query(
    `SELECT blood_group, to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
            SUM(quantity)::int AS pockets
     FROM blood_requests
     WHERE created_at >= date_trunc('month', now()) - interval '5 months'
       AND status <> 'refused'
     GROUP BY blood_group, month`
  );
  const stocks = (await query(
    `SELECT blood_group, COALESCE(SUM(quantity),0)::int AS qty FROM blood_stocks GROUP BY blood_group`
  )).rows;
  const now = new Date();
  const monthKey = (offset) => {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };
  const weights = [0.5, 0.3, 0.2]; // mois courant, -1, -2
  return GROUPS.map((g) => {
    const history = [];
    for (let i = 5; i >= 0; i--) {
      const key = monthKey(i);
      const row = rows.find((r) => r.blood_group === g && r.month === key);
      history.push({ month: key, pockets: row ? row.pockets : 0 });
    }
    const last3 = history.slice(-3).reverse();
    const projected = Math.ceil(last3.reduce((acc, h, i) => acc + h.pockets * weights[i], 0));
    const stock = stocks.find((s) => s.blood_group === g)?.qty || 0;
    const coverage = projected > 0 ? Math.round((stock / projected) * 100) : null;
    const risk = projected === 0 ? 'faible' : stock < projected ? 'élevé' : stock < projected * 1.5 ? 'modéré' : 'faible';
    return { blood_group: g, history, projected, stock, coverage, risk };
  });
}
