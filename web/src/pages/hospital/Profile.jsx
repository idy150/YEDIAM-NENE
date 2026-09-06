import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Spinner, Alert, PageHead } from '../../components/ui.jsx';

export default function HospProfile() {
  const { reload } = useAuth();
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('/hospital/dashboard').then((d) => {
      const h = d.hospital;
      setForm({
        adresse: h.adresse || '', telephone: h.telephone || '', email: h.email || '',
        nom_responsable: h.nom_responsable || '', telephone_responsable: h.telephone_responsable || '',
      });
    }).catch(() => {});
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/hospital/profile', { method: 'PUT', body: form });
      await reload();
      setMsg('Profil mis à jour ✓');
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!form) return <Spinner />;

  return (
    <>
      <PageHead title="Profil de l'hôpital" />
      {msg && <Alert type="success">{msg}</Alert>}
      <form className="card" onSubmit={save}>
        <div className="field"><label>Adresse</label><input value={form.adresse} onChange={set('adresse')} /></div>
        <div className="grid-2">
          <div className="field"><label>Téléphone</label><input value={form.telephone} onChange={set('telephone')} /></div>
          <div className="field"><label>Email</label><input value={form.email} onChange={set('email')} /></div>
        </div>
        <div className="grid-2">
          <div className="field"><label>Responsable</label><input value={form.nom_responsable} onChange={set('nom_responsable')} /></div>
          <div className="field"><label>Tél. responsable</label><input value={form.telephone_responsable} onChange={set('telephone_responsable')} /></div>
        </div>
        <button className="btn btn-red" disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer'}</button>
      </form>
    </>
  );
}