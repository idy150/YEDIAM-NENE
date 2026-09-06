import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { Spinner, EmptyState, BloodBadge, UrgencyBadge, fmtDateTime } from '../../components/ui.jsx';

export default function HospResponses() {
  const [items, setItems] = useState(null);
  useEffect(() => { api('/hospital/responses').then(setItems).catch(() => setItems([])); }, []);

  if (!items) return <Spinner />;

  return (
    <>
      <div className="page-head"><h1>Réponses des donneurs</h1><span className="badge" style={{ background: 'var(--green)', color: '#fff' }}>{items.length} positives</span></div>
      {items.length === 0 ? (
        <EmptyState text="Aucune réponse positive reçue pour le moment." />
      ) : (
        <div className="card">
          {items.map((n) => (
            <div className="row" key={n.id}>
              <BloodBadge group={n.donor_group} />
              <div className="grow">
                <div className="title">{n.donor_name}</div>
                <div className="sub">{n.wilaya} · {n.telephone} · répondu le {fmtDateTime(n.responded_at)}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <UrgencyBadge urgency={n.urgency} />
                <span className="muted">{n.quantity} poches · {n.blood_group}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}