const { Client } = require('@neondatabase/serverless');

exports.handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const data = JSON.parse(event.body);
    // Use the key 'group' because that is what your HTML fetch sends
    const participants = data.group; 

    console.log("Attempting to save participants:", participants.length);

    await client.connect();

    for (const p of participants) {
      // Use public.participants to avoid schema errors
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
      body: JSON.stringify({ message: "Success" })
    };

  } catch (error) {
    console.error("DETAILED ERROR:", error.message);
    if (client) await client.end();
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
