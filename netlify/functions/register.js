const { Client } = require('pg'); // Or @neondatabase/serverless

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // Nile connection string from Netlify Environment Variables
  const client = new Client({
    connectionString: process.env.NILE_DATABASE_URL,
    ssl: { rejectUnauthorized: false } 
  });

  try {
    const data = JSON.parse(event.body);
    const participants = data.group;

    await client.connect();

    // Loop through and insert each participant
    for (const p of participants) {
      const query = `
        INSERT INTO participants (firstname, lastname, email, year, tshirt)
        VALUES ($1, $2, $3, $4, $5)
      `;
      await client.query(query, [p.firstname, p.lastname, p.email, p.year, p.tshirt]);
    }

    await client.end();

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Success" })
    };

  } catch (error) {
    console.error("Nile DB Error:", error.message);
    if (client) await client.end();
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
