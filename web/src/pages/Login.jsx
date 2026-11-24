import AuthShell from '../components/AuthShell.jsx';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Droplets, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { Alert } from '../components/ui.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const u = await login(identifier, password);
      navigate(u.role === 'donor' ? '/donneur' : u.role === 'hospital_admin' ? '/hopital' : u.role === 'blood_bank_admin' ? '/banque' : '/admin');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Espace sécurisé"
      title="Bon retour parmi nous."
      lead="Donneurs, hôpitaux, banques de sang et administration : un seul accès, un espace adapté à chaque rôle."
      points={["Alertes d’urgence pour votre groupe sanguin", "Suivi des demandes et des dons en temps réel", "Données protégées, accès par rôle"]}
      tone="dark"
    >

      <form className="card" onSubmit={submit}>
        {error && <Alert type="error">{error}</Alert>}
        <div className="field">
          <label>Email ou téléphone</label>
          <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="ex. admin@yediam.mr" required autoFocus />
        </div>
        <div className="field">
          <label>Mot de passe</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
        </div>
        <button className="btn btn-red" disabled={busy}>
          <LogIn size={18} /> {busy ? 'Connexion…' : 'Se connecter'}
        </button>
        <p style={{ textAlign: 'center', marginTop: 10 }}>
          <Link to="/mot-de-passe-oublie" className="text-red" style={{ fontSize: 14, fontWeight: 700 }}>Mot de passe oublié ?</Link>
        </p>
      </form>

      <div className="card mt">
        <p className="muted" style={{ fontWeight: 700, marginBottom: 8 }}>Comptes de démonstration</p>
        <p className="muted" style={{ fontSize: 13, lineHeight: 1.8 }}>
          🛡️ Super Admin — admin@yediam.mr / Admin123!<br />
          🏥 Hôpital — admin.hnn@yediam.mr / Hopital123!<br />
          🏦 Banque de sang — cnts@yediam.mr / Banque123!<br />
          🩸 Donneur — donneur1@yediam.mr / Donneur123!
        </p>
      </div>

      <p style={{ textAlign: 'center', marginTop: 14 }}>
        <Link to="/" className="text-gray" style={{ fontSize: 14 }}>← Retour à l'accueil</Link>
      </p>
    </AuthShell>
  );
}