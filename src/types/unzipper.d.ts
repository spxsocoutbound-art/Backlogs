// src/types/unzipper.d.ts
declare module "unzipper" {
type ExtractOptions = { path?: string };

// Declare a callable Extract function (value) and its return type
export function Extract(opts?: ExtractOptions): {
promise(): Promise<void>;
};

export function Open(): unknown;
export function Parse(): unknown;

// Also export a default object (CommonJS shape)
const unzipperDefault: {
Extract: typeof Extract;
Open: typeof Open;
Parse: typeof Parse;
};

export default unzipperDefault;
}