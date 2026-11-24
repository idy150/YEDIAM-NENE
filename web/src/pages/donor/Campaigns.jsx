import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, CalendarDays, CheckCircle2, Droplets, HandHeart } from 'lucide-react';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Spinner, EmptyState, Progress, fmtDate, useToast } from '../../components/ui.jsx';
import { daysLeft } from '../../components/CampaignCard.jsx';
import { CAMPAIGN_TYPES } from '../../constants.js';

export default function DonorCampaigns() {
  const { profile } = useAuth();
  const [items, setItems] = useState(null);
  const [joined, setJoined] = useState([]);
  const [busy, setBusy] = useState(null);
  const [toast, setToast] = useToast();

  const load = () => Promise.all([
    api('/public/campaigns?status=active', { auth: false }).then(setItems),
    api('/campaigns/donor/joined').then((r) => setJoined(r.map((x) => x.campaign_id))),
  ]).catch(() => setItems((i) => i || []));
  useEffect(() => { load(); }, []);

  const toggle = async (c) => {
    setBusy(c.id);
    try {
      const isIn = joined.includes(c.id);
      const r = await api(`/campaigns/${c.id}/${isIn ? 'leave' : 'join'}`, { method: 'POST' });
      setToast(r.message);
      load();
    } catch (e) { setToast(e.message); } finally { setBusy(null); }
  };

  if (!items) return <Spinner />;
  const myGroup = profile?.blood_group;
  const sorted = [...items].sort((a, b) =>
    Number(!!b.target_groups?.includes(myGroup)) - Number(!!a.target_groups?.includes(myGroup)));

  return (
    <>
      <div className="page-head"><div><h1>Campagnes</h1><div className="sub">Collectes ouvertes près de chez vous</div></div></div>
      {sorted.length === 0 && <EmptyState text="Aucune campagne en cours pour le moment." />}
      {sorted.map((c) => {
        const isIn = joined.includes(c.id);
        const priority = c.target_groups?.includes(myGroup);
        const left = daysLeft(c.end_date);
        return (
          <div className="card" key={c.id}>
            <div className="flex between" style={{ alignItems: 'flex-start' }}>
              <div>
                <div className="flex wrap" style={{ gap: 6 }}>
                  <span className={`pill ${c.type === 'collecte' ? 'pill-red' : ''}`}>{CAMPAIGN_TYPES[c.type]}</span>
                  {priority && <span className="pill pill-gold"><Droplets size={12} /> Votre groupe est recherché</span>}
                </div>
                <h3 style={{ fontSize: 16.5, marginTop: 8 }}>{c.title}</h3>
                <div className="sub">{c.organizer_name}</div>
              </div>
              <span className="pill">{left > 0 ? `J-${left}` : 'Aujourd’hui'}</span>
            </div>
            <div className="campaign-meta mt">
              {c.wilaya && <span><MapPin size={14} /> {c.location ? `${c.location}, ` : ''}{c.wilaya}</span>}
              <span><CalendarDays size={14} /> jusqu’au {fmtDate(c.end_date)}</span>
            </div>
            {c.type === 'collecte' && c.target_donors > 0 && (
              <div className="mt">
                <div className="meter-label"><span>{c.participants} inscrits</span><span>objectif {c.target_donors}</span></div>
                <Progress value={c.participants} max={c.target_donors} />
              </div>
            )}
            <div className="grid-2 mt">
              {c.type === 'collecte' ? (
                <button className={`btn ${isIn ? 'btn-outline' : 'btn-red'}`} disabled={busy === c.id} onClick={() => toggle(c)}>
                  {isIn ? <><CheckCircle2 size={17} /> Inscrit</> : 'Je participe'}
                </button>
              ) : <Link to={`/campagnes/${c.id}`} className="btn btn-outline">Découvrir</Link>}
              <Link to={`/campagnes/${c.id}`} className="btn btn-outline"><HandHeart size={16} /> Détails</Link>
            </div>
          </div>
        );
      })}
      {toast}
    </>
  );
}
