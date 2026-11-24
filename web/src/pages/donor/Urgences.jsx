import { useEffect, useState } from 'react';
import { Siren, Truck, Phone } from 'lucide-react';
import { api } from '../../api.js';
import { Spinner, EmptyState, UrgencyBadge, BloodBadge, Modal, StatusBadge, fmtDateTime, fmtMoney, Alert } from '../../components/ui.jsx';
import { TRANSPORT_STATUS } from '../../constants.js';

export default function DonorUrgences() {
  const [items, setItems] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [flash, setFlash] = useState('');

  const [transport, setTransport] = useState([]);
  const [tr, setTr] = useState(null); // demande de soutien en cours de saisie
  const [trError, setTrError] = useState('');

  const load = () => {
    api('/donor/transport-requests').then(setTransport).catch(() => {});
    return api('/donor/notifications').then(setItems).catch(() => setItems([]));
  };

  const sendTransport = async (e) => {
    e.preventDefault();
    setTrError('');
    try {
      const res = await api('/donor/transport-requests', { method: 'POST', body: { request_id: tr.request_id, amount: Number(tr.amount), note: tr.note } });
      setTr(null);
      setFlash(res.message);
      load();
    } catch (err) { setTrError(err.message); }
  };
  useEffect(() => { load(); }, []);

  const respond = async (id, response) => {
    setBusyId(id);
    try {
      const res = await api(`/donor/notifications/${id}/respond`, { method: 'POST', body: { response } });
      setFlash({ type: 'success', text: res.message });
      load();
    } catch (err) {
      setFlash({ type: 'error', text: err.message });
      load();
    } finally {
      setBusyId(null);
    }
  };

  if (!items) return <Spinner />;
  const active = items.filter((n) => n.notification_status === 'sent' && n.request_status === 'active');
  const transportFor = (requestId) => transport.find((t) => t.request_id === requestId);
  const past = items.filter((n) => n.notification_status === 'responded' || n.request_status !== 'active');

  return (
    <>
      <div className="page-head">
        <h1>Urgences</h1>
      </div>
      {flash && <Alert type={flash.type || 'success'}>{flash.text || flash}</Alert>}

      {active.length === 0 && (
        <EmptyState text="Aucune urgence en attente. Merci d'être disponible !" icon={<Siren size={40} />} />
      )}

      {active.map((n) => (
        <div key={n.notification_id} className={`card urgency-card ${n.urgency}`}>
          <div className="flex" style={{ alignItems: 'flex-start', gap: 14 }}>
            <BloodBadge group={n.blood_group} tone="red" />
            <div className="grow">
              <div className="flex between wrap" style={{ gap: 6 }}>
                <div className="title" style={{ fontWeight: 800, fontSize: 16 }}>Besoin urgent de sang {n.blood_group}</div>
                <UrgencyBadge urgency={n.urgency} />
              </div>
              <div className="sub">{n.hospital_name || 'Hôpital'} · {n.hospital_wilaya || '—'}</div>
              <div className="sub">{n.quantity} poches · alerte {fmtDateTime(n.sent_at)}{n.service ? ` · ${n.service}` : ''}</div>
              {n.additional_info && <div className="sub" style={{ marginTop: 4, color: 'var(--ink-2)' }}>{n.additional_info}</div>}
            </div>
          </div>
          <div className="grid-2 mt">
            <button className="btn btn-red btn-lg" disabled={busyId === n.notification_id} onClick={() => respond(n.notification_id, 'positive')}>
              Je peux donner
            </button>
            <button className="btn btn-outline btn-lg" disabled={busyId === n.notification_id} onClick={() => respond(n.notification_id, 'negative')}>
              Pas disponible
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
                  <div className="sub">{n.quantity} poches · {n.responded_at ? `répondu le ${fmtDateTime(n.responded_at)}` : 'demande clôturée avant votre réponse'}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <span className="badge" style={{ background: n.response === 'positive' ? 'var(--green)' : n.response ? 'var(--gray-light)' : 'var(--paper)', color: n.response === 'positive' ? '#fff' : 'var(--gray)' }}>
                    {n.response === 'positive' ? '✓ Je peux donner' : n.response ? '✗ Indisponible' : 'Clôturée'}
                  </span>
                  {n.response === 'positive' && n.hospital_telephone && (
                    <a className="pill" href={`tel:${n.hospital_telephone}`}><Phone size={12} /> Hôpital</a>
                  )}
                  {n.response === 'positive' && (transportFor(n.request_id) ? (
                    <StatusBadge status={transportFor(n.request_id).status} map={TRANSPORT_STATUS} />
                  ) : ['active', 'five_reached'].includes(n.request_status) && (
                    <button className="pill pill-blue" style={{ border: 'none' }} onClick={() => { setTrError(''); setTr({ request_id: n.request_id, amount: 500, note: '', label: n.hospital_name }); }}>
                      <Truck size={12} /> Soutien transport
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      <Modal open={!!tr} onClose={() => setTr(null)} title="Soutien transport">
        {tr && (
          <form onSubmit={sendTransport}>
            {trError && <Alert type="error">{trError}</Alert>}
            <p className="muted mb">
              Votre déplacement vers {tr.label || 'l’hôpital'} peut être remboursé par le fonds solidaire YEDIAM NENE, financé par des contributions volontaires.
              Le don de sang reste bénévole et gratuit.
            </p>
            <div className="field">
              <label>Montant estimé (MRU)</label>
              <input type="number" min={1} max={2000} value={tr.amount} onChange={(e) => setTr({ ...tr, amount: e.target.value })} required />
              <div className="hint">Maximum 2 000 MRU par déplacement · versé par mobile money après validation.</div>
            </div>
            <div className="field">
              <label>Précision (facultatif)</label>
              <input value={tr.note} onChange={(e) => setTr({ ...tr, note: e.target.value })} placeholder="ex. Taxi aller-retour depuis Arafat" />
            </div>
            <button className="btn btn-red"><Truck size={17} /> Envoyer la demande</button>
            {transport.length > 0 && <p className="muted center mt">Total déjà demandé : {fmtMoney(transport.reduce((a, t) => a + Number(t.amount), 0))}</p>}
          </form>
        )}
      </Modal>
    </>
  );
}