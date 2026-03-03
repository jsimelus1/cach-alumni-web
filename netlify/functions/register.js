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
        await client.connect();
        
        // 2. Save to Database
        await client.query(
            'INSERT INTO registrations (firstname, lastname, email, tshirt) VALUES ($1, $2, $3, $4)',
            [firstname, lastname, email, tshirt]
        );

        // 3. Simple email logic (using a free service like Formspree or Netlify's built in notification)
        // For simplicity, we trigger a successful response. 
        // Instructions below explain how to enable the auto-email in Netlify.

        await client.end();
        return { statusCode: 200, body: JSON.stringify({ message: "Saved" }) };
    } catch (err) {
        return { statusCode: 500, body: err.toString() };
    }
};