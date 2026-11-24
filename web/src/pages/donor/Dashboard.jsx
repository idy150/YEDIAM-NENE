import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Siren, HeartHandshake, History, CheckCircle2, CalendarHeart } from 'lucide-react';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { BloodBadge, Spinner, EmptyState, Progress, fmtDate } from '../../components/ui.jsx';
import { URGENCY } from '../../constants.js';

export default function DonorDashboard() {
  const { user, reload } = useAuth();
  const [data, setData] = useState(null);

  const load = () => api('/donor/dashboard').then(setData).catch(() => {});
  useEffect(() => { load(); }, []);

  if (!data) return <Spinner />;
  const { donor, counts, history } = data;

  const toggleAvailability = async () => {
    await api('/donor/profile', { method: 'PUT', body: { available: !donor.available } });
    await reload();
    load();
  };

  const elig = data.eligibility;
  const progressDays = elig && !elig.eligible ? Math.round(((elig.interval - elig.days_left) / elig.interval) * 100) : 100;

  return (
    <>
      {counts.urgent > 0 && (
        <Link to="/donneur/urgences" className="urgent-hero flex" style={{ marginBottom: 14, gap: 14 }}>
          <span className="pulse" style={{ background: '#fff' }} />
          <div className="grow">
            <div style={{ fontWeight: 900, fontSize: 17 }}>{counts.urgent} urgence{counts.urgent > 1 ? 's' : ''} pour votre groupe</div>
            <div style={{ opacity: 0.85, fontSize: 13.5 }}>Un patient a besoin de vous. Répondez en un geste.</div>
          </div>
          <Siren size={26} />
        </Link>
      )}

      <div className="card" style={{ background: 'var(--black)', color: '#fff', padding: 22, overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', right: -50, top: -50, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(215,38,46,0.45), transparent 70%)' }} />
        <p style={{ color: '#b9bbc6', fontSize: 14 }}>Bonjour {user.nom} 👋</p>
        <div className="flex" style={{ gap: 14, margin: '14px 0 18px' }}>
          <BloodBadge group={donor.blood_group} tone="red" />
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>Groupe {donor.blood_group}</div>
            <div style={{ color: '#b9bbc6', fontSize: 13 }}>{donor.wilaya}{donor.quartier ? ` · ${donor.quartier}` : ''}</div>
          </div>
        </div>
        <button
          onClick={toggleAvailability}
          className="btn btn-lg"
          style={{ background: donor.available ? 'var(--green)' : 'rgba(255,255,255,0.1)', color: '#fff' }}
          aria-pressed={donor.available}
        >
          {donor.available ? '● Disponible pour donner' : '○ Indisponible — toucher pour activer'}
        </button>
      </div>

      {elig && (
        <div className="card">
          <div className="flex between">
            <div className="card-title" style={{ marginBottom: 0 }}><CalendarHeart size={18} className="text-red" /> Prochain don</div>
            {elig.eligible ? <span className="pill pill-green">Éligible</span> : <span className="pill pill-gold">Dans {elig.days_left} j</span>}
          </div>
          <p className="muted" style={{ margin: '6px 0 8px' }}>
            {elig.eligible
              ? 'Vous pouvez donner dès maintenant. Vous recevrez les alertes compatibles avec votre groupe.'
              : `Dernier don le ${fmtDate(donor.last_donation_date)}. Pour votre santé, prochain don possible le ${fmtDate(elig.next_date)} (délai de ${elig.interval} jours).`}
          </p>
          <Progress value={progressDays} max={100} tone={elig.eligible ? 'green' : 'gold'} />
        </div>
      )}

      <div className="stats-grid mt">
        <Link to="/donneur/urgences" className="stat-card" style={{ background: counts.urgent > 0 ? 'var(--red)' : '#fff', color: counts.urgent > 0 ? '#fff' : 'inherit', textDecoration: 'none' }}>
          <span className="ico"><Siren size={20} /></span>
          <div className="num">{counts.urgent}</div>
          <div className="lbl">{counts.urgent > 0 ? 'URGENCES actives' : 'Urgences'}</div>
        </Link>
        <div className="stat-card">
          <span className="ico"><HeartHandshake size={20} /></span>
          <div className="num">{counts.responded}</div>
          <div className="lbl">Réponses données</div>
        </div>
        <div className="stat-card">
          <span className="ico"><CheckCircle2 size={20} /></span>
          <div className="num">{counts.donations}</div>
          <div className="lbl">Dons réalisés</div>
        </div>
        <Link to="/donneur/historique" className="stat-card" style={{ textDecoration: 'none' }}>
          <span className="ico"><History size={20} /></span>
          <div className="num">→</div>
          <div className="lbl">Mon historique</div>
        </Link>
      </div>

      <h3 style={{ margin: '20px 0 10px', fontSize: 16 }}>Réponses récentes</h3>
      {history.length === 0 ? (
        <EmptyState text="Aucune réponse pour le moment. Vous serez notifié lors d'une urgence." />
      ) : (
        <div className="card">
          {history.slice(0, 5).map((h, i) => (
            <div className="row" key={i}>
              <BloodBadge group={h.blood_group} />
              <div className="grow">
                <div className="title">{h.hospital_name || 'Demande famille'}</div>
                <div className="sub">{h.quantity} poches · {URGENCY[h.urgency]?.label.replace(/[🔴🟠🟢]/g, '').trim()}</div>
              </div>
              <span className="badge" style={{ background: h.response === 'positive' ? 'var(--green)' : 'var(--gray-light)', color: h.response === 'positive' ? '#fff' : 'var(--gray)' }}>
                {h.response === 'positive' ? '✓ Je peux' : '✗ Non'}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}