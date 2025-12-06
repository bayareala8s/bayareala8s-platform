// products/bayserve-v2/frontend/src/auth/AuthContext.tsx

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

type AuthUser = {
  email?: string;
  sub?: string;
};

type AuthContextValue = {
  isAuthenticated: boolean;
  idToken: string | null;
  user: AuthUser | null;
  loading: boolean;
  signIn: () => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const COGNITO_REGION = import.meta.env.VITE_COGNITO_REGION;
const USER_POOL_ID = import.meta.env.VITE_COGNITO_USER_POOL_ID;
const CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID;
const COGNITO_DOMAIN = import.meta.env.VITE_COGNITO_DOMAIN;
const REDIRECT_URI = import.meta.env.VITE_COGNITO_REDIRECT_URI;

const STORAGE_KEY = "bayserve_v2_auth";

/**
 * Very small JWT parser – just to read the payload.
 */
function parseJwt(token: string): any | null {
  try {
    const [, payload] = token.split(".");
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

type StoredAuth = {
  idToken: string;
  expiresAt: number;
  user: AuthUser;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [idToken, setIdToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Load from localStorage and/or URL hash on first load
  useEffect(() => {
    const now = Date.now() / 1000; // seconds

    // 1) Check URL hash from Cognito (implicit flow: response_type=token)
    if (window.location.hash.includes("id_token")) {
      const params = new URLSearchParams(window.location.hash.substring(1));
      const newIdToken = params.get("id_token");
      const expiresIn = Number(params.get("expires_in") || "3600");

      if (newIdToken) {
        const payload = parseJwt(newIdToken) || {};
        const auth: StoredAuth = {
          idToken: newIdToken,
          expiresAt: now + expiresIn - 60, // 1 minute safety margin
          user: {
            email: payload.email,
            sub: payload.sub,
          },
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
        setIdToken(auth.idToken);
        setUser(auth.user);
      }

      // Clean up URL hash
      window.history.replaceState({}, document.title, window.location.pathname);

      setLoading(false);
      return;
    }

    // 2) Otherwise, read from localStorage
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const saved: StoredAuth = JSON.parse(raw);
        if (saved.expiresAt > now && saved.idToken) {
          setIdToken(saved.idToken);
          setUser(saved.user);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    setLoading(false);
  }, []);

  const signIn = () => {
    if (!CLIENT_ID || !COGNITO_DOMAIN || !REDIRECT_URI) {
      console.error("Cognito env vars missing");
      alert("Auth is not configured correctly. Please check env vars.");
      return;
    }

    const loginUrl = new URL(`https://${COGNITO_DOMAIN}/login`);
    loginUrl.searchParams.set("client_id", CLIENT_ID);
    loginUrl.searchParams.set("response_type", "token");
    loginUrl.searchParams.set("scope", "openid email");
    loginUrl.searchParams.set("redirect_uri", REDIRECT_URI);

    window.location.assign(loginUrl.toString());
  };

  const signOut = () => {
    localStorage.removeItem(STORAGE_KEY);
    setIdToken(null);
    setUser(null);

    if (!CLIENT_ID || !COGNITO_DOMAIN || !REDIRECT_URI) {
      window.location.href = "/";
      return;
    }

    const logoutUrl = new URL(`https://${COGNITO_DOMAIN}/logout`);
    logoutUrl.searchParams.set("client_id", CLIENT_ID);
    logoutUrl.searchParams.set("logout_uri", REDIRECT_URI);

    window.location.assign(logoutUrl.toString());
  };

  const value: AuthContextValue = {
    isAuthenticated: !!idToken,
    idToken,
    user,
    loading,
    signIn,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
};
