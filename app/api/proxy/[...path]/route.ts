// app/api/proxy/[...path]/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
]);

function getBackendBaseUrl() {
  const raw =
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.API_URL ||
    "";

  const base = raw.trim().replace(/\/+$/, "");
  if (!base) throw new Error("BACKEND_URL is not set");
  return base;
}

function buildTargetUrl(req: NextRequest, pathParts: string[]) {
  const base = getBackendBaseUrl();
  const path = "/" + pathParts.map(encodeURIComponent).join("/");
  const url = new URL(base + path);
  req.nextUrl.searchParams.forEach((v, k) => url.searchParams.append(k, v));
  return url;
}

async function proxy(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;

  let targetUrl: URL;
  try {
    targetUrl = buildTargetUrl(req, path || []);
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Proxy config error" },
      { status: 500 }
    );
  }

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (!HOP_BY_HOP_HEADERS.has(k)) headers.set(key, value);
  });

  headers.delete("host");

  // ✅ КРИТИЧНО ДЛЯ TELEGRAM WEBVIEW:
  // Просимо backend/edge НЕ gzip'ити відповідь
  headers.set("accept-encoding", "identity");

  const method = req.method.toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD";

  let body: ArrayBuffer | undefined = undefined;
  if (hasBody) body = await req.arrayBuffer();

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, {
      method,
      headers,
      body,
      redirect: "manual",
      cache: "no-store",
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to reach backend",
        detail: e?.message || String(e),
        target: targetUrl.toString(),
      },
      { status: 502 }
    );
  }

  const resHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (!HOP_BY_HOP_HEADERS.has(k)) resHeaders.set(key, value);
  });

  // ✅ Якщо раптом upstream все одно дав content-encoding — прибираємо,
  // бо ми віддаємо raw bytes і WebView може “розпакувати” ще раз і впасти.
  resHeaders.delete("content-encoding");
  resHeaders.delete("content-length");

  resHeaders.set("cache-control", "no-store");

  const buf = await upstream.arrayBuffer();
  return new NextResponse(buf, {
    status: upstream.status,
    headers: resHeaders,
  });
}

export async function GET(req: NextRequest, ctx: any) {
  return proxy(req, ctx);
}
export async function POST(req: NextRequest, ctx: any) {
  return proxy(req, ctx);
}
export async function PUT(req: NextRequest, ctx: any) {
  return proxy(req, ctx);
}
export async function PATCH(req: NextRequest, ctx: any) {
  return proxy(req, ctx);
}
export async function DELETE(req: NextRequest, ctx: any) {
  return proxy(req, ctx);
}
export async function OPTIONS(req: NextRequest, ctx: any) {
  return proxy(req, ctx);
}
