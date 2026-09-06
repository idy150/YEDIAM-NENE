import { useEffect, useState } from 'react';
import { Siren } from 'lucide-react';
import { api } from '../../api.js';
import { Spinner, EmptyState, UrgencyBadge, fmtDateTime, Alert } from '../../components/ui.jsx';

export default function DonorUrgences() {
  const [items, setItems] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [flash, setFlash] = useState('');

  const load = () => api('/donor/notifications').then(setItems).catch(() => setItems([]));
  useEffect(() => { load(); }, []);

  const respond = async (id, response) => {
    setBusyId(id);
    try {
      const res = await api(`/donor/notifications/${id}/respond`, { method: 'POST', body: { response } });
      setFlash(res.message);
      setTimeout(() => setFlash(''), 4000);
      load();
    } catch (err) {
      setFlash(err.message);
    } finally {
      setBusyId(null);
    }
  };

  if (!items) return <Spinner />;
  const active = items.filter((n) => n.notification_status === 'sent');
  const past = items.filter((n) => n.notification_status === 'responded');

  return (
    <>
      <div className="page-head">
        <h1>Urgences</h1>
      </div>
      {flash && <Alert type="success">{flash}</Alert>}

      {active.length === 0 && (
        <EmptyState text="Aucune urgence en attente. Merci d'être disponible !" icon={<Siren size={40} />} />
      )}

      {active.map((n) => (
        <div key={n.notification_id} className={`card urgency-card ${n.urgency}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 30 }}>🩸</span>
            <div className="grow">
              <div className="title">BESOIN URGENT DE SANG {n.blood_group}</div>
              <div className="sub">{n.hospital_name || 'Hôpital'} · {n.hospital_wilaya || '—'}</div>
              <div className="sub">{n.quantity} poches · {fmtDateTime(n.sent_at)}</div>
              {n.service && <div className="sub">Service : {n.service}</div>}
              {n.additional_info && <div className="sub">{n.additional_info}</div>}
              <div className="mt"><UrgencyBadge urgency={n.urgency} /></div>
            </div>
          </div>
          <div className="grid-2 mt">
            <button className="btn btn-red" disabled={busyId === n.notification_id} onClick={() => respond(n.notification_id, 'positive')}>
              🩸 JE PEUX DONNER
            </button>
            <button className="btn btn-outline" disabled={busyId === n.notification_id} onClick={() => respond(n.notification_id, 'negative')}>
              ❌ JE NE SUIS PAS DISPONIBLE
            </button>
          </div>
        </div>
      ))}

      {past.length > 0 && (
        <>
          <h3 style={{ margin: '20px 0 10px', fontSize: 16 }}>Déjà traitées</h3>
          <div className="card">
            {past.map((n) => (
              <div className="row" key={n.notification_id}>
                <div className="grow">
                  <div className="title">Sang {n.blood_group} · {n.hospital_name}</div>
                  <div className="sub">{n.quantity} poches · répondu le {fmtDateTime(n.responded_at)}</div>
                </div>
                <span className="badge" style={{ background: n.response === 'positive' ? 'var(--green)' : 'var(--gray-light)', color: n.response === 'positive' ? '#fff' : 'var(--gray)' }}>
                  {n.response === 'positive' ? '✓ Je peux donner' : '✗ Indisponible'}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}