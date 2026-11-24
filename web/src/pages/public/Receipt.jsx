import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Printer, ArrowRight, Share2 } from 'lucide-react';
import { api } from '../../api.js';
import { Spinner, EmptyState, fmtMoney, fmtDateTime } from '../../components/ui.jsx';
import { Brand } from '../../components/Layout.jsx';
import { CONTRIBUTION_PURPOSES, CONTRIBUTOR_TYPES } from '../../constants.js';

export default function Receipt() {
  const { reference } = useParams();
  const [params] = useSearchParams();
  const [r, setR] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/public/receipts/${encodeURIComponent(reference)}`, { auth: false }).then(setR).catch((e) => setError(e.message));
  }, [reference]);

  if (error) return <div className="container"><EmptyState text={error} /></div>;
  if (!r) return <Spinner />;

  const share = () => {
    const text = `J’ai soutenu le don de sang en Mauritanie avec YEDIAM NENE. Le sang reste gratuit, la solidarité finance la logistique. ${window.location.origin}/soutenir`;
    if (navigator.share) navigator.share({ text }).catch(() => {});
    else window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  };

  return (
    <div className="container" style={{ paddingTop: 28 }}>
      {params.get('merci') && (
        <div className="center no-print" style={{ marginBottom: 22 }}>
          <CheckCircle2 size={52} color="var(--green)" style={{ margin: '0 auto' }} />
          <h1 style={{ fontSize: 28, fontWeight: 900, marginTop: 10 }}>Merci pour votre solidarité !</h1>
          <p className="muted" style={{ fontSize: 15 }}>Votre contribution aide des donneurs à sauver des vies.</p>
        </div>
      )}

      <div className="receipt">
        <div className="receipt-head">
          <Brand light sub="Reçu de contribution" />
          <span className="pill" style={{ background: r.status === 'paid' ? 'var(--green)' : 'var(--gold)', color: '#fff', borderColor: 'transparent' }}>
            {r.status === 'paid' ? 'Payé' : r.status}
          </span>
        </div>
        <div className="receipt-body">
          <div className="muted">Montant</div>
          <div className="receipt-amount">{fmtMoney(r.amount)}</div>
          <div className="mt">
            <div className="receipt-line"><span>Référence</span><span>{r.reference}</span></div>
            <div className="receipt-line"><span>Date</span><span>{fmtDateTime(r.paid_at || r.created_at)}</span></div>
            <div className="receipt-line"><span>Contributeur</span><span>{r.contributor_name} ({CONTRIBUTOR_TYPES[r.contributor_type]})</span></div>
            {(r.contributor_phone || r.contributor_email) && (
              <div className="receipt-line"><span>Contact</span><span>{r.contributor_phone || r.contributor_email}</span></div>
            )}
            <div className="receipt-line"><span>Affectation</span><span>{CONTRIBUTION_PURPOSES[r.purpose]?.label}</span></div>
            {r.campaign_title && <div className="receipt-line"><span>Campagne</span><span>{r.campaign_title}</span></div>}
            <div className="receipt-line"><span>Moyen de paiement</span><span>{r.payment_method}</span></div>
            <div className="receipt-line"><span>Réf. opérateur</span><span>{r.provider_reference || '—'}</span></div>
            <div className="receipt-line"><span>Visibilité publique</span><span>{r.anonymous ? 'Anonyme' : 'Nom affiché'}</span></div>
          </div>
        </div>
        <div className="receipt-foot">
          Le sang reste gratuit : cette contribution finance exclusivement la logistique et les campagnes de don.
          {r.simulated && ' Prototype — transaction simulée, sans débit réel.'}
        </div>
      </div>

      <div className="flex wrap no-print" style={{ justifyContent: 'center', marginTop: 20 }}>
        <button className="btn btn-outline btn-auto" onClick={() => window.print()}><Printer size={17} /> Imprimer / PDF</button>
        <button className="btn btn-outline btn-auto" onClick={share}><Share2 size={17} /> Partager</button>
        <Link to="/transparence" className="btn btn-black btn-auto">Suivre l’utilisation des fonds <ArrowRight size={17} /></Link>
      </div>
    </div>
  );
}
