"use client";

import type { TelegramWidgetUser } from "./telegram";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;

  if (typeof window === "undefined") return;
  try {
    if (token) localStorage.setItem("access_token", token);
    else localStorage.removeItem("access_token");
  } catch {
    // ignore
  }
}

function getAccessToken(): string | null {
  if (accessToken) return accessToken;

  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem("access_token");
    if (stored) accessToken = stored;
  } catch {
    // ignore
  }

  return accessToken;
}

async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {});

  // Set JSON content type unless caller set something else.
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const token = getAccessToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const doFetch = (h: Headers) =>
    fetch(`${API_BASE}${path}`, {
      ...init,
      headers: h,
      credentials: "include"
    });

  const res = await doFetch(headers);

  // Auto-refresh on 401.
  if (res.status !== 401) return res;

  const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    credentials: "include"
  });

  if (!refreshRes.ok) return res;

  const refreshJson = await refreshRes.json().catch(() => null);
  if (refreshJson?.accessToken) setAccessToken(refreshJson.accessToken);

  const headers2 = new Headers(init.headers || {});
  if (!headers2.has("Content-Type")) headers2.set("Content-Type", "application/json");
  const token2 = getAccessToken();
  if (token2 && !headers2.has("Authorization")) {
    headers2.set("Authorization", `Bearer ${token2}`);
  }

  return doFetch(headers2);
}

async function jsonOrThrow<T = any>(res: Response): Promise<T> {
  if (res.ok) return (await res.json()) as T;
  const txt = await res.text().catch(() => "");
  throw new Error(txt || `HTTP ${res.status}`);
}

export const api = {
  auth: {
    telegramInitData: async (initData: string) => {
      const res = await apiFetch("/auth/telegram/initdata", {
        method: "POST",
        body: JSON.stringify({ initData })
      });
      const json = await jsonOrThrow<{ accessToken?: string }>(res);
      if (json.accessToken) setAccessToken(json.accessToken);
      return json;
    },

    telegramWidget: async (user: TelegramWidgetUser) => {
      const res = await apiFetch("/auth/telegram/widget", {
        method: "POST",
        body: JSON.stringify(user)
      });
      const json = await jsonOrThrow<{ accessToken?: string }>(res);
      if (json.accessToken) setAccessToken(json.accessToken);
      return json;
    },

    login: async (email: string, password: string) => {
      const res = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      const json = await jsonOrThrow<{ accessToken?: string }>(res);
      if (json.accessToken) setAccessToken(json.accessToken);
      return json;
    },

    register: async (email: string, password: string) => {
      const res = await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      const json = await jsonOrThrow<{ accessToken?: string }>(res);
      if (json.accessToken) setAccessToken(json.accessToken);
      return json;
    },

    logout: async () => {
      const res = await apiFetch("/auth/logout", { method: "POST" });
      // Clear token regardless of server result.
      setAccessToken(null);
      return jsonOrThrow(res);
    }
  },

  me: async () => {
    const res = await apiFetch("/me");
    return jsonOrThrow(res);
  },

  // Characters
  generateCharacter: async (force = false) => {
    const res = await apiFetch("/characters/generate", {
      method: "POST",
      body: JSON.stringify({ force })
    });
    return jsonOrThrow(res);
  },

  // Runs
  runStart: async () => {
    const res = await apiFetch("/runs/start", { method: "POST", body: JSON.stringify({}) });
    return jsonOrThrow(res);
  },

  runAct: async (runId: string, action: string) => {
    const res = await apiFetch("/runs/act", {
      method: "POST",
      body: JSON.stringify({ run_id: runId, action })
    });
    return jsonOrThrow(res);
  },

  // Bosses
  bossesActive: async () => {
    const res = await apiFetch("/bosses/active");
    return jsonOrThrow(res);
  },

  bossesAttack: async (liveBossId: string) => {
    const res = await apiFetch("/bosses/attack", {
      method: "POST",
      body: JSON.stringify({ live_boss_id: liveBossId })
    });
    return jsonOrThrow(res);
  },

  // Guilds
  guilds: async () => {
    const res = await apiFetch("/guilds/my");
    return jsonOrThrow(res);
  },

  guildCreate: async (name: string, tag: string) => {
    const res = await apiFetch("/guilds/create", {
      method: "POST",
      body: JSON.stringify({ name, tag })
    });
    return jsonOrThrow(res);
  },

  guildJoin: async (code: string) => {
    const res = await apiFetch("/guilds/join", {
      method: "POST",
      body: JSON.stringify({ code })
    });
    return jsonOrThrow(res);
  },

  guildLeave: async () => {
    const res = await apiFetch("/guilds/leave", { method: "POST", body: JSON.stringify({}) });
    return jsonOrThrow(res);
  },

  guildAttackBoss: async (liveGuildBossId: string) => {
    const res = await apiFetch("/guilds/attack-boss", {
      method: "POST",
      body: JSON.stringify({ live_guild_boss_id: liveGuildBossId })
    });
    return jsonOrThrow(res);
  },

  // Inventory
  inventory: async () => {
    const res = await apiFetch("/inventory");
    return jsonOrThrow(res);
  },

  // Seasons / quests / rewards
  seasonActive: async () => {
    const res = await apiFetch("/seasons/active");
    return jsonOrThrow(res);
  },

  questsToday: async () => {
    const res = await apiFetch("/quests/today", { method: "POST", body: JSON.stringify({}) });
    return jsonOrThrow(res);
  },

  rewardClaim: async (rewardId: string) => {
    const res = await apiFetch("/rewards/claim", {
      method: "POST",
      body: JSON.stringify({ reward_id: rewardId })
    });
    return jsonOrThrow(res);
  },

  // Shop
  shopOffers: async () => {
    const res = await apiFetch("/shop/offers");
    return jsonOrThrow(res);
  },

  shopPurchase: async (offerId: string) => {
    const res = await apiFetch("/shop/purchase", {
      method: "POST",
      body: JSON.stringify({ offer_id: offerId })
    });
    return jsonOrThrow(res);
  }
};