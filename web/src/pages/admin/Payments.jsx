import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { Spinner, EmptyState, PayStatusBadge, fmtDateTime, PageHead } from '../../components/ui.jsx';

export default function AdminPayments() {
  const [items, setItems] = useState(null);
  useEffect(() => { api('/admin/payments').then(setItems).catch(() => setItems([])); }, []);

  if (!items) return <Spinner />;
  const total = items.filter((p) => p.status === 'paid').reduce((a, p) => a + Number(p.amount), 0);

  return (
    <>
      <PageHead title="Paiements" sub="Paiements simulés — intégration réelle ultérieure" actions={
        <span className="badge" style={{ background: 'var(--green)', color: '#fff' }}>{total.toLocaleString('fr-FR')} MRU encaissés</span>
      } />
      {items.length === 0 ? (
        <EmptyState text="Aucun paiement enregistré." />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Référence</th><th>Type</th><th>Bénéficiaire</th><th>Montant</th><th>Statut</th><th>Date</th></tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id}>
                  <td><code>{p.transaction_reference}</code></td>
                  <td>
                    <span className="badge" style={{ background: p.type === 'subscription' ? 'var(--black)' : 'var(--gold)', color: '#fff' }}>
                      {p.type === 'subscription' ? 'Abonnement' : 'Demande famille'}
                    </span>
                  </td>
                  <td>{p.hospital_name || p.patient_name || '—'}</td>
                  <td><b>{Number(p.amount).toLocaleString('fr-FR')} MRU</b></td>
                  <td><PayStatusBadge status={p.status} /></td>
                  <td>{fmtDateTime(p.payment_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}