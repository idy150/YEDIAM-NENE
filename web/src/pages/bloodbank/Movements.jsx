import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { Spinner, EmptyState, fmtDateTime } from '../../components/ui.jsx';

export default function BankMovements() {
  const [items, setItems] = useState(null);
  useEffect(() => { api('/bloodbank/movements').then(setItems).catch(() => setItems([])); }, []);

  if (!items) return <Spinner />;

  return (
    <>
      <div className="page-head"><h1>Historique des mouvements</h1></div>
      {items.length === 0 ? (
        <EmptyState text="Aucun mouvement enregistré." />
      ) : (
        <div className="card">
          {items.map((m) => (
            <div className="row" key={m.id}>
              <span className="blood-badge" style={{ background: m.delta > 0 ? 'var(--green)' : 'var(--red)' }}>{m.blood_group}</span>
              <div className="grow">
                <div className="title">{m.delta > 0 ? `+${m.delta}` : m.delta} poches · {m.reason}</div>
                <div className="sub">{fmtDateTime(m.created_at)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}