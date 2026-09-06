import { useEffect, useState } from 'react';
import { MapPin, Phone } from 'lucide-react';
import { api } from '../../api.js';
import { Spinner, EmptyState } from '../../components/ui.jsx';

export default function HospBloodBanks() {
  const [items, setItems] = useState(null);
  useEffect(() => { api('/hospital/blood-banks').then(setItems).catch(() => setItems([])); }, []);

  if (!items) return <Spinner />;

  return (
    <>
      <div className="page-head"><h1>Banques de sang</h1><span className="badge" style={{ background: 'var(--black)', color: '#fff' }}>{items.length} actives</span></div>
      {items.length === 0 ? (
        <EmptyState text="Aucune banque de sang disponible." />
      ) : (
        items.map((b) => (
          <div className="card" key={b.id}>
            <div className="row">
              <span className="blood-badge gold">🏦</span>
              <div className="grow">
                <div className="title">{b.nom}</div>
                <div className="sub"><MapPin size={12} style={{ verticalAlign: -2 }} /> {b.wilaya}{b.adresse ? ` · ${b.adresse}` : ''}</div>
                <div className="sub"><Phone size={12} style={{ verticalAlign: -2 }} /> {b.telephone || '—'}</div>
              </div>
            </div>
            <div className="table-wrap" style={{ marginTop: 10 }}>
              <table style={{ minWidth: 0 }}>
                <thead><tr><th>Groupe</th><th>Stock</th></tr></thead>
                <tbody>
                  {(b.stocks || []).map((s) => (
                    <tr key={s.blood_group}>
                      <td><b>{s.blood_group}</b></td>
                      <td style={{ color: s.quantity <= 5 ? 'var(--red)' : 'inherit', fontWeight: 700 }}>
                        {s.quantity} {s.quantity <= 5 && '⚠️'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </>
  );
}