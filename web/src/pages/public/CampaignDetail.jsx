import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MapPin, CalendarDays, Users, HandHeart, Share2, ArrowLeft, CheckCircle2, Building2, Droplets } from 'lucide-react';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Spinner, EmptyState, Progress, fmtMoney, fmtDate, HBar, useToast } from '../../components/ui.jsx';
import { daysLeft } from '../../components/CampaignCard.jsx';
import { CAMPAIGN_TYPES, CAMPAIGN_STATUS, EXPENSE_CATEGORIES, CONTRIBUTOR_TYPES } from '../../constants.js';

export default function CampaignDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [joined, setJoined] = useState(false);
  const [toast, setToast] = useToast();

  const load = () => api(`/public/campaigns/${id}`, { auth: false }).then(setData).catch((e) => setError(e.message));
  useEffect(() => { load(); }, [id]);
  useEffect(() => {
    if (user?.role === 'donor') {
      api('/campaigns/donor/joined').then((rows) => setJoined(rows.some((r) => String(r.campaign_id) === String(id)))).catch(() => {});
    }
  }, [user, id]);

  if (error) return <div className="container"><EmptyState text={error} /></div>;
  if (!data) return <Spinner />;
  const { campaign: c, contributions, expenses, summary } = data;
  const left = daysLeft(c.end_date);
  const isActive = c.status === 'active';

  const join = async () => {
    try {
      const r = await api(`/campaigns/${c.id}/${joined ? 'leave' : 'join'}`, { method: 'POST' });
      setJoined(!joined);
      setToast(r.message);
      load();
    } catch (e) { setToast(e.message); }
  };

  const share = async () => {
    const url = window.location.href;
    const text = `${c.title} — rejoignez la campagne sur YEDIAM NENE`;
    if (navigator.share) { navigator.share({ title: c.title, text, url }).catch(() => {}); return; }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, '_blank', 'noopener');
  };

  const maxCat = Math.max(1, ...summary.by_category.map((x) => x.total));

  return (
    <div className="container">
      <div style={{ paddingTop: 22 }}>
        <Link to="/campagnes" className="muted flex" style={{ gap: 6, fontWeight: 700 }}><ArrowLeft size={16} /> Toutes les campagnes</Link>
      </div>

      <div className={`campaign-cover ${c.type}`} style={{ height: 'auto', borderRadius: 'var(--radius-xl)', padding: 26, marginTop: 14, display: 'block', overflow: 'hidden' }}>
        <div className="flex wrap" style={{ gap: 8 }}>
          <span className="pill" style={{ background: 'rgba(255,255,255,0.16)', color: '#fff', borderColor: 'transparent' }}>{CAMPAIGN_TYPES[c.type]}</span>
          <span className="pill" style={{ background: '#fff', color: 'var(--ink)', borderColor: 'transparent' }}>
            {isActive ? (left > 0 ? `Encore ${left} jour${left > 1 ? 's' : ''}` : 'Dernier jour') : CAMPAIGN_STATUS[c.status]?.label}
          </span>
        </div>
        <h1 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 900, marginTop: 14, maxWidth: 760 }}>{c.title}</h1>
        <div className="campaign-meta" style={{ color: 'rgba(255,255,255,0.85)', marginTop: 10 }}>
          <span><Building2 size={14} /> {c.organizer_name}</span>
          {c.wilaya && <span><MapPin size={14} /> {c.location ? `${c.location}, ` : ''}{c.wilaya}</span>}
          <span><CalendarDays size={14} /> {fmtDate(c.start_date)} → {fmtDate(c.end_date)}</span>
        </div>
        <span className="big-ico" style={{ right: 26, bottom: -20 }}><Droplets size={170} /></span>
      </div>

      <div className="grid-auto grid-2-1 mt-lg" style={{ alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 14 }}>
          <div className="card">
            <div className="card-title">À propos</div>
            <p style={{ color: 'var(--ink-2)' }}>{c.description || 'Aucune description.'}</p>
            {c.target_groups?.length > 0 && (
              <div className="mt">
                <div className="muted" style={{ fontWeight: 700, marginBottom: 6 }}>Groupes recherchés en priorité</div>
                <div className="chips">{c.target_groups.map((g) => <span key={g} className="blood-badge red" style={{ width: 42, height: 42 }}>{g}</span>)}</div>
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-title">Utilisation des fonds de la campagne</div>
            {summary.by_category.length === 0 ? (
              <p className="muted">Aucune dépense enregistrée pour le moment.</p>
            ) : (
              summary.by_category.map((x) => (
                <HBar key={x.category} label={EXPENSE_CATEGORIES[x.category]?.label || x.category} value={x.total} max={maxCat} color={EXPENSE_CATEGORIES[x.category]?.color} suffix={fmtMoney} />
              ))
            )}
            {expenses.length > 0 && (
              <div className="mt">
                {expenses.map((e) => (
                  <div className="row" key={e.reference}>
                    <div className="grow">
                      <div className="title" style={{ fontSize: 14 }}>{e.description}</div>
                      <div className="sub">{fmtDate(e.spent_at)} · {EXPENSE_CATEGORIES[e.category]?.label} · réf. {e.reference}</div>
                    </div>
                    <b>{fmtMoney(e.amount)}</b>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-title">Ils soutiennent cette campagne</div>
            {contributions.length === 0 ? <p className="muted">Soyez le premier à contribuer.</p> : contributions.map((k, i) => (
              <div className="row" key={i}>
                <span className="avatar" style={{ background: k.contributor_type === 'individual' ? 'var(--red)' : 'var(--black)' }}>
                  {k.contributor.slice(0, 1)}
                </span>
                <div className="grow">
                  <div className="title" style={{ fontSize: 14 }}>{k.contributor}</div>
                  <div className="sub">{CONTRIBUTOR_TYPES[k.contributor_type]} · {fmtDate(k.paid_at)}{k.message ? ` · « ${k.message} »` : ''}</div>
                </div>
                <b>{fmtMoney(k.amount)}</b>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ position: 'sticky', top: 84 }}>
          {c.target_amount > 0 && (
            <>
              <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-0.03em' }}>{fmtMoney(c.collected)}</div>
              <div className="muted">collectés sur un objectif de {fmtMoney(c.target_amount)}</div>
              <Progress value={c.collected} max={c.target_amount} tone="gold" size="lg" />
              <div className="flex between mt muted"><span>{c.contributors} contributions</span><span>{fmtMoney(c.spent)} dépensés</span></div>
            </>
          )}
          {c.type === 'collecte' && c.target_donors > 0 && (
            <div className="mt">
              <div className="meter-label"><span><Users size={13} style={{ verticalAlign: -2 }} /> {c.participants} donneurs inscrits</span><span>objectif {c.target_donors}</span></div>
              <Progress value={c.participants} max={c.target_donors} size="lg" />
            </div>
          )}

          <div style={{ display: 'grid', gap: 8, marginTop: 18 }}>
            {isActive && c.type === 'collecte' && (
              user?.role === 'donor' ? (
                <button className={`btn ${joined ? 'btn-outline' : 'btn-red'}`} onClick={join}>
                  {joined ? <><CheckCircle2 size={18} /> Inscrit · se désinscrire</> : <><Droplets size={18} /> Je participe</>}
                </button>
              ) : !user ? (
                <Link to="/inscription" className="btn btn-red"><Droplets size={18} /> Je m’inscris pour donner</Link>
              ) : null
            )}
            {isActive && (
              <Link to={`/soutenir?campagne=${c.id}`} className="btn btn-gold"><HandHeart size={18} /> Financer la logistique</Link>
            )}
            <button className="btn btn-outline" onClick={share}><Share2 size={17} /> Partager</button>
          </div>
          <div className="alert alert-info" style={{ marginTop: 14, marginBottom: 0, fontSize: 12.5 }}>Le sang reste gratuit : les fonds couvrent transport, collations, matériel et communication.</div>
        </div>
      </div>
      {toast}
    </div>
  );
}
