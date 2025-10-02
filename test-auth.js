require('dotenv').config();

const path = require('path');
// adjust path if your project structure differs
const { getSheetsClient } = require(path.join(__dirname, 'src', 'lib', 'sheets.js'));

(async () => {
try {
// Ensure env vars are available: you can load .env.local via dotenv for local dev
require('dotenv').config(); // optional: install dotenv if not already
const { sheets, spreadsheetId } = await getSheetsClient();
const meta = await sheets.spreadsheets.get({ spreadsheetId });
console.log('OK - spreadsheet title:', meta.data.properties.title);
} catch (e) {
console.error('Auth error:', e.message);
console.error(e);
}
})();