import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Droplets, HeartHandshake } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { Alert } from '../components/ui.jsx';
import { BLOOD_GROUPS, WILAYAS } from '../constants.js';

export default function RegisterDonor() {
  const { registerDonor } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nom: '', telephone: '', email: '', password: '',
    blood_group: '', wilaya: '', moughataa: '', quartier: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.blood_group || !form.wilaya) {
      setError('Choisissez votre groupe sanguin et votre wilaya');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await registerDonor(form);
      navigate('/donneur');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel" style={{ paddingTop: 30 }}>
      <div className="brand" style={{ justifyContent: 'center', marginBottom: 20 }}>
        <span className="brand-drop"><Droplets size={20} /></span>
        <span>YEDIAM NENE<small>Devenir donneur</small></span>
      </div>

      <form className="card" onSubmit={submit}>
        <h3 style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <HeartHandshake size={20} className="text-red" /> Rejoindre les donneurs
        </h3>
        {error && <Alert type="error">{error}</Alert>}

        <div className="field">
          <label>Nom complet</label>
          <input value={form.nom} onChange={set('nom')} placeholder="Votre nom" required />
        </div>
        <div className="grid-2">
          <div className="field">
            <label>Téléphone</label>
            <input value={form.telephone} onChange={set('telephone')} placeholder="+222 …" required />
          </div>
          <div className="field">
            <label>Email (facultatif)</label>
            <input type="email" value={form.email} onChange={set('email')} placeholder="vous@email.mr" />
          </div>
        </div>
        <div className="field">
          <label>Mot de passe</label>
          <input type="password" value={form.password} onChange={set('password')} placeholder="Minimum 6 caractères" required minLength={6} />
        </div>

        <div className="field">
          <label>Groupe sanguin (essentiel)</label>
          <div className="chips">
            {BLOOD_GROUPS.map((g) => (
              <button type="button" key={g} className={`chip ${form.blood_group === g ? 'selected' : ''}`} onClick={() => setForm({ ...form, blood_group: g })}>
                {g}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Wilaya</label>
          <select value={form.wilaya} onChange={set('wilaya')}>
            <option value="">Choisir…</option>
            {WILAYAS.map((w) => <option key={w}>{w}</option>)}
          </select>
        </div>
        <div className="grid-2">
          <div className="field">
            <label>Moughataa</label>
            <input value={form.moughataa} onChange={set('moughataa')} placeholder="ex. Tevragh-Zeina" />
          </div>
          <div className="field">
            <label>Quartier</label>
            <input value={form.quartier} onChange={set('quartier')} placeholder="Quartier" />
          </div>
        </div>

        <button className="btn btn-red" disabled={busy}>
          {busy ? 'Inscription…' : 'S’inscrire et devenir disponible'}
        </button>
        <p style={{ textAlign: 'center', marginTop: 10, fontSize: 13 }}>
          <Link to="/login" className="text-red" style={{ fontWeight: 700 }}>Déjà inscrit ? Se connecter</Link>
        </p>
      </form>
    </div>
  );
}