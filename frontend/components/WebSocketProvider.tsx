import { useAuthContext } from "@/app/auth";
import { SERVER_URL } from "@/service/posts";
import {
  isWsServerEvent,
  LikeCountUpdatePayload,
  LikeNotification,
  toWebSocketUrl,
  WsServerEvent,
} from "@/util/websocket";
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

type LikeCountUpdateHandler = (payload: LikeCountUpdatePayload) => void;

interface IWebSocketContext {
  subscribeLikeCountUpdate: (handler: LikeCountUpdateHandler) => () => void;
  notifications: LikeNotification[];
  dismissNotification: (id: string) => void;
}

const WebSocketContext = createContext<IWebSocketContext | null>(null);

const RECONNECT_DELAY_MS = 3000;
const UNAUTHORIZED_CLOSE_CODE = 1008;
const MAX_UNAUTHORIZED_RETRIES = 2;

export function WebSocketProvider({ children }: PropsWithChildren) {
  const { isAuthenticated, ensureValidAccessToken } = useAuthContext();
  const [notifications, setNotifications] = useState<LikeNotification[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const likeCountHandlersRef = useRef<Set<LikeCountUpdateHandler>>(new Set());
  const shouldConnectRef = useRef(false);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const unauthorizedRetriesRef = useRef(0);
  const connectRef = useRef<() => Promise<void>>(async () => undefined);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const handleServerEvent = useCallback((event: WsServerEvent) => {
    if (event.type === "likeCountUpdate") {
      for (const handler of likeCountHandlersRef.current) {
        handler(event.payload);
      }
      return;
    }
    if (event.type === "notification:song_liked") {
      setNotifications((prev) => [
        ...prev,
        {
          id: `${event.payload.songId}-${Date.now()}`,
          ...event.payload,
        },
      ]);
    }
  }, []);

  const scheduleReconnect = useCallback((delayMs = RECONNECT_DELAY_MS) => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    reconnectTimeoutRef.current = setTimeout(() => {
      void connectRef.current();
    }, delayMs);
  }, []);

  const connect = useCallback(async () => {
    if (!shouldConnectRef.current) {
      return;
    }
    if (
      socketRef.current &&
      (socketRef.current.readyState === WebSocket.OPEN ||
        socketRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const token = await ensureValidAccessToken();
    if (!token || !SERVER_URL || !shouldConnectRef.current) {
      return;
    }

    const url = `${toWebSocketUrl(SERVER_URL)}?token=${encodeURIComponent(token)}`;
    const socket = new WebSocket(url);
    socketRef.current = socket;

    socket.onopen = () => {
      unauthorizedRetriesRef.current = 0;
    };

    socket.onmessage = (messageEvent) => {
      try {
        const parsed: unknown = JSON.parse(String(messageEvent.data));
        if (isWsServerEvent(parsed)) {
          handleServerEvent(parsed);
        }
      } catch (error) {
        console.error("Failed to parse WS message:", error);
      }
    };

    socket.onclose = (closeEvent) => {
      socketRef.current = null;
      if (!shouldConnectRef.current) {
        return;
      }

      const isUnauthorized =
        closeEvent.code === UNAUTHORIZED_CLOSE_CODE ||
        closeEvent.reason === "Unauthorized";

      if (isUnauthorized) {
        if (unauthorizedRetriesRef.current >= MAX_UNAUTHORIZED_RETRIES) {
          console.error(
            "WebSocket unauthorized after token refresh retries; giving up",
          );
          return;
        }
        unauthorizedRetriesRef.current += 1;
        console.info(
          "WebSocket unauthorized; refreshing session and retrying...",
        );
        void (async () => {
          await ensureValidAccessToken(true);
          if (shouldConnectRef.current) {
            scheduleReconnect(0);
          }
        })();
        return;
      }

      scheduleReconnect();
    };

    socket.onerror = () => {
      socket.close();
    };
  }, [ensureValidAccessToken, handleServerEvent, scheduleReconnect]);

  connectRef.current = connect;

  useEffect(() => {
    shouldConnectRef.current = isAuthenticated;
    if (isAuthenticated) {
      void connect();
    } else {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      socketRef.current?.close();
      socketRef.current = null;
      unauthorizedRetriesRef.current = 0;
      setNotifications([]);
    }

    return () => {
      shouldConnectRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [isAuthenticated, connect]);

  const subscribeLikeCountUpdate = useCallback(
    (handler: LikeCountUpdateHandler): (() => void) => {
      likeCountHandlersRef.current.add(handler);
      return () => {
        likeCountHandlersRef.current.delete(handler);
      };
    },
    [],
  );

  return (
    <WebSocketContext.Provider
      value={{ subscribeLikeCountUpdate, notifications, dismissNotification }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext(): IWebSocketContext {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error(
      "useWebSocketContext must be used within WebSocketProvider",
    );
  }
  return context;
}
