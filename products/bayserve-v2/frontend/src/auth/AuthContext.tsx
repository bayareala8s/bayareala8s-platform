// src/auth/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { buildLoginUrl, buildLogoutUrl } from "./cognito";

type AuthState = {
  idToken?: string;
  isAuthenticated: boolean;
};

type AuthContextType = {
  auth: AuthState;
  login: () => void;
  logout: () => void;
  setToken: (token?: string) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "bayserve_v2_id_token";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [idToken, setIdToken] = useState<string | undefined>(() => {
    return localStorage.getItem(TOKEN_KEY) || undefined;
  });

  const isAuthenticated = !!idToken;

  useEffect(() => {
    if (idToken) {
      localStorage.setItem(TOKEN_KEY, idToken);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }, [idToken]);

  const login = () => {
    window.location.href = buildLoginUrl();
  };

  const logout = () => {
    setIdToken(undefined);
    // Optional: also hit Cognito logout
    window.location.href = buildLogoutUrl();
  };

  const setToken = (token?: string) => {
    setIdToken(token);
  };

  return (
    <AuthContext.Provider value={{ auth: { idToken, isAuthenticated }, login, logout, setToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
