require('dotenv').config();
const { google } = require('googleapis');
try {
const b64 = process.env.SHEETS_SERVICE_ACCOUNT;
const creds = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
// normalize private_key inside creds
if (creds.private_key) creds.private_key = creds.private_key.replace(/\n/g, '\n').replace(/\r\n/g, '\n').trim();

const client = new google.auth.GoogleAuth({
credentials: creds,
scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

(async () => {
try {
const authClient = await client.getClient();
const token = await authClient.getAccessToken();
console.log('auth OK, token length:', token && token.token ? token.token.length : 'no-token');
} catch (e) {
console.error('auth-from-json ERROR:', e.message);
}
})();
} catch (e) {
console.error('parse error', e.message);
}

