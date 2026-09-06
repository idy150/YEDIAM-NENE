import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Siren, HeartHandshake, History, CheckCircle2 } from 'lucide-react';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { BloodBadge, Spinner, EmptyState, fmtDate } from '../../components/ui.jsx';
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

  return (
    <>
      <div className="card" style={{ background: 'var(--black)', color: '#fff', textAlign: 'center', padding: 24 }}>
        <p className="muted" style={{ color: '#aaa' }}>Bonjour {user.nom} 👋</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, margin: '14px 0' }}>
          <BloodBadge group={donor.blood_group} tone="red" />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 800, fontSize: 18 }}>Mon groupe</div>
            <div className="muted" style={{ color: '#aaa', fontSize: 13 }}>{donor.wilaya}{donor.quartier ? ` · ${donor.quartier}` : ''}</div>
          </div>
        </div>
        <button
          onClick={toggleAvailability}
          className="btn btn-lg"
          style={{ background: donor.available ? 'var(--green)' : 'var(--gray)', color: '#fff' }}
        >
          {donor.available ? '🟢 Disponible pour donner' : '⚫ Indisponible'}
        </button>
        {donor.last_donation_date && (
          <p className="muted" style={{ color: '#aaa', marginTop: 10, fontSize: 13 }}>
            Dernier don : {fmtDate(donor.last_donation_date)}
          </p>
        )}
      </div>

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