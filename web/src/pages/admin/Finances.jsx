import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, ArrowDownLeft, ArrowUpRight, Truck, Plus, ExternalLink, Check, X, Banknote } from 'lucide-react';
import { api } from '../../api.js';
import {
  Spinner, StatCard, PageHead, Modal, Alert, EmptyState, StatusBadge, PayStatusBadge, HBar, BloodBadge,
  fmtMoney, fmtDate, fmtDateTime, useToast,
} from '../../components/ui.jsx';
import {
  EXPENSE_CATEGORIES, CONTRIBUTION_PURPOSES, CONTRIBUTOR_TYPES, PAYMENT_LABELS, TRANSPORT_STATUS,
} from '../../constants.js';

const emptyExpense = { category: 'collation', amount: '', description: '', beneficiary: '', campaign_id: '', spent_at: new Date().toISOString().slice(0, 10) };

export default function AdminFinances() {
  const [overview, setOverview] = useState(null);
  const [contribs, setContribs] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [transport, setTransport] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [tab, setTab] = useState('contributions');
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [form, setForm] = useState(emptyExpense);
  const [error, setError] = useState('');
  const [toast, setToast] = useToast();

  const load = () => Promise.all([
    api('/finance/overview').then(setOverview),
    api('/finance/contributions').then(setContribs),
    api('/finance/expenses').then(setExpenses),
    api('/finance/transport-requests').then(setTransport),
  ]).catch(() => {});

  useEffect(() => {
    load();
    api('/campaigns/mine').then(setCampaigns).catch(() => {});
  }, []);

  const saveExpense = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api('/finance/expenses', { method: 'POST', body: { ...form, amount: Number(form.amount), campaign_id: form.campaign_id ? Number(form.campaign_id) : null } });
      setExpenseOpen(false);
      setForm(emptyExpense);
      setToast('Dépense enregistrée et publiée');
      load();
    } catch (err) { setError(err.message); }
  };

  const decide = async (id, decision) => {
    try {
      await api(`/finance/transport-requests/${id}/decision`, { method: 'POST', body: { decision } });
      setToast(decision === 'paid' ? 'Versement enregistré (dépense transport créée)' : 'Décision enregistrée');
      load();
    } catch (err) { setToast(err.message); }
  };

  if (!overview) return <Spinner />;
  const s = overview.summary;
  const maxCat = Math.max(1, ...s.by_category.map((x) => x.total));
  const pendingTransport = transport.filter((t) => ['pending', 'approved'].includes(t.status)).length;

  return (
    <>
      <PageHead
        title="Fonds solidaires"
        sub="Contributions, dépenses et soutien transport — le sang reste gratuit"
        actions={
          <div className="flex">
            <Link to="/transparence" target="_blank" className="btn btn-outline btn-sm"><ExternalLink size={15} /> Page publique</Link>
            <button className="btn btn-red btn-sm" onClick={() => { setError(''); setExpenseOpen(true); }}><Plus size={15} /> Dépense</button>
          </div>
        }
      />

      <div className="stats-grid">
        <StatCard icon={<ArrowDownLeft size={20} />} num={fmtMoney(s.collected)} label={`Collectés · ${s.contributions_count} contributions`} color="var(--gold)" />
        <StatCard icon={<ArrowUpRight size={20} />} num={fmtMoney(s.spent)} label={`Utilisés · ${s.usage_rate} %`} />
        <StatCard icon={<Wallet size={20} />} num={fmtMoney(s.balance)} label="Solde disponible" color="var(--green)" />
        <StatCard icon={<Truck size={20} />} num={overview.pending_transport.n} label={`Soutiens transport en attente · ${fmtMoney(overview.pending_transport.total)}`} color="var(--blue)" />
      </div>

      <div className="grid-auto" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="card-title">Utilisation par catégorie</div>
          {s.by_category.length === 0 ? <p className="muted">Aucune dépense.</p> : s.by_category.map((x) => (
            <HBar key={x.category} label={EXPENSE_CATEGORIES[x.category]?.label} value={x.total} max={maxCat} color={EXPENSE_CATEGORIES[x.category]?.color} suffix={fmtMoney} />
          ))}
        </div>
        <div className="card">
          <div className="card-title">Origine des fonds</div>
          {s.by_purpose.map((x) => (
            <div className="row" key={x.purpose}>
              <div className="grow"><div className="title" style={{ fontSize: 14 }}>{CONTRIBUTION_PURPOSES[x.purpose]?.label}</div><div className="sub">{x.n} contributions</div></div>
              <b>{fmtMoney(x.total)}</b>
            </div>
          ))}
        </div>
      </div>

      <div className="tabs" style={{ marginTop: 22 }}>
        <button className={tab === 'contributions' ? 'active' : ''} onClick={() => setTab('contributions')}>Contributions</button>
        <button className={tab === 'expenses' ? 'active' : ''} onClick={() => setTab('expenses')}>Dépenses</button>
        <button className={tab === 'transport' ? 'active' : ''} onClick={() => setTab('transport')}>
          Soutien transport {pendingTransport > 0 && <span className="count">{pendingTransport}</span>}
        </button>
      </div>

      {tab === 'contributions' && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Date</th><th>Contributeur</th><th>Affectation</th><th>Paiement</th><th className="num-cell">Montant</th><th>Statut</th><th /></tr></thead>
            <tbody>
              {contribs.map((k) => (
                <tr key={k.id}>
                  <td className="muted">{fmtDateTime(k.paid_at || k.created_at)}</td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{k.contributor_name} {k.anonymous && <span className="pill" style={{ marginLeft: 4 }}>anonyme</span>}</div>
                    <div className="muted">{CONTRIBUTOR_TYPES[k.contributor_type]} · {k.contributor_phone || k.contributor_email || '—'}</div>
                  </td>
                  <td>{k.campaign_title || CONTRIBUTION_PURPOSES[k.purpose]?.label}</td>
                  <td className="muted">{PAYMENT_LABELS[k.payment_method]}</td>
                  <td className="num-cell">{fmtMoney(k.amount)}</td>
                  <td><PayStatusBadge status={k.status} /></td>
                  <td><Link to={`/recu/${k.reference}`} target="_blank" className="btn btn-outline btn-sm" title="Reçu"><ExternalLink size={14} /></Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'expenses' && (
        expenses.length === 0 ? <div className="card"><EmptyState text="Aucune dépense enregistrée." /></div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Catégorie</th><th>Description</th><th>Campagne</th><th className="num-cell">Montant</th><th>Référence</th></tr></thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id}>
                    <td className="muted">{fmtDate(e.spent_at)}</td>
                    <td><span className="badge" style={{ background: EXPENSE_CATEGORIES[e.category]?.color, color: '#fff' }}>{EXPENSE_CATEGORIES[e.category]?.label}</span></td>
                    <td><div style={{ fontWeight: 600 }}>{e.description}</div><div className="muted">{e.beneficiary || ''}{e.recorded_by_name ? ` · saisi par ${e.recorded_by_name}` : ''}</div></td>
                    <td className="muted">{e.campaign_title || 'Fonds général'}</td>
                    <td className="num-cell">{fmtMoney(e.amount)}</td>
                    <td className="muted">{e.reference}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === 'transport' && (
        transport.length === 0 ? <div className="card"><EmptyState text="Aucune demande de soutien transport." /></div> : (
          <div className="card">
            {transport.map((t) => (
              <div className="row" key={t.id}>
                <BloodBadge group={t.blood_group} />
                <div className="grow">
                  <div className="title">{t.donor_name} · {fmtMoney(t.amount)}</div>
                  <div className="sub">{t.hospital_name ? `Urgence ${t.hospital_name}` : t.campaign_title} · {t.wilaya} · {t.telephone} · {fmtDateTime(t.created_at)}</div>
                  {t.note && <div className="sub">« {t.note} »</div>}
                </div>
                {['pending', 'approved'].includes(t.status) ? (
                  <div className="row-actions">
                    {t.status === 'pending' && <button className="btn btn-outline btn-sm" onClick={() => decide(t.id, 'approved')}><Check size={14} /> Approuver</button>}
                    <button className="btn btn-green btn-sm" onClick={() => decide(t.id, 'paid')}><Banknote size={14} /> Verser</button>
                    <button className="btn btn-outline-red btn-sm" onClick={() => decide(t.id, 'refused')}><X size={14} /></button>
                  </div>
                ) : (
                  <StatusBadge status={t.status} map={TRANSPORT_STATUS} />
                )}
              </div>
            ))}
          </div>
        )
      )}

      <Modal open={expenseOpen} onClose={() => setExpenseOpen(false)} title="Enregistrer une dépense">
        <form onSubmit={saveExpense}>
          {error && <Alert type="error">{error}</Alert>}
          <p className="muted mb">Solde disponible : <b>{fmtMoney(s.balance)}</b>. La dépense sera publiée sur la page Transparence.</p>
          <div className="field">
            <label>Catégorie</label>
            <div className="chips">
              {Object.entries(EXPENSE_CATEGORIES).map(([k, v]) => (
                <button type="button" key={k} className={`chip ${form.category === k ? 'selected' : ''}`} onClick={() => setForm({ ...form, category: k })}>{v.label}</button>
              ))}
            </div>
          </div>
          <div className="grid-2">
            <div className="field"><label>Montant (MRU)</label><input type="number" min={1} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
            <div className="field"><label>Date</label><input type="date" value={form.spent_at} onChange={(e) => setForm({ ...form, spent_at: e.target.value })} /></div>
          </div>
          <div className="field"><label>Description</label><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required minLength={4} placeholder="ex. Collations pour 40 donneurs" /></div>
          <div className="grid-2">
            <div className="field"><label>Bénéficiaire / fournisseur</label><input value={form.beneficiary} onChange={(e) => setForm({ ...form, beneficiary: e.target.value })} /></div>
            <div className="field"><label>Campagne</label>
              <select value={form.campaign_id} onChange={(e) => setForm({ ...form, campaign_id: e.target.value })}>
                <option value="">Fonds général</option>
                {campaigns.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
          </div>
          <button className="btn btn-red">Enregistrer la dépense</button>
        </form>
      </Modal>
      {toast}
    </>
  );
}
