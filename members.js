const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.NILE_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Create members table if it doesn't exist
async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS members (
      id SERIAL PRIMARY KEY,
      firstname TEXT NOT NULL,
      lastname TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      promo TEXT,
      password TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    await ensureTable();
    const body = JSON.parse(event.body);
    const { action } = body;

    // --- REGISTER ---
    if (action === 'register') {
      const { firstname, lastname, email, promo, password } = body;

      if (!firstname || !lastname || !email || !password) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Tous les champs sont requis.' }) };
      }

      // Check if email already exists
      const existing = await pool.query('SELECT id FROM members WHERE LOWER(email) = LOWER($1)', [email]);
      if (existing.rows.length > 0) {
        return { statusCode: 409, headers, body: JSON.stringify({ error: 'Un compte existe déjà avec cet email.' }) };
      }

      const result = await pool.query(
        'INSERT INTO members (firstname, lastname, email, promo, password) VALUES ($1, $2, $3, $4, $5) RETURNING id, firstname, lastname, email, promo',
        [firstname, lastname, email, promo || '', password]
      );

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ success: true, user: result.rows[0] })
      };
    }

    // --- LOGIN ---
    if (action === 'login') {
      const { email, password } = body;

      if (!email || !password) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Email et mot de passe requis.' }) };
      }

      const result = await pool.query(
        'SELECT id, firstname, lastname, email, promo FROM members WHERE LOWER(email) = LOWER($1) AND password = $2',
        [email, password]
      );

      if (result.rows.length === 0) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: 'Email ou mot de passe incorrect.' }) };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, user: result.rows[0] })
      };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Action invalide.' }) };

  } catch (err) {
    console.error('Member function error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erreur serveur.' }) };
  }
};
