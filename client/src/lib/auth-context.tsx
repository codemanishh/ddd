import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { Restaurant } from "@shared/schema";

interface AuthContextType {
  admin: Restaurant | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (admin: Restaurant, token: string) => void;
  logout: () => void;
  token: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Restaurant | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("auth_token");
    const storedAdmin = localStorage.getItem("auth_admin");
    
    if (storedToken && storedAdmin) {
      try {
        setToken(storedToken);
        setAdmin(JSON.parse(storedAdmin));
      } catch {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_admin");
      }
    }
    setIsLoading(false);
  }, []);

  const login = (admin: Restaurant, authToken: string) => {
    setAdmin(admin);
    setToken(authToken);
    localStorage.setItem("auth_token", authToken);
    localStorage.setItem("auth_admin", JSON.stringify(admin));
  };

  const logout = () => {
    setAdmin(null);
    setToken(null);
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_admin");
  };

  return (
    <AuthContext.Provider
      value={{
        admin,
        isAuthenticated: !!admin,
        isLoading,
        login,
        logout,
        token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
