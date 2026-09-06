import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { Spinner, EmptyState, BloodBadge, fmtDateTime } from '../../components/ui.jsx';

export default function HospUsers() {
  const [items, setItems] = useState(null);
  useEffect(() => { api('/hospital/users').then(setItems).catch(() => setItems([])); }, []);

  if (!items) return <Spinner />;

  return (
    <>
      <div className="page-head"><h1>Donneurs</h1><span className="badge" style={{ background: 'var(--gold)', color: '#fff' }}>{items.length} contacts</span></div>
      {items.length === 0 ? (
        <EmptyState text="Aucun donneur n'a encore répondu à vos demandes." />
      ) : (
        <div className="card">
          {items.map((d) => (
            <div className="row" key={d.id}>
              <BloodBadge group={d.blood_group} />
              <div className="grow">
                <div className="title">{d.nom}</div>
                <div className="sub">{d.wilaya}{d.quartier ? ` · ${d.quartier}` : ''} · {d.telephone}</div>
                <div className="sub">Dernière réponse : {fmtDateTime(d.last_response)}</div>
              </div>
              <span className="badge" style={{ background: d.available ? 'var(--green)' : 'var(--gray-light)', color: d.available ? '#fff' : 'var(--gray)' }}>
                {d.available ? '🟢 Disponible' : '⚫ Indisponible'}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}