const { Client } = require('pg');

exports.handler = async (event) => {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
    
    const { firstname, lastname, email, tshirt } = JSON.parse(event.body);

    // 1. Connect to Neon Database
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
    const data = JSON.parse(event.body);
    const participants = data.group; // From your HTML script

    await client.connect();

    // Prepare the SQL query for multiple inserts
    // We use a loop or an unnest approach. A loop is easiest for small batches.
    for (const p of participants) {
      const query = `
        INSERT INTO public.participants (firstname, lastname, email, year, tshirt)
        VALUES ($1, $2, $3, $4, $5)
    `;
      const values = [p.firstname, p.lastname, p.email, p.year, p.tshirt];
      await client.query(query, values);
    }

    await client.end();

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Success! All participants saved to Neon." })
    };

  } catch (error) {
    console.error('Database Error:', error);
    if (client) await client.end();
    
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Could not save to database." })
    };
  }
};
