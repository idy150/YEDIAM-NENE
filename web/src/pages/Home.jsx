import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Siren, HeartHandshake, Hospital, Landmark, Users, ShieldCheck, ArrowRight, BellRing,
  MapPin, CheckCircle2, Clock, HandHeart, Truck, Receipt, LineChart, Megaphone, Droplet, Lock,
} from 'lucide-react';
import { api } from '../api.js';
import { fmtNumber, fmtMoney } from '../components/ui.jsx';
import CampaignCard from '../components/CampaignCard.jsx';

const roles = [
  { icon: <HeartHandshake size={22} />, bg: 'var(--red)', title: 'Donneur', text: 'Inscription en 1 minute, groupe sanguin, disponibilité, alertes d’urgence et historique de vos dons.', to: '/inscription', cta: 'Devenir donneur' },
  { icon: <Hospital size={22} />, bg: 'var(--black)', title: 'Hôpital', text: 'Demandes urgentes, suivi des réponses en temps réel, confirmation des dons et tableau de bord.', to: '/adhesion-hopital', cta: 'Demander l’adhésion' },
  { icon: <Landmark size={22} />, bg: 'var(--gold)', title: 'Banque de sang', text: 'Stocks par groupe, alertes de stock critique, réponses aux demandes et campagnes de collecte.', to: '/login', cta: 'Espace professionnel' },
  { icon: <Users size={22} />, bg: '#7b5cd6', title: 'Famille', text: 'Une demande urgente simplifiée, même sans compte, avec un code pour suivre la mobilisation.', to: '/besoin-urgent', cta: 'Faire une demande' },
  { icon: <ShieldCheck size={22} />, bg: 'var(--green)', title: 'Super Admin', text: 'Pilotage national : hôpitaux, donneurs, demandes, campagnes, fonds solidaires et statistiques.', to: '/login', cta: 'Administration' },
  { icon: <HandHeart size={22} />, bg: 'var(--blue)', title: 'Contributeur', text: 'Particuliers et entreprises financent la logistique des collectes, avec reçu et suivi transparent.', to: '/soutenir', cta: 'Soutenir' },
];

const workflow = [
  { t: 'Besoin urgent', d: 'Un hôpital ou une famille crée une demande.' },
  { t: 'Groupe & lieu', d: 'Groupe sanguin, poches nécessaires, wilaya.' },
  { t: 'Donneurs compatibles', d: 'Sélection selon compatibilité, disponibilité et délai entre dons.' },
  { t: 'Alerte envoyée', d: '« Je peux donner » ou « Je ne suis pas disponible ».' },
  { t: 'Suivi en direct', d: 'L’hôpital voit les réponses et confirme les dons.' },
  { t: 'Besoin couvert', d: 'Clôture automatique et historique conservé.' },
];

