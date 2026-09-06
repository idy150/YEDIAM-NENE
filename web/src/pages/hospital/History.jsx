import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { Spinner, EmptyState, BloodBadge, UrgencyBadge, ReqStatusBadge, fmtDateTime } from '../../components/ui.jsx';

export default function HospHistory() {
  const [items, setItems] = useState(null);
  useEffect(() => { api('/hospital/history').then(setItems).catch(() => setItems([])); }, []);

  if (!items) return <Spinner />;

  return (
    <>
      <div className="page-head"><h1>Historique</h1></div>
      {items.length === 0 ? (
        <EmptyState text="Aucune demande terminée." />
      ) : (
        <div className="card">
          {items.map((r) => (
            <div className="row" key={r.id}>
              <BloodBadge group={r.blood_group} />
              <div className="grow">
                <div className="title">{r.quantity} poches · {r.service || '—'}</div>
                <div className="sub">Créée le {fmtDateTime(r.created_at)} · clôturée le {fmtDateTime(r.closed_at)} · {r.positives} réponse(s) positive(s)</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <UrgencyBadge urgency={r.urgency} />
                <ReqStatusBadge status={r.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}