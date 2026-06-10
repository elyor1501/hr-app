"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { getLoggedInUser } from "@/lib/users/data";
import { getApiUrl } from "@/lib/api-config";

interface User {
  id: string;
  email?: string;
  [key: string]: unknown;
}

interface UserContextType {
  user: User | null;
  loading: boolean;
  clearUser: () => void;
  setUser: (user: User | null) => void;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const USER_CACHE_TTL = 5 * 60 * 1000;
let _userCache: { data: User; timestamp: number } | null = null;

async function _doTokenRefresh(): Promise<boolean> {
  try {
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) return false;

    const apiUrl = getApiUrl();
    const url = apiUrl ? `${apiUrl}/api/v1/auth/refresh` : "/api/v1/auth/refresh";

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) return false;

    const data = await res.json();
    if (!data.access_token) return false;

    localStorage.setItem("access_token", data.access_token);
    if (data.refresh_token) {
      localStorage.setItem("refresh_token", data.refresh_token);
    }
    const expiresAt = Date.now() + 25 * 60 * 1000;
    localStorage.setItem("token_expires_at", String(expiresAt));
    return true;
  } catch {
    return false;
  }
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearUser = useCallback(() => {
    setUserState(null);
    _userCache = null;
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const setUser = useCallback((u: User | null) => {
    setUserState(u);
    if (u) {
      _userCache = { data: u, timestamp: Date.now() };
    } else {
      _userCache = null;
    }
  }, []);

  const scheduleTokenRefresh = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    const expiresAt = parseInt(
      localStorage.getItem("token_expires_at") || "0",
      10
    );
    const now = Date.now();
    const delay = expiresAt - now;

    if (delay <= 0) {
      _doTokenRefresh().then((success) => {
        if (success) {
          scheduleTokenRefresh();
        } else {
          clearUser();
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          localStorage.removeItem("token_expires_at");
        }
      });
      return;
    }

    refreshTimerRef.current = setTimeout(async () => {
      const success = await _doTokenRefresh();
      if (success) {
        scheduleTokenRefresh();
      } else {
        clearUser();
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("token_expires_at");
      }
    }, delay);
  }, [clearUser]);

  const refreshUser = useCallback(async () => {
    if (
      _userCache &&
      Date.now() - _userCache.timestamp < USER_CACHE_TTL
    ) {
      setUserState(_userCache.data);
      setLoading(false);
      return;
    }

    const data = await getLoggedInUser();
    if (data) {
      _userCache = { data, timestamp: Date.now() };
      setUserState(data);
    } else {
      _userCache = null;
      setUserState(null);
    }
    setLoading(false);
    if (data) {
      scheduleTokenRefresh();
    }
  }, [scheduleTokenRefresh]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const token = localStorage.getItem("access_token");
    if (!token) {
      setLoading(false);
      return;
    }

    const expiresAt = parseInt(
      localStorage.getItem("token_expires_at") || "0",
      10
    );
    if (expiresAt && Date.now() >= expiresAt) {
      _doTokenRefresh().then((success) => {
        if (success) {
          refreshUser();
        } else {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          localStorage.removeItem("token_expires_at");
          setLoading(false);
        }
      });
      return;
    }

    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  return (
    <UserContext.Provider
      value={{ user, loading, clearUser, setUser, refreshUser }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserContextType {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within a UserProvider");
  return ctx;
}