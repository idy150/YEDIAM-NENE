import AuthShell from '../components/AuthShell.jsx';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Droplets } from 'lucide-react';
import { api } from '../api.js';
import { Alert } from '../components/ui.jsx';

export default function ForgotPassword() {
  const [identifier, setIdentifier] = useState('');
  const [msg, setMsg] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    const res = await api('/auth/forgot-password', { method: 'POST', body: { identifier }, auth: false });
    setMsg(res.message);
  };

  return (
    <AuthShell
      eyebrow="Compte"
      title="Mot de passe oublié"
      lead="Indiquez votre email ou téléphone : nous vous aiderons à récupérer l’accès à votre espace."
      points={[]}
      tone="dark"
    >
      <form className="card" onSubmit={submit}>
        {msg && <Alert type="info">{msg}</Alert>}
        <div className="field">
          <label>Email ou téléphone</label>
          <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} required placeholder="Votre identifiant" />
        </div>
        <button className="btn btn-red">Réinitialiser</button>
        <p className="muted" style={{ marginTop: 10, textAlign: 'center' }}>Prototype : réinitialisation simulée.</p>
        <p style={{ textAlign: 'center', marginTop: 8 }}>
          <Link to="/login" className="text-red" style={{ fontSize: 14, fontWeight: 700 }}>← Retour à la connexion</Link>
        </p>
      </form>
    </AuthShell>
  );
}