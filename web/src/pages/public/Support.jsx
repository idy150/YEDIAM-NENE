import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { HandHeart, Smartphone, Landmark, CreditCard, ShieldCheck, Lock } from 'lucide-react';
import { api } from '../../api.js';
import { Alert, fmtMoney, Progress } from '../../components/ui.jsx';
import { CONTRIBUTION_PURPOSES, CONTRIBUTOR_TYPES } from '../../constants.js';

const AMOUNTS = [500, 1000, 2500, 5000, 10000, 25000];
const METHOD_ICONS = { mobile_money: <Smartphone size={18} />, bank: <Landmark size={18} />, card: <CreditCard size={18} /> };

// Ce que finance un montant (pédagogie, ordre de grandeur indicatif)
function impactOf(amount) {
  if (amount >= 25000) return 'finance une demi-journée de bus de collecte';
  if (amount >= 10000) return 'offre la collation à ~40 donneurs';
  if (amount >= 5000) return 'rembourse le transport de ~6 donneurs';
  if (amount >= 1000) return 'rembourse un aller-retour en taxi pour un donneur';
  return 'contribue au fonds solidaire';
}

export default function Support() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [methods, setMethods] = useState([]);
  const [form, setForm] = useState({
    purpose: params.get('campagne') ? 'campaign' : params.get('type') === 'company' ? 'sponsoring' : 'general',
    campaign_id: params.get('campagne') || '',
    contributor_type: params.get('type') === 'company' ? 'company' : 'individual',
    contributor_name: '', contributor_phone: '', contributor_email: '',
    anonymous: false, amount: 1000, payment_method: 'bankily', message: '',
  });
  const [custom, setCustom] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('/public/campaigns?status=active', { auth: false }).then(setCampaigns).catch(() => {});
    api('/public/payment-methods', { auth: false }).then(setMethods).catch(() => {});
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const amount = custom ? Number(custom) : form.amount;
  const needsCampaign = ['campaign', 'sponsoring'].includes(form.purpose);
  const selectedCampaign = campaigns.find((c) => String(c.id) === String(form.campaign_id));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (needsCampaign && !form.campaign_id) { setError('Choisissez la campagne à soutenir.'); return; }
    setBusy(true);
    try {
      const res = await api('/public/contributions', {
        method: 'POST',
        auth: false,
        body: { ...form, amount, campaign_id: needsCampaign ? Number(form.campaign_id) : null },
      });
      navigate(`/recu/${res.reference}?merci=1`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container">
      <div className="page-hero">
        <span className="eyebrow">Soutenir</span>
        <h1>Financer la solidarité, jamais le sang.</h1>
        <p>Votre contribution finance le transport des donneurs, les collations, le matériel et la communication des campagnes. Vous recevez un reçu numérique et pouvez suivre l’utilisation des fonds.</p>
      </div>

      <div className="grid-auto grid-2-1 mt-lg" style={{ alignItems: 'start' }}>
        <form className="card" onSubmit={submit}>
          {error && <Alert type="error">{error}</Alert>}

          <div className="field">
            <label>1. À quoi affecter votre contribution ?</label>
            <div className="tiles">
              {Object.entries(CONTRIBUTION_PURPOSES).map(([k, v]) => (
                <button type="button" key={k} className={`tile ${form.purpose === k ? 'selected' : ''}`} onClick={() => set('purpose', k)}>
                  {v.label}<small>{v.sub}</small>
                </button>
              ))}
            </div>
          </div>

          {needsCampaign && (
            <div className="field">
              <label>Campagne</label>
              <select value={form.campaign_id} onChange={(e) => set('campaign_id', e.target.value)} required>
                <option value="">Choisir une campagne…</option>
                {campaigns.map((c) => <option key={c.id} value={c.id}>{c.title} — {c.organizer_name}</option>)}
              </select>
              {selectedCampaign && selectedCampaign.target_amount > 0 && (
                <div className="mt">
                  <div className="meter-label"><span>{fmtMoney(selectedCampaign.collected)} collectés</span><span>objectif {fmtMoney(selectedCampaign.target_amount)}</span></div>
                  <Progress value={selectedCampaign.collected} max={selectedCampaign.target_amount} tone="gold" />
                </div>
              )}
            </div>
          )}

          <div className="field">
            <label>2. Montant (MRU)</label>
            <div className="tiles" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))' }}>
              {AMOUNTS.map((a) => (
                <button type="button" key={a} className={`tile ${!custom && form.amount === a ? 'selected' : ''}`} onClick={() => { setCustom(''); set('amount', a); }}>
                  {a.toLocaleString('fr-FR')}<small>MRU</small>
                </button>
              ))}
            </div>
            <input className="mt" type="number" min={50} placeholder="Autre montant" value={custom} onChange={(e) => setCustom(e.target.value)} style={{ marginTop: 8 }} />
            {amount > 0 && <div className="hint">≈ {fmtMoney(amount)} {impactOf(amount)}.</div>}
          </div>

          <div className="field">
            <label>3. Vous êtes</label>
            <div className="chips">
              {Object.entries(CONTRIBUTOR_TYPES).map(([k, v]) => (
                <button type="button" key={k} className={`chip ${form.contributor_type === k ? 'selected' : ''}`} onClick={() => set('contributor_type', k)}>{v}</button>
              ))}
            </div>
          </div>
          <div className="field">
            <label>{form.contributor_type === 'individual' ? 'Nom complet' : 'Nom de l’organisation'}</label>
            <input value={form.contributor_name} onChange={(e) => set('contributor_name', e.target.value)} required minLength={2} />
          </div>
          <div className="grid-2">
            <div className="field">
              <label>Téléphone</label>
              <input value={form.contributor_phone} onChange={(e) => set('contributor_phone', e.target.value)} placeholder="+222 …" />
            </div>
            <div className="field">
              <label>Email</label>
              <input type="email" value={form.contributor_email} onChange={(e) => set('contributor_email', e.target.value)} placeholder="pour recevoir le reçu" />
            </div>
          </div>
          <div className="field">
            <label>Message (facultatif)</label>
            <input value={form.message} maxLength={280} onChange={(e) => set('message', e.target.value)} placeholder="Un mot d’encouragement pour les donneurs" />
          </div>
          <label className="check mb">
            <input type="checkbox" checked={form.anonymous} onChange={(e) => set('anonymous', e.target.checked)} />
            Apparaître comme « Contributeur anonyme » sur les pages publiques
          </label>

          <div className="field">
            <label>4. Moyen de paiement</label>
            <div className="tiles">
              {methods.map((m) => (
                <button type="button" key={m.id} className={`tile ${form.payment_method === m.id ? 'selected' : ''}`} onClick={() => set('payment_method', m.id)}>
                  <span className="flex" style={{ gap: 8 }}>{METHOD_ICONS[m.kind]} {m.label}</span>
                </button>
              ))}
            </div>
          </div>

          <button className="btn btn-red btn-lg" disabled={busy || !(amount >= 50)}>
            <Lock size={18} /> {busy ? 'Paiement en cours…' : `Contribuer ${amount > 0 ? fmtMoney(amount) : ''}`}
          </button>
          <p className="muted center mt">Prototype : le paiement est simulé. Les paiements réels passeront par les partenaires (Bankily, Masrivi, Sedad, banques) après accord et intégration autorisée.</p>
        </form>

        <div style={{ display: 'grid', gap: 14, position: 'sticky', top: 84 }}>
          <div className="card" style={{ background: 'var(--black)', color: '#fff' }}>
            <HandHeart size={26} color="var(--gold)" />
            <h3 style={{ marginTop: 10 }}>Notre engagement</h3>
            <ul className="feature-list">
              <li><span className="fi"><ShieldCheck size={16} /></span><div><b>Le sang n’est jamais vendu</b><span>Aucune transaction ne porte sur le sang ou les poches.</span></div></li>
              <li><span className="fi"><HandHeart size={16} /></span><div><b>Affectation respectée</b><span>Une contribution « transport » ne finance que du transport.</span></div></li>
              <li><span className="fi"><Lock size={16} /></span><div><b>Reçu et traçabilité</b><span>Chaque dépense a une référence publiée sur la page Transparence.</span></div></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
