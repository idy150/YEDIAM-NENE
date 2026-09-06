import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Siren, CheckCircle2, MessageCircle, Landmark } from 'lucide-react';
import { api } from '../../api.js';
import { Spinner, StatCard, UrgencyBadge, BloodBadge, ReqStatusBadge, fmtDateTime } from '../../components/ui.jsx';

export default function HospDashboard() {
  const [data, setData] = useState(null);
  useEffect(() => { api('/hospital/dashboard').then(setData).catch(() => {}); }, []);

  if (!data) return <Spinner />;
  const { hospital, counts, recent } = data;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{hospital.nom}</h1>
          <div className="sub">{hospital.wilaya}{hospital.moughataa ? ` · ${hospital.moughataa}` : ''}</div>
        </div>
      </div>

      {hospital.subscription_status !== 'active' && (
        <div className="alert alert-error">
          ⚠️ Abonnement {hospital.subscription_status === 'expired' ? 'expiré' : 'non actif'} — vous ne pouvez pas créer de demande.
          <Link to="/hopital/abonnement" className="text-red" style={{ fontWeight: 800, marginLeft: 6 }}>Renouveler →</Link>
        </div>
      )}

      <Link to="/hopital/nouvelle-demande" className="big-cta">
        <Plus size={24} /> NOUVELLE DEMANDE URGENTE
      </Link>

      <div className="stats-grid">
        <StatCard icon={<Siren size={20} />} num={counts.activeRequests} label="Demandes en cours" />
        <StatCard icon={<CheckCircle2 size={20} />} num={counts.fiveReached} label="5 réponses atteintes" color="var(--green)" />
        <StatCard icon={<MessageCircle size={20} />} num={counts.positiveResponses} label="Réponses positives" color="var(--gold)" />
        <StatCard icon={<Landmark size={20} />} num={counts.bloodBanks} label="Banques de sang" color="var(--black)" />
      </div>

      <h3 style={{ margin: '20px 0 10px', fontSize: 16 }}>Demandes récentes</h3>
      {recent.length === 0 ? (
        <div className="card muted" style={{ textAlign: 'center', padding: 30 }}>Aucune demande active. Lancez votre première demande !</div>
      ) : (
        recent.map((r) => (
          <div key={r.id} className="card urgency-card" style={r.urgency === 'normal' ? { borderLeftColor: 'var(--green)' } : r.urgency === 'urgent' ? { borderLeftColor: 'var(--orange)' } : {}}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <BloodBadge group={r.blood_group} tone={r.urgency === 'immediate' ? 'red' : r.urgency === 'normal' ? 'gold' : ''} />
              <div className="grow">
                <div className="title">{r.quantity} poches · {r.service || 'Service général'}</div>
                <div className="sub">{fmtDateTime(r.created_at)} · {r.positives} réponse(s) positive(s) / 5</div>
                <div className="progress"><div style={{ width: `${Math.min(100, (r.positives / 5) * 100)}%` }} /></div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                <UrgencyBadge urgency={r.urgency} />
                <ReqStatusBadge status={r.status} />
              </div>
            </div>
          </div>
        ))
      )}
    </>
  );
}