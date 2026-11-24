import pg from 'pg';

// Les colonnes DATE restent des chaînes AAAA-MM-JJ (pas de décalage de fuseau horaire)
pg.types.setTypeParser(1082, (v) => v);
import { config } from './config.js';

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
});

export const query = (text, params) => pool.query(text, params);