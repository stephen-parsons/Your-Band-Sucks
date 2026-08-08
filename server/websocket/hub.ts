import chalk from "chalk";
import type { Server as HttpServer, IncomingMessage } from "http";
import { parse as parseUrl } from "url";
import { RawData, WebSocket, WebSocketServer } from "ws";
import { resolveUserIdFromAccessToken } from "../auth/resolveUser";
import { moduleLogger } from "../util/logger";
import { isWsClientMessage, WsChannel, WsServerEvent } from "./events";

const WS_PATH = "/ws";
const PING_INTERVAL_MS = 30_000;

const hubLogger = moduleLogger("websocket/hub");

interface AuthenticatedSocket extends WebSocket {
  userId: number;
  isAlive: boolean;
  channels: Set<WsChannel>;
}

const socketsByUserId = new Map<number, Set<AuthenticatedSocket>>();
const channelSubscribers = new Map<WsChannel, Set<AuthenticatedSocket>>();

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

function subscribe(socket: AuthenticatedSocket, channel: WsChannel): void {
  socket.channels.add(channel);
  let set = channelSubscribers.get(channel);
  if (!set) {
    set = new Set();
    channelSubscribers.set(channel, set);
  }
  set.add(socket);
}

function unsubscribe(socket: AuthenticatedSocket, channel: WsChannel): void {
  socket.channels.delete(channel);
  channelSubscribers.get(channel)?.delete(socket);
}

function cleanupSocket(socket: AuthenticatedSocket): void {
  for (const channel of socket.channels) {
    unsubscribe(socket, channel);
  }
  removeFromUserMap(socket);
}

function sendJson(socket: WebSocket, event: WsServerEvent): void {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(event));
  }
}

export function broadcastToChannel(
  channel: WsChannel,
  event: WsServerEvent,
): void {
  const subscribers = channelSubscribers.get(channel);
  const recipientCount = subscribers?.size ?? 0;
  hubLogger.info(
    "broadcast",
    chalk.cyan(event.type),
    "→ channel",
    chalk.cyan(channel),
    `(${recipientCount} subscriber${recipientCount === 1 ? "" : "s"})`,
  );
  if (!subscribers || recipientCount === 0) {
    return;
  }
  for (const socket of subscribers) {
    sendJson(socket, event);
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
      authed.channels = new Set();
      addToUserMap(authed);

      hubLogger.info("WS connected for userId:", chalk.cyan(userId));

      authed.on("pong", () => {
        authed.isAlive = true;
      });

      authed.on("message", (raw: RawData) => {
        try {
          const parsed: unknown = JSON.parse(raw.toString());
          if (!isWsClientMessage(parsed)) {
            return;
          }
          if (parsed.action === "subscribe") {
            subscribe(authed, parsed.channel);
            hubLogger.info(
              "userId",
              chalk.cyan(userId),
              "subscribed to",
              parsed.channel,
            );
          } else {
            unsubscribe(authed, parsed.channel);
            hubLogger.info(
              "userId",
              chalk.cyan(userId),
              "unsubscribed from",
              parsed.channel,
            );
          }
        } catch (error) {
          hubLogger.error("Failed to handle WS message:", error);
        }
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

  hubLogger.info("WebSocket server attached at", chalk.green(WS_PATH));
}
