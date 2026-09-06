import { useEffect, useState } from 'react';
import { Search, UserPlus, Ban, RotateCcw } from 'lucide-react';
import { api } from '../../api.js';
import { Spinner, EmptyState, Modal, BloodBadge, fmtDate, Alert, PageHead } from '../../components/ui.jsx';
import { BLOOD_GROUPS, WILAYAS } from '../../constants.js';

export default function AdminDonors() {
  const [filters, setFilters] = useState({ q: '', blood_group: '', wilaya: '', available: '' });
  const [items, setItems] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ nom: '', telephone: '', email: '', blood_group: '', wilaya: '', moughataa: '', quartier: '', available: true });
  const [msg, setMsg] = useState('');

  const load = () => {
    const p = new URLSearchParams();
    if (filters.q) p.set('q', filters.q);
    if (filters.blood_group) p.set('blood_group', filters.blood_group);
    if (filters.wilaya) p.set('wilaya', filters.wilaya);
    if (filters.available !== '') p.set('available', filters.available);
    api(`/admin/donors?${p}`).then(setItems).catch(() => setItems([]));
  };
  useEffect(() => { load(); }, [filters]);

  const act = async (fn, label = 'Action effectuée') => {
    await fn();
    setMsg(`${label} ✓`);
    setTimeout(() => setMsg(''), 3000);
    load();
  };

  const submitAdd = async (e) => {
    e.preventDefault();
    await api('/admin/donors', { method: 'POST', body: addForm });
    setShowAdd(false);
    setAddForm({ nom: '', telephone: '', email: '', blood_group: '', wilaya: '', moughataa: '', quartier: '', available: true });
    setMsg('Donneur ajouté manuellement ✓');
    setTimeout(() => setMsg(''), 3000);
    load();
  };

  return (
    <>
      <PageHead title="Gestion des donneurs" sub="Recherche, filtres, ajout manuel, suspension" actions={
        <button className="btn btn-red btn-sm" onClick={() => setShowAdd(true)}><UserPlus size={16} /> Ajouter un donneur</button>
      } />
      {msg && <Alert type="success">{msg}</Alert>}

      <div className="toolbar">
        <div style={{ display: 'flex', gap: 6, flex: 1, minWidth: 160 }}>
          <Search size={18} style={{ alignSelf: 'center', color: 'var(--gray)' }} />
          <input placeholder="Rechercher (nom, téléphone)…" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
        </div>
        <select value={filters.blood_group} onChange={(e) => setFilters({ ...filters, blood_group: e.target.value })}>
          <option value="">Groupe : tous</option>
          {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={filters.wilaya} onChange={(e) => setFilters({ ...filters, wilaya: e.target.value })}>
          <option value="">Wilaya : toutes</option>
          {WILAYAS.map((w) => <option key={w} value={w}>{w}</option>)}
        </select>
        <select value={filters.available} onChange={(e) => setFilters({ ...filters, available: e.target.value })}>
          <option value="">Dispo : tous</option>
          <option value="true">Disponibles</option>
          <option value="false">Indisponibles</option>
        </select>
      </div>

      {!items ? <Spinner /> : items.length === 0 ? (
        <EmptyState text="Aucun donneur trouvé." />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Donneur</th><th>Groupe</th><th>Wilaya</th><th>Disponibilité</th><th>Dernier don</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {items.map((d) => (
                <tr key={d.id}>
                  <td>
                    <b>{d.nom}</b>
                    <div className="muted">{d.telephone || '—'}{d.quartier ? ` · ${d.quartier}` : ''}</div>
                  </td>
                  <td><BloodBadge group={d.blood_group} /></td>
                  <td>{d.wilaya}</td>
                  <td>
                    <span className="badge" style={{ background: d.available ? 'var(--green)' : 'var(--gray-light)', color: d.available ? '#fff' : 'var(--gray)' }}>
                      {d.available ? '🟢 Disponible' : '⚫ Indisponible'}
                    </span>
                  </td>
                  <td>{fmtDate(d.last_donation_date)}</td>
                  <td>
                    {d.available || d.user_status !== 'suspended' ? (
                      <button className="btn btn-sm btn-outline-red" onClick={() => act(() => api(`/admin/donors/${d.id}/suspend`, { method: 'POST' }), 'Donneur suspendu')}>
                        <Ban size={14} /> Suspendre
                      </button>
                    ) : (
                      <button className="btn btn-sm" style={{ background: 'var(--green)', color: '#fff' }} onClick={() => act(() => api(`/admin/donors/${d.id}/reactivate`, { method: 'POST' }), 'Donneur réactivé')}>
                        <RotateCcw size={14} /> Réactiver
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Ajouter un donneur manuellement">
        <form onSubmit={submitAdd}>
          <div className="field"><label>Nom complet</label><input required value={addForm.nom} onChange={(e) => setAddForm({ ...addForm, nom: e.target.value })} /></div>
          <div className="grid-2">
            <div className="field"><label>Téléphone</label><input value={addForm.telephone} onChange={(e) => setAddForm({ ...addForm, telephone: e.target.value })} /></div>
            <div className="field"><label>Email</label><input value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} /></div>
          </div>
          <div className="grid-2">
            <div className="field">
              <label>Groupe sanguin</label>
              <select required value={addForm.blood_group} onChange={(e) => setAddForm({ ...addForm, blood_group: e.target.value })}>
                <option value="">Choisir…</option>
                {BLOOD_GROUPS.map((g) => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Wilaya</label>
              <select required value={addForm.wilaya} onChange={(e) => setAddForm({ ...addForm, wilaya: e.target.value })}>
                <option value="">Choisir…</option>
                {WILAYAS.map((w) => <option key={w}>{w}</option>)}
              </select>
            </div>
          </div>
          <div className="grid-2">
            <div className="field"><label>Moughataa</label><input value={addForm.moughataa} onChange={(e) => setAddForm({ ...addForm, moughataa: e.target.value })} /></div>
            <div className="field"><label>Quartier</label><input value={addForm.quartier} onChange={(e) => setAddForm({ ...addForm, quartier: e.target.value })} /></div>
          </div>
          <div className="field">
            <label>Disponibilité</label>
            <div className="chips">
              <button type="button" className={`chip ${addForm.available ? 'selected' : ''}`} onClick={() => setAddForm({ ...addForm, available: true })}>🟢 Disponible</button>
              <button type="button" className={`chip ${!addForm.available ? 'selected' : ''}`} onClick={() => setAddForm({ ...addForm, available: false })}>⚫ Indisponible</button>
            </div>
          </div>
          <button className="btn btn-red">Ajouter</button>
        </form>
      </Modal>
    </>
  );
}