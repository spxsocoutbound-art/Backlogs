import { google } from 'googleapis';
import type { GoogleAuth } from 'google-auth-library';

interface ServiceAccount {
client_email: string;
private_key: string;
[k: string]: unknown;
}

function getEnv(name: string, optional = false): string {
const v = process.env[name];
if (!v && !optional) throw new Error(`Missing environment variable: ${name}`);
return v as string;
}

function decodeServiceAccountFromBase64(b64: string): Record<string, unknown> {
try {
const jsonText = Buffer.from(b64, 'base64').toString('utf8');
return JSON.parse(jsonText) as Record<string, unknown>;
} catch {
throw new Error('Failed to decode or parse SHEETS_SERVICE_ACCOUNT (base64 JSON)');
}
}

function normalizePrivateKey(key: string): string {
if (!key) return key;
return key.replace(/\n/g, '\n').replace(/\r\n/g, '\n').trim();
}

export async function writeToGoogleSheet(values: (string | number | null)[][]) {
if (!Array.isArray(values) || values.length === 0) throw new Error('values must be a non-empty 2D array');

const spreadsheetId = getEnv('GOOGLE_SHEETS_SPREADSHEET_ID');
const targetSheet = process.env.TARGET_SHEET_NAME || process.env.NEXT_PUBLIC_TARGET_SHEET_NAME || 'data_integration';
const saB64 = getEnv('SHEETS_SERVICE_ACCOUNT');

const credsRaw = decodeServiceAccountFromBase64(saB64);
const creds = credsRaw as ServiceAccount;
if (!creds.client_email || !creds.private_key) throw new Error('Service account JSON missing fields');

creds.private_key = normalizePrivateKey(String(creds.private_key));

const auth = new google.auth.GoogleAuth({
credentials: creds,
scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

// Use GoogleAuth instance as the auth parameter (typed)
const sheets = google.sheets({ version: 'v4', auth: auth as unknown as GoogleAuth });

// Normalize values to strings for Sheets API
const safeValues = values.map((row) => row.map((cell) => (cell === undefined || cell === null ? '' : String(cell))));

await sheets.spreadsheets.values.clear({ spreadsheetId, range: targetSheet });
await sheets.spreadsheets.values.update({
spreadsheetId,
range: `${targetSheet}!A1`,
valueInputOption: 'RAW',
requestBody: { values: safeValues },
});

return { wrote: values.length - 1 };
}