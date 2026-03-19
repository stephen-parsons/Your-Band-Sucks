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

  const apiClient = useCallback(
    async (input: string | URL | Request, options: RequestInit = {}) => {
      let currentSession = session;
      //check if access token needs to be refreshed
      //multipy the access token exp claim by 1000 to get epoch time and create new Date
      //compare this with curren time.
      //this check is not programatically done amplify unless fetchAuthSession is invoked
      if (
        session?.tokens?.accessToken.payload.exp &&
        new Date(session?.tokens?.accessToken.payload.exp * 1000) < new Date()
      ) {
        console.info("Refreshing auth tokens...");
        const newSession = await refreshTokens();
        currentSession = newSession;
      }

      const headerObj: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (currentSession && currentSession.tokens) {
        headerObj["Authorization"] =
          `Bearer ${currentSession.tokens.accessToken.toString()}`;
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
    [session],
  );

  const isAuthenticated = authStatus === "authenticated" && session !== null;
  return (
    <AuthContext.Provider
      value={{ user, username, isAuthenticated, apiClient, getIdToken }}
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
