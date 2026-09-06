import { useState } from 'react';
import { useEffect } from 'react';
import { Plus, Minus, Siren } from 'lucide-react';
import { api } from '../../api.js';
import { Spinner, Alert, StatCard } from '../../components/ui.jsx';
import { BLOOD_GROUPS } from '../../constants.js';

export default function BankDashboard() {
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api('/bloodbank/dashboard').then(setData).catch(() => {});
  useEffect(() => { load(); }, []);

  const qty = (g) => data.stocks.find((s) => s.blood_group === g)?.quantity || 0;

  const adjust = async (group, delta) => {
    setBusy(true);
    try {
      await api('/bloodbank/stocks', { method: 'PUT', body: { blood_group: group, delta, mode: 'adjust', reason: delta > 0 ? 'Ajout de poches' : 'Retrait de poches' } });
      load();
    } catch (err) {
      setMsg(err.message);
      setTimeout(() => setMsg(''), 3000);
    } finally {
      setBusy(false);
    }
  };

  const alertCritical = async (group) => {
    await api(`/bloodbank/stocks/${group}/alert`, { method: 'POST' });
    setMsg(`Alerte critique signalée pour ${group} — le Super Admin en est informé.`);
    setTimeout(() => setMsg(''), 4000);
  };

  if (!data) return <Spinner />;
  const { bank, total, critical, counts } = data;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{bank.nom}</h1>
          <div className="sub">{bank.wilaya}</div>
        </div>
      </div>
      {msg && <Alert type="info">{msg}</Alert>}

      <div className="stats-grid">
        <StatCard icon={<span>🩸</span>} num={total} label="Poches en stock" color="var(--black)" />
        <StatCard icon={<Siren size={20} />} num={critical.length} label="Groupes critiques" color="var(--red)" />
        <StatCard icon={<span>📨</span>} num={counts.activeRequests} label="Demandes actives" color="var(--gold)" />
        <StatCard icon={<span>💬</span>} num={counts.myResponses} label="Mes réponses" color="var(--green)" />
      </div>

      <h3 style={{ margin: '20px 0 10px', fontSize: 16 }}>Stocks par groupe</h3>
      <div className="card">
        {BLOOD_GROUPS.map((g) => {
          const isCritical = qty(g) <= 5 && qty(g) > 0;
          const isZero = qty(g) === 0;
          return (
            <div className={`stock-row ${isCritical || isZero ? 'critical' : ''}`} key={g}>
              <span className="blood-badge" style={isCritical || isZero ? { background: 'var(--red)' } : {}}>{g}</span>
              <div className="grow">
                <div className="title" style={{ fontSize: 14 }}>
                  {isCritical && '⚠️ Stock critique'} {isZero && '🟥 RUPTURE'}
                </div>
              </div>
              <div className="qty">{qty(g)}</div>
              <button className="btn btn-sm" style={{ background: 'var(--green-soft)', color: 'var(--green)', padding: '6px 10px' }} disabled={busy} onClick={() => adjust(g, 1)}>
                <Plus size={15} />
              </button>
              <button className="btn btn-sm" style={{ background: 'var(--red-soft)', color: 'var(--red)', padding: '6px 10px' }} disabled={busy || qty(g) === 0} onClick={() => adjust(g, -1)}>
                <Minus size={15} />
              </button>
              {(isCritical || isZero) && (
                <button className="btn btn-sm btn-outline-red" onClick={() => alertCritical(g)}>Signaler</button>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}