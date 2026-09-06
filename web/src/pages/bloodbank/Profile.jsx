import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { Spinner, Alert, PageHead } from '../../components/ui.jsx';

export default function BankProfile() {
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api('/bloodbank/dashboard').then((d) => {
      const b = d.bank;
      setForm({ adresse: b.adresse || '', telephone: b.telephone || '', email: b.email || '' });
    }).catch(() => {});
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    try {
      await api('/bloodbank/profile', { method: 'PUT', body: form });
      setMsg('Profil mis à jour ✓');
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      setMsg(err.message);
    }
  };

  if (!form) return <Spinner />;

  return (
    <>
      <PageHead title="Profil de la banque de sang" />
      {msg && <Alert type="success">{msg}</Alert>}
      <form className="card" onSubmit={save}>
        <div className="field"><label>Adresse</label><input value={form.adresse} onChange={set('adresse')} /></div>
        <div className="grid-2">
          <div className="field"><label>Téléphone</label><input value={form.telephone} onChange={set('telephone')} /></div>
          <div className="field"><label>Email</label><input value={form.email} onChange={set('email')} /></div>
        </div>
        <button className="btn btn-red">Enregistrer</button>
      </form>
    </>
  );
}