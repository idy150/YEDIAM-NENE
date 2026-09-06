import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Spinner, Alert } from '../../components/ui.jsx';
import { WILAYAS } from '../../constants.js';

export default function DonorProfile() {
  const { reload } = useAuth();
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('/donor/dashboard').then((d) => {
      const p = d.donor;
      setForm({ available: p.available, wilaya: p.wilaya, moughataa: p.moughataa || '', quartier: p.quartier || '', telephone: p.telephone || '', email: p.email || '', last_donation_date: p.last_donation_date || '' });
    }).catch(() => {});
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/donor/profile', { method: 'PUT', body: form });
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
      <div className="page-head"><h1>Mon profil</h1></div>
      {msg && <Alert type="success">{msg}</Alert>}
      <form className="card" onSubmit={save}>
        <div className="field">
          <label>Disponibilité</label>
          <div className="chips">
            <button type="button" className={`chip ${form.available ? 'selected' : ''}`} style={form.available ? { borderColor: 'var(--green)', background: 'var(--green-soft)', color: 'var(--green)' } : {}} onClick={() => setForm({ ...form, available: true })}>🟢 Disponible</button>
            <button type="button" className={`chip ${!form.available ? 'selected' : ''}`} style={!form.available ? { borderColor: 'var(--gray)', background: 'var(--gray-light)', color: 'var(--gray)' } : {}} onClick={() => setForm({ ...form, available: false })}>⚫ Indisponible</button>
          </div>
        </div>
        <div className="field">
          <label>Wilaya</label>
          <select value={form.wilaya} onChange={set('wilaya')}>
            {WILAYAS.map((w) => <option key={w}>{w}</option>)}
          </select>
        </div>
        <div className="grid-2">
          <div className="field"><label>Moughataa</label><input value={form.moughataa} onChange={set('moughataa')} /></div>
          <div className="field"><label>Quartier</label><input value={form.quartier} onChange={set('quartier')} /></div>
        </div>
        <div className="grid-2">
          <div className="field"><label>Téléphone</label><input value={form.telephone} onChange={set('telephone')} /></div>
          <div className="field"><label>Email</label><input value={form.email} onChange={set('email')} /></div>
        </div>
        <div className="field">
          <label>Date du dernier don</label>
          <input type="date" value={form.last_donation_date} onChange={set('last_donation_date')} />
        </div>
        <button className="btn btn-red" disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer'}</button>
      </form>
    </>
  );
}