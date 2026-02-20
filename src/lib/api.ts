import { getTgIdSync } from "@/lib/tg";

// lib/api.ts
// ===============================
// ENV
// ===============================
export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE ?? "").replace(/\/+$/, "");
export const API_DEBUG = process.env.NEXT_PUBLIC_API_DEBUG === "1";

// ===============================
// ApiError (важливо для редіректів)
// ===============================
export class ApiError extends Error {
  status: number;
  method: "GET" | "POST";
  path: string;
  detail: any;

  constructor(
    message: string,
    opts: { status: number; method: "GET" | "POST"; path: string; detail?: any }
  ) {
    super(message);
    this.name = "ApiError";
    this.status = opts.status;
    this.method = opts.method;
    this.path = opts.path;
    this.detail = opts.detail;
  }
}

// ===============================
// ADMIN PATH GUARD (✅ NEW)
// ===============================
// Адмінка має працювати БЕЗ Telegram initData.
// Тому для /admin/* ми не додаємо X-Init-Data / X-Tg-Id.
function isAdminPath(path: string): boolean {
  const p = String(path || "").trim();

  // підтримуємо як "/admin/..", так і "/api/admin/.."
  return (
    p === "/admin" ||
    p.startsWith("/admin/") ||
    p === "admin" ||
    p.startsWith("admin/") ||
    p === "/api/admin" ||
    p.startsWith("/api/admin/") ||
    p === "api/admin" ||
    p.startsWith("api/admin/")
  );
}

// ===============================
// BUILD URL
// ===============================
function buildUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;

  let norm = path.startsWith("/") ? path : `/${path}`;

  // ✅ якщо хтось випадково передав уже проксійований шлях — НЕ додаємо /api/proxy ще раз
  // (щоб не було /api/proxy/proxy/...)
  if (norm.startsWith("/api/proxy/") || norm === "/api/proxy") {
    // якщо API_BASE заданий — напряму на бек (без /api/proxy)
    return API_BASE ? `${API_BASE}${norm.replace(/^\/api\/proxy/, "")}` : norm;
  }

  // ✅ якщо десь лишився старий стиль "/proxy/api/..." — виправляємо
  // "/proxy/api/name-available" -> "/api/name-available"
  if (norm.startsWith("/proxy/")) {
    norm = norm.replace(/^\/proxy/, "");
    if (!norm.startsWith("/api/")) norm = `/api${norm}`;
  }

  // якщо вже /api/* — нічого не чіпаємо
  if (!norm.startsWith("/api/")) {
    // все що живе на бекенді під /api/*
    const backendApiRoutes = [
      "/professions",
      "/alchemy",
      "/equipment",
      "/battle",
      "/gathering",
      "/inventory",
      "/materials",
      "/profile",
      "/areas",
      "/city",
      "/perun",
      "/zastavy",
      "/quests",
      "/ratings",
      "/forum",
      "/mail",
      "/npc",
      "/registration",
      "/name-available",
      "/auth",
      "/city-entry",
    ];

    if (
      backendApiRoutes.some(
        (p) => norm === p || norm.startsWith(`${p}/`) || norm.startsWith(`${p}?`)
      )
    ) {
      norm = `/api${norm}`;
    }
  }

  // якщо API_BASE не заданий — ідемо через next proxy
  return API_BASE ? `${API_BASE}${norm}` : `/api/proxy${norm}`;
}

// ===============================
// apiFetch() (INIT DATA ONLY)
// ===============================
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const url = buildUrl(path);
  const headers = new Headers(init.headers || undefined);

  // ✅ NEW: адмінка НЕ повинна залежати від Telegram
  const skipTelegramHeaders = isAdminPath(path);

  if (!skipTelegramHeaders && typeof window !== "undefined") {
    try {
      const wa = (window as any).Telegram?.WebApp;

      // 1) Telegram initData -> X-Init-Data
      const rawInit = wa?.initData;
      if (rawInit) {
        let hasInitHeader = false;
        headers.forEach((_v, k) => {
          if (k.toLowerCase() === "x-init-data") hasInitHeader = true;
        });
        if (!hasInitHeader) headers.set("X-Init-Data", rawInit as string);
      }

      // 2) Telegram user id -> X-Tg-Id
      const tgId = wa?.initDataUnsafe?.user?.id;
      if (tgId) {
        let hasTgHeader = false;
        headers.forEach((_v, k) => {
          if (k.toLowerCase() === "x-tg-id") hasTgHeader = true;
        });
        if (!hasTgHeader) headers.set("X-Tg-Id", String(tgId));
      }

      // 3) Фолбек: якщо не в Telegram-контексті, пробуємо зчитати tg_id
      // (DEV env NEXT_PUBLIC_DEV_TG_ID, hash/initData parser тощо).
      let hasTgHeader = false;
      headers.forEach((_v, k) => {
        if (k.toLowerCase() === "x-tg-id") hasTgHeader = true;
      });
      if (!hasTgHeader) {
        const fallbackTgId = getTgIdSync();
        if (fallbackTgId) headers.set("X-Tg-Id", String(fallbackTgId));
      }
    } catch {}
  }

  return await fetch(url, {
    cache: "no-store",
    ...init,
    headers,
  });
}

