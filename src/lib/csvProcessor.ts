// src/lib/csvProcessor.ts
import Papa from 'papaparse';
import { DateTime } from 'luxon';

const colIndex = (col: string): number => {
const s = String(col).toUpperCase();
let n = 0;
for (let i = 0; i < s.length; i++) n = n * 26 + (s.charCodeAt(i) - 64);
return n - 1;
};

const dropRanges: [number, number][] = [
[colIndex('C'), colIndex('I')],
[colIndex('K'), colIndex('M')],
[colIndex('O'), colIndex('U')],
[colIndex('Y'), colIndex('AA')],
[colIndex('AE'), colIndex('AH')],
];

const shouldDropIndex = (i: number) => dropRanges.some(([a, b]) => i >= a && i <= b);

const filterChecks = [
{ idx: colIndex('K'), text: 'Station' },
{ idx: colIndex('M'), text: 'SOC 5' },
];

const dateIdx = colIndex('X');

function parseCsvBufferToRows(buf: Buffer): string[][] {
const text = buf.toString('utf8');
const parsed = Papa.parse<string[]>(text, { skipEmptyLines: true });
return parsed.data || [];
}

function normalizeRowForDrop(row: unknown[]): string[] {
const out: string[] = [];
for (let i = 0; i < row.length; i++) {
if (!shouldDropIndex(i)) {
const cell = (row as unknown[])[i];
out.push(cell === undefined || cell === null ? '' : String(cell));
}
}
return out;
}

function rowPassesFilters(origRow: unknown[]): boolean {
for (const f of filterChecks) {
const v = String(((origRow as unknown[])[f.idx]) ?? '');
if (!v.includes(f.text)) return false;
}
return true;
}

function parseDateValue(v: unknown): DateTime | null {
if (v === null || v === undefined) return null;
const s = String(v).trim();
let dt = DateTime.fromFormat(s, 'M/d/yyyy H:mm');
if (!dt.isValid) dt = DateTime.fromFormat(s, 'M/d/yyyy HH:mm');
if (!dt.isValid) dt = DateTime.fromFormat(s, 'M/d/yyyy');
if (!dt.isValid) {
const d = new Date(s);
if (!isNaN(d.getTime())) return DateTime.fromJSDate(d);
return null;
}
return dt;
}

type ParsedRow = string[] & { __parsedDateISO?: string | null };

export async function processCsvFiles(csvBuffers: { name: string; buffer: Buffer }[]): Promise<string[][]> {
let header: string[] | null = null;
const dataRows: ParsedRow[] = [];

for (let i = 0; i < csvBuffers.length; i++) {
const item = csvBuffers[i];
const rows = parseCsvBufferToRows(item.buffer);
if (!rows || rows.length === 0) continue;

let startIdx = 0;  
if (i === 0) {  
  header = normalizeRowForDrop(rows[0]);  
  startIdx = 1;  
} else {  
  const firstRow = rows[0] as unknown[];  
  const looksLikeHeader = firstRow.some((cell) => isNaN(Number(String(cell))));  
  if (looksLikeHeader) startIdx = 1;  
}  

for (let r = startIdx; r < rows.length; r++) {  
  const origRow = rows[r];  
  if (!Array.isArray(origRow)) continue;  

  if (!rowPassesFilters(origRow)) continue;  

  const maybeDate = (origRow as unknown[])[dateIdx];  
  const dateVal = parseDateValue(maybeDate);  
  if (!dateVal || !dateVal.isValid) continue;  

  const trimmed = normalizeRowForDrop(origRow);  
  (trimmed as ParsedRow).__parsedDateISO = dateVal.toISO();  
  dataRows.push(trimmed as ParsedRow);  
}  
}

dataRows.sort((a: ParsedRow, b: ParsedRow) => {
const da = Date.parse(a.__parsedDateISO || '');
const db = Date.parse(b.__parsedDateISO || '');
return da - db;
});

const finalRows: string[][] = dataRows.map((r) => {
const arr: string[] = [];
for (let i = 0; i < r.length; i++) arr.push(r[i]);
return arr;
});

if (!header) throw new Error('No header found in CSV files');
return [header, ...finalRows];
}