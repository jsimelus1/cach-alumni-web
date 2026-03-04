// netlify/functions/register.js
const axios = require('axios');

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const data = JSON.parse(event.body);
    const participants = data.group; // This matches the 'group' key in your HTML script

    // Airtable Configuration (Set these in Netlify UI)
    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
    const AIRTABLE_TABLE_NAME = "Table 1"; // Or whatever your table is named

    // We map your JS objects to the format Airtable expects
    const records = participants.map(p => ({
      fields: {
        firstname: p.firstname,
        lastname: p.lastname,
        email: p.email,
        year: p.year,
        tshirt: p.tshirt
      }
    }));

    // Send data to Airtable (Airtable allows max 10 records per request)
    await axios.post(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`,
      { records: records },
      {
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Participants registered successfully!" })
    };

  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to store data" })
    };
  }
};
