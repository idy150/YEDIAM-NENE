import { query } from '../db.js';
import { verifyToken } from '../utils/jwt.js';
import { ApiError } from '../utils/http.js';

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new ApiError(401, 'Authentification requise');

    const payload = verifyToken(token);
    const { rows } = await query('SELECT * FROM users WHERE id = $1', [payload.id]);
    const user = rows[0];
    if (!user) throw new ApiError(401, 'Compte introuvable');
    if (user.status !== 'active') throw new ApiError(403, 'Compte suspendu');

    req.user = user;
    next();
  } catch (err) {
    next(err instanceof ApiError ? err : new ApiError(401, 'Session invalide ou expirée'));
  }
}

export const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Accès refusé pour ce rôle'));
    }
    next();
  };

export async function logActivity(userId, action, entity = null, entityId = null) {
  try {
    await query(
      'INSERT INTO activity_logs (user_id, action, entity, entity_id) VALUES ($1, $2, $3, $4)',
      [userId, action, entity, entityId]
    );
  } catch (err) {
    console.error('logActivity failed:', err.message);
  }
}