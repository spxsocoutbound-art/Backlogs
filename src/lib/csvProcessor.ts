// src/lib/csvProcessor.ts
import Papa from 'papaparse';
import { DateTime } from 'luxon';

type ColumnMapping = {
  stationName?: string;
  clusterName?: string;
  mmType?: string;
  region?: string;
  missType?: string;
  dateColumn?: string;
};

function parseCsvBufferToRows(buf: Buffer): string[][] {
  const text = buf.toString('utf8');
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: true });
  return parsed.data || [];
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

type ProcessedRow = {
  data: string[];
  parsedDate?: DateTime;
};

export async function processCsvFiles(
  csvBuffers: { name: string; buffer: Buffer }[], 
  columnMapping: ColumnMapping
): Promise<string[][]> {
  let originalHeaders: string[] | null = null;
  const dataRows: ProcessedRow[] = [];

  // Define the output columns based on mapping
  const outputHeaders = [
    'Station Name',
    'Cluster Name', 
    'MM Type',
    'Region',
    'Miss Type/Remarks',
    'Date'
  ];

  for (let i = 0; i < csvBuffers.length; i++) {
    const item = csvBuffers[i];
    const rows = parseCsvBufferToRows(item.buffer);
    if (!rows || rows.length === 0) continue;

    let startIdx = 0;
    if (i === 0) {
      originalHeaders = rows[0] as string[];
      startIdx = 1;
    } else {
      const firstRow = rows[0] as unknown[];
      const looksLikeHeader = firstRow.some((cell) => isNaN(Number(String(cell))));
      if (looksLikeHeader) startIdx = 1;
    }

    if (!originalHeaders) continue;

    // Find column indices based on mapping
    const stationIdx = originalHeaders.findIndex(h => h === columnMapping.stationName);
    const clusterIdx = originalHeaders.findIndex(h => h === columnMapping.clusterName);
    const mmTypeIdx = originalHeaders.findIndex(h => h === columnMapping.mmType);
    const regionIdx = originalHeaders.findIndex(h => h === columnMapping.region);
    const missTypeIdx = originalHeaders.findIndex(h => h === columnMapping.missType);
    const dateIdx = originalHeaders.findIndex(h => h === columnMapping.dateColumn);

    for (let r = startIdx; r < rows.length; r++) {
      const origRow = rows[r];
      if (!Array.isArray(origRow)) continue;

      // Extract mapped columns
      const mappedRow: string[] = [
        stationIdx >= 0 ? String(origRow[stationIdx] || '') : '',
        clusterIdx >= 0 ? String(origRow[clusterIdx] || '') : '',
        mmTypeIdx >= 0 ? String(origRow[mmTypeIdx] || '') : '',
        regionIdx >= 0 ? String(origRow[regionIdx] || '') : '',
        missTypeIdx >= 0 ? String(origRow[missTypeIdx] || '') : '',
        dateIdx >= 0 ? String(origRow[dateIdx] || '') : ''
      ];

      // Parse date if available
      let parsedDate: DateTime | null = null;
      if (dateIdx >= 0) {
        parsedDate = parseDateValue(origRow[dateIdx]);
      }

      // Only include rows with valid dates if date column is specified
      if (columnMapping.dateColumn && (!parsedDate || !parsedDate.isValid)) {
        continue;
      }

      dataRows.push({
        data: mappedRow,
        parsedDate: parsedDate || undefined
      });
    }
  }

  // Sort by date if available
  dataRows.sort((a, b) => {
    if (!a.parsedDate || !b.parsedDate) return 0;
    return a.parsedDate.toMillis() - b.parsedDate.toMillis();
  });

  const finalRows: string[][] = dataRows.map(row => row.data);

  return [outputHeaders, ...finalRows];
}