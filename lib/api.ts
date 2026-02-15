const API_BASE = process.env.NEXT_PUBLIC_API_BASE!;

export type AuthState = {
  accessToken: string | null;
};

export const authState: AuthState = {
  accessToken: null
};

export function setAccessToken(t: string | null) {
  authState.accessToken = t;
  if (typeof window !== "undefined") {
    if (t) localStorage.setItem("pk_access", t);
    else localStorage.removeItem("pk_access");
  }
}

export function loadAccessTokenFromStorage() {
  if (typeof window === "undefined") return null;
  const t = localStorage.getItem("pk_access");
  authState.accessToken = t;
  return t;
}

async function apiFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");

  if (authState.accessToken) headers.set("Authorization", `Bearer ${authState.accessToken}`);

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: "include"
  });

  if (res.status === 401) {
    // try refresh once
    const rr = await fetch(`${API_BASE}/auth/refresh`, { method: "POST", credentials: "include" });
    if (rr.ok) {
      const j = await rr.json();
      setAccessToken(j.accessToken);
      // retry
      const res2 = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers: new Headers({ ...Object.fromEntries(headers.entries()), Authorization: `Bearer ${j.accessToken}` }),
        credentials: "include"
      });
      if (!res2.ok) throw new Error((await safeJson(res2))?.error ?? `HTTP ${res2.status}`);
      return safeJson(res2);
    }
  }

  if (!res.ok) throw new Error((await safeJson(res))?.error ?? `HTTP ${res.status}`);
  return safeJson(res);
}

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export const api = {
  auth: {
    register: (email: string, password: string) =>
      apiFetch("/auth/register", { method: "POST", body: JSON.stringify({ email, password }) }),
    login: (email: string, password: string) =>
      apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
    telegramInitData: (initData: string) =>
      apiFetch("/auth/telegram/initdata", { method: "POST", body: JSON.stringify({ initData }) }),
    telegramWidget: (payload: any) =>
      apiFetch("/auth/telegram/widget", { method: "POST", body: JSON.stringify(payload) }),
    logout: () => apiFetch("/auth/logout", { method: "POST" })
  },
  me: () => apiFetch("/me"),
  generateCharacter: (force?: boolean) => apiFetch("/characters/generate", { method: "POST", body: JSON.stringify({ force: !!force }) }),
  inventory: () => apiFetch("/inventory"),
  equipment: () => apiFetch("/equipment"),
  equip: (slot: string, item_instance_id: string | null) =>
    apiFetch("/equipment", { method: "POST", body: JSON.stringify({ slot, item_instance_id }) }),
  runStart: () => apiFetch("/runs/start", { method: "POST" }),
  runAct: (run_id: string, action: "ATTACK" | "DEFEND" | "FLEE") =>
    apiFetch("/runs/act", { method: "POST", body: JSON.stringify({ run_id, action }) }),
  bossesActive: () => apiFetch("/bosses/active"),
  bossesAttack: (live_boss_id: string) => apiFetch("/bosses/attack", { method: "POST", body: JSON.stringify({ live_boss_id }) }),
  guilds: () => apiFetch("/guilds"),
  guildCreate: (name: string, tag: string) => apiFetch("/guilds/create", { method: "POST", body: JSON.stringify({ name, tag }) }),
  guildJoin: (join_code: string) => apiFetch("/guilds/join", { method: "POST", body: JSON.stringify({ join_code }) }),
  guildLeave: () => apiFetch("/guilds/leave", { method: "POST" }),
  seasonActive: () => apiFetch("/seasons/active"),
  questsToday: () => apiFetch("/quests/today"),
  rewardClaim: (user_quest_id: string) => apiFetch("/rewards/claim", { method: "POST", body: JSON.stringify({ user_quest_id }) }),
  shopOffers: () => apiFetch("/shop/offers"),
  shopPurchase: (offer_id: string, provider: "telegram_stars" | "test") =>
    apiFetch("/shop/purchase", { method: "POST", body: JSON.stringify({ offer_id, provider }) })
};