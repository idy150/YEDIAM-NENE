import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { signToken } from '../utils/jwt.js';
import { asyncHandler, ApiError } from '../utils/http.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// Inscription donneur
router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { nom, telephone, email, password, blood_group, wilaya, moughataa, quartier } = req.body;
    if (!nom || !telephone || !password || !blood_group || !wilaya) {
      throw new ApiError(400, 'Champs obligatoires manquants (nom, téléphone, mot de passe, groupe sanguin, wilaya)');
    }
    if (!BLOOD_GROUPS.includes(blood_group)) throw new ApiError(400, 'Groupe sanguin invalide');

    const hash = await bcrypt.hash(password, 10);
    let user;
    try {
      const { rows } = await query(
        `INSERT INTO users (nom, email, telephone, password_hash, role, status)
         VALUES ($1, $2, $3, $4, 'donor', 'active') RETURNING *`,
        [nom, email || null, telephone, hash]
      );
      user = rows[0];
    } catch (err) {
      if (err.code === '23505') throw new ApiError(409, 'Ce téléphone ou cet email est déjà utilisé');
      throw err;
    }

    await query(
      `INSERT INTO donors (user_id, nom, telephone, email, blood_group, wilaya, moughataa, quartier, available)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)`,
      [user.id, nom, telephone, email || null, blood_group, wilaya, moughataa || null, quartier || null]
    );

    res.status(201).json({ token: signToken(user), user: { id: user.id, nom: user.nom, email: user.email, telephone: user.telephone, role: user.role } });
  })
);

// Connexion
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { identifier, password } = req.body;
    if (!identifier || !password) throw new ApiError(400, 'Identifiant et mot de passe requis');

    const { rows } = await query(
      'SELECT * FROM users WHERE email = $1 OR telephone = $1',
      [identifier]
    );
    const user = rows[0];
    if (!user || !user.password_hash) throw new ApiError(401, 'Identifiant ou mot de passe incorrect');
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) throw new ApiError(401, 'Identifiant ou mot de passe incorrect');
    if (user.status !== 'active') throw new ApiError(403, 'Ce compte est suspendu. Contactez l’administration.');

    res.json({ token: signToken(user), user: { id: user.id, nom: user.nom, email: user.email, telephone: user.telephone, role: user.role } });
  })
);

// Profil complet de l'utilisateur connecté (avec les données de son rôle)
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = req.user;
    let profile = null;
    if (user.role === 'donor') {
      const { rows } = await query('SELECT * FROM donors WHERE user_id = $1', [user.id]);
      profile = rows[0] || null;
    } else if (user.role === 'hospital_admin') {
      const { rows } = await query('SELECT * FROM hospitals WHERE user_id = $1', [user.id]);
      profile = rows[0] || null;
    } else if (user.role === 'blood_bank_admin') {
      const { rows } = await query('SELECT * FROM blood_banks WHERE user_id = $1', [user.id]);
      profile = rows[0] || null;
    }
    res.json({ user, profile });
  })
);

// Récupération de mot de passe — simulée pour le prototype
router.post(
  '/forgot-password',
  asyncHandler(async (req, res) => {
    const { identifier } = req.body;
    const { rows } = await query('SELECT id, email, telephone FROM users WHERE email = $1 OR telephone = $1', [identifier]);
    if (rows.length === 0) {
      // Ne pas révéler l'existence du compte
      return res.json({ message: 'Si ce compte existe, un lien de réinitialisation a été envoyé.' });
    }
    // Prototype : on renvoie un pseudo-lien
    res.json({
      message: 'Prototype : lien de réinitialisation simulé.',
      demo_link: `/reset-password?u=${rows[0].id}&t=demo-token`,
    });
  })
);

export default router;