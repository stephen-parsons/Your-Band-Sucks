import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Loads key=value pairs from a .env file into process.env (does not override
 * variables that are already set).
 */
export function loadEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) {
    return;
  }

  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const eq = trimmed.indexOf("=");
    if (eq === -1) {
      continue;
    }

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

/** Server .env — shared source for CDK imported AWS resource identifiers. */
export const SERVER_ENV_PATH = path.join(__dirname, "../../server/.env");

export function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name} (set it in ${SERVER_ENV_PATH} or the shell)`,
    );
  }
  return value;
}

// Load shared server .env whenever CDK env helpers are imported.
loadEnvFile(SERVER_ENV_PATH);
