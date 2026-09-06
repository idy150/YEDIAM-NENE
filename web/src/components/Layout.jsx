import { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Droplets, Menu, X, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLE_LABELS } from '../constants.js';

const navByRole = {
  donor: [
    { to: '/donneur', label: 'Accueil', icon: '🏠', end: true },
    { to: '/donneur/urgences', label: 'Urgences', icon: '🚨' },
    { to: '/donneur/historique', label: 'Historique', icon: '📋' },
    { to: '/donneur/profil', label: 'Profil', icon: '👤' },
  ],
  super_admin: [
    { to: '/admin', label: 'Dashboard', icon: '📊', end: true },
    { to: '/admin/hopitaux', label: 'Hôpitaux', icon: '🏥' },
    { to: '/admin/donneurs', label: 'Donneurs', icon: '🩸' },
    { to: '/admin/demandes', label: 'Demandes', icon: '📨' },
    { to: '/admin/paiements', label: 'Paiements', icon: '💳' },
    { to: '/admin/abonnements', label: 'Abonnements', icon: '🔑' },
    { to: '/admin/activite', label: 'Journal', icon: '🧾' },
  ],
  hospital_admin: [
    { to: '/hopital', label: 'Tableau de bord', icon: '📊', end: true },
    { to: '/hopital/nouvelle-demande', label: 'Nouvelle demande', icon: '➕' },
    { to: '/hopital/demandes', label: 'Demandes en cours', icon: '📨' },
    { to: '/hopital/reponses', label: 'Réponses donneurs', icon: '💬' },
    { to: '/hopital/banques', label: 'Banques de sang', icon: '🏦' },
    { to: '/hopital/utilisateurs', label: 'Utilisateurs', icon: '👥' },
    { to: '/hopital/historique', label: 'Historique', icon: '📋' },
    { to: '/hopital/abonnement', label: 'Abonnement', icon: '🔑' },
    { to: '/hopital/profil', label: 'Profil', icon: '⚙️' },
  ],
  blood_bank_admin: [
    { to: '/banque', label: 'Stocks', icon: '🏦', end: true },
    { to: '/banque/mouvements', label: 'Mouvements', icon: '🔄' },
    { to: '/banque/demandes', label: 'Demandes', icon: '📨' },
    { to: '/banque/profil', label: 'Profil', icon: '⚙️' },
  ],
};

function Brand() {
  return (
    <div className="brand">
      <span className="brand-drop"><Droplets size={20} /></span>
      <span>
        YEDIAM NENE
        <small>Un geste simple. Une vie sauvée.</small>
      </span>
    </div>
  );
}

export function DonorLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const nav = navByRole.donor;

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <>
      <header className="topbar">
        <Brand />
        <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#fff' }} aria-label="Déconnexion">
          <LogOut size={20} />
        </button>
      </header>
      <main className="panel">
        <Outlet />
      </main>
      <nav className="bottom-nav">
        {nav.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? 'active' : '')}>
            <span style={{ fontSize: 18 }}>{n.icon}</span>
            {n.label}
          </NavLink>
        ))}
      </nav>
      {location.pathname !== '/donneur' && (
        <div style={{ position: 'fixed', bottom: 64, right: 14, zIndex: 25 }}>
          <span className="badge" style={{ background: 'var(--red)', color: '#fff' }}>Connecté : {user?.nom}</span>
        </div>
      )}
    </>
  );
}

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const nav = navByRole[user.role] || [];

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <Brand />
        {nav.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? 'active' : '')}>
            <span>{n.icon}</span> {n.label}
          </NavLink>
        ))}
        <div style={{ flex: 1 }} />
        <div className="muted" style={{ padding: '0 12px 8px' }}>{ROLE_LABELS[user.role]} — {user.nom}</div>
        <button className="btn btn-outline btn-sm" style={{ color: '#fff', borderColor: '#444', width: '100%' }} onClick={handleLogout}>
          <LogOut size={16} /> Déconnexion
        </button>
      </aside>

      <div className="mobile-admin-bar">
        <Brand />
        <button className="hamb" onClick={() => setOpen(true)} aria-label="Menu"><Menu size={24} /></button>
      </div>

      <div className={`drawer ${open ? 'open' : ''}`} onClick={() => setOpen(false)}>
        <aside onClick={(e) => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Brand />
            <button className="hamb" onClick={() => setOpen(false)} aria-label="Fermer"><X size={22} /></button>
          </div>
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} onClick={() => setOpen(false)} className={({ isActive }) => (isActive ? 'active' : '')}>
              <span>{n.icon}</span> {n.label}
            </NavLink>
          ))}
          <div style={{ flex: 1 }} />
          <button className="btn btn-outline btn-sm" style={{ color: '#fff', borderColor: '#444' }} onClick={handleLogout}>
            <LogOut size={16} /> Déconnexion
          </button>
        </aside>
      </div>

      <main className="admin-main">
        <div className="panel-wide">
          <Outlet />
        </div>
      </main>
    </div>
  );
}