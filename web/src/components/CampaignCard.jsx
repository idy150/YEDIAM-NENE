import { Link } from 'react-router-dom';
import { Megaphone, Droplets, MapPin, CalendarDays, Users } from 'lucide-react';
import { Progress, fmtMoney, fmtDate } from './ui.jsx';
import { CAMPAIGN_TYPES, CAMPAIGN_STATUS } from '../constants.js';

export function daysLeft(end) {
  const d = Math.ceil((new Date(end) - new Date(new Date().toDateString())) / 86400000);
  return d;
}

export default function CampaignCard({ c, to, footer }) {
  const left = daysLeft(c.end_date);
  const status = CAMPAIGN_STATUS[c.status];
  return (
    <Link to={to || `/campagnes/${c.id}`} className="campaign-card">
      <div className={`campaign-cover ${c.type}`}>
        <span className="pill" style={{ background: 'rgba(255,255,255,0.16)', color: '#fff', borderColor: 'transparent' }}>
          {c.type === 'collecte' ? <Droplets size={13} /> : <Megaphone size={13} />} {CAMPAIGN_TYPES[c.type]}
        </span>
        <span className="pill" style={{ background: '#fff', color: 'var(--ink)', borderColor: 'transparent' }}>
          {c.status === 'active' ? (left > 0 ? `J-${left}` : 'Dernier jour') : status?.label}
        </span>
        <span className="big-ico">{c.type === 'collecte' ? <Droplets size={96} /> : <Megaphone size={96} />}</span>
      </div>
      <div className="campaign-body">
        <div>
          <div className="muted" style={{ fontWeight: 700 }}>{c.organizer_name}</div>
          <h3>{c.title}</h3>
        </div>
        <div className="campaign-meta">
          {c.wilaya && <span><MapPin size={14} /> {c.location ? `${c.location}, ` : ''}{c.wilaya}</span>}
          <span><CalendarDays size={14} /> {fmtDate(c.start_date)} → {fmtDate(c.end_date)}</span>
        </div>
        {c.target_groups?.length > 0 && (
          <div className="chips" style={{ gap: 5 }}>
            {c.target_groups.map((g) => <span key={g} className="pill pill-red">{g}</span>)}
          </div>
        )}
        <div style={{ marginTop: 'auto', display: 'grid', gap: 10 }}>
          {c.type === 'collecte' && c.target_donors > 0 && (
            <div>
              <div className="meter-label"><span><Users size={13} style={{ verticalAlign: -2 }} /> {c.participants} inscrits</span><span>objectif {c.target_donors}</span></div>
              <Progress value={c.participants} max={c.target_donors} />
            </div>
          )}
          {c.target_amount > 0 && (
            <div>
              <div className="meter-label"><span>{fmtMoney(c.collected)}</span><span>sur {fmtMoney(c.target_amount)}</span></div>
              <Progress value={c.collected} max={c.target_amount} tone="gold" />
            </div>
          )}
          {footer}
        </div>
      </div>
    </Link>
  );
}
