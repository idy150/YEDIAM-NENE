import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Users, ExternalLink, CheckCircle2, XCircle, Flag } from 'lucide-react';
import { api } from '../api.js';
import { Spinner, EmptyState, Modal, Alert, PageHead, StatusBadge, Progress, fmtMoney, fmtDate, useToast, BloodBadge } from './ui.jsx';
import { BLOOD_GROUPS, WILAYAS, CAMPAIGN_STATUS, CAMPAIGN_TYPES } from '../constants.js';

const empty = {
  title: '', description: '', type: 'collecte', wilaya: '', location: '',
  start_date: new Date().toISOString().slice(0, 10), end_date: '', target_donors: 50, target_amount: 0, target_groups: [],
};

// Gestion des campagnes pour les organisateurs (Super Admin, hôpital, banque de sang)
export default function CampaignManager({ subtitle }) {
  const [items, setItems] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [participants, setParticipants] = useState(null);
  const [toast, setToast] = useToast();

  const load = () => api('/campaigns/mine').then(setItems).catch(() => setItems([]));
  useEffect(() => { load(); }, []);

  const openForm = (c) => {
    setError('');
    setEditing(c || 'new');
    setForm(c ? {
      ...empty, ...c,
      start_date: c.start_date?.slice(0, 10), end_date: c.end_date?.slice(0, 10),
      target_groups: c.target_groups || [], description: c.description || '', wilaya: c.wilaya || '', location: c.location || '',
    } : empty);
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const body = {
        title: form.title, description: form.description, type: form.type, wilaya: form.wilaya, location: form.location,
        start_date: form.start_date, end_date: form.end_date, target_donors: Number(form.target_donors),
        target_amount: Number(form.target_amount), target_groups: form.target_groups,
      };
      if (editing === 'new') await api('/campaigns', { method: 'POST', body });
      else await api(`/campaigns/${editing.id}`, { method: 'PUT', body });
      setEditing(null);
      setToast(editing === 'new' ? 'Campagne publiée' : 'Campagne mise à jour');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (c, status) => {
    await api(`/campaigns/${c.id}/status`, { method: 'POST', body: { status } });
    setToast('Statut mis à jour');
    load();
  };

  const openParticipants = async (c) => {
    const rows = await api(`/campaigns/${c.id}/participants`);
    setParticipants({ campaign: c, rows });
  };

  const markDonated = async (pid) => {
    await api(`/campaigns/${participants.campaign.id}/participants/${pid}/donated`, { method: 'POST' });
    openParticipants(participants.campaign);
    load();
  };

  const toggleGroup = (g) =>
    setForm((f) => ({ ...f, target_groups: f.target_groups.includes(g) ? f.target_groups.filter((x) => x !== g) : [...f.target_groups, g] }));

  if (!items) return <Spinner />;

  return (
    <>
      <PageHead
        title="Campagnes"
        sub={subtitle || 'Collectes de sang et campagnes de sensibilisation'}
        actions={<button className="btn btn-red btn-sm" onClick={() => openForm(null)}><Plus size={16} /> Nouvelle campagne</button>}
      />

      {items.length === 0 ? (
        <div className="card"><EmptyState text="Aucune campagne. Lancez votre première collecte pour mobiliser les donneurs." /></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Campagne</th><th>Dates</th><th>Donneurs</th><th>Fonds</th><th>Statut</th><th /></tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{c.title}</div>
                    <div className="muted">{CAMPAIGN_TYPES[c.type]} · {c.organizer_name}{c.wilaya ? ` · ${c.wilaya}` : ''}</div>
                  </td>
                  <td className="muted">{fmtDate(c.start_date)} → {fmtDate(c.end_date)}</td>
                  <td style={{ minWidth: 130 }}>
                    {c.type === 'collecte' ? (
                      <>
                        <div className="muted"><b style={{ color: 'var(--ink)' }}>{c.participants}</b> / {c.target_donors || '—'} · {c.donations} dons</div>
                        {c.target_donors > 0 && <Progress value={c.participants} max={c.target_donors} />}
                      </>
                    ) : <span className="muted">—</span>}
                  </td>
                  <td style={{ minWidth: 150 }}>
                    <div className="muted"><b style={{ color: 'var(--ink)' }}>{fmtMoney(c.collected)}</b>{c.target_amount > 0 ? ` / ${fmtMoney(c.target_amount)}` : ''}</div>
                    {c.target_amount > 0 && <Progress value={c.collected} max={c.target_amount} tone="gold" />}
                  </td>
                  <td><StatusBadge status={c.status} map={CAMPAIGN_STATUS} /></td>
                  <td>
                    <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
                      {c.type === 'collecte' && <button className="btn btn-outline btn-sm" onClick={() => openParticipants(c)} title="Participants"><Users size={15} /></button>}
                      <button className="btn btn-outline btn-sm" onClick={() => openForm(c)} title="Modifier"><Pencil size={15} /></button>
                      {c.status === 'active' && <button className="btn btn-outline btn-sm" onClick={() => setStatus(c, 'completed')} title="Clôturer"><Flag size={15} /></button>}
                      {c.status === 'active' && <button className="btn btn-outline-red btn-sm" onClick={() => setStatus(c, 'cancelled')} title="Annuler"><XCircle size={15} /></button>}
                      {c.status !== 'active' && <button className="btn btn-outline btn-sm" onClick={() => setStatus(c, 'active')}>Réactiver</button>}
                      <Link className="btn btn-outline btn-sm" to={`/campagnes/${c.id}`} target="_blank" title="Page publique"><ExternalLink size={15} /></Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'Nouvelle campagne' : 'Modifier la campagne'}>
        <form onSubmit={save}>
          {error && <Alert type="error">{error}</Alert>}
          <div className="field">
            <label>Type</label>
            <div className="chips">
              {Object.entries(CAMPAIGN_TYPES).map(([k, v]) => (
                <button type="button" key={k} className={`chip ${form.type === k ? 'selected' : ''}`} onClick={() => setForm({ ...form, type: k })}>{v}</button>
              ))}
            </div>
          </div>
          <div className="field"><label>Titre</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required minLength={4} placeholder="ex. Collecte du quartier Ksar" /></div>
          <div className="field"><label>Description</label><textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Objectif, déroulé, avantages pour les donneurs…" /></div>
          <div className="grid-2">
            <div className="field"><label>Wilaya</label>
              <select value={form.wilaya} onChange={(e) => setForm({ ...form, wilaya: e.target.value })}>
                <option value="">—</option>{WILAYAS.map((w) => <option key={w}>{w}</option>)}
              </select>
            </div>
            <div className="field"><label>Lieu</label><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Adresse, établissement…" /></div>
          </div>
          <div className="grid-2">
            <div className="field"><label>Début</label><input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required /></div>
            <div className="field"><label>Fin</label><input type="date" value={form.end_date} min={form.start_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} required /></div>
          </div>
          <div className="grid-2">
            {form.type === 'collecte' && <div className="field"><label>Objectif donneurs</label><input type="number" min={0} value={form.target_donors} onChange={(e) => setForm({ ...form, target_donors: e.target.value })} /></div>}
            <div className="field"><label>Budget logistique (MRU)</label><input type="number" min={0} step={500} value={form.target_amount} onChange={(e) => setForm({ ...form, target_amount: e.target.value })} /><div className="hint">0 = pas de collecte de fonds</div></div>
          </div>
          {form.type === 'collecte' && (
            <div className="field">
              <label>Groupes prioritaires</label>
              <div className="chips">
                {BLOOD_GROUPS.map((g) => (
                  <button type="button" key={g} className={`chip ${form.target_groups.includes(g) ? 'selected' : ''}`} onClick={() => toggleGroup(g)}>{g}</button>
                ))}
              </div>
            </div>
          )}
          <button className="btn btn-red" disabled={busy}>{busy ? 'Enregistrement…' : editing === 'new' ? 'Publier la campagne' : 'Enregistrer'}</button>
        </form>
      </Modal>

      <Modal open={!!participants} onClose={() => setParticipants(null)} title={participants ? `Participants — ${participants.campaign.title}` : ''}>
        {participants && (participants.rows.length === 0 ? <EmptyState text="Aucun donneur inscrit pour le moment." /> : participants.rows.map((p) => (
          <div className="row" key={p.id}>
            <BloodBadge group={p.blood_group} />
            <div className="grow">
              <div className="title">{p.nom}</div>
              <div className="sub">{p.wilaya} · {p.telephone || '—'} · inscrit le {fmtDate(p.created_at)}</div>
            </div>
            {p.status === 'donated' ? (
              <span className="pill pill-green"><CheckCircle2 size={14} /> A donné</span>
            ) : p.status === 'cancelled' ? (
              <span className="pill">Désinscrit</span>
            ) : (
              <button className="btn btn-sm btn-green" onClick={() => markDonated(p.id)}><CheckCircle2 size={14} /> Don réalisé</button>
            )}
          </div>
        )))}
      </Modal>
      {toast}
    </>
  );
}
