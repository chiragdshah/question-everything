import type { Handler } from '@netlify/functions';
import { google } from 'googleapis';

interface GuestResponses {
  guest_name: string;
  q1_story_stage: string;
  q2_decision_cost: string;
  q3_paths_feeling: string;
  q4_who_shaped: string;
  q5_unlearned: string;
  q6_the_pull: string;
  q7_misunderstanding: string;
  q8_rethinking: string;
}

const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const responses: GuestResponses = JSON.parse(event.body || '{}');

    if (!responses.guest_name) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing guest name' }) };
    }

    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    if (!serviceAccountKey) {
      console.error('GOOGLE_SERVICE_ACCOUNT_KEY not set');
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };
    }

    if (!spreadsheetId) {
      console.error('GOOGLE_SHEET_ID not set');
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };
    }

    // Authenticate with Google Sheets API via service account
    const credentials = JSON.parse(serviceAccountKey);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Append a row: Timestamp | Guest Name | Story Stage | Decision & Cost |
    // Paths Feeling | Who Shaped You | Unlearned Belief | The Pull |
    // Misunderstanding | Rethinking
    const row = [
      new Date().toISOString(),
      responses.guest_name,
      responses.q1_story_stage || '',
      responses.q2_decision_cost || '',
      responses.q3_paths_feeling || '',
      responses.q4_who_shaped || '',
      responses.q5_unlearned || '',
      responses.q6_the_pull || '',
      responses.q7_misunderstanding || '',
      responses.q8_rethinking || '',
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Responses!A:J',
      valueInputOption: 'RAW',
      requestBody: {
        values: [row],
      },
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true }),
    };

  } catch (error) {
    console.error('Submission error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
    };
  }
};

export { handler };
