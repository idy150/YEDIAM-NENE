import { useEffect, useState } from 'react';
import { Check, X, Square, RotateCw, Plus } from 'lucide-react';
import { api } from '../../api.js';
import { Spinner, EmptyState, Modal, BloodBadge, UrgencyBadge, ReqStatusBadge, fmtDateTime, Alert, PageHead } from '../../components/ui.jsx';
import { BLOOD_GROUPS, WILAYAS } from '../../constants.js';

const TABS = [
  ['', 'Toutes'],
  ['active', 'En cours'],
  ['pending', 'En attente'],
  ['five_reached', '5 réponses'],
  ['completed', 'Terminées'],
  ['cancelled', 'Annulées'],
];

export default function AdminRequests() {
  const [tab, setTab] = useState('');
  const [blood_group, setBloodGroup] = useState('');
  const [items, setItems] = useState(null);
  const [msg, setMsg] = useState('');
  const [showLaunch, setShowLaunch] = useState(false);
  const [hospitals, setHospitals] = useState([]);
  const [launch, setLaunch] = useState({ hospital_id: '', blood_group: '', quantity: 3, urgency: 'urgent', wilaya: '', service: '', additional_info: '' });

  const load = () => {
    const p = new URLSearchParams();
    if (tab) p.set('status', tab);
    if (blood_group) p.set('blood_group', blood_group);
    api(`/admin/requests?${p}`).then(setItems).catch(() => setItems([]));
  };
  useEffect(() => { load(); }, [tab, blood_group]);

  useEffect(() => {
    api('/admin/hospitals?status=active').then(setHospitals).catch(() => {});
  }, []);

  const act = async (fn, label) => {
    await fn();
    setMsg(`${label} ✓`);
    setTimeout(() => setMsg(''), 3000);
    load();
  };

  const submitLaunch = async (e) => {
    e.preventDefault();
    await api('/admin/launch-request', { method: 'POST', body: { ...launch, hospital_id: Number(launch.hospital_id), quantity: Number(launch.quantity) } });
    setShowLaunch(false);
    setMsg('Demande urgente lancée — donneurs notifiés ✓');
    setTimeout(() => setMsg(''), 4000);
    load();
  };

  return (
    <>
      <PageHead title="Gestion des demandes" sub="Toutes les demandes du réseau — validation famille, arrêt, relance" actions={
        <button className="btn btn-red btn-sm" onClick={() => setShowLaunch(true)}><Plus size={16} /> Lancer une urgence</button>
      } />
      {msg && <Alert type="success">{msg}</Alert>}

      <div className="toolbar">
        {TABS.map(([v, l]) => (
          <button key={v} className={`chip ${tab === v ? 'selected' : ''}`} onClick={() => setTab(v)}>{l}</button>
        ))}
        <select value={blood_group} onChange={(e) => setBloodGroup(e.target.value)}>
          <option value="">Groupe : tous</option>
          {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      {!items ? <Spinner /> : items.length === 0 ? (
        <EmptyState text="Aucune demande trouvée." />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Type</th><th>Sang</th><th>Quantité</th><th>Hôpital / Patient</th><th>Wilaya</th><th>Urgence</th><th>Statut</th><th>Créée le</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id}>
                  <td>
                    <span className="badge" style={{ background: r.requester_type === 'hospital' ? 'var(--black)' : 'var(--gold)', color: '#fff' }}>
                      {r.requester_type === 'hospital' ? 'Hôpital' : 'Famille'}
                    </span>
                  </td>
                  <td><b>{r.blood_group}</b></td>
                  <td>{r.quantity}</td>
                  <td>
                    <b>{r.hospital_name || r.patient_name}</b>
                    {r.patient_name && <div className="muted">Patient : {r.patient_name} · {r.family_contact}</div>}
                  </td>
                  <td>{r.wilaya || '—'}</td>
                  <td><UrgencyBadge urgency={r.urgency} /></td>
                  <td><ReqStatusBadge status={r.status} /></td>
                  <td>{fmtDateTime(r.created_at)}</td>
                  <td>
                    <div className="row-actions" style={{ flexWrap: 'nowrap' }}>
                      {r.status === 'pending' && r.requester_type === 'family' && (
                        <>
                          <button className="btn btn-sm" style={{ background: 'var(--green)', color: '#fff' }} onClick={() => act(() => api(`/admin/requests/${r.id}/approve`, { method: 'POST' }), 'Demande diffusée')}>
                            <Check size={14} /> Diffuser
                          </button>
                          <button className="btn btn-sm btn-outline-red" onClick={() => act(() => api(`/admin/requests/${r.id}/refuse`, { method: 'POST' }), 'Demande refusée')}>
                            <X size={14} />
                          </button>
                        </>
                      )}
                      {['active', 'pending'].includes(r.status) && (
                        <>
                          <button className="btn btn-sm btn-outline" onClick={() => act(() => api(`/admin/requests/${r.id}/relaunch`, { method: 'POST' }), 'Donneurs relancés')}>
                            <RotateCw size={14} /> Relancer
                          </button>
                          <button className="btn btn-sm btn-outline-red" onClick={() => act(() => api(`/admin/requests/${r.id}/stop`, { method: 'POST' }), 'Demande arrêtée')}>
                            <Square size={14} /> Arrêter
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showLaunch} onClose={() => setShowLaunch(false)} title="Lancer une demande urgente">
        <form onSubmit={submitLaunch}>
          <div className="field">
            <label>Hôpital</label>
            <select required value={launch.hospital_id} onChange={(e) => setLaunch({ ...launch, hospital_id: e.target.value })}>
              <option value="">Choisir…</option>
              {hospitals.map((h) => <option key={h.id} value={h.id}>{h.nom}</option>)}
            </select>
          </div>
          <div className="grid-2">
            <div className="field">
              <label>Groupe sanguin</label>
              <select required value={launch.blood_group} onChange={(e) => setLaunch({ ...launch, blood_group: e.target.value })}>
                <option value="">Choisir…</option>
                {BLOOD_GROUPS.map((g) => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Poches</label>
              <input type="number" min={1} value={launch.quantity} onChange={(e) => setLaunch({ ...launch, quantity: e.target.value })} />
            </div>
          </div>
          <div className="grid-2">
            <div className="field">
              <label>Urgence</label>
              <select value={launch.urgency} onChange={(e) => setLaunch({ ...launch, urgency: e.target.value })}>
                <option value="immediate">🔴 IMMÉDIAT</option>
                <option value="urgent">🟠 URGENT</option>
                <option value="normal">🟢 NORMAL</option>
              </select>
            </div>
            <div className="field">
              <label>Wilaya</label>
              <select value={launch.wilaya} onChange={(e) => setLaunch({ ...launch, wilaya: e.target.value })}>
                <option value="">—</option>
                {WILAYAS.map((w) => <option key={w}>{w}</option>)}
              </select>
            </div>
          </div>
          <div className="field"><label>Service</label><input value={launch.service} onChange={(e) => setLaunch({ ...launch, service: e.target.value })} /></div>
          <div className="field"><label>Informations</label><textarea rows={2} value={launch.additional_info} onChange={(e) => setLaunch({ ...launch, additional_info: e.target.value })} /></div>
          <button className="btn btn-red">Lancer et notifier les donneurs</button>
        </form>
      </Modal>
    </>
  );
}