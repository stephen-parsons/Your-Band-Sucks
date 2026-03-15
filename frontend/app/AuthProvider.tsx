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

  const apiClient = useCallback(
    async (input: string | URL | Request, options: RequestInit = {}) => {
      const headerObj: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (session && session.tokens) {
        headerObj["Authorization"] =
          `Bearer ${session.tokens.accessToken.toString()}`;
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
      value={{ user, username, isAuthenticated, apiClient }}
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
