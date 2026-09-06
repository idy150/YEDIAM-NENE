import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { Spinner, EmptyState, fmtDateTime, PageHead } from '../../components/ui.jsx';

const ACTION_LABELS = {
  hospital_join_request: "Demande d'adhésion hôpital",
  hospital_approved: 'Hôpital approuvé',
  hospital_refused: 'Hôpital refusé',
  hospital_suspended: 'Hôpital suspendu',
  hospital_reactivated: 'Hôpital réactivé',
  hospital_updated: 'Hôpital modifié',
  hospital_profile_updated: 'Profil hôpital modifié',
  donor_created_manually: 'Donneur ajouté manuellement',
  donor_updated: 'Donneur modifié',
  donor_suspended: 'Donneur suspendu',
  donor_reactivated: 'Donneur réactivé',
  donor_profile_updated: 'Profil donneur modifié',
  donor_responded: 'Donneur a répondu',
  request_created: 'Demande créée',
  request_launched: 'Demande lancée (admin)',
  request_approved: 'Demande famille diffusée',
  request_refused: 'Demande refusée',
  request_stopped: 'Demande arrêtée',
  request_completed: 'Demande clôturée',
  request_relaunched: 'Donneurs relancés',
  auto_stop: 'Arrêt automatique (5 réponses)',
  subscription_renewed: 'Abonnement renouvelé',
  stock_updated: 'Stock mis à jour',
  stock_critical_alert: 'Alerte stock critique',
  blood_bank_responded: 'Banque de sang a répondu',
  blood_bank_profile_updated: 'Profil banque modifié',
  family_request_created: 'Demande famille créée',
};

export default function AdminLogs() {
  const [items, setItems] = useState(null);
  useEffect(() => { api('/admin/activity-logs').then(setItems).catch(() => setItems([])); }, []);

  if (!items) return <Spinner />;

  return (
    <>
      <PageHead title="Journal d'activité" sub="Journalisation des actions importantes" />
      {items.length === 0 ? (
        <EmptyState text="Aucune activité enregistrée." />
      ) : (
        <div className="card">
          {items.map((l) => (
            <div className="row" key={l.id}>
              <span style={{ fontSize: 18 }}>🧾</span>
              <div className="grow">
                <div className="title">{ACTION_LABELS[l.action] || l.action}</div>
                <div className="sub">
                  {l.user_name ? `${l.user_name} · ` : ''}{l.entity}{l.entity_id ? ` #${l.entity_id}` : ''}
                </div>
              </div>
              <span className="muted">{fmtDateTime(l.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}