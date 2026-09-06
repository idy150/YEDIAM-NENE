import { useEffect, useState } from 'react';
import { KeyRound } from 'lucide-react';
import { api } from '../../api.js';
import { Spinner, Alert, SubStatusBadge, PayStatusBadge, fmtDate } from '../../components/ui.jsx';

export default function HospSubscription() {
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api('/hospital/subscription').then(setData).catch(() => {});
  useEffect(() => { load(); }, []);

  const renew = async () => {
    setBusy(true);
    try {
      const res = await api('/hospital/subscribe', { method: 'POST' });
      setMsg(`${res.message} — valable jusqu'au ${fmtDate(res.subscription.end_date)}`);
      setTimeout(() => setMsg(''), 5000);
      load();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!data) return <Spinner />;
  const { hospital, subscriptions, payments } = data;
  const current = subscriptions[0];

  return (
    <>
      <div className="page-head"><h1>Abonnement</h1></div>
      {msg && <Alert type="success">{msg}</Alert>}

      <div className="card" style={{ textAlign: 'center', padding: 26 }}>
        <KeyRound size={36} style={{ margin: '0 auto 10px', display: 'block', color: 'var(--gold)' }} />
        <div className="title" style={{ fontSize: 18 }}>1 000 MRU / mois</div>
        <p className="muted">Accès aux services professionnels de la plateforme.</p>
        {current ? (
          <>
            <div className="mt"><SubStatusBadge status={current.status} /></div>
            <p className="muted mt">
              Du {fmtDate(current.start_date)} au {fmtDate(current.end_date)}
            </p>
            {current.status === 'active' && (
              <div className="alert alert-success mt" style={{ marginBottom: 0 }}>
                ✅ Abonnement actif — vous pouvez créer des demandes.
              </div>
            )}
            {(current.status === 'expired' || current.status === 'suspended' || current.status === 'pending') && (
              <div className="alert alert-error mt" style={{ marginBottom: 0 }}>
                ⚠️ Abonnement {current.status === 'expired' ? 'expiré' : current.status} — renouvelez pour continuer.
              </div>
            )}
          </>
        ) : (
          <p className="muted mt">Aucun abonnement enregistré.</p>
        )}
        <button className="btn btn-gold mt" onClick={renew} disabled={busy || current?.status === 'active'}>
          {busy ? 'Traitement…' : current?.status === 'active' ? 'Renouveler pour 1 mois (1 000 MRU)' : 'Souscrire — 1 000 MRU (simulé)'}
        </button>
        <p className="muted" style={{ marginTop: 8 }}>Paiement simulé dans le prototype.</p>
      </div>

      <h3 style={{ margin: '20px 0 10px', fontSize: 16 }}>Historique des paiements</h3>
      {payments.length === 0 ? (
        <EmptyState text="Aucun paiement enregistré." />
      ) : (
        <div className="card">
          {payments.map((p) => (
            <div className="row" key={p.id}>
              <div className="grow">
                <div className="title">{Number(p.amount).toLocaleString('fr-FR')} MRU · Abonnement mensuel</div>
                <div className="sub">Réf. {p.transaction_reference} · {fmtDate(p.payment_date)}</div>
              </div>
              <PayStatusBadge status={p.status} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}