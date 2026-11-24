import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { URGENCY, REQUEST_STATUS, SUBSCRIPTION_STATUS, HOSPITAL_STATUS, PAYMENT_STATUS } from '../constants.js';

export function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button className="icon-close" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function StatCard({ icon, num, label, color = 'var(--red)' }) {
  return (
    <div className="stat-card">
      <span className="ico" style={{ color, background: `color-mix(in srgb, ${color} 12%, white)` }}>{icon}</span>
      <div className="num" style={{ color }}>{num}</div>
      <div className="lbl">{label}</div>
    </div>
  );
}

export function BloodBadge({ group, tone }) {
  return <span className={`blood-badge ${tone || ''}`}>{group}</span>;
}

export function UrgencyBadge({ urgency }) {
  const u = URGENCY[urgency] || URGENCY.normal;
  return <span className="badge" style={{ background: u.color, color: '#fff' }}>{u.label}</span>;
}

export function StatusBadge({ status, map }) {
  const s = (map || REQUEST_STATUS)[status];
  if (!s) return <span className="badge" style={{ background: 'var(--gray-light)', color: 'var(--gray)' }}>{status}</span>;
  return <span className="badge" style={{ background: s.color, color: '#fff' }}>{s.label}</span>;
}

export const ReqStatusBadge = ({ status }) => <StatusBadge status={status} />;
export const SubStatusBadge = ({ status }) => <StatusBadge status={status} map={SUBSCRIPTION_STATUS} />;
export const HospStatusBadge = ({ status }) => <StatusBadge status={status} map={HOSPITAL_STATUS} />;
export const PayStatusBadge = ({ status }) => <StatusBadge status={status} map={PAYMENT_STATUS} />;

export function Spinner() {
  return <div className="spinner">Chargement…</div>;
}

export function EmptyState({ text, icon }) {
  return (
    <div className="empty">
      <div className="ico">{icon || '🩸'}</div>
      <p>{text || 'Aucune donnée pour le moment.'}</p>
    </div>
  );
}

export function PageHead({ title, sub, actions }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {sub && <div className="sub">{sub}</div>}
      </div>
      {actions && <div>{actions}</div>}
    </div>
  );
}

export function Alert({ type, children }) {
  return <div className={`alert alert-${type}`}>{children}</div>;
}

export function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
// Montant en ouguiya (MRU)
export function fmtMoney(v) {
  return `${fmtNumber(Math.round(Number(v || 0)))}\u00a0MRU`;
}

export function fmtNumber(v) {
  // Espace insécable classique (U+202F mal rendu par certaines polices)
  return Number(v || 0).toLocaleString('fr-FR').replace(/\u202f/g, '\u00a0');
}

export function Progress({ value, max, tone, size }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={`progress ${tone || ''} ${size || ''}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div style={{ width: `${pct}%` }} />
    </div>
  );
}

// Notification éphémère
export function useToast() {
  const [msg, setMsg] = useState('');
  useEffect(() => {
    if (!msg) return undefined;
    const t = setTimeout(() => setMsg(''), 3800);
    return () => clearTimeout(t);
  }, [msg]);
  const node = msg ? <div className="toast" role="status">{msg}</div> : null;
  return [node, setMsg];
}

export function HBar({ label, value, max, color, suffix }) {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <div className="hbar">
      <span>{label}</span>
      <div className="track"><div className="fill" style={{ width: `${pct}%`, background: color || 'var(--red)' }} /></div>
      <b>{suffix ? suffix(value) : value}</b>
    </div>
  );
}
