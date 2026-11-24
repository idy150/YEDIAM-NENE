import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { HandHeart, ShieldCheck, Search } from 'lucide-react';
import { api } from '../../api.js';
import { Spinner, fmtMoney, fmtDate, HBar, Progress } from '../../components/ui.jsx';
import { EXPENSE_CATEGORIES, CONTRIBUTION_PURPOSES, CONTRIBUTOR_TYPES } from '../../constants.js';

const monthLabel = (m) => new Date(`${m}-01T00:00:00`).toLocaleDateString('fr-FR', { month: 'short' });

export default function Transparency() {
  const [d, setD] = useState(null);
  const [ref, setRef] = useState('');

  useEffect(() => { api('/public/transparency', { auth: false }).then(setD).catch(() => {}); }, []);
  if (!d) return <Spinner />;
  const s = d.summary;
  const maxCat = Math.max(1, ...s.by_category.map((x) => x.total));
  const maxPurpose = Math.max(1, ...s.by_purpose.map((x) => x.total));

  return (
    <div className="container">
      <div className="page-hero">
        <span className="eyebrow">Transparence</span>
        <h1>Chaque ouguiya est tracée.</h1>
        <p>Les sommes collectées et leur utilisation sont publiées ici en temps réel. Le sang reste gratuit : les fonds couvrent uniquement la logistique et les campagnes.</p>
      </div>

      <div className="kpi-band mt-lg">
        <div><div className="v">{fmtMoney(s.collected)}</div><div className="l">collectés</div></div>
        <div><div className="v text-red">{fmtMoney(s.spent)}</div><div className="l">utilisés</div></div>
        <div><div className="v text-green">{fmtMoney(s.balance)}</div><div className="l">disponibles</div></div>
        <div><div className="v">{s.contributions_count}</div><div className="l">contributions · {s.organisations_count} organisations</div></div>
      </div>

      <div className="grid-auto mt-lg">
        <div className="card">
          <div className="card-title">Collecté et utilisé par mois</div>
          <div style={{ height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={d.monthly.map((m) => ({ ...m, label: monthLabel(m.month) }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eceae5" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} width={56} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip formatter={(v) => fmtMoney(v)} />
                <Legend iconType="circle" />
                <Bar name="Collecté" dataKey="collected" fill="#c99a2e" radius={[6, 6, 0, 0]} />
                <Bar name="Utilisé" dataKey="spent" fill="#d7262e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <div className="card-title">Utilisation des fonds</div>
          {s.by_category.map((x) => (
            <HBar key={x.category} label={EXPENSE_CATEGORIES[x.category]?.label} value={x.total} max={maxCat} color={EXPENSE_CATEGORIES[x.category]?.color} suffix={fmtMoney} />
          ))}
          <div className="card-title mt-lg">Origine des fonds</div>
          {s.by_purpose.map((x) => (
            <HBar key={x.purpose} label={CONTRIBUTION_PURPOSES[x.purpose]?.label} value={x.total} max={maxPurpose} color="var(--gold)" suffix={fmtMoney} />
          ))}
          <div className="mt">
            <div className="meter-label"><span>Taux d’utilisation</span><span>{s.usage_rate} %</span></div>
            <Progress value={s.usage_rate} max={100} tone="green" />
          </div>
        </div>
      </div>

      {d.campaigns.length > 0 && (
        <div className="card mt-lg">
          <div className="card-title">Par campagne</div>
          <div className="table-wrap" style={{ boxShadow: 'none', border: 'none' }}>
            <table>
              <thead><tr><th>Campagne</th><th>Organisateur</th><th className="num-cell">Collecté</th><th className="num-cell">Utilisé</th><th style={{ width: 180 }}>Objectif</th></tr></thead>
              <tbody>
                {d.campaigns.map((c) => (
                  <tr key={c.id}>
                    <td><Link to={`/campagnes/${c.id}`} style={{ fontWeight: 700 }}>{c.title}</Link></td>
                    <td className="muted">{c.organizer_name}</td>
                    <td className="num-cell">{fmtMoney(c.collected)}</td>
                    <td className="num-cell">{fmtMoney(c.spent)}</td>
                    <td>{c.target_amount > 0 ? <Progress value={c.collected} max={c.target_amount} tone="gold" /> : <span className="muted">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid-auto mt-lg">
        <div className="card">
          <div className="card-title">Dernières contributions</div>
          {d.recentContributions.map((k, i) => (
            <div className="row" key={i}>
              <div className="grow">
                <div className="title" style={{ fontSize: 14 }}>{k.contributor}</div>
                <div className="sub">{CONTRIBUTOR_TYPES[k.contributor_type]} · {k.campaign_title || CONTRIBUTION_PURPOSES[k.purpose]?.label} · {fmtDate(k.paid_at)}</div>
              </div>
              <b className="text-green">+{fmtMoney(k.amount)}</b>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="card-title">Dernières dépenses</div>
          {d.recentExpenses.map((e) => (
            <div className="row" key={e.reference}>
              <span className="badge" style={{ background: EXPENSE_CATEGORIES[e.category]?.color, color: '#fff' }}>{EXPENSE_CATEGORIES[e.category]?.label}</span>
              <div className="grow">
                <div className="title" style={{ fontSize: 14 }}>{e.description}</div>
                <div className="sub">{e.campaign_title || 'Fonds général'} · {fmtDate(e.spent_at)} · {e.reference}</div>
              </div>
              <b className="text-red">−{fmtMoney(e.amount)}</b>
            </div>
          ))}
        </div>
      </div>

      <div className="grid-auto mt-lg">
        <div className="card" id="sang-gratuit" style={{ background: 'var(--black)', color: '#fff' }}>
          <ShieldCheck size={26} color="var(--gold)" />
          <h3 style={{ marginTop: 8 }}>Charte : le sang reste gratuit</h3>
          <p style={{ color: '#b9bbc6', marginTop: 6, fontSize: 14 }}>
            YEDIAM NENE ne vend ni ne facture le sang, les poches ou l’accès à un donneur. Les fonds servent uniquement au transport
            des donneurs, aux collations, au matériel de collecte et à la sensibilisation. Toute dépense est publiée avec sa référence.
          </p>
          <Link to="/soutenir" className="btn btn-gold btn-auto mt"><HandHeart size={17} /> Contribuer</Link>
        </div>
        <form className="card" onSubmit={(e) => { e.preventDefault(); if (ref.trim()) window.location.assign(`/recu/${ref.trim().toUpperCase()}`); }}>
          <div className="card-title"><Search size={18} /> Vérifier un reçu</div>
          <p className="muted mb">Saisissez la référence de votre reçu (ex. YN-20261124-AB12CD).</p>
          <div className="field"><input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Référence du reçu" /></div>
          <button className="btn btn-black">Vérifier</button>
        </form>
      </div>
    </div>
  );
}
