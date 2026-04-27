const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.NILE_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      member_id INTEGER,
      firstname TEXT NOT NULL,
      lastname TEXT NOT NULL,
      email TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      zip TEXT,
      payment_method TEXT NOT NULL,
      payment_detail TEXT,
      total NUMERIC(10,2) NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
      item_name TEXT NOT NULL,
      item_size TEXT,
      price NUMERIC(10,2) NOT NULL
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
    await ensureTables();
    const body = JSON.parse(event.body);
    const { member_id, firstname, lastname, email, address, city, state, zip, payment_method, payment_detail, items, total } = body;

    if (!firstname || !lastname || !payment_method || !items || items.length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Informations incomplètes.' }) };
    }

    // Insert order
    const orderResult = await pool.query(
      `INSERT INTO orders (member_id, firstname, lastname, email, address, city, state, zip, payment_method, payment_detail, total)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [member_id || null, firstname, lastname, email || '', address || '', city || '', state || '', zip || '', payment_method, payment_detail || '', total]
    );

    const orderId = orderResult.rows[0].id;

    // Insert order items
    for (const item of items) {
      await pool.query(
        'INSERT INTO order_items (order_id, item_name, item_size, price) VALUES ($1, $2, $3, $4)',
        [orderId, item.name, item.size || '', item.price]
      );
    }

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({ success: true, orderId: orderId })
    };

  } catch (err) {
    console.error('Order function error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erreur serveur.' }) };
  }
};
