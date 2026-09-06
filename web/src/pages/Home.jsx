import { Link, useNavigate } from 'react-router-dom';
import { Droplets, HeartHandshake, Hospital, Landmark, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const actions = [
    { to: '/besoin-urgent', icon: <Droplets size={26} />, bg: 'var(--red)', title: "J'AI BESOIN DE SANG", sub: 'Demande urgente pour un proche' },
    { to: '/inscription', icon: <HeartHandshake size={26} />, bg: 'var(--gold)', title: 'JE VEUX DONNER', sub: 'Devenir donneur volontaire' },
    { to: '/adhesion-hopital', icon: <Hospital size={26} />, bg: 'var(--black)', title: 'JE SUIS UN HÔPITAL', sub: "Demande d'adhésion au réseau" },
    { to: '/login', icon: <Landmark size={26} />, bg: 'var(--red-dark)', title: 'BANQUE DE SANG', sub: 'Espace professionnel' },
  ];

  return (
    <>
      <section className="hero">
        <div className="logo"><Droplets size={40} /></div>
        <h1>YEDIAM NENE</h1>
        <p className="slogan">« Un geste simple. Une vie sauvée. »</p>
      </section>

      <div className="home-actions">
        {actions.map((a) => (
          <button key={a.to} className="home-action" onClick={() => navigate(a.to)}>
            <span className="ico" style={{ background: a.bg, color: '#fff' }}>{a.icon}</span>
            <span>
              {a.title}
              <small>{a.sub}</small>
            </span>
          </button>
        ))}

        {user ? (
          <Link to={user.role === 'donor' ? '/donneur' : user.role === 'hospital_admin' ? '/hopital' : user.role === 'blood_bank_admin' ? '/banque' : '/admin'} className="btn btn-black">
            <LogIn size={18} /> Continuer vers mon espace
          </Link>
        ) : (
          <Link to="/login" className="btn btn-black">
            <LogIn size={18} /> Se connecter
          </Link>
        )}

        <p className="footer-note" style={{ paddingBottom: 0 }}>
          Plateforme de coordination du don de sang en Mauritanie.
          <br />
          Prototype — les paiements et notifications sont simulés.
        </p>
      </div>
    </>
  );
}