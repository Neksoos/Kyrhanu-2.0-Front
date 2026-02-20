// app/api/proxy/[...path]/route.ts
import { NextRequest, NextResponse } from "next/server";

const RAW_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";
const BASE = RAW_BASE.replace(/\/+$/, "");

function normalizePath(pathname: string): string {
  /**
   * Приклади:
   *  /api/proxy/api/profile        -> /api/profile
   *  /api/proxy/chat/tavern/send   -> /chat/tavern/send
   */
  const withoutProxy = pathname.replace(/^\/api\/proxy/, "");
  return withoutProxy === "" ? "/" : withoutProxy;
}

function buildTargetUrl(req: NextRequest): string {
  if (!BASE) {
    throw new Error("NEXT_PUBLIC_API_BASE is empty");
  }

  const url = new URL(req.url);
  const path = normalizePath(url.pathname);

  const target = new URL(BASE + path);
  target.search = url.search;

  return target.toString();
}

function copyRequestHeaders(req: NextRequest): Headers {
  const headers = new Headers();

  req.headers.forEach((value, key) => {
    headers.set(key, value);
  });

  // hop-by-hop headers
  headers.delete("host");
  headers.delete("connection");
  headers.delete("accept-encoding");

  // гарантовано прокидаємо Telegram initData
  const initData = req.headers.get("x-init-data");
  if (initData) headers.set("x-init-data", initData);

  const tgId = req.headers.get("x-tg-id");
  if (tgId) headers.set("x-tg-id", tgId);

  return headers;
}

async function forward(req: NextRequest) {
  let targetUrl: string;

  try {
    targetUrl = buildTargetUrl(req);
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Proxy config error" },
      { status: 500 }
    );
  }

  const headers = copyRequestHeaders(req);

  const init: RequestInit = {
    method: req.method,
    headers,
    body:
      req.method === "GET" ||
      req.method === "HEAD" ||
      req.method === "OPTIONS"
        ? undefined
        : await req.arrayBuffer(),
    redirect: "manual",
  };

  const resp = await fetch(targetUrl, init);

  const outHeaders = new Headers(resp.headers);
  outHeaders.delete("transfer-encoding");

  const buf = await resp.arrayBuffer();

  return new NextResponse(buf, {
    status: resp.status,
    statusText: resp.statusText,
    headers: outHeaders,
  });
}

export async function GET(req: NextRequest) {
  return forward(req);
}
export async function POST(req: NextRequest) {
  return forward(req);
}
export async function PUT(req: NextRequest) {
  return forward(req);
}
export async function PATCH(req: NextRequest) {
  return forward(req);
}
export async function DELETE(req: NextRequest) {
  return forward(req);
}
export async function OPTIONS(req: NextRequest) {
  return forward(req);
}