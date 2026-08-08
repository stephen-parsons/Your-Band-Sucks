/**
 * Resolves Prisma's connection URL from DB_URL, or composes it
 * from DB_HOST / DB_USER / DB_PASSWORD / DB_NAME (and optional DB_PORT).
 */
export function resolveDatabaseUrl(): string {
  const existing = process.env.DB_URL?.trim();
  if (existing) {
    return existing;
  }

  const host = process.env.DB_HOST;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const name = process.env.DB_NAME;
  const port = process.env.DB_PORT ?? "5432";

  if (!host || !user || !password || !name) {
    throw new Error(
      "DB_URL is unset and DB_HOST/DB_USER/DB_PASSWORD/DB_NAME are incomplete",
    );
  }

  const encodedPassword = encodeURIComponent(password);
  const databaseUrl = `postgresql://${user}:${encodedPassword}@${host}:${port}/${name}`;
  process.env.DB_URL = databaseUrl;
  return databaseUrl;
}
