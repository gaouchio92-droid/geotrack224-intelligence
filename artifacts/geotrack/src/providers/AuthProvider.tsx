import { useState, useEffect, useCallback, type ReactNode } from "react";
import { AuthContext, type AuthState, type AuthUser } from "@/hooks/use-auth";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  return res;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({ status: "loading" });

  const refresh = useCallback(async () => {
    try {
      const res = await apiFetch("/api/auth/me");
      if (res.ok) {
        const user: AuthUser = await res.json();
        setAuth({ status: "authenticated", user });
      } else {
        setAuth({ status: "unauthenticated" });
      }
    } catch {
      setAuth({ status: "unauthenticated" });
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Identifiants incorrects");
    }
    const user: AuthUser = await res.json();
    setAuth({ status: "authenticated", user });
  }, []);

  const logout = useCallback(async () => {
    await apiFetch("/api/auth/logout", { method: "POST" });
    setAuth({ status: "unauthenticated" });
  }, []);

  return (
    <AuthContext.Provider value={{ auth, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}
