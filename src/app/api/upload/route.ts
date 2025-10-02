import { pipeline, Readable } from 'stream';
import { promisify } from 'util';
import fs from 'fs';
import os from 'os';
import path from 'path';
import JSZip from "jszip";

import { NextResponse } from 'next/server';
import { processCsvFiles } from '@/lib/csvProcessor';
import { writeToGoogleSheet } from '@/lib/sheets';

export const runtime = 'nodejs';
export const revalidate = 0;
export const dynamic = 'force-dynamic';
export const config = { api: { bodyParser: false } };

const pump = promisify(pipeline);

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("zip") as File | null;

    if (!file) {
      return NextResponse.json(
        { ok: false, message: "No ZIP file uploaded" },
        { status: 400 }
      );
    }

    // ✅ convert to Buffer
    const buffer = await fileToBuffer(file);

    // ✅ unzip in memory
    const zip = await JSZip.loadAsync(buffer);
    const csvBuffers: { name: string; buffer: Buffer }[] = [];

    for (const [filename, entry] of Object.entries(zip.files)) {
      if (filename.toLowerCase().endsWith(".csv")) {
        const content = await entry.async("nodebuffer");
        csvBuffers.push({ name: filename, buffer: content });
      }
    }

    if (csvBuffers.length === 0) {
      return NextResponse.json(
        { ok: false, message: "No CSV files found in ZIP" },
        { status: 400 }
      );
    }

    const merged = await processCsvFiles(csvBuffers);
    await writeToGoogleSheet(merged);

    return NextResponse.json({
      ok: true,
      message: "Merged data exported to Google Sheets",
    });
  } catch (err: unknown) {
    console.error(err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, message: message || "Processing failed" },
      { status: 500 }
    );
  }
}

async function fileToBuffer(file: File): Promise<Buffer> {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

