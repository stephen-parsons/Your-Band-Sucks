import { prisma } from "../prisma";

export interface PGConnections {
  state: string;
  count: string;
}

/**
 * Queries the pg_stat_activity view to fetch open connections.
 */
export async function getActivePgConnections(): Promise<PGConnections[]> {
  return await prisma.$queryRaw<PGConnections[]>`
      SELECT state, count(*) 
      FROM pg_stat_activity 
      GROUP BY state;
    `;
}
