"use client";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";

type AuthState = { accessToken: string | null };
const authState: AuthState = { accessToken: null };

function setAccessToken(token: string | null) {
  authState.accessToken = token;
  if (typeof window !== "undefined") {
    if (token) localStorage.setItem("pk_access", token);
    else localStorage.removeItem("pk_access");
  }
}

function loadAccessTokenFromStorage() {
  if (typeof window === "undefined") return;
  const t = localStorage.getItem("pk_access");
  authState.accessToken = t;
}

async function apiFetch(path: string, init: RequestInit = {}) {
  // Ensure token is available after page reload / redirect.
  // (In some WebViews refresh cookies can be blocked, so we rely on pk_access.)
  if (!authState.accessToken) {
    loadAccessTokenFromStorage();
  }

  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");

  if (authState.accessToken) headers.set("Authorization", `Bearer ${authState.accessToken}`);

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  // If unauthorized, try refresh once
  if (res.status === 401) {
    const r = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (r.ok) {
      const j = await r.json();
      setAccessToken(j.accessToken);
      // retry original request
      const res2 = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers: new Headers({
          ...Object.fromEntries(headers.entries()),
          Authorization: `Bearer ${j.accessToken}`,
        }),
        credentials: "include",
      });
      return res2;
    }
  }

  return res;
}

export const api = {
  auth: {
    telegramInitData: async (initData: string) => {
      const res = await apiFetch("/auth/telegram/initdata", {
        method: "POST",
        body: JSON.stringify({ initData }),
      });
      if (!res.ok) throw new Error(await res.text());
      const j = await res.json();
      setAccessToken(j.accessToken);
      return j;
    },

    login: async (email: string, password: string) => {
      const res = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error(await res.text());
      const j = await res.json();
      setAccessToken(j.accessToken);
      return j;
    },

    register: async (email: string, password: string, displayName?: string) => {
      const res = await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, displayName }),
      });
      if (!res.ok) throw new Error(await res.text());
      const j = await res.json();
      setAccessToken(j.accessToken);
      return j;
    },

    logout: async () => {
      await apiFetch("/auth/logout", { method: "POST" });
      setAccessToken(null);
    },
  },

  me: async () => {
    const res = await apiFetch("/me");
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  game: {
    status: async () => {
      const res = await apiFetch("/game/status");
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  },

  _debug: {
    setAccessToken,
    loadAccessTokenFromStorage,
    authState,
  },
};