// ===============================
// Helpers: parse error payload
// ===============================
function formatFastapi422(detail: any): string | null {
  if (!Array.isArray(detail)) return null;

  const parts: string[] = [];
  for (const it of detail) {
    if (!it || typeof it !== "object") continue;
    const loc = Array.isArray(it.loc) ? it.loc.join(".") : "";
    const msg = typeof it.msg === "string" ? it.msg : "";
    if (loc && msg) parts.push(`${loc}: ${msg}`);
    else if (msg) parts.push(msg);
  }

  if (!parts.length) return "Validation error";
  return parts.slice(0, 3).join(" · ");
}

async function readErrorPayload(r: Response): Promise<{ text: string; json: any | null }> {
  const text = await r.text().catch(() => "");
  if (!text) return { text: "", json: null };

  try {
    return { text, json: JSON.parse(text) };
  } catch {
    return { text, json: null };
  }
}

function pickMessage(method: "GET" | "POST", path: string, r: Response, data: any, raw: string) {
  // найчастіші формати
  if (data && typeof data === "object") {
    if (typeof data.error === "string" && data.error.trim()) return data.error.trim();
    if (typeof data.message === "string" && data.message.trim()) return data.message.trim();

    // FastAPI: {"detail": "..."} або {"detail": {...}} або {"detail":[...422]}
    if (typeof data.detail === "string" && data.detail.trim()) return data.detail.trim();

    const vmsg = formatFastapi422(data.detail);
    if (vmsg) return vmsg;

    if (data.detail && typeof data.detail === "object") {
      if (typeof data.detail.error === "string" && data.detail.error.trim())
        return data.detail.error.trim();
      if (typeof data.detail.message === "string" && data.detail.message.trim())
        return data.detail.message.trim();

      // якщо є detail.code — теж корисно
      if (typeof data.detail.code === "string" && data.detail.code.trim())
        return data.detail.code.trim();
    }
  }

  // fallback
  return `${method} ${path} -> ${r.status} ${r.statusText}${raw ? ` — ${raw}` : ""}`;
}

// ===============================
// GET JSON
// ===============================
export async function getJSON<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const r = await apiFetch(path, { ...init, method: "GET" });

  if (!r.ok) {
    const { text, json } = await readErrorPayload(r);
    const msg = pickMessage("GET", path, r, json, text);

    // важливо: зберігаємо detail для логіки (409 NEED_REGISTER)
    const detail = (json as any)?.detail ?? json ?? null;
    throw new ApiError(msg, { status: r.status, method: "GET", path, detail });
  }

  return (await r.json()) as T;
}

// ===============================
// POST JSON
// ===============================
export async function postJSON<T = unknown>(
  path: string,
  body: any,
  init: RequestInit = {}
): Promise<T> {
  const r = await apiFetch(path, {
    ...init,
    method: "POST",
    body: JSON.stringify(body ?? {}),
    headers: {
      "content-type": "application/json",
      ...(init.headers || {}),
    },
  });

  if (!r.ok) {
    const { text, json } = await readErrorPayload(r);
    const msg = pickMessage("POST", path, r, json, text);

    const detail = (json as any)?.detail ?? json ?? null;
    throw new ApiError(msg, { status: r.status, method: "POST", path, detail });
  }

  return (await r.json()) as T;
}

// ===============================
// ping()
// ===============================
export async function ping(): Promise<void> {
  const r = await apiFetch("/health");
  if (!r.ok) throw new Error(`health ${r.status}`);
}

// ===============================
// endpoints
// ===============================
export const endpoints = {
  ping: "/health",
  city: "/api/city",
  areas: "/api/areas",
  cityAreas: "/api/areas",
  perun: "/api/perun",
  zastavy: "/api/zastavy",

  profile: "/api/profile",

  nameAvailable: (name: string) => `/api/name-available?name=${encodeURIComponent(name)}`,
  registration: `/api/registration`,
};

// ===============================
// SWR fetcher
// ===============================
export const fetcherJSON = (url: string) => getJSON(url);
