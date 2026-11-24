import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Droplets, Menu, X, LogOut, LayoutDashboard, Hospital, Users, Inbox, CreditCard, KeyRound,
  ScrollText, Megaphone, Wallet, PlusCircle, MessageSquare, Landmark, History, Settings,
  Warehouse, ArrowLeftRight, Home, Siren, User, HandHeart, Search,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLE_LABELS, homeFor } from '../constants.js';

const I = 18;

// Navigation par rôle, regroupée en sections pour les espaces professionnels
const navByRole = {
  donor: [
    { to: '/donneur', label: 'Accueil', icon: <Home size={20} />, end: true },
    { to: '/donneur/urgences', label: 'Urgences', icon: <Siren size={20} /> },
    { to: '/donneur/campagnes', label: 'Campagnes', icon: <Megaphone size={20} /> },
    { to: '/donneur/historique', label: 'Historique', icon: <History size={20} /> },
    { to: '/donneur/profil', label: 'Profil', icon: <User size={20} /> },
  ],
  super_admin: [
    { section: 'Pilotage' },
    { to: '/admin', label: 'Tableau de bord', icon: <LayoutDashboard size={I} />, end: true },
    { to: '/admin/demandes', label: 'Demandes', icon: <Inbox size={I} /> },
    { to: '/admin/campagnes', label: 'Campagnes', icon: <Megaphone size={I} /> },
    { section: 'Réseau' },
    { to: '/admin/hopitaux', label: 'Hôpitaux', icon: <Hospital size={I} /> },
    { to: '/admin/donneurs', label: 'Donneurs', icon: <Users size={I} /> },
    { section: 'Finances solidaires' },
    { to: '/admin/finances', label: 'Fonds & transparence', icon: <Wallet size={I} /> },
    { to: '/admin/paiements', label: 'Paiements', icon: <CreditCard size={I} /> },
    { to: '/admin/abonnements', label: 'Abonnements', icon: <KeyRound size={I} /> },
    { section: 'Système' },
    { to: '/admin/activite', label: 'Journal d’activité', icon: <ScrollText size={I} /> },
  ],
  hospital_admin: [
    { section: 'Urgences' },
    { to: '/hopital', label: 'Tableau de bord', icon: <LayoutDashboard size={I} />, end: true },
    { to: '/hopital/nouvelle-demande', label: 'Nouvelle demande', icon: <PlusCircle size={I} /> },
    { to: '/hopital/demandes', label: 'Demandes en cours', icon: <Inbox size={I} /> },
    { to: '/hopital/reponses', label: 'Réponses donneurs', icon: <MessageSquare size={I} /> },
    { section: 'Ressources' },
    { to: '/hopital/banques', label: 'Banques de sang', icon: <Landmark size={I} /> },
    { to: '/hopital/campagnes', label: 'Campagnes', icon: <Megaphone size={I} /> },
    { to: '/hopital/utilisateurs', label: 'Donneurs contacts', icon: <Users size={I} /> },
    { to: '/hopital/historique', label: 'Historique', icon: <History size={I} /> },
    { section: 'Compte' },
    { to: '/hopital/abonnement', label: 'Abonnement', icon: <KeyRound size={I} /> },
    { to: '/hopital/profil', label: 'Profil', icon: <Settings size={I} /> },
  ],
  blood_bank_admin: [
    { section: 'Banque de sang' },
    { to: '/banque', label: 'Stocks', icon: <Warehouse size={I} />, end: true },
    { to: '/banque/mouvements', label: 'Mouvements', icon: <ArrowLeftRight size={I} /> },
    { to: '/banque/demandes', label: 'Demandes', icon: <Inbox size={I} /> },
    { to: '/banque/campagnes', label: 'Campagnes', icon: <Megaphone size={I} /> },
    { section: 'Compte' },
    { to: '/banque/profil', label: 'Profil', icon: <Settings size={I} /> },
  ],
};

export function Brand({ light, sub = 'Un geste simple. Une vie sauvée.' }) {
  return (
    <span className="brand" style={{ color: light ? '#fff' : 'var(--ink)' }}>
      <span className="brand-drop"><Droplets size={19} /></span>
      <span>
        YEDIAM NENE
        <small>{sub}</small>
      </span>
    </span>
  );
}

const initials = (name = '') =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || 'YN';

// ---------------------------------------------------------------------------
// Site public (accueil, campagnes, transparence, formulaires)
// ---------------------------------------------------------------------------
const publicLinks = [
  { to: '/', label: 'Accueil', end: true },
  { to: '/campagnes', label: 'Campagnes' },
  { to: '/transparence', label: 'Transparence' },
  { to: '/suivi', label: 'Suivre une demande' },
  { to: '/adhesion-hopital', label: 'Hôpitaux' },
];

