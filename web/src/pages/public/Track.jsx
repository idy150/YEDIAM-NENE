import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Search, Check, BellRing, Users, ShieldCheck, Flag, Siren } from 'lucide-react';
import { api } from '../../api.js';
import { Alert, Spinner, BloodBadge, UrgencyBadge, ReqStatusBadge, Progress, fmtDateTime } from '../../components/ui.jsx';

// Étapes visibles par la famille
function stepsFor(r) {
  const validated = !['pending', 'refused'].includes(r.status);
  const notified = r.notified > 0;
  const covered = ['five_reached', 'completed'].includes(r.status);
  const closed = ['completed', 'cancelled', 'five_reached'].includes(r.status);
  return [
    { icon: <Check size={15} />, t: 'Demande reçue', d: fmtDateTime(r.created_at), done: true },
    { icon: <ShieldCheck size={15} />, t: r.status === 'refused' ? 'Demande refusée' : 'Validée par l’équipe', d: validated ? 'Diffusion autorisée' : r.status === 'refused' ? 'Contactez l’hôpital' : 'Vérification en cours…', done: validated },
    { icon: <BellRing size={15} />, t: 'Donneurs compatibles alertés', d: notified ? `${r.notified} donneurs notifiés` : 'En attente', done: notified },
    { icon: <Users size={15} />, t: 'Réponses des donneurs', d: `${r.positives} / ${r.target} donneurs prêts à donner`, done: r.positives > 0 },
    { icon: <Flag size={15} />, t: covered ? 'Besoin couvert' : 'Clôture', d: closed ? fmtDateTime(r.closed_at) : 'Pas encore', done: closed },
  ];
}

export default function Track() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [input, setInput] = useState(code || '');
  const [r, setR] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!code) { setR(null); return undefined; }
    let alive = true;
    const load = () => {
      setLoading(true);
      api(`/public/track/${encodeURIComponent(code)}`, { auth: false })
        .then((d) => { if (alive) { setR(d); setError(''); } })
        .catch((e) => { if (alive) { setError(e.message); setR(null); } })
        .finally(() => alive && setLoading(false));
    };
    load();
    const t = setInterval(load, 20000); // actualisation automatique
    return () => { alive = false; clearInterval(t); };
  }, [code]);

  const steps = r ? stepsFor(r) : [];
  const currentIdx = steps.findIndex((s) => !s.done);

  return (
    <div className="container" style={{ maxWidth: 720 }}>
      <div className="page-hero">
        <span className="eyebrow">Suivi famille</span>
        <h1>Suivre une demande</h1>
        <p>Entrez le code reçu lors de votre demande urgente pour voir la mobilisation des donneurs, sans créer de compte.</p>
      </div>

      <form className="card flex mt" onSubmit={(e) => { e.preventDefault(); if (input.trim()) navigate(`/suivi/${input.trim().toUpperCase()}`); }}>
        <input
          value={input} onChange={(e) => setInput(e.target.value)} placeholder="ex. YN-AB12-CD34"
          style={{ flex: 1, padding: '12px 14px', border: '1.5px solid var(--gray-light)', borderRadius: 12, textTransform: 'uppercase' }}
          aria-label="Code de suivi"
        />
        <button className="btn btn-red btn-auto"><Search size={17} /> Suivre</button>
      </form>

      {error && <div className="mt"><Alert type="error">{error}</Alert></div>}
      {loading && !r && <Spinner />}

      {r && (
        <div className="card mt-lg">
          <div className="flex wrap" style={{ gap: 14 }}>
            <BloodBadge group={r.blood_group} tone="red" />
            <div className="grow">
              <div style={{ fontWeight: 800, fontSize: 18 }}>{r.quantity} poche{r.quantity > 1 ? 's' : ''} de sang {r.blood_group}</div>
              <div className="muted">{r.hospital_name || 'Hôpital non précisé'} · {r.wilaya} · code {r.tracking_code}</div>
            </div>
            <div className="flex" style={{ gap: 6 }}><UrgencyBadge urgency={r.urgency} /><ReqStatusBadge status={r.status} /></div>
          </div>
          <div className="mt-lg">
            <div className="meter-label"><span>Donneurs prêts à donner</span><span>{r.positives} / {r.target}</span></div>
            <Progress value={r.positives} max={r.target} size="lg" tone={r.positives >= r.target ? 'green' : ''} />
          </div>
          <div className="timeline mt-lg">
            {steps.map((s, i) => (
              <div key={s.t} className={`tl-item ${s.done ? 'done' : i === currentIdx ? 'current' : ''}`}>
                <span className="tl-dot">{s.icon}</span>
                <div><b>{s.t}</b><span>{s.d}</span></div>
              </div>
            ))}
          </div>
          <p className="muted mt-lg">Cette page s’actualise automatiquement. Les donneurs qui acceptent se présentent à l’hôpital indiqué.</p>
        </div>
      )}

      {!code && (
        <div className="card mt-lg center">
          <Siren size={28} color="var(--red)" style={{ margin: '0 auto' }} />
          <p className="mt" style={{ fontWeight: 700 }}>Pas encore de demande ?</p>
          <Link to="/besoin-urgent" className="btn btn-red btn-auto mt">Faire une demande urgente</Link>
        </div>
      )}
    </div>
  );
}
