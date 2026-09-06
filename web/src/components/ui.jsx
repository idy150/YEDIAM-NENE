import { X } from 'lucide-react';
import { URGENCY, REQUEST_STATUS, SUBSCRIPTION_STATUS, HOSPITAL_STATUS, PAYMENT_STATUS } from '../constants.js';

export function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button className="btn-ghost" style={{ border: 'none', background: 'none' }} onClick={onClose} aria-label="Fermer">
            <X size={22} />
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
      <span className="ico" style={{ color }}>{icon}</span>
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