export default function Home() {
  const [stats, setStats] = useState(null);
  const [campaigns, setCampaigns] = useState([]);

  useEffect(() => {
    api('/public/stats', { auth: false }).then(setStats).catch(() => {});
    api('/public/campaigns?status=active', { auth: false }).then((c) => setCampaigns(c.slice(0, 3))).catch(() => {});
  }, []);

  return (
    <>
      {/* HERO */}
      <section className="landing-hero">
        <div className="container hero-grid">
          <div>
            <span className="pill pill-red"><Droplet size={14} /> Yediam nene · « Donne ton sang » en Pulaar</span>
            <h1 className="hero-title" style={{ marginTop: 16 }}>
              Un geste simple.<br /><em>Une vie sauvée.</em>
            </h1>
            <p className="hero-lead">
              Le réseau national qui remplace les appels et messages WhatsApp désorganisés : une demande, des donneurs
              compatibles alertés en quelques secondes, un suivi clair pour l’hôpital et la famille.
            </p>
            <div className="hero-actions">
              <Link to="/besoin-urgent" className="btn btn-red btn-lg"><Siren size={19} /> J’ai besoin de sang</Link>
              <Link to="/inscription" className="btn btn-black btn-lg"><HeartHandshake size={19} /> Je veux donner</Link>
            </div>
            <div className="hero-trust">
              <span><CheckCircle2 size={16} color="var(--green)" /> Gratuit pour les donneurs</span>
              <span><Lock size={16} /> Données protégées</span>
              <span><Receipt size={16} /> Fonds 100 % traçables</span>
            </div>
          </div>

          <div className="hero-visual">
            <div className="alert-mock">
              <div className="live"><span className="pulse" /> ALERTE EN DIRECT</div>
              <div className="flex" style={{ marginTop: 16, gap: 14 }}>
                <span className="blood-badge red" style={{ width: 58, height: 58, fontSize: 19 }}>O+</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 19 }}>Besoin urgent de sang</div>
                  <div style={{ color: '#b9bbc6', fontSize: 14 }}>Hôpital National · Nouakchott Ouest · 5 poches</div>
                </div>
              </div>
              <div style={{ marginTop: 18 }}>
                <div className="meter-label" style={{ color: '#d8d9e0' }}><span>Donneurs confirmés</span><span>3 / 5</span></div>
                <div className="progress lg" style={{ background: 'rgba(255,255,255,0.1)' }}><div style={{ width: '60%' }} /></div>
              </div>
              <div className="grid-2" style={{ marginTop: 18 }}>
                <span className="btn btn-red" style={{ pointerEvents: 'none' }}>Je peux donner</span>
                <span className="btn btn-light" style={{ pointerEvents: 'none' }}>Pas disponible</span>
              </div>
            </div>
            <div className="float-card" style={{ left: -28, bottom: -22 }}>
              <span className="blood-badge" style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--green)' }}><CheckCircle2 size={18} /></span>
              Fatou a confirmé · il y a 2 min
            </div>
            <div className="float-card" style={{ right: -14, top: -20 }}>
              <BellRing size={18} color="var(--red)" /> 17 donneurs compatibles alertés
            </div>
          </div>
        </div>
      </section>

      {/* CHIFFRES */}
      <section className="container">
        <div className="kpi-band">
          <div><div className="v">{stats ? fmtNumber(stats.donors) : '—'}</div><div className="l">donneurs inscrits</div></div>
          <div><div className="v">{stats ? fmtNumber(stats.hospitals) : '—'}</div><div className="l">hôpitaux connectés</div></div>
          <div><div className="v text-red">{stats ? fmtNumber(stats.covered) : '—'}</div><div className="l">besoins couverts</div></div>
          <div><div className="v">{stats ? fmtMoney(stats.collected) : '—'}</div><div className="l">collectés pour la logistique</div></div>
        </div>
      </section>

      {/* WORKFLOW */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Comment ça marche</span>
            <h2>De l’alerte au don, en quelques minutes.</h2>
            <p>Chaque demande suit le même parcours, visible par l’hôpital et la famille, jusqu’à la clôture.</p>
          </div>
          <div className="steps six">
            {workflow.map((s) => (
              <div className="step" key={s.t}><h4>{s.t}</h4><p>{s.d}</p></div>
            ))}
          </div>
        </div>
      </section>

      {/* ROLES */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Pour chacun</span>
            <h2>Un espace pensé pour chaque acteur.</h2>
          </div>
          <div className="roles">
            {roles.map((r) => (
              <Link to={r.to} className="role-card" key={r.title}>
                <span className="ico" style={{ background: r.bg }}>{r.icon}</span>
                <h3>{r.title}</h3>
                <p>{r.text}</p>
                <span className="go">{r.cta} <ArrowRight size={15} /></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CAMPAGNES */}
      {campaigns.length > 0 && (
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="flex between wrap" style={{ alignItems: 'flex-end', marginBottom: 24 }}>
              <div className="section-head" style={{ marginBottom: 0 }}>
                <span className="eyebrow">Campagnes en cours</span>
                <h2>Rejoignez une collecte près de chez vous.</h2>
              </div>
              <Link to="/campagnes" className="btn btn-outline btn-auto">Toutes les campagnes <ArrowRight size={16} /></Link>
            </div>
            <div className="campaign-grid">
              {campaigns.map((c) => <CampaignCard key={c.id} c={c} />)}
            </div>
          </div>
        </section>
      )}

      {/* FINTECH */}
      <section className="section section-dark" id="sang-gratuit">
        <div className="container split">
          <div>
            <span className="eyebrow" style={{ color: 'var(--gold)' }}>Solidarité sanitaire · FinTech</span>
            <h2 style={{ fontSize: 'clamp(26px, 3.6vw, 38px)', fontWeight: 900, marginTop: 8 }}>
              Le sang reste gratuit.<br />La logistique, elle, a besoin de vous.
            </h2>
            <p style={{ color: '#b9bbc6', marginTop: 12 }}>
              Les contributions volontaires financent le transport des donneurs, les collations, le matériel et la
              communication des campagnes. Chaque ouguiya est tracée et publiée.
            </p>
            <ul className="feature-list">
              <li><span className="fi"><Megaphone size={17} /></span><div><b>Financement des campagnes</b><span>Particuliers, entreprises et ONG soutiennent une collecte précise.</span></div></li>
              <li><span className="fi"><Truck size={17} /></span><div><b>Soutien au transport</b><span>Les donneurs peuvent demander le remboursement de leur déplacement.</span></div></li>
              <li><span className="fi"><Receipt size={17} /></span><div><b>Reçus et historique</b><span>Un reçu numérique pour chaque contribution, vérifiable en ligne.</span></div></li>
              <li><span className="fi"><LineChart size={17} /></span><div><b>Suivi des fonds</b><span>Sommes collectées et dépenses publiées sur la page Transparence.</span></div></li>
            </ul>
            <div className="hero-actions">
              <Link to="/soutenir" className="btn btn-gold btn-lg"><HandHeart size={19} /> Soutenir</Link>
              <Link to="/transparence" className="btn btn-light btn-lg">Voir la transparence</Link>
            </div>
          </div>
          <div className="card" style={{ background: '#1d1f29', color: '#fff', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="muted" style={{ color: '#8d90a0', fontWeight: 700 }}>Fonds solidaires</div>
            <div style={{ fontSize: 38, fontWeight: 900, letterSpacing: '-0.03em', marginTop: 4 }}>{stats ? fmtMoney(stats.collected) : '—'}</div>
            <div style={{ color: '#b9bbc6', fontSize: 14 }}>collectés auprès de {stats?.contributions ?? '—'} contributeurs</div>
            <div style={{ marginTop: 20 }}>
              <div className="meter-label" style={{ color: '#d8d9e0' }}>
                <span>Utilisés pour la logistique</span>
                <span>{stats ? fmtMoney(stats.spent) : '—'}</span>
              </div>
              <div className="progress gold lg" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div style={{ width: stats && stats.collected ? `${Math.min(100, (stats.spent / stats.collected) * 100)}%` : 0 }} />
              </div>
            </div>
            <div className="alert alert-info" style={{ marginTop: 20, marginBottom: 0 }}>
              <ShieldCheck size={18} style={{ flexShrink: 0 }} /> Aucune transaction ne concerne le sang lui-même : il n’est jamais vendu.
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="container">
          <div className="cta-band">
            <div>
              <h3>Chaque minute compte.</h3>
              <p style={{ opacity: 0.9, marginTop: 6 }}><Clock size={15} style={{ verticalAlign: -2 }} /> Inscrivez-vous maintenant : vous serez alerté seulement quand un patient compatible a besoin de vous, <MapPin size={15} style={{ verticalAlign: -2 }} /> près de chez vous.</p>
            </div>
            <div className="flex wrap">
              <Link to="/inscription" className="btn btn-black btn-lg">Devenir donneur</Link>
              <Link to="/suivi" className="btn btn-light btn-lg">Suivre une demande</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
