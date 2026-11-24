import { useEffect, useState } from 'react';
import { Users, Hospital, Landmark, Siren, CheckCircle2, KeyRound, Wallet, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, Legend } from 'recharts';
import { api } from '../../api.js';
import { Spinner, StatCard, PageHead } from '../../components/ui.jsx';
import ForecastCard from '../../components/ForecastCard.jsx';

const COLORS = ['#d7262e', '#c99a2e', '#12131a', '#17945a', '#e27a0c', '#2f6fde', '#7b5cd6', '#7b7f8c'];

export default function AdminDashboard() {
  const [dash, setDash] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api('/admin/dashboard').then(setDash).catch(() => {});
    api('/admin/stats').then(setStats).catch(() => {});
  }, []);

  if (!dash || !stats) return <Spinner />;

  const monthLabel = (m) => {
    const [y, mo] = m.split('-');
    return `${mo}/${y.slice(2)}`;
  };

  return (
    <>
      <PageHead title="Dashboard national" sub="Vue globale de la plateforme YEDIAM NENE" />
      <div className="stats-grid">
        <StatCard icon={<Users size={20} />} num={dash.donors} label="Donneurs" />
        <StatCard icon={<Hospital size={20} />} num={dash.hospitals} label="Hôpitaux" color="var(--black)" />
        <StatCard icon={<Landmark size={20} />} num={dash.bloodBanks} label="Banques de sang" color="var(--gold)" />
        <StatCard icon={<Siren size={20} />} num={dash.activeRequests} label="Demandes actives" />
        <StatCard icon={<CheckCircle2 size={20} />} num={dash.completedRequests} label="Demandes terminées" color="var(--green)" />
        <StatCard icon={<Siren size={20} />} num={dash.urgentRequests} label="Urgences immédiates" color="var(--orange)" />
        <StatCard icon={<KeyRound size={20} />} num={dash.subscriptionsActive} label="Abonnements actifs" color="var(--gold)" />
        <StatCard icon={<Wallet size={20} />} num={`${dash.revenue.toLocaleString('fr-FR')} MRU`} label="Revenus (simulés)" color="var(--green)" />
      </div>

      <div className="grid-auto" style={{ marginTop: 16 }}>
        <div className="card">
          <h3 style={{ fontSize: 15, marginBottom: 10 }}>Dons par mois</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.donorsPerMonth.map((d) => ({ name: monthLabel(d.month), n: d.n }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="name" fontSize={11} />
              <YAxis fontSize={11} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="n" fill="#d7262e" radius={[6, 6, 0, 0]} name="Donneurs" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3 style={{ fontSize: 15, marginBottom: 10 }}>Demandes par mois</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.requestsPerMonth.map((d) => ({ name: monthLabel(d.month), n: d.n }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="name" fontSize={11} />
              <YAxis fontSize={11} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="n" fill="#c99a2e" radius={[6, 6, 0, 0]} name="Demandes" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid-auto" style={{ marginTop: 16 }}>
        <div className="card">
          <h3 style={{ fontSize: 15, marginBottom: 10 }}>Groupes sanguins les plus recherchés</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={stats.topBloodGroups} dataKey="n" nameKey="blood_group" innerRadius={50} outerRadius={80} paddingAngle={2}>
                {stats.topBloodGroups.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend fontSize={11} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3 style={{ fontSize: 15, marginBottom: 10 }}>Wilayas avec le plus de demandes</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.byWilaya.map((d) => ({ name: d.wilaya, n: d.n }))} layout="vertical">
              <XAxis type="number" fontSize={11} allowDecimals={false} />
              <YAxis type="category" dataKey="name" fontSize={10} width={110} />
              <Tooltip />
              <Bar dataKey="n" fill="#12131a" radius={[0, 6, 6, 0]} name="Demandes" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid-auto" style={{ marginTop: 16 }}>
        <div className="card">
          <h3 style={{ fontSize: 15, marginBottom: 10 }}>Satisfaction des demandes</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={[{ name: 'Satisfaites', value: stats.satisfied }, { name: 'Non satisfaites', value: stats.unsatisfied }]} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                <Cell fill="#17945a" />
                <Cell fill="#d7262e" />
              </Pie>
              <Tooltip />
              <Legend fontSize={11} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3 style={{ fontSize: 15, marginBottom: 10 }}>Donneurs par groupe sanguin</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={stats.donorsByGroup} dataKey="n" nameKey="blood_group" innerRadius={50} outerRadius={80} paddingAngle={2}>
                {stats.donorsByGroup.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend fontSize={11} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <ForecastCard />

      <div className="card mt" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Activity size={18} className="text-gold" />
        <span className="muted">Prototype : données de démonstration et paiements simulés. Statistiques mises à jour en temps réel sur la base PostgreSQL.</span>
      </div>
    </>
  );
}