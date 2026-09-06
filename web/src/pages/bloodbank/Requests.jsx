import { useState } from 'react';
import { useEffect } from 'react';
import { Send } from 'lucide-react';
import { api } from '../../api.js';
import { Spinner, EmptyState, Alert, Modal, BloodBadge, UrgencyBadge, fmtDateTime } from '../../components/ui.jsx';

export default function BankRequests() {
  const [items, setItems] = useState(null);
  const [respond, setRespond] = useState(null);
  const [pockets, setPockets] = useState(1);
  const [message, setMessage] = useState('');
  const [msg, setMsg] = useState('');

  const load = () => api('/bloodbank/requests').then(setItems).catch(() => setItems([]));
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api(`/bloodbank/requests/${respond.id}/respond`, { method: 'POST', body: { available_pockets: Number(pockets), message } });
      setMsg(`Réponse envoyée : ${pockets} poches proposées.`);
      setTimeout(() => setMsg(''), 4000);
      setRespond(null);
      load();
    } catch (err) {
      setMsg(err.message);
    }
  };

  if (!items) return <Spinner />;

  return (
    <>
      <div className="page-head"><h1>Demandes actives</h1></div>
      {msg && <Alert type="success">{msg}</Alert>}
      {items.length === 0 ? (
        <EmptyState text="Aucune demande active pour le moment." />
      ) : (
        items.map((r) => (
          <div key={r.id} className="card urgency-card" style={r.urgency === 'urgent' ? { borderLeftColor: 'var(--orange)' } : r.urgency === 'normal' ? { borderLeftColor: 'var(--green)' } : {}}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <BloodBadge group={r.blood_group} tone={r.urgency === 'immediate' ? 'red' : ''} />
              <div className="grow">
                <div className="title">{r.quantity} poches · {r.blood_group}</div>
                <div className="sub">{r.hospital_name || `Patient : ${r.patient_name}`} · {r.wilaya || '—'} · {r.service || ''}</div>
                <div className="sub">{fmtDateTime(r.created_at)}</div>
                {r.additional_info && <div className="sub">{r.additional_info}</div>}
              </div>
              <UrgencyBadge urgency={r.urgency} />
            </div>
            {r.already_responded === 0 ? (
              <button className="btn btn-red mt" onClick={() => { setRespond(r); setPockets(Math.min(r.quantity, 5)); setMessage(''); }}>
                <Send size={16} /> Répondre avec des poches
              </button>
            ) : (
              <div className="alert alert-success mt" style={{ marginBottom: 0 }}>✓ Vous avez déjà répondu à cette demande.</div>
            )}
          </div>
        ))
      )}

      <Modal open={!!respond} onClose={() => setRespond(null)} title={respond ? `Répondre — sang ${respond.blood_group}` : ''}>
        <form onSubmit={submit}>
          <div className="field">
            <label>Poches disponibles</label>
            <input type="number" min={0} max={100} value={pockets} onChange={(e) => setPockets(e.target.value)} required />
          </div>
          <div className="field">
            <label>Message (facultatif)</label>
            <textarea rows={2} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="ex. Poches disponibles dès maintenant" />
          </div>
          <button className="btn btn-red">Envoyer la réponse</button>
        </form>
      </Modal>
    </>
  );
}