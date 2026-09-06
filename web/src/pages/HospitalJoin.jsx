import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Droplets, Hospital, CheckCircle2 } from 'lucide-react';
import { api } from '../api.js';
import { Alert } from '../components/ui.jsx';
import { WILAYAS } from '../constants.js';

export default function HospitalJoin() {
  const [form, setForm] = useState({
    nom: '', wilaya: '', moughataa: '', commune: '', adresse: '',
    telephone: '', email: '', nom_responsable: '', telephone_responsable: '',
    infos_administratives: '', motif_adhesion: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await api('/public/hospital-join', { method: 'POST', body: form, auth: false });
      setDone(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="panel" style={{ paddingTop: 40 }}>
        <div className="card" style={{ textAlign: 'center', padding: 30 }}>
          <CheckCircle2 size={56} color="var(--green)" style={{ margin: '0 auto 12px', display: 'block' }} />
          <h3>Demande envoyée !</h3>
          <p className="muted mt">
            Votre demande d'adhésion est <b>EN ATTENTE</b> de validation par le Super Admin.
            Une fois approuvée, vous recevrez les identifiants de votre compte administrateur.
          </p>
          <Link to="/" className="btn btn-red mt">Retour à l'accueil</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="panel" style={{ paddingTop: 30 }}>
      <div className="brand" style={{ justifyContent: 'center', marginBottom: 20 }}>
        <span className="brand-drop"><Droplets size={20} /></span>
        <span>YEDIAM NENE<small>Adhésion hôpital</small></span>
      </div>

      <form className="card" onSubmit={submit}>
        <h3 style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Hospital size={20} className="text-red" /> Rejoindre le réseau
        </h3>
        {error && <Alert type="error">{error}</Alert>}
        <p className="muted mb">Votre demande sera examinée par l'administration de la plateforme.</p>

        <div className="field">
          <label>Nom de l'hôpital</label>
          <input value={form.nom} onChange={set('nom')} required placeholder="ex. Hôpital de Kaédi" />
        </div>
        <div className="grid-2">
          <div className="field">
            <label>Wilaya</label>
            <select value={form.wilaya} onChange={set('wilaya')} required>
              <option value="">Choisir…</option>
              {WILAYAS.map((w) => <option key={w}>{w}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Moughataa</label>
            <input value={form.moughataa} onChange={set('moughataa')} />
          </div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label>Commune</label>
            <input value={form.commune} onChange={set('commune')} />
          </div>
          <div className="field">
            <label>Adresse</label>
            <input value={form.adresse} onChange={set('adresse')} />
          </div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label>Téléphone</label>
            <input value={form.telephone} onChange={set('telephone')} required placeholder="+222 …" />
          </div>
          <div className="field">
            <label>Email professionnel</label>
            <input type="email" value={form.email} onChange={set('email')} />
          </div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label>Nom du responsable</label>
            <input value={form.nom_responsable} onChange={set('nom_responsable')} required />
          </div>
          <div className="field">
            <label>Téléphone du responsable</label>
            <input value={form.telephone_responsable} onChange={set('telephone_responsable')} />
          </div>
        </div>
        <div className="field">
          <label>Informations administratives</label>
          <textarea rows={2} value={form.infos_administratives} onChange={set('infos_administratives')} placeholder="N° agrément, structure de tutelle…" />
        </div>
        <div className="field">
          <label>Motif d'adhésion</label>
          <textarea rows={2} value={form.motif_adhesion} onChange={set('motif_adhesion')} placeholder="Pourquoi rejoindre YEDIAM NENE ?" />
        </div>

        <button className="btn btn-red" disabled={busy}>{busy ? 'Envoi…' : 'Envoyer la demande'}</button>
      </form>
    </div>
  );
}