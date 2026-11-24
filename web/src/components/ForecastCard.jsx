import { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { api } from '../api.js';
import { BloodBadge } from './ui.jsx';

const RISK = {
  élevé: { bg: 'var(--red-soft)', color: 'var(--red-dark)' },
  modéré: { bg: 'var(--orange-soft)', color: '#9a5208' },
  faible: { bg: 'var(--green-soft)', color: '#0f6a3f' },
};

// Prévision des besoins (moyenne pondérée des 3 derniers mois vs stocks)
export default function ForecastCard() {
  const [rows, setRows] = useState(null);
  useEffect(() => { api('/finance/forecast').then(setRows).catch(() => setRows([])); }, []);
  if (!rows || rows.length === 0) return null;
  const maxHist = Math.max(1, ...rows.flatMap((r) => r.history.map((h) => h.pockets)));

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="flex between wrap">
        <div className="card-title" style={{ marginBottom: 0 }}><TrendingUp size={18} className="text-red" /> Prévision des besoins — mois prochain</div>
        <span className="pill pill-blue">Aide à la décision · bêta</span>
      </div>
      <p className="muted" style={{ margin: '6px 0 12px' }}>Projection par moyenne pondérée des demandes des 3 derniers mois, comparée aux stocks des banques de sang.</p>
      <div className="table-wrap" style={{ boxShadow: 'none', border: 'none' }}>
        <table>
          <thead>
            <tr><th>Groupe</th><th>Tendance 6 mois</th><th className="num-cell">Besoin projeté</th><th className="num-cell">Stock</th><th className="num-cell">Couverture</th><th>Risque</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.blood_group}>
                <td><BloodBadge group={r.blood_group} /></td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 30 }} aria-label="Historique mensuel">
                    {r.history.map((h) => (
                      <span key={h.month} title={`${h.month} : ${h.pockets} poches`} style={{ width: 10, height: `${Math.max(3, (h.pockets / maxHist) * 30)}px`, background: 'var(--red)', opacity: 0.35 + 0.65 * (h.pockets / maxHist), borderRadius: 3 }} />
                    ))}
                  </div>
                </td>
                <td className="num-cell">{r.projected} poches</td>
                <td className="num-cell">{r.stock}</td>
                <td className="num-cell">{r.coverage === null ? '—' : `${r.coverage} %`}</td>
                <td><span className="pill" style={{ background: RISK[r.risk].bg, color: RISK[r.risk].color, borderColor: 'transparent' }}>{r.risk}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
