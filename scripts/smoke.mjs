// Test de fumée : lance Chrome headless, se connecte avec chaque rôle,
// vérifie le rendu des pages clés et remonte les erreurs console.
const CHROME =
  process.env.CHROME_PATH ||
  'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.env.BASE_URL || 'http://localhost:5173';
const PORT = Number(process.env.CDP_PORT || 9222);
const PROFILE = `/tmp/chrome-smoke-${PORT}-${Date.now()}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const getJson = async (url, opts) => (await fetch(url, opts)).json();

async function main() {
  const { spawn } = await import('node:child_process');
  const chrome = spawn(
    CHROME,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--window-size=1280,900',
      ...(process.getuid?.() === 0 ? ['--no-sandbox'] : []),
      `--user-data-dir=${PROFILE}`,
      `--remote-debugging-port=${PORT}`,
      'about:blank',
    ],
    { stdio: 'ignore' }
  );

  try {
    let ready = false;
    for (let i = 0; i < 40; i++) {
      try {
        await getJson(`http://127.0.0.1:${PORT}/json/version`);
        ready = true;
        break;
      } catch {
        await sleep(500);
      }
    }
    if (!ready) throw new Error('Chrome CDP indisponible');

    const tab = await getJson(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(BASE)}`, { method: 'PUT' });
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise((r) => (ws.onopen = r));

    let msgId = 0;
    const pending = new Map();
    const consoleErrors = [];

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id && pending.has(msg.id)) {
        pending.get(msg.id)(msg);
        pending.delete(msg.id);
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        consoleErrors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
      }
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        consoleErrors.push(msg.params.args.map((a) => a.value || a.description).join(' '));
      }
    };

    const send = (method, params = {}) =>
      new Promise((resolve) => {
        const id = ++msgId;
        pending.set(id, resolve);
        ws.send(JSON.stringify({ id, method, params }));
      });

    const evaluate = async (expression) => {
      const res = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (res.result?.exceptionDetails) {
        throw new Error(res.result.exceptionDetails.text);
      }
      return res.result?.result?.value;
    };

    await send('Runtime.enable');
    await send('Page.enable');
    await sleep(2000); // laisser la page d'accueil se charger

    const results = [];
    let pass = true;

    const testPage = async (label, checks) => {
      let body = '';
      // Attendre que le chargement soit terminé (plus de « Chargement… »)
      for (let i = 0; i < 20; i++) {
        body = (await evaluate('document.body.innerText')) || '';
        if (!body.includes('Chargement…')) break;
        await sleep(500);
      }
      const errors = [...new Set(consoleErrors)].filter((e) => !e.includes('favicon'));
      consoleErrors.length = 0;
      const missing = checks.filter((c) => !body.includes(c));
      const ok = missing.length === 0 && errors.length === 0;
      if (!ok) pass = false;
      results.push({ label, ok, missing, errors, body: body.slice(0, 300).replace(/\n+/g, ' | ') });
    };

    // 1. Rôles connectés
    const roles = [
      { label: 'Super Admin', id: 'admin@yediam.mr', pwd: 'Admin123!', home: '/admin', extra: [['/admin/finances', ['Fonds solidaires', 'Soutien transport']], ['/admin/campagnes', ['Grande collecte de Nouakchott']]], checks: ['Dashboard national', 'Hôpitaux', 'Prévision des besoins'] },
      { label: 'Hôpital', id: 'admin.hnn@yediam.mr', pwd: 'Hopital123!', home: '/hopital', extra: [['/hopital/campagnes', ['Nouvelle campagne']]], checks: ['Hôpital National', 'NOUVELLE DEMANDE URGENTE'] },
      { label: 'Banque de sang', id: 'cnts@yediam.mr', pwd: 'Banque123!', home: '/banque', extra: [['/banque/campagnes', ['Grande collecte de Nouakchott']]], checks: ['Stocks par groupe', 'Poches en stock'] },
      { label: 'Donneur', id: 'donneur1@yediam.mr', pwd: 'Donneur123!', home: '/donneur', extra: [['/donneur/campagnes', ['Je participe']], ['/donneur/urgences', ['Urgences']]], checks: ['Groupe O+', 'Disponible pour donner', 'Prochain don'] },
    ];

    for (const role of roles) {
      const ok = await evaluate(`(async () => {
        const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier: ${JSON.stringify(role.id)}, password: ${JSON.stringify(role.pwd)} }) });
        const data = await res.json();
        if (!data.token) return false;
        localStorage.setItem('yn_token', data.token);
        location.href = ${JSON.stringify(BASE + role.home)};
        return true;
      })()`);
      if (!ok) {
        results.push({ label: role.label, ok: false, missing: ['login failed'], errors: [], body: '' });
        pass = false;
        continue;
      }
      await sleep(3000);
      await testPage(role.label, role.checks);
      for (const [path, checks] of role.extra || []) {
        await evaluate(`location.href = ${JSON.stringify(BASE)} + ${JSON.stringify(path)}`);
        await sleep(2500);
        await testPage(`${role.label} ${path}`, checks);
      }
    }

    // 2. Pages publiques
    await evaluate(`location.href = ${JSON.stringify(BASE)}`);
    await sleep(2500);
    for (const [path, checks] of [
      ['/', ['YEDIAM NENE', 'J’ai besoin de sang', 'Je veux donner', 'Le sang reste gratuit']],
      ['/campagnes', ['Collectes et sensibilisation', 'Grande collecte de Nouakchott']],
      ['/campagnes/1', ['Utilisation des fonds de la campagne', 'Financer la logistique']],
      ['/soutenir', ['Financer la solidarité', 'Moyen de paiement']],
      ['/transparence', ['Chaque ouguiya est tracée', 'Dernières dépenses']],
      ['/recu/YN-DEMO-0001', ['Montant', 'YN-DEMO-0001', 'Le sang reste gratuit']],
      ['/suivi/YN-DEMO-2026', ['Suivre une demande', 'Demande reçue']],
      ['/besoin-urgent', ['Besoin urgent pour un proche', '100 MRU']],
      ['/adhesion-hopital', ["Nom de l'hôpital", 'Nom du responsable']],
      ['/inscription', ['Groupe sanguin (essentiel)']],
      ['/login', ['Comptes de démonstration']],
    ]) {
      await evaluate(`location.href = ${JSON.stringify(BASE + path)}`);
      await sleep(2500);
      await testPage(`Public ${path}`, checks);
    }

    // 3. Rapport
    console.log('\n=== RAPPORT DE TEST DE FUMÉE ===');
    for (const r of results) {
      console.log(`${r.ok ? '✅' : '❌'} ${r.label}`);
      if (!r.ok) {
        if (r.missing.length) console.log(`     manque : ${r.missing.join(', ')}`);
        if (r.errors.length) console.log(`     erreurs JS : ${r.errors.slice(0, 3).join(' | ')}`);
        console.log(`     corps : ${r.body}`);
      }
    }
    console.log(pass ? '\n🎉 TOUS LES TESTS PASSENT' : '\n⚠️ DES TESTS ONT ÉCHOUÉ');
    ws.close();
    process.exit(pass ? 0 : 1);
  } finally {
    chrome.kill();
  }
}

main().catch((err) => {
  console.error('Erreur smoke test :', err.message);
  process.exit(1);
});