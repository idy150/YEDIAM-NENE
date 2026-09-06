import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { Spinner, EmptyState, SubStatusBadge, fmtDate, PageHead } from '../../components/ui.jsx';

export default function AdminSubscriptions() {
  const [items, setItems] = useState(null);
  useEffect(() => { api('/admin/subscriptions').then(setItems).catch(() => setItems([])); }, []);

  if (!items) return <Spinner />;

  return (
    <>
      <PageHead title="Abonnements" sub="1 000 MRU / mois / hôpital (paiement simulé)" />
      {items.length === 0 ? (
        <EmptyState text="Aucun abonnement enregistré." />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Hôpital</th><th>Montant</th><th>Début</th><th>Expiration</th><th>Statut</th><th>Créé le</th></tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id}>
                  <td><b>{s.hospital_name}</b></td>
                  <td>{Number(s.amount).toLocaleString('fr-FR')} MRU</td>
                  <td>{fmtDate(s.start_date)}</td>
                  <td>{fmtDate(s.end_date)}</td>
                  <td><SubStatusBadge status={s.status} /></td>
                  <td>{fmtDate(s.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}