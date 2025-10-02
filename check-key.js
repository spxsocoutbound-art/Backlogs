// check-key.js - safe diagnostics, does NOT print secret contents
require('dotenv').config();
const b64 = process.env.SHEETS_SERVICE_ACCOUNT;
if (!b64) { console.error('NO B64'); process.exit(1); }
const obj = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
const raw = obj.private_key || '';
const normalized = raw.replace(/\n/g, '\n').replace(/\r\n/g, '\n').trim();

console.log('raw length:', raw.length);
console.log('normalized length:', normalized.length);

// Show char codes for first and last 30 characters (not the whole key)
function codes(str, n) {
return Array.from(str.slice(0,n)).map(c=>c.charCodeAt(0)).join(',');
}
function codesEnd(str, n) {
const s = str.slice(-n);
return Array.from(s).map(c=>c.charCodeAt(0)).join(',');
}

console.log('first 30 char codes:', codes(normalized, 30));
console.log('last 30 char codes:', codesEnd(normalized, 30));

// Check for any null bytes
console.log('contains NUL char (code 0):', normalized.includes('\0'));

// Check for non-ASCII control chars (codes <32 except newline(10) and CR(13))
const ctrl = Array.from(normalized).map(c=>c.charCodeAt(0)).filter(ch => ch < 32 && ch !== 10 && ch !== 13);
console.log('other control char codes present:', ctrl.length ? ctrl.slice(0,10).join(',') : 'none');