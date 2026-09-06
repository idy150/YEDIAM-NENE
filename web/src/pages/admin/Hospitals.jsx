import { useEffect, useState } from 'react';
import { Search, Eye, Check, X, Ban, RotateCcw, UserPlus } from 'lucide-react';
import { api } from '../../api.js';
import { Spinner, EmptyState, Modal, HospStatusBadge, SubStatusBadge, fmtDate, Alert, PageHead } from '../../components/ui.jsx';

const TABS = [
  ['', 'Tous'],
  ['pending', 'En attente'],
  ['active', 'Actifs'],
  ['suspended', 'Suspendus'],
];

export default function AdminHospitals() {
  const [tab, setTab] = useState('');
  const [q, setQ] = useState('');
  const [items, setItems] = useState(null);
  const [view, setView] = useState(null);
  const [approve, setApprove] = useState(null);
  const [created, setCreated] = useState(null);
  const [msg, setMsg] = useState('');

  const load = () => {
    const params = new URLSearchParams();
    if (tab) params.set('status', tab);
    if (q) params.set('q', q);
    api(`/admin/hospitals?${params}`).then(setItems).catch(() => setItems([]));
  };
  useEffect(() => { load(); }, [tab, q]);

  const act = async (fn) => {
    await fn();
    setMsg('Action effectuée ✓');
    setTimeout(() => setMsg(''), 3000);
    load();
  };

  return (
    <>
      <PageHead title="Gestion des hôpitaux" sub="Approbation des adhésions, comptes administrateurs, suspensions" />
      {msg && <Alert type="success">{msg}</Alert>}

      <div className="toolbar">
        {TABS.map(([v, l]) => (
          <button key={v} className={`chip ${tab === v ? 'selected' : ''}`} onClick={() => setTab(v)}>{l}</button>
        ))}
        <div style={{ display: 'flex', gap: 6, flex: 1, minWidth: 200 }}>
          <Search size={18} style={{ alignSelf: 'center', color: 'var(--gray)' }} />
          <input placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {!items ? <Spinner /> : items.length === 0 ? (
        <EmptyState text="Aucun hôpital trouvé." />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Hôpital</th><th>Wilaya</th><th>Statut</th><th>Abonnement</th><th>Demandé le</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {items.map((h) => (
                <tr key={h.id}>
                  <td>
                    <b>{h.nom}</b>
                    <div className="muted">{h.admin_email ? `👤 ${h.admin_email}` : 'Pas de compte'}</div>
                  </td>
                  <td>{h.wilaya}</td>
                  <td><HospStatusBadge status={h.status} /></td>
                  <td><SubStatusBadge status={h.subscription_status} /></td>
                  <td>{fmtDate(h.created_at)}</td>
                  <td>
                    <div className="row-actions" style={{ flexWrap: 'nowrap' }}>
                      <button className="btn btn-sm btn-outline" onClick={() => setView(h)}><Eye size={14} /></button>
                      {h.status === 'pending' && (
                        <>
                          <button className="btn btn-sm" style={{ background: 'var(--green)', color: '#fff' }} onClick={() => setApprove(h)}>
                            <Check size={14} /> Approuver
                          </button>
                          <button className="btn btn-sm btn-outline-red" onClick={() => act(() => api(`/admin/hospitals/${h.id}/refuse`, { method: 'POST' }))}>
                            <X size={14} />
                          </button>
                        </>
                      )}
                      {h.status === 'active' && (
                        <button className="btn btn-sm btn-outline-red" onClick={() => act(() => api(`/admin/hospitals/${h.id}/suspend`, { method: 'POST' }))}>
                          <Ban size={14} /> Suspendre
                        </button>
                      )}
                      {h.status === 'suspended' && (
                        <button className="btn btn-sm" style={{ background: 'var(--green)', color: '#fff' }} onClick={() => act(() => api(`/admin/hospitals/${h.id}/reactivate`, { method: 'POST' }))}>
                          <RotateCcw size={14} /> Réactiver
                        </button>
                      )}
                      {!h.admin_email && h.status === 'active' && (
                        <button className="btn btn-sm btn-outline" onClick={() => setApprove(h)}><UserPlus size={14} /> Créer admin</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!view} onClose={() => setView(null)} title={view?.nom}>
        {view && (
          <div>
            <p><b>Wilaya :</b> {view.wilaya}</p>
            <p><b>Moughataa :</b> {view.moughataa || '—'} · <b>Commune :</b> {view.commune || '—'}</p>
            <p><b>Adresse :</b> {view.adresse || '—'}</p>
            <p><b>Téléphone :</b> {view.telephone} · <b>Email :</b> {view.email || '—'}</p>
            <p><b>Responsable :</b> {view.nom_responsable} ({view.telephone_responsable})</p>
            <p><b>Infos administratives :</b> {view.infos_administratives || '—'}</p>
            <p><b>Motif d'adhésion :</b> {view.motif_adhesion || '—'}</p>
          </div>
        )}
      </Modal>

      <Modal open={!!approve} onClose={() => { setApprove(null); setCreated(null); }} title={created ? '✅ Compte créé !' : `Approuver ${approve?.nom}`}>
        {created ? (
          <div>
            <Alert type="success">L'hôpital est actif, l'abonnement (1 000 MRU/mois) est enregistré.</Alert>
            <div className="card mt" style={{ background: 'var(--gold-soft)' }}>
              <p><b>Identifiant :</b> {created.admin.email}</p>
              <p><b>Mot de passe temporaire :</b> <code>{created.admin.password}</code></p>
              <p className="muted">À transmettre à l'hôpital avec le lien de connexion.</p>
            </div>
            <button className="btn btn-red mt" onClick={() => { setApprove(null); setCreated(null); load(); }}>Fermer</button>
          </div>
        ) : (
          <form onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const res = await api(`/admin/hospitals/${approve.id}/approve`, {
              method: 'POST',
              body: { email: formData.get('email') || undefined, password: formData.get('password') || undefined },
            });
            setCreated(res);
          }}>
            <p className="muted mb">Le Super Admin crée le compte administrateur de l'hôpital. Laissez vide pour générer automatiquement.</p>
            <div className="field"><label>Email administrateur</label><input name="email" placeholder="admin.hopital@yediam.mr" /></div>
            <div className="field"><label>Mot de passe temporaire</label><input name="password" placeholder="Généré automatiquement si vide" /></div>
            <button className="btn btn-red">Créer le compte + activer l'hôpital</button>
          </form>
        )}
      </Modal>
    </>
  );
}