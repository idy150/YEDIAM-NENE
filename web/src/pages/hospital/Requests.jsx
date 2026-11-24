import { useEffect, useState } from 'react';
import { Eye, Square, CheckCircle2, HeartPulse } from 'lucide-react';
import { api } from '../../api.js';
import { Spinner, EmptyState, Modal, BloodBadge, UrgencyBadge, ReqStatusBadge, fmtDateTime } from '../../components/ui.jsx';
import { TARGET } from '../../constants.js';

export default function HospRequests() {
  const [items, setItems] = useState(null);
  const [detail, setDetail] = useState(null);

  const load = () => api('/hospital/requests').then(setItems).catch(() => setItems([]));
  useEffect(() => { load(); }, []);

  const openDetail = async (id) => {
    const d = await api(`/hospital/requests/${id}`);
    setDetail(d);
  };

  const confirmDonation = async (notificationId, outcome) => {
    await api(`/hospital/notifications/${notificationId}/donation`, { method: 'POST', body: { outcome } });
    openDetail(detail.request.id);
  };

  const act = async (fn, id) => {
    await fn(id);
    setDetail(null);
    load();
  };

  if (!items) return <Spinner />;
  const active = items.filter((r) => ['active', 'pending', 'five_reached'].includes(r.status));

  return (
    <>
      <div className="page-head"><h1>Demandes en cours</h1></div>
      {active.length === 0 ? (
        <EmptyState text="Aucune demande en cours." />
      ) : (
        active.map((r) => (
          <div key={r.id} className="card urgency-card" style={r.urgency === 'urgent' ? { borderLeftColor: 'var(--orange)' } : r.urgency === 'normal' ? { borderLeftColor: 'var(--green)' } : {}}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <BloodBadge group={r.blood_group} tone={r.urgency === 'immediate' ? 'red' : ''} />
              <div className="grow">
                <div className="title">{r.quantity} poches · {r.service || '—'}</div>
                <div className="sub">{fmtDateTime(r.created_at)} · {r.notified} notifiés</div>
                <div className="progress"><div style={{ width: `${Math.min(100, (r.positives / TARGET) * 100)}%` }} /></div>
                <div className="sub" style={{ fontWeight: 700, color: r.positives >= TARGET ? 'var(--green)' : 'var(--red)' }}>
                  {r.positives} / {TARGET} réponses positives
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                <UrgencyBadge urgency={r.urgency} />
                <ReqStatusBadge status={r.status} />
              </div>
            </div>
            <div className="row-actions mt">
              <button className="btn btn-outline btn-sm" onClick={() => openDetail(r.id)}><Eye size={15} /> Voir les réponses</button>
              {r.status !== 'five_reached' && (
                <button className="btn btn-outline-red btn-sm" onClick={() => act(() => api(`/hospital/requests/${r.id}/stop`, { method: 'POST' }), r.id)}>
                  <Square size={14} /> Arrêter
                </button>
              )}
              <button className="btn btn-sm" style={{ background: 'var(--green)', color: '#fff' }} onClick={() => act(() => api(`/hospital/requests/${r.id}/complete`, { method: 'POST' }), r.id)}>
                <CheckCircle2 size={14} /> Clôturer
              </button>
            </div>
          </div>
        ))
      )}

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail ? `Réponses — sang ${detail.request.blood_group}` : ''}>
        {detail && (
          <>
            <p className="muted mb">
              Les donneurs compatibles (groupe identique en priorité) ont été alertés. Confirmez chaque don pour mettre à jour l’historique du donneur.
            </p>
            <p className="muted mb">
              {detail.request.quantity} poches · {detail.request.service || '—'} · créée le {fmtDateTime(detail.request.created_at)}
            </p>
            {detail.responses.length === 0 ? (
              <EmptyState text="Aucune réponse pour l'instant. Les donneurs sont en cours de notification." />
            ) : (
              detail.responses.map((n) => (
                <div className="row" key={n.id}>
                  <BloodBadge group={n.donor_group} />
                  <div className="grow">
                    <div className="title">{n.donor_name}</div>
                    <div className="sub">{n.wilaya}{n.quartier ? ` · ${n.quartier}` : ''} · {n.telephone}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <span className="badge" style={{ background: n.response === 'positive' ? 'var(--green)' : 'var(--gray-light)', color: n.response === 'positive' ? '#fff' : 'var(--gray)' }}>
                      {n.response === 'positive' ? '✓ Peut donner' : '✗ Non disponible'}
                    </span>
                    {n.response === 'positive' && (
                      n.donation_status === 'completed' ? <span className="pill pill-green"><HeartPulse size={12} /> Don réalisé</span>
                      : n.donation_status === 'cancelled' ? <span className="pill">Absent</span>
                      : (
                        <div className="row-actions">
                          <button className="btn btn-green btn-sm" onClick={() => confirmDonation(n.id, 'completed')}><HeartPulse size={13} /> Don réalisé</button>
                          <button className="btn btn-outline btn-sm" onClick={() => confirmDonation(n.id, 'cancelled')}>Absent</button>
                        </div>
                      )
                    )}
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </Modal>
    </>
  );
}