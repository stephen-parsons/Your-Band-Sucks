import { useAuthenticator } from "@aws-amplify/ui-react-native";
import { AuthSession, AuthUser, fetchAuthSession } from "aws-amplify/auth";
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useState,
} from "react";

export interface IAuthContext {
  user: AuthUser;
  username: string;
  isAuthenticated: boolean;
  apiClient: typeof fetch;
  getIdToken: () => string | undefined;
  getAccessToken: () => string | undefined;
  /**
   * Returns a valid access token, refreshing the Cognito session when expired
   * or when `forceRefresh` is true.
   */
  ensureValidAccessToken: (
    forceRefresh?: boolean,
  ) => Promise<string | undefined>;
}

const AuthContext = createContext<IAuthContext | null>(null);

export default function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const { authStatus, username, user } = useAuthenticator();

  if (!session) getSession();

  async function getSession() {
    const session = await fetchAuthSession();

    if (session) setSession(session);
  }

  const getIdToken = useCallback(() => {
    return session?.tokens?.idToken?.toString();
  }, [session]);

  const getAccessToken = useCallback(() => {
    return session?.tokens?.accessToken?.toString();
  }, [session]);

  const isAccessTokenExpired = useCallback(
    (currentSession: AuthSession | null): boolean => {
      const exp = currentSession?.tokens?.accessToken.payload.exp;
      if (!exp) {
        return false;
      }
      // multiply exp claim by 1000 for epoch ms; Amplify does not auto-refresh
      // unless fetchAuthSession is invoked
      return new Date(exp * 1000) < new Date();
    },
    [],
  );

  const ensureValidAccessToken = useCallback(
    async (forceRefresh = false): Promise<string | undefined> => {
      let currentSession = session;
      if (forceRefresh || isAccessTokenExpired(session)) {
        console.info("Refreshing auth tokens...");
        const newSession = await refreshTokens();
        currentSession = newSession;
        setSession(newSession);
      }
      return currentSession?.tokens?.accessToken?.toString();
    },
    [session, isAccessTokenExpired],
  );

  const apiClient = useCallback(
    async (input: string | URL | Request, options: RequestInit = {}) => {
      const accessToken = await ensureValidAccessToken();

      const headerObj: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (accessToken) {
        headerObj["Authorization"] = `Bearer ${accessToken}`;
      }
      const config = {
        ...options,
        headers: {
          ...headerObj,
          ...options.headers,
        },
      };

      return fetch(input, config);
    },
    [ensureValidAccessToken],
  );

  const isAuthenticated = authStatus === "authenticated" && session !== null;
  return (
    <AuthContext.Provider
      value={{
        user,
        username,
        isAuthenticated,
        apiClient,
        getIdToken,
        getAccessToken,
        ensureValidAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuthContext = (): IAuthContext => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuthContext must be used within AuthProvider");
  }

  return context;
};

async function refreshTokens() {
  return await fetchAuthSession({ forceRefresh: true });
}
