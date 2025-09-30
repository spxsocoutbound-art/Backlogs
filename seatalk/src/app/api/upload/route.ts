import JSZip from "jszip";
import { NextResponse } from "next/server";
import { writeToGoogleSheet } from "@/lib/sheets";
import { parse } from "csv-parse/sync";

export const runtime = "nodejs";
export const maxDuration = 60;

type CsvRow = Record<string, string | number | null | undefined>;

function sanitizeHeader(header: string): string {
  return header.replace(/\s+/g, " ").trim();
}

function sanitizeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.replace(/\s+/g, " ").trim();
  return String(value);
}

const MAX_CSV_BYTES = 25 * 1024 * 1024; // 25 MB per extracted CSV

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("zip");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ ok: false, message: "Missing 'zip' file" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    const csvEntries = Object.values(zip.files).filter((f) => !f.dir && f.name.toLowerCase().endsWith(".csv"));
    if (csvEntries.length === 0) {
      return NextResponse.json({ ok: false, message: "No CSV files found in ZIP" }, { status: 400 });
    }

    // Parse and merge
    const allRows: CsvRow[] = [];
    const allHeadersSet: Set<string> = new Set();

    for (const entry of csvEntries) {
      const data = await entry.async("uint8array");
      if (data.byteLength > MAX_CSV_BYTES) {
        return NextResponse.json({ ok: false, message: `${entry.name} exceeds 25 MB limit` }, { status: 413 });
      }

      const text = new TextDecoder("utf-8").decode(data);
      const records: string[][] = parse(text, {
        bom: true,
        columns: false,
        relax_column_count: true,
        skip_empty_lines: true,
        trim: true,
      });
      if (records.length === 0) continue;
      const headers = records[0].map((h) => sanitizeHeader(h));
      headers.forEach((h) => allHeadersSet.add(h));

      for (let i = 1; i < records.length; i++) {
        const row = records[i];
        const obj: CsvRow = {};
        headers.forEach((h, idx) => {
          obj[h] = sanitizeCell(row[idx]);
        });
        allRows.push(obj);
      }
    }

    // Sort headers and rows
    const headers = Array.from(allHeadersSet).sort((a, b) => a.localeCompare(b));
    const rowsMatrix: (string | number | null | undefined)[][] = allRows.map((r) => headers.map((h) => r[h]));
    rowsMatrix.sort((a, b) => {
      const av = a[0] ?? "";
      const bv = b[0] ?? "";
      return String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: "base" });
    });

    // Export to Google Sheets
    const result = await writeToGoogleSheet(headers, rowsMatrix);

    return NextResponse.json({ ok: true, message: `Exported ${result.wrote} rows to Google Sheets` });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    console.error(err);
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

