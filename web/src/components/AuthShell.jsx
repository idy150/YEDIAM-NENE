import { CheckCircle2 } from 'lucide-react';

// Mise en page des formulaires publics : panneau de marque à gauche (desktop),
// formulaire à droite. Sur mobile, un en-tête compact au-dessus du formulaire.
export default function AuthShell({ eyebrow, title, lead, points = [], tone = 'dark', children }) {
  return (
    <div className="container auth-shell">
      <aside className={`auth-side ${tone}`}>
        {eyebrow && <span className="eyebrow" style={{ color: tone === 'red' ? '#ffd2d4' : 'var(--gold)' }}>{eyebrow}</span>}
        <h1>{title}</h1>
        {lead && <p className="auth-lead">{lead}</p>}
        {points.length > 0 && (
          <ul className="auth-points">
            {points.map((p) => (
              <li key={p}><CheckCircle2 size={17} /> <span>{p}</span></li>
            ))}
          </ul>
        )}
      </aside>
      <div className="auth-main">{children}</div>
    </div>
  );
}
