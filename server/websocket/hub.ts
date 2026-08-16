import chalk from "chalk";
import type { Server as HttpServer, IncomingMessage } from "http";
import { parse as parseUrl } from "url";
import { WebSocket, WebSocketServer } from "ws";
import { resolveUserIdFromAccessToken } from "../auth/resolveUser";
import { moduleLogger } from "../util/logger";
import { WsServerEvent } from "./events";

const WS_PATH = "/ws";
const PING_INTERVAL_MS = 30_000;

const hubLogger = moduleLogger("websocket/hub", { devOnly: false });

interface AuthenticatedSocket extends WebSocket {
  userId: number;
  isAlive: boolean;
}

const socketsByUserId = new Map<number, Set<AuthenticatedSocket>>();

let wss: WebSocketServer | null = null;
let pingInterval: ReturnType<typeof setInterval> | null = null;

function addToUserMap(socket: AuthenticatedSocket): void {
  let set = socketsByUserId.get(socket.userId);
  if (!set) {
    set = new Set();
    socketsByUserId.set(socket.userId, set);
  }
  set.add(socket);
}

function removeFromUserMap(socket: AuthenticatedSocket): void {
  const set = socketsByUserId.get(socket.userId);
  if (!set) {
    return;
  }
  set.delete(socket);
  if (set.size === 0) {
    socketsByUserId.delete(socket.userId);
  }
}

function cleanupSocket(socket: AuthenticatedSocket): void {
  removeFromUserMap(socket);
}

function sendJson(socket: WebSocket, event: WsServerEvent): void {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(event));
  }
}

export function broadcastToAll(event: WsServerEvent): void {
  if (!wss) {
    return;
  }
  const recipientCount = wss.clients.size;
  hubLogger.info(
    "broadcast",
    chalk.cyan(event.type),
    "→ all clients",
    `(${recipientCount} socket${recipientCount === 1 ? "" : "s"})`,
  );
  for (const client of wss.clients) {
    sendJson(client, event);
  }
}

export function sendToUser(userId: number, event: WsServerEvent): void {
  const sockets = socketsByUserId.get(userId);
  const recipientCount = sockets?.size ?? 0;
  hubLogger.info(
    "notify",
    chalk.cyan(event.type),
    "→ userId",
    chalk.cyan(userId),
    `(${recipientCount} socket${recipientCount === 1 ? "" : "s"})`,
  );
  if (!sockets || recipientCount === 0) {
    return;
  }
  for (const socket of sockets) {
    sendJson(socket, event);
  }
}

export interface WebSocketHealth {
  status: "HEALTHY" | "UNHEALTHY";
  path: string;
  clients: number;
  users: number;
}

/**
 * Reports whether the WebSocket server is attached and current connection counts.
 */
export function getWebSocketHealth(): WebSocketHealth {
  return {
    status: wss ? "HEALTHY" : "UNHEALTHY",
    path: WS_PATH,
    clients: wss?.clients.size ?? 0,
    users: socketsByUserId.size,
  };
}

async function authenticateUpgrade(
  request: IncomingMessage,
): Promise<number | null> {
  const { query } = parseUrl(request.url ?? "", true);
  const token = typeof query.token === "string" ? query.token : null;
  if (!token) {
    return null;
  }
  try {
    const { userId } = await resolveUserIdFromAccessToken(token);
    return userId;
  } catch (error) {
    hubLogger.error("WS auth failed:", error);
    return null;
  }
}

/**
 * Attaches a WebSocket server to the existing HTTP server on path `/ws`.
 * Clients must pass a Cognito access token as `?token=`.
 */
export function attachWebSocketServer(server: HttpServer): void {
  if (wss) {
    hubLogger.warn("WebSocket server already attached");
    return;
  }

  wss = new WebSocketServer({ server, path: WS_PATH });

  wss.on("connection", (socket: WebSocket, request: IncomingMessage) => {
    void (async () => {
      const userId = await authenticateUpgrade(request);
      if (userId === null) {
        hubLogger.warn("Rejecting unauthenticated WS connection");
        socket.close(1008, "Unauthorized");
        return;
      }

      const authed = socket as AuthenticatedSocket;
      authed.userId = userId;
      authed.isAlive = true;
      addToUserMap(authed);

      hubLogger.info("WS connected for userId:", chalk.cyan(userId));

      authed.on("pong", () => {
        authed.isAlive = true;
      });

      authed.on("close", () => {
        cleanupSocket(authed);
        hubLogger.info("WS disconnected for userId:", chalk.cyan(userId));
      });

      authed.on("error", (error: Error) => {
        hubLogger.error("WS socket error:", error);
        cleanupSocket(authed);
      });
    })();
  });

  pingInterval = setInterval(() => {
    if (!wss) {
      return;
    }
    for (const client of wss.clients) {
      const authed = client as AuthenticatedSocket;
      if (!authed.isAlive) {
        cleanupSocket(authed);
        authed.terminate();
        continue;
      }
      authed.isAlive = false;
      authed.ping();
    }
  }, PING_INTERVAL_MS);

  wss.on("close", () => {
    if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = null;
    }
  });

  console.info("✅ WebSocket server attached at", chalk.green(WS_PATH));
}
