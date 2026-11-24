import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { HandHeart } from 'lucide-react';
import { api } from '../../api.js';
import { Spinner, EmptyState } from '../../components/ui.jsx';
import CampaignCard from '../../components/CampaignCard.jsx';
import { WILAYAS } from '../../constants.js';

export default function Campaigns() {
  const [items, setItems] = useState(null);
  const [tab, setTab] = useState('active');
  const [type, setType] = useState('');
  const [wilaya, setWilaya] = useState('');

  useEffect(() => {
    api('/public/campaigns', { auth: false }).then(setItems).catch(() => setItems([]));
  }, []);

  const list = useMemo(
    () => (items || []).filter((c) =>
      (tab === 'all' || c.status === tab) && (!type || c.type === type) && (!wilaya || c.wilaya === wilaya)
    ),
    [items, tab, type, wilaya]
  );

  return (
    <div className="container">
      <div className="page-hero">
        <span className="eyebrow">Campagnes</span>
        <h1>Collectes et sensibilisation</h1>
        <p>Inscrivez-vous à une collecte, partagez-la autour de vous ou financez sa logistique. Les montants collectés sont publiés en temps réel.</p>
      </div>

      <div className="flex wrap between" style={{ margin: '18px 0' }}>
        <div className="tabs" style={{ marginBottom: 0 }}>
          {[['active', 'En cours'], ['completed', 'Terminées'], ['all', 'Toutes']].map(([v, l]) => (
            <button key={v} className={tab === v ? 'active' : ''} onClick={() => setTab(v)}>{l}</button>
          ))}
        </div>
        <div className="toolbar" style={{ marginBottom: 0 }}>
          <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Type">
            <option value="">Tous les types</option>
            <option value="collecte">Collecte de sang</option>
            <option value="sensibilisation">Sensibilisation</option>
          </select>
          <select value={wilaya} onChange={(e) => setWilaya(e.target.value)} aria-label="Wilaya">
            <option value="">Toutes les wilayas</option>
            {WILAYAS.map((w) => <option key={w}>{w}</option>)}
          </select>
        </div>
      </div>

      {!items ? <Spinner /> : list.length === 0 ? (
        <EmptyState text="Aucune campagne ne correspond à ces filtres." />
      ) : (
        <div className="campaign-grid">
          {list.map((c) => <CampaignCard key={c.id} c={c} />)}
        </div>
      )}

      <div className="cta-band mt-lg" style={{ background: 'var(--black)', boxShadow: 'var(--shadow-lg)' }}>
        <div>
          <h3>Votre entreprise veut sponsoriser une collecte ?</h3>
          <p style={{ opacity: 0.8, marginTop: 6 }}>Bus de collecte, collations, communication : votre soutien est visible et tracé.</p>
        </div>
        <Link to="/soutenir?type=company" className="btn btn-gold btn-lg"><HandHeart size={18} /> Devenir sponsor</Link>
      </div>
    </div>
  );
}
