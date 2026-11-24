import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api.js';
import { Alert, PageHead } from '../../components/ui.jsx';
import { BLOOD_GROUPS, WILAYAS, COMPATIBLE_DONORS } from '../../constants.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function HospNewRequest() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    blood_group: '', quantity: 5, urgency: 'immediate',
    wilaya: profile?.wilaya || '', moughataa: profile?.moughataa || '',
    service: '', contact_number: profile?.telephone || '', additional_info: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.blood_group) { setError('Choisissez le groupe sanguin'); return; }
    setBusy(true);
    setError('');
    try {
      const res = await api('/hospital/requests', { method: 'POST', body: { ...form, quantity: Number(form.quantity) } });
      setResult(res);
      setTimeout(() => navigate('/hopital/demandes'), 2200);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    return (
      <div className="alert alert-success" style={{ fontSize: 16, padding: 20 }}>
        ✅ Demande créée ! {result.notified} donneur(s) compatible(s) notifié(s) automatiquement. Redirection…
      </div>
    );
  }

  return (
    <>
      <PageHead title="Nouvelle demande urgente" sub="Formulaire simple — la notification des donneurs est automatique" />
      {error && <Alert type="error">{error}</Alert>}
      <form className="card" onSubmit={submit}>
        <div className="field">
          <label>Groupe sanguin</label>
          <div className="chips">
            {BLOOD_GROUPS.map((g) => (
              <button type="button" key={g} className={`chip ${form.blood_group === g ? 'selected' : ''}`} onClick={() => setForm({ ...form, blood_group: g })}>
                {g}
              </button>
            ))}
          </div>
          {form.blood_group && (
            <div className="hint" style={{ marginTop: 8 }}>
              Donneurs alertés : groupe <b>{form.blood_group}</b> en priorité, puis compatibles{' '}
              {COMPATIBLE_DONORS[form.blood_group].filter((g) => g !== form.blood_group).join(', ') || '— (aucun autre)'} ·
              uniquement disponibles et éligibles (dernier don &gt; 90 jours).
            </div>
          )}
        </div>
        <div className="grid-2">
          <div className="field">
            <label>Nombre de poches</label>
            <input type="number" min={1} max={50} value={form.quantity} onChange={set('quantity')} />
          </div>
          <div className="field">
            <label>Niveau d'urgence</label>
            <select value={form.urgency} onChange={set('urgency')}>
              <option value="immediate">🔴 IMMÉDIAT</option>
              <option value="urgent">🟠 URGENT</option>
              <option value="normal">🟢 NORMAL</option>
            </select>
          </div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label>Wilaya</label>
            <select value={form.wilaya} onChange={set('wilaya')}>
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
            <label>Service concerné</label>
            <input value={form.service} onChange={set('service')} placeholder="ex. Urgences, Maternité" />
          </div>
          <div className="field">
            <label>Numéro de contact</label>
            <input value={form.contact_number} onChange={set('contact_number')} />
          </div>
        </div>
        <div className="field">
          <label>Informations complémentaires</label>
          <textarea rows={2} value={form.additional_info} onChange={set('additional_info')} placeholder="Contexte, précisions…" />
        </div>
        <button className="btn btn-red btn-lg" disabled={busy}>
          {busy ? 'Création + notification…' : '🚨 Créer la demande et notifier les donneurs'}
        </button>
        <p className="muted" style={{ textAlign: 'center', marginTop: 8 }}>
          Les donneurs compatibles (groupe, disponibilité, wilaya) seront notifiés immédiatement.
          La campagne s'arrête automatiquement à 5 réponses positives.
        </p>
      </form>
    </>
  );
}