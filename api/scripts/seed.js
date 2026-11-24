import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import { config } from '../src/config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pool = new pg.Pool({ connectionString: config.databaseUrl });

const run = async (sql, params = []) => {
  const { rows } = await pool.query(sql, params);
  return rows;
};

const hash = (pwd) => bcrypt.hashSync(pwd, 10);

async function main() {
  console.log('🩸 Seed YEDIAM NENE — démarrage...');

  // 1. Schéma
  const schema = readFileSync(path.join(__dirname, '../../db/schema.sql'), 'utf8');
  await pool.query(schema);
  console.log('✓ Schéma appliqué');

  // 2. Nettoyage (ordre inverse des dépendances)
  await pool.query(`
    TRUNCATE fund_expenses, transport_requests, contributions, campaign_participants, campaigns,
             activity_logs, stock_movements, blood_bank_responses, donations,
             notifications, blood_requests, subscriptions, payments, blood_stocks,
             blood_banks, donors, hospitals, users RESTART IDENTITY CASCADE
  `);

  // 3. Super Admin
  await run(
    `INSERT INTO users (nom, email, telephone, password_hash, role, status)
     VALUES ('Idy Salif Ba', 'admin@yediam.mr', '+222 00000000', $1, 'super_admin', 'active')`,
    [hash('Admin123!')]
  );

  // 4. Hôpitaux
  const hospitals = [
    {
      nom: 'Hôpital National de Nouakchott', wilaya: 'Nouakchott Ouest', moughataa: 'Tevragh-Zeina',
      commune: 'Tevragh-Zeina', adresse: 'Avenue de l’hôpital', telephone: '+222 4525 0001',
      email: 'contact@hnn.mr', responsable: 'Dr. Mohamed Ould Cheikh', tel_resp: '+222 4610 0001',
      infos: 'Hôpital public de référence', motif: 'Coordination des demandes de sang urgentes',
      status: 'active', sub: 'active',
    },
    {
      nom: 'Centre Hospitalier Mère et Enfant', wilaya: 'Nouakchott Nord', moughataa: 'Dar Naïm',
      commune: 'Dar Naïm', adresse: 'Route de l’aéroport', telephone: '+222 4525 0002',
      email: 'contact@chme.mr', responsable: 'Dr. Aïchetou Mint Sidi', tel_resp: '+222 4610 0002',
      infos: 'Spécialisé pédiatrie et maternité', motif: 'Besoin fréquent de sang O- et A-',
      status: 'active', sub: 'active',
    },
    {
      nom: 'Hôpital de Nouadhibou', wilaya: 'Dakhlet Nouadhibou', moughataa: 'Nouadhibou',
      commune: 'Nouadhibou', adresse: 'Centre-ville', telephone: '+222 4574 0003',
      email: 'contact@hnd.mr', responsable: 'Dr. Sidi Mohamed Vall', tel_resp: '+222 4610 0003',
      infos: 'Hôpital régional', motif: 'Rejoindre le réseau national de transfusion',
      status: 'active', sub: 'expired',
    },
    {
      nom: 'Hôpital de Kiffa', wilaya: 'Assaba', moughataa: 'Kiffa', commune: 'Kiffa',
      adresse: 'Quartier administratif', telephone: '+222 4571 0004',
      email: 'contact@hk.mr', responsable: 'Dr. Fatimetou Mint Ahmed', tel_resp: '+222 4610 0004',
      infos: 'Hôpital régional', motif: 'Améliorer la prise en charge des urgences',
      status: 'suspended', sub: 'suspended',
    },
    {
      nom: 'Hôpital de Rosso', wilaya: 'Trarza', moughataa: 'Rosso', commune: 'Rosso',
      adresse: 'Avenue principale', telephone: '+222 4572 0005',
      email: 'contact@hr.mr', responsable: 'Dr. Cheikhna Ould Beye', tel_resp: '+222 4610 0005',
      infos: 'Hôpital régional du Trarza', motif: 'Demande d’adhésion en attente',
      status: 'pending', sub: 'pending',
    },
    {
      nom: 'Hôpital de Zouérate', wilaya: 'Tiris Zemmour', moughataa: 'Zouérate', commune: 'Zouérate',
      adresse: 'Cité SNIM', telephone: '+222 4573 0006',
      email: 'contact@hz.mr', responsable: 'Dr. Mouna Mint Ely', tel_resp: '+222 4610 0006',
      infos: 'Hôpital minier', motif: 'Besoin de donneurs pour le site minier',
      status: 'pending', sub: 'pending',
    },
  ];

  const hospitalIds = {};
  for (const h of hospitals) {
    const [row] = await run(
      `INSERT INTO hospitals (nom, wilaya, moughataa, commune, adresse, telephone, email,
        nom_responsable, telephone_responsable, infos_administratives, motif_adhesion, status, subscription_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
      [h.nom, h.wilaya, h.moughataa, h.commune, h.adresse, h.telephone, h.email,
       h.responsable, h.tel_resp, h.infos, h.motif, h.status, h.sub]
    );
    hospitalIds[h.nom] = row.id;
  }
  console.log(`✓ ${hospitals.length} hôpitaux`);

  // 5. Comptes admin hôpitaux (pour les hôpitaux actifs/suspendus)
  const hospitalAdminAccounts = [
    { nom: 'Hôpital National de Nouakchott', email: 'admin.hnn@yediam.mr', pwd: 'Hopital123!' },
    { nom: 'Centre Hospitalier Mère et Enfant', email: 'admin.chme@yediam.mr', pwd: 'Hopital123!' },
    { nom: 'Hôpital de Nouadhibou', email: 'admin.hnd@yediam.mr', pwd: 'Hopital123!' },
    { nom: 'Hôpital de Kiffa', email: 'admin.hk@yediam.mr', pwd: 'Hopital123!' },
  ];
  for (const acc of hospitalAdminAccounts) {
    const h = hospitals.find((x) => x.nom === acc.nom);
    const [user] = await run(
      `INSERT INTO users (nom, email, password_hash, role, status) VALUES ($1, $2, $3, 'hospital_admin', 'active') RETURNING id`,
      [h.responsable, acc.email, hash(acc.pwd)]
    );
    await run(`UPDATE hospitals SET user_id = $1 WHERE id = $2`, [user.id, hospitalIds[h.nom]]);
  }

  // 6. Abonnements + paiements (hôpitaux actifs)
  const subs = [
    { hospital: 'Hôpital National de Nouakchott', status: 'active', months: 3 },
    { hospital: 'Centre Hospitalier Mère et Enfant', status: 'active', months: 1 },
    { hospital: 'Hôpital de Nouadhibou', status: 'expired', months: 2 },
  ];
  for (const s of subs) {
    const hid = hospitalIds[s.hospital];
    await run(
      `INSERT INTO subscriptions (hospital_id, amount, start_date, end_date, status)
       VALUES ($1, 1000, CURRENT_DATE - INTERVAL '1 month', CURRENT_DATE + INTERVAL '${s.months - 1} month', $2)`,
      [hid, s.status]
    );
    await run(
      `INSERT INTO payments (hospital_id, amount, type, status, transaction_reference, payment_date)
       VALUES ($1, 1000, 'subscription', 'paid', 'SUB-DEMO-' || floor(random()*99999)::int, now() - interval '1 month')`,
      [hid]
    );
  }
  console.log('✓ Abonnements + paiements hôpitaux');

  // 7. Banques de sang
  const banks = [
    { nom: 'Centre National de Transfusion Sanguine', wilaya: 'Nouakchott Ouest', adresse: 'Avenue Gamal Abdel Nasser', telephone: '+222 4525 1001', email: 'admin.cnts@yediam.mr', user: 'cnts@yediam.mr', pwd: 'Banque123!' },
    { nom: 'Banque de Sang de Nouadhibou', wilaya: 'Dakhlet Nouadhibou', adresse: 'Zone portuaire', telephone: '+222 4574 1002', email: 'admin.bsn@yediam.mr', user: 'bsn@yediam.mr', pwd: 'Banque123!' },
  ];
  const bankIds = {};
  for (const b of banks) {
    const [user] = await run(
      `INSERT INTO users (nom, email, password_hash, role, status) VALUES ($1, $2, $3, 'blood_bank_admin', 'active') RETURNING id`,
      [b.nom, b.user, hash(b.pwd)]
    );
    const [row] = await run(
      `INSERT INTO blood_banks (user_id, nom, adresse, wilaya, telephone, email, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'active') RETURNING id`,
      [user.id, b.nom, b.adresse, b.wilaya, b.telephone, b.email]
    );
    bankIds[b.nom] = row.id;
  }

  // Stocks initiaux (CNTS)
  const initialStocks = [
    ['A+', 25], ['A-', 8], ['B+', 17], ['B-', 5],
    ['AB+', 10], ['AB-', 3], ['O+', 30], ['O-', 7],
  ];
  const cntsId = bankIds['Centre National de Transfusion Sanguine'];
  for (const [group, qty] of initialStocks) {
    await run(
      `INSERT INTO blood_stocks (blood_bank_id, blood_group, quantity) VALUES ($1, $2, $3)`,
      [cntsId, group, qty]
    );
  }
  // Petits stocks pour Nouadhibou
  for (const [group, qty] of [['O+', 12], ['O-', 4], ['B+', 6]]) {
    await run(
      `INSERT INTO blood_stocks (blood_bank_id, blood_group, quantity) VALUES ($1, $2, $3)`,
      [bankIds['Banque de Sang de Nouadhibou'], group, qty]
    );
  }
  console.log('✓ Banques de sang + stocks');

  // 8. Donneurs (avec comptes pour les 3 premiers, les autres ajoutés manuellement)
  const donorData = [
    ['Amadou Diallo', '+222 4611 0001', 'O+', 'Nouakchott Ouest', 'Tevragh-Zeina', 'Ksar', true, null],
    ['Fatou Sow', '+222 4611 0002', 'O+', 'Nouakchott Nord', 'Dar Naïm', 'Dar Naïm', true, null],
    ['Moussa Ba', '+222 4611 0003', 'B-', 'Nouakchott Sud', 'El Mina', 'El Mina', true, null],
    ['Aminata Touré', '+222 4611 0004', 'O-', 'Dakhlet Nouadhibou', 'Nouadhibou', 'Centre', true, null],
    ['Ibrahima Sy', '+222 4611 0005', 'A+', 'Trarza', 'Rosso', 'Médine', true, '2026-03-15'],
    ['Mariem Ould', '+222 4611 0006', 'AB+', 'Assaba', 'Kiffa', 'Kiffa', false, '2026-01-10'],
    ['Cheikh Fall', '+222 4611 0007', 'O+', 'Gorgol', 'Kaédi', 'Kaédi', true, null],
    ['Hawa Camara', '+222 4611 0008', 'A-', 'Brakna', 'Aleg', 'Aleg', true, null],
    ['Souleymane Kane', '+222 4611 0009', 'B+', 'Hodh El Chargui', 'Néma', 'Néma', true, null],
    ['Khadija Mint', '+222 4611 0010', 'O+', 'Adrar', 'Atar', 'Atar', true, null],
    ['Oumar Ndiaye', '+222 4611 0011', 'AB-', 'Tagant', 'Tidjikja', 'Tidjikja', false, '2025-12-01'],
    ['Awa Ba', '+222 4611 0012', 'O+', 'Guidimaka', 'Sélibaby', 'Sélibaby', true, null],
    ['Boubacar Dicko', '+222 4611 0013', 'O-', 'Inchiri', 'Akjoujt', 'Akjoujt', true, null],
    ['Rokhaya Ndiaye', '+222 4611 0014', 'B-', 'Nouakchott Ouest', 'Ksar', 'Ksar', true, null],
    ['Yacine Diop', '+222 4611 0015', 'A+', 'Nouakchott Sud', 'Arafat', 'Arafat', true, null],
    ['Mahmoud Ould', '+222 4611 0016', 'O+', 'Tiris Zemmour', 'Zouérate', 'Zouérate', true, null],
    ['Nafissa Mint', '+222 4611 0017', 'A-', 'Nouakchott Nord', 'Toujounine', 'Toujounine', true, null],
    ['El Hacen Lemrabott', '+222 4611 0018', 'B+', 'Hodh El Gharbi', 'Aïoun', 'Aïoun', true, null],
    ['Zeinabou Mint', '+222 4611 0019', 'O+', 'Nouakchott Ouest', 'Sbeikha', 'Sbeikha', false, '2026-02-20'],
    ['Mamadou Barry', '+222 4611 0020', 'O+', 'Nouakchott Sud', 'Riyad', 'Riyad', true, null],
  ];

  const donorIds = {};
  for (let i = 0; i < donorData.length; i++) {
    const [nom, tel, group, wilaya, moughataa, quartier, available, lastDonation] = donorData[i];
    let user_id = null;
    if (i < 3) {
      const [user] = await run(
        `INSERT INTO users (nom, email, telephone, password_hash, role, status)
         VALUES ($1, $2, $3, $4, 'donor', 'active') RETURNING id`,
        [nom, `donneur${i + 1}@yediam.mr`, tel, hash('Donneur123!')]
      );
      user_id = user.id;
    }
    const [row] = await run(
      `INSERT INTO donors (user_id, nom, telephone, blood_group, wilaya, moughataa, quartier, available, last_donation_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [user_id, nom, tel, group, wilaya, moughataa, quartier, available, lastDonation]
    );
    donorIds[nom] = row.id;
  }
  console.log(`✓ ${donorData.length} donneurs`);

  // 9. Demandes de sang
  // Une demande active O+ (Hôpital National) + une B- (Mère et Enfant) + historique
  const [reqActive] = await run(
    `INSERT INTO blood_requests (requester_type, requester_id, hospital_id, blood_group, quantity, urgency, status, wilaya, moughataa, service, contact_number, additional_info)
     VALUES ('hospital', $1, $1, 'O+', 5, 'immediate', 'active', 'Nouakchott Ouest', 'Tevragh-Zeina', 'Urgences', '+222 4525 0001', 'Accident de la route, besoin urgent de donneurs O+')
     RETURNING id`,
    [hospitalIds['Hôpital National de Nouakchott']]
  );
  const [reqActiveB] = await run(
    `INSERT INTO blood_requests (requester_type, requester_id, hospital_id, blood_group, quantity, urgency, status, wilaya, moughataa, service, contact_number, additional_info)
     VALUES ('hospital', $1, $1, 'B-', 2, 'urgent', 'active', 'Nouakchott Nord', 'Dar Naïm', 'Maternité', '+222 4525 0002', 'Césarienne programmée, recherche de donneurs B-')
     RETURNING id`,
    [hospitalIds['Centre Hospitalier Mère et Enfant']]
  );
  await run(
    `INSERT INTO blood_requests (requester_type, requester_id, hospital_id, blood_group, quantity, urgency, status, wilaya, service, closed_at)
     VALUES ('hospital', $1, $1, 'A+', 3, 'urgent', 'completed', 'Nouakchott Ouest', 'Chirurgie', now() - interval '12 days')`,
    [hospitalIds['Hôpital National de Nouakchott']]
  );
  await run(
    `INSERT INTO blood_requests (requester_type, requester_id, hospital_id, blood_group, quantity, urgency, status, wilaya, service, closed_at)
     VALUES ('hospital', $1, $1, 'O+', 4, 'urgent', 'cancelled', 'Nouakchott Ouest', 'Urgences', now() - interval '5 days')`,
    [hospitalIds['Hôpital National de Nouakchott']]
  );
  // Demande famille en attente de validation
  await run(
    `INSERT INTO blood_requests (requester_type, patient_name, family_contact, hospital_id, blood_group, quantity, urgency, status, wilaya, tracking_code)
     VALUES ('family', 'Mariem Bint Ahmed', '+222 4612 0001', $1, 'O-', 2, 'immediate', 'pending', 'Nouakchott Sud', 'YN-DEMO-2026')`,
    [hospitalIds['Hôpital National de Nouakchott']]
  );
  await run(
    `INSERT INTO payments (request_id, amount, type, status, transaction_reference, payment_date)
     VALUES ((SELECT id FROM blood_requests WHERE requester_type = 'family' LIMIT 1), 100, 'family_request', 'paid', 'FAM-DEMO-001', now() - interval '2 hours')`
  );
  console.log('✓ Demandes de sang');

  // 10. Notifications sur les demandes actives (donneurs compatibles et disponibles)
  const { rows: allDonors } = await pool.query(
    'SELECT id, blood_group, wilaya, available FROM donors'
  );
  const oPlusDonors = allDonors.filter((d) => d.blood_group === 'O+' && d.available);
  const bMinusDonors = allDonors.filter((d) => d.blood_group === 'B-' && d.available);
  for (const d of oPlusDonors) {
    await run(
      `INSERT INTO notifications (donor_id, request_id, type, status, sent_at)
       VALUES ($1, $2, 'urgent', 'sent', now() - interval '30 minutes')`,
      [d.id, reqActive.id]
    );
  }
  // 2 donneurs ont déjà répondu positivement
  for (const d of oPlusDonors.slice(0, 2)) {
    await run(
      `UPDATE notifications SET status = 'responded', response = 'positive', responded_at = now() - interval '20 minutes'
       WHERE donor_id = $1 AND request_id = $2`,
      [d.id, reqActive.id]
    );
  }
  for (const d of bMinusDonors) {
    await run(
      `INSERT INTO notifications (donor_id, request_id, type, status, sent_at)
       VALUES ($1, $2, 'urgent', 'sent', now() - interval '15 minutes')`,
      [d.id, reqActiveB.id]
    );
  }
  console.log('✓ Notifications');

  // 11. Dons réalisés (historique)
  await run(
    `INSERT INTO donations (donor_id, hospital_id, request_id, donation_date, blood_group, status)
     VALUES ($1, $2, NULL, CURRENT_DATE - interval '12 days', 'A+', 'completed')`,
    [donorIds['Ibrahima Sy'], hospitalIds['Hôpital National de Nouakchott']]
  );
  await run(
    `INSERT INTO donations (donor_id, hospital_id, request_id, donation_date, blood_group, status)
     VALUES ($1, $2, NULL, CURRENT_DATE - interval '30 days', 'O+', 'completed')`,
    [donorIds['Khadija Mint'], hospitalIds['Hôpital National de Nouakchott']]
  );

  // 11 bis. Historique des demandes sur 6 mois (alimente les statistiques et la prévision)
  const histHospitals = [hospitalIds['Hôpital National de Nouakchott'], hospitalIds['Centre Hospitalier Mère et Enfant']];
  const histGroups = ['O+', 'O+', 'O+', 'A+', 'A+', 'B+', 'O-', 'AB+', 'B-', 'A-'];
  for (let m = 5; m >= 1; m--) {
    const count = 3 + ((m * 7) % 4);
    for (let i = 0; i < count; i++) {
      const g = histGroups[(m * 3 + i) % histGroups.length];
      await run(
        `INSERT INTO blood_requests (requester_type, requester_id, hospital_id, blood_group, quantity, urgency, status, wilaya, service, created_at, closed_at)
         VALUES ('hospital', $1, $1, $2, $3, $4, 'completed', 'Nouakchott Ouest', 'Urgences',
                 now() - ($5 || ' months')::interval - ($6 || ' days')::interval,
                 now() - ($5 || ' months')::interval - ($6 || ' days')::interval + interval '6 hours')`,
        [histHospitals[i % 2], g, 2 + (i % 4), ['immediate', 'urgent', 'normal'][i % 3], m, i * 3]
      );
    }
  }
  console.log('✓ Historique des demandes (6 mois)');

  // 11 ter. Campagnes, contributions solidaires, dépenses, soutien transport
  const [camp1] = await run(
    `INSERT INTO campaigns (title, description, type, wilaya, location, start_date, end_date, organizer_type, organizer_id,
       organizer_name, target_donors, target_amount, target_groups, status, created_by)
     VALUES ('Grande collecte de Nouakchott', 'Collecte nationale avec le CNTS : bus de collecte, collation offerte et transport pris en charge pour les donneurs.',
       'collecte', 'Nouakchott Ouest', 'Place de la Liberté', CURRENT_DATE - 3, CURRENT_DATE + 14, 'blood_bank', $1,
       'Centre National de Transfusion Sanguine', 150, 250000, ARRAY['O+','O-','A+'], 'active', 1) RETURNING id`,
    [bankIds['Centre National de Transfusion Sanguine']]
  );
  const [camp2] = await run(
    `INSERT INTO campaigns (title, description, type, wilaya, location, start_date, end_date, organizer_type, organizer_id,
       organizer_name, target_donors, target_amount, status, created_by)
     VALUES ('Maternité : chaque goutte compte', 'Mobilisation des donneurs O- et A- pour les urgences obstétricales du Centre Mère et Enfant.',
       'collecte', 'Nouakchott Nord', 'Centre Hospitalier Mère et Enfant', CURRENT_DATE, CURRENT_DATE + 30, 'hospital', $1,
       'Centre Hospitalier Mère et Enfant', 60, 80000, 'active', 1) RETURNING id`,
    [hospitalIds['Centre Hospitalier Mère et Enfant']]
  );
  const [camp3] = await run(
    `INSERT INTO campaigns (title, description, type, wilaya, location, start_date, end_date, organizer_type, organizer_name,
       target_donors, target_amount, status, created_by)
     VALUES ('Universités solidaires', 'Sensibilisation au don de sang dans les universités et lycées de Nouakchott.',
       'sensibilisation', 'Nouakchott Ouest', 'Université de Nouakchott', CURRENT_DATE - 40, CURRENT_DATE - 10, 'admin', 'YEDIAM NENE',
       0, 40000, 'completed', 1) RETURNING id`
  );
  for (const [donorName, status] of [['Amadou Diallo', 'registered'], ['Fatou Sow', 'registered'], ['Mamadou Barry', 'donated'], ['Yacine Diop', 'registered']]) {
    await run(`INSERT INTO campaign_participants (campaign_id, donor_id, status) VALUES ($1, $2, $3)`, [camp1.id, donorIds[donorName], status]);
  }
  await run(`INSERT INTO campaign_participants (campaign_id, donor_id) VALUES ($1, $2)`, [camp2.id, donorIds['Hawa Camara']]);

  const contributions = [
    ['YN-DEMO-0001', camp1.id, 'sponsoring', 'company', 'Mauritel', false, 100000, 'bank_transfer', 'Fiers de soutenir la grande collecte.', 9],
    ['YN-DEMO-0002', camp1.id, 'campaign', 'individual', 'Aïssata Diallo', false, 2000, 'bankily', 'Pour ma mère, sauvée grâce aux donneurs.', 6],
    ['YN-DEMO-0003', camp1.id, 'campaign', 'individual', 'Sidi Mohamed', true, 5000, 'masrivi', null, 4],
    ['YN-DEMO-0004', camp2.id, 'sponsoring', 'ngo', 'Croissant-Rouge (démo)', false, 30000, 'bank_transfer', null, 3],
    ['YN-DEMO-0005', null, 'transport', 'company', 'Société Générale Mauritanie (démo)', false, 25000, 'bank_transfer', 'Fonds transport des donneurs.', 20],
    ['YN-DEMO-0006', null, 'general', 'individual', 'Oumar Sy', false, 1500, 'sedad', null, 2],
    ['YN-DEMO-0007', camp3.id, 'campaign', 'company', 'Chinguitel (démo)', false, 40000, 'bank_transfer', null, 45],
    ['YN-DEMO-0008', camp2.id, 'campaign', 'individual', 'Mariem Mint Ahmed', true, 3000, 'bankily', 'Merci aux donneurs !', 1],
  ];
  for (const [ref, campaignId, purpose, type, name, anon, amount, method, message, daysAgo] of contributions) {
    await run(
      `INSERT INTO contributions (reference, campaign_id, purpose, contributor_type, contributor_name, contributor_phone, anonymous,
         amount, payment_method, status, provider_reference, message, created_at, paid_at)
       VALUES ($1,$2,$3,$4,$5,'+222 4600 0000',$6,$7,$8,'paid','SIM-' || $1,$9, now() - ($10 || ' days')::interval, now() - ($10 || ' days')::interval)`,
      [ref, campaignId, purpose, type, name, anon, amount, method, message, daysAgo]
    );
  }
  const expenses = [
    ['DEP-DEMO-0001', camp3.id, 'communication', 18000, 'Affiches et sessions de sensibilisation (3 universités)', 'Imprimerie Al Amal', 30],
    ['DEP-DEMO-0002', camp3.id, 'collation', 9500, 'Collations pour les étudiants volontaires', 'Traiteur Nouakchott', 25],
    ['DEP-DEMO-0003', camp1.id, 'logistique', 35000, 'Location du bus de collecte (2 semaines)', 'Transports Errahma', 2],
    ['DEP-DEMO-0004', camp1.id, 'collation', 6000, 'Jus et biscuits pour les donneurs — jour 1', 'Supermarché Atlas', 1],
    ['DEP-DEMO-0005', null, 'transport', 1500, 'Soutien transport donneur', 'Amadou Diallo', 5],
  ];
  for (const [ref, campaignId, cat, amount, desc, benef, daysAgo] of expenses) {
    await run(
      `INSERT INTO fund_expenses (reference, campaign_id, category, amount, description, beneficiary, spent_at, recorded_by)
       VALUES ($1,$2,$3,$4,$5,$6, CURRENT_DATE - $7::int, 1)`,
      [ref, campaignId, cat, amount, desc, benef, daysAgo]
    );
  }
  await run(
    `INSERT INTO transport_requests (donor_id, request_id, amount, note, status)
     VALUES ($1, $2, 800, 'Taxi aller-retour Dar Naïm → Hôpital National', 'pending')`,
    [donorIds['Fatou Sow'], reqActive.id]
  );
  console.log('✓ Campagnes, contributions, dépenses et soutien transport');

  // 12. Journaux d'activité
  const actions = [
    ['hospital_join_request', 'hospital', hospitalIds['Hôpital de Rosso']],
    ['hospital_approved', 'hospital', hospitalIds['Hôpital National de Nouakchott']],
    ['request_created', 'blood_request', reqActive.id],
    ['donor_responded', 'notification', null],
    ['stock_updated', 'blood_stock', null],
    ['subscription_renewed', 'hospital', hospitalIds['Hôpital National de Nouakchott']],
  ];
  for (const [action, entity, entityId] of actions) {
    await run(
      `INSERT INTO activity_logs (user_id, action, entity, entity_id) VALUES (1, $1, $2, $3)`,
      [action, entity, entityId]
    );
  }
  console.log('✓ Journaux d’activité');

  console.log('\n✅ Seed terminé !');
  console.log('──────────────────────────────────────────────');
  console.log('Comptes de démonstration :');
  console.log('  Super Admin    : admin@yediam.mr      / Admin123!');
  console.log('  Hôpital        : admin.hnn@yediam.mr  / Hopital123!');
  console.log('  Banque de sang : cnts@yediam.mr       / Banque123!');
  console.log('  Donneur        : donneur1@yediam.mr   / Donneur123!');

  await pool.end();
}

main().catch((err) => {
  console.error('Erreur seed :', err);
  process.exit(1);
});