import AuthShell from '../components/AuthShell.jsx';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Droplets, Siren, CheckCircle2 } from 'lucide-react';
import { api } from '../api.js';
import { Alert } from '../components/ui.jsx';
import { BLOOD_GROUPS, WILAYAS } from '../constants.js';

export default function FamilyRequest() {
  const [hospitals, setHospitals] = useState([]);
  const [form, setForm] = useState({
    patient_name: '', blood_group: '', hospital_id: '', wilaya: '',
    contact: '', quantity: 1, urgency: 'immediate',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  useEffect(() => {
    api('/public/hospitals', { auth: false }).then(setHospitals).catch(() => {});
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.blood_group || !form.wilaya || !form.contact) {
      setError('Remplissez les champs essentiels');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await api('/public/family-request', {
        method: 'POST',
        body: { ...form, quantity: Number(form.quantity), hospital_id: form.hospital_id ? Number(form.hospital_id) : null },
        auth: false,
      });
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
          <h3>Demande enregistrée</h3>
          <p className="muted mt">
            Paiement de <b>100 MRU</b> simulé — référence <b>{done.payment_reference}</b>.
            <br />
            Votre demande sera diffusée aux donneurs compatibles après validation.
          </p>
          {done.tracking_code && (
            <div className="card mt" style={{ background: 'var(--paper)', boxShadow: 'none' }}>
              <div className="muted" style={{ fontWeight: 700 }}>Votre code de suivi</div>
              <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: '0.04em', margin: '4px 0' }}>{done.tracking_code}</div>
              <div className="muted">Conservez-le : il permet de suivre la mobilisation des donneurs sans compte.</div>
            </div>
          )}
          {done.tracking_code && (
            <Link to={`/suivi/${done.tracking_code}`} className="btn btn-red mt">Suivre ma demande</Link>
          )}
          <Link to="/" className="btn btn-outline mt">Retour à l'accueil</Link>
        </div>
      </div>
    );
  }

  return (
    <AuthShell
      eyebrow="Urgence famille"
      title="Un proche a besoin de sang ?"
      lead="Remplissez l’essentiel : notre équipe valide la demande puis alerte les donneurs compatibles. Vous recevez un code pour suivre la mobilisation."
      points={["Sans création de compte", "Donneurs compatibles alertés après validation", "Code de suivi pour voir les réponses"]}
      tone="red"
    >

      <form className="card" onSubmit={submit}>
        <h3 style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Siren size={20} className="text-red" /> Besoin urgent pour un proche
        </h3>
        {error && <Alert type="error">{error}</Alert>}
        <p className="muted mb">Formulaire court — uniquement l'essentiel. Tarif : <b>100 MRU</b> (simulé pour le prototype).</p>

        <div className="field">
          <label>Nom du patient</label>
          <input value={form.patient_name} onChange={set('patient_name')} required placeholder="Nom du proche" />
        </div>
        <div className="field">
          <label>Groupe sanguin</label>
          <div className="chips">
            {BLOOD_GROUPS.map((g) => (
              <button type="button" key={g} className={`chip ${form.blood_group === g ? 'selected' : ''}`} onClick={() => setForm({ ...form, blood_group: g })}>
                {g}
              </button>
            ))}
          </div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label>Hôpital</label>
            <select value={form.hospital_id} onChange={set('hospital_id')}>
              <option value="">—</option>
              {hospitals.map((h) => <option key={h.id} value={h.id}>{h.nom}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Wilaya</label>
            <select value={form.wilaya} onChange={set('wilaya')}>
              <option value="">Choisir…</option>
              {WILAYAS.map((w) => <option key={w}>{w}</option>)}
            </select>
          </div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label>Téléphone</label>
            <input value={form.contact} onChange={set('contact')} required placeholder="+222 …" />
          </div>
          <div className="field">
            <label>Quantité (poches)</label>
            <input type="number" min={1} max={20} value={form.quantity} onChange={set('quantity')} />
          </div>
        </div>
        <div className="field">
          <label>Niveau d'urgence</label>
          <div className="chips">
            {[
              ['immediate', '🔴 IMMÉDIAT', 'urgency-immediate'],
              ['urgent', '🟠 URGENT', 'urgency-urgent'],
              ['normal', '🟢 NORMAL', 'urgency-normal'],
            ].map(([v, l, c]) => (
              <button type="button" key={v} className={`chip ${c} ${form.urgency === v ? 'selected' : ''}`} onClick={() => setForm({ ...form, urgency: v })}>
                {l}
              </button>
            ))}
          </div>
        </div>

        <button className="btn btn-red" disabled={busy}>{busy ? 'Envoi…' : 'Envoyer la demande (100 MRU)'}</button>
        <p className="muted" style={{ textAlign: 'center', marginTop: 8 }}>
          Paiement simulé dans le prototype. La demande est validée avant diffusion.
        </p>
      </form>
    </AuthShell>
  );
}