export function PublicLayout() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => { setOpen(false); window.scrollTo(0, 0); }, [location.pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <header className={`site-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="container inner">
          <Link to="/" aria-label="Accueil YEDIAM NENE"><Brand /></Link>
          <nav className="site-links" aria-label="Navigation principale">
            {publicLinks.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => (isActive ? 'active' : '')}>{l.label}</NavLink>
            ))}
          </nav>
          <div className="site-cta">
            {user ? (
              <Link to={homeFor(user.role)} className="btn btn-black">Mon espace</Link>
            ) : (
              <Link to="/login" className="btn btn-outline hide-sm">Connexion</Link>
            )}
            <Link to="/besoin-urgent" className="btn btn-red"><Siren size={16} /> Urgence</Link>
            <button className="site-burger" onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open}>
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
        {open && (
          <nav className="site-mobile-menu">
            {publicLinks.map((l) => <Link key={l.to} to={l.to}>{l.label}</Link>)}
            <Link to="/soutenir">Soutenir financièrement</Link>
            {!user && <Link to="/login">Connexion</Link>}
          </nav>
        )}
      </header>

      <Outlet />

      <footer className="site-footer">
        <div className="container">
          <div className="cols">
            <div>
              <Brand light />
              <p style={{ marginTop: 12, fontSize: 14, maxWidth: 320 }}>
                « Yediam nene » signifie « Donne ton sang » en Pulaar. La plateforme mauritanienne qui relie donneurs,
                hôpitaux, banques de sang et familles.
              </p>
            </div>
            <div>
              <h4>Agir</h4>
              <Link to="/inscription">Devenir donneur</Link>
              <Link to="/besoin-urgent">Demande urgente</Link>
              <Link to="/soutenir">Faire un don financier</Link>
              <Link to="/campagnes">Campagnes</Link>
            </div>
            <div>
              <h4>Professionnels</h4>
              <Link to="/adhesion-hopital">Adhésion hôpital</Link>
              <Link to="/login">Espace banque de sang</Link>
              <Link to="/login">Connexion</Link>
            </div>
            <div>
              <h4>Confiance</h4>
              <Link to="/transparence">Transparence des fonds</Link>
              <Link to="/suivi">Suivre une demande</Link>
              <Link to="/transparence">Charte : le sang reste gratuit</Link>
            </div>
          </div>
          <div className="legal">
            <span>© {new Date().getFullYear()} YEDIAM NENE · Un geste simple. Une vie sauvée.</span>
            <span>Prototype — paiements et notifications simulés.</span>
          </div>
        </div>
      </footer>
    </>
  );
}

// ---------------------------------------------------------------------------
// Espace donneur (mobile-first, navigation basse)
// ---------------------------------------------------------------------------
export function DonorLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const nav = navByRole.donor;

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <>
      <header className="topbar">
        <Link to="/donneur"><Brand light /></Link>
        <div className="flex" style={{ gap: 8 }}>
          <Link to="/soutenir" className="icon-btn" aria-label="Soutenir"><HandHeart size={18} /></Link>
          <button onClick={handleLogout} className="icon-btn" aria-label="Déconnexion"><LogOut size={18} /></button>
        </div>
      </header>
      <main className="panel">
        <Outlet />
      </main>
      <nav className="bottom-nav" aria-label="Navigation donneur">
        {nav.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? 'active' : '')}>
            {n.icon}
            {n.label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}

// ---------------------------------------------------------------------------
// Espaces professionnels (Super Admin, hôpital, banque de sang)
// ---------------------------------------------------------------------------
function NavItems({ items, onClick }) {
  return items.map((n, i) =>
    n.section ? (
      <div key={`s${i}`} className="nav-section">{n.section}</div>
    ) : (
      <NavLink key={n.to} to={n.to} end={n.end} onClick={onClick} className={({ isActive }) => (isActive ? 'active' : '')}>
        {n.icon} {n.label}
      </NavLink>
    )
  );
}

function SideFooter({ user, onLogout }) {
  return (
    <>
      <div style={{ flex: 1, minHeight: 16 }} />
      <Link to="/" className="nav-link-plain" style={{ color: '#8d90a0', fontSize: 13, padding: '8px 12px', display: 'flex', gap: 8, alignItems: 'center' }}>
        <Search size={15} /> Voir le site public
      </Link>
      <div className="side-user">
        <span className="avatar">{initials(user.nom)}</span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="name">{user.nom}</div>
          <div className="role">{ROLE_LABELS[user.role]}</div>
        </div>
        <button onClick={onLogout} aria-label="Déconnexion" style={{ background: 'none', border: 'none', color: '#b9bbc6' }}>
          <LogOut size={17} />
        </button>
      </div>
    </>
  );
}

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const nav = navByRole[user.role] || [];

  useEffect(() => { setOpen(false); }, [location.pathname]);
  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <Link to={homeFor(user.role)}><Brand light sub={ROLE_LABELS[user.role]} /></Link>
        <NavItems items={nav} />
        <SideFooter user={user} onLogout={handleLogout} />
      </aside>

      <div className="mobile-admin-bar">
        <Brand light sub={ROLE_LABELS[user.role]} />
        <button className="hamb" onClick={() => setOpen(true)} aria-label="Menu"><Menu size={22} /></button>
      </div>

      <div className={`drawer ${open ? 'open' : ''}`} onClick={() => setOpen(false)}>
        <aside onClick={(e) => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Brand light sub={ROLE_LABELS[user.role]} />
            <button className="hamb" onClick={() => setOpen(false)} aria-label="Fermer"><X size={20} /></button>
          </div>
          <NavItems items={nav} onClick={() => setOpen(false)} />
          <SideFooter user={user} onLogout={handleLogout} />
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
