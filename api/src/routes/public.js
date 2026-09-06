import { Router } from 'express';
import { query } from '../db.js';
import { asyncHandler, ApiError } from '../utils/http.js';
import { logActivity } from '../middleware/auth.js';
import { PRICES } from '../config.js';
import { BLOOD_GROUPS } from '../config.js';

const router = Router();

// Étape 1-3 : un hôpital demande son adhésion → statut EN ATTENTE chez le Super Admin
router.post(
  '/hospital-join',
  asyncHandler(async (req, res) => {
    const {
      nom, wilaya, moughataa, commune, adresse, telephone, email,
      nom_responsable, telephone_responsable, infos_administratives, motif_adhesion,
    } = req.body;
    if (!nom || !wilaya || !telephone || !nom_responsable) {
      throw new ApiError(400, 'Champs obligatoires : nom, wilaya, téléphone, nom du responsable');
    }
    const { rows } = await query(
      `INSERT INTO hospitals
       (nom, wilaya, moughataa, commune, adresse, telephone, email,
        nom_responsable, telephone_responsable, infos_administratives, motif_adhesion,
        status, subscription_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending','pending')
       RETURNING *`,
      [nom, wilaya, moughataa || null, commune || null, adresse || null, telephone,
       email || null, nom_responsable, telephone_responsable || null,
       infos_administratives || null, motif_adhesion || null]
    );
    await logActivity(null, 'hospital_join_request', 'hospital', rows[0].id);
    res.status(201).json({ message: 'Demande envoyée. Elle sera examinée par l’administration.', hospital: rows[0] });
  })
);

// Demande urgente d'une famille → 100 MRU (paiement simulé) puis validation avant diffusion
router.post(
  '/family-request',
  asyncHandler(async (req, res) => {
    const {
      patient_name, blood_group, hospital_id, wilaya, contact, quantity, urgency,
    } = req.body;
    if (!patient_name || !blood_group || !wilaya || !contact || !quantity) {
      throw new ApiError(400, 'Tous les champs essentiels sont requis');
    }
    if (!BLOOD_GROUPS.includes(blood_group)) throw new ApiError(400, 'Groupe sanguin invalide');
    if (!['immediate', 'urgent', 'normal'].includes(urgency)) throw new ApiError(400, 'Niveau d’urgence invalide');

    const { rows } = await query(
      `INSERT INTO blood_requests
       (requester_type, patient_name, family_contact, hospital_id, blood_group, quantity, urgency,
        wilaya, status, contact_number)
       VALUES ('family', $1, $2, $3, $4, $5, $6, $7, 'pending', $2)
       RETURNING *`,
      [patient_name, contact, hospital_id || null, blood_group, Number(quantity), urgency, wilaya]
    );
    const request = rows[0];

    // Paiement simulé : 100 MRU
    const ref = `FAM-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;
    await query(
      `INSERT INTO payments (request_id, amount, type, status, transaction_reference, payment_date)
       VALUES ($1, $2, 'family_request', 'paid', $3, now())`,
      [request.id, PRICES.familyRequest, ref]
    );
    await logActivity(null, 'family_request_created', 'blood_request', request.id);

    res.status(201).json({
      message: 'Demande enregistrée. Paiement de 100 MRU simulé avec succès. Elle sera diffusée après validation.',
      request,
      payment_reference: ref,
    });
  })
);

// Liste des hôpitaux actifs (pour le formulaire famille)
router.get(
  '/hospitals',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      "SELECT id, nom, wilaya FROM hospitals WHERE status = 'active' ORDER BY nom"
    );
    res.json(rows);
  })
);

export default router;