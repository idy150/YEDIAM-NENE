import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { Spinner, EmptyState, BloodBadge, fmtDate, fmtDateTime } from '../../components/ui.jsx';

export default function DonorHistory() {
  const [data, setData] = useState(null);
  useEffect(() => { api('/donor/history').then(setData).catch(() => setData({ donations: [], responses: [] })); }, []);

  if (!data) return <Spinner />;

  return (
    <>
      <div className="page-head"><h1>Mon historique</h1></div>

      <h3 style={{ margin: '8px 0 10px', fontSize: 16 }}>🩸 Mes dons</h3>
      {data.donations.length === 0 ? (
        <EmptyState text="Aucun don enregistré pour le moment." />
      ) : (
        <div className="card">
          {data.donations.map((d) => (
            <div className="row" key={d.id}>
              <BloodBadge group={d.blood_group || '?'} />
              <div className="grow">
                <div className="title">{d.hospital_name || d.blood_bank_name || 'Établissement'}</div>
                <div className="sub">{fmtDate(d.donation_date)}</div>
              </div>
              <span className="badge" style={{ background: d.status === 'completed' ? 'var(--green)' : 'var(--gold)', color: '#fff' }}>
                {d.status === 'completed' ? '✓ Don effectué' : 'Programmé'}
              </span>
            </div>
          ))}
        </div>
      )}

      <h3 style={{ margin: '20px 0 10px', fontSize: 16 }}>💬 Mes réponses aux urgences</h3>
      {data.responses.length === 0 ? (
        <EmptyState text="Aucune réponse enregistrée." />
      ) : (
        <div className="card">
          {data.responses.map((r, i) => (
            <div className="row" key={i}>
              <BloodBadge group={r.blood_group} />
              <div className="grow">
                <div className="title">{r.hospital_name || 'Demande'}</div>
                <div className="sub">{r.quantity} poches · {fmtDateTime(r.responded_at)}</div>
              </div>
              <span className="badge" style={{ background: r.response === 'positive' ? 'var(--green)' : 'var(--gray-light)', color: r.response === 'positive' ? '#fff' : 'var(--gray)' }}>
                {r.response === 'positive' ? '✓ Oui' : '✗ Non'}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="card mt" style={{ textAlign: 'center', background: 'var(--gold-soft)' }}>
        <p style={{ fontWeight: 700, color: '#7a6416' }}>
          Merci pour votre geste. 💛
          <br />
          <span className="muted">Votre don peut contribuer à sauver une vie.</span>
        </p>
      </div>
    </>
  );
}