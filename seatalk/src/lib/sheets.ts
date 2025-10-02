import { google } from "googleapis";

export type SheetsResult = {
  wrote: number;
  headers: string[];
};

function getEnv(name: string, optional = false): string | undefined {
  const value = process.env[name];
  if (!value && !optional) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export async function writeToGoogleSheet(
  headers: string[],
  rows: (string | number | null | undefined)[][]
): Promise<SheetsResult> {
  const spreadsheetId = getEnv("GOOGLE_SHEETS_SPREADSHEET_ID")!;
  const sheetName = process.env.TARGET_SHEET_NAME || "data_integration";
  const clientEmail = getEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL")!;
  let privateKey = getEnv("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY")!;
  // Support newline replacement for env files
  privateKey = privateKey.replace(/\\n/g, "\n");

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  // Ensure sheet exists; try to add it, ignore error if exists
  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: sheetName,
              },
            },
          },
        ],
      },
    });
  } catch {
    // ignore if already exists
  }

  // Clear existing values
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${sheetName}!A:ZZ`,
  });

  // Write new values
  const values = [headers, ...rows.map((r) => headers.map((h, i) => r[i] ?? ""))];
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A1`,
    valueInputOption: "RAW",
    requestBody: {
      range: `${sheetName}!A1`,
      majorDimension: "ROWS",
      values,
    },
  });

  return { wrote: rows.length, headers };
}

