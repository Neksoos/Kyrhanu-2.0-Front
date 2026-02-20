// app/api/admin/players/route.ts
import { NextRequest, NextResponse } from "next/server";

const RAW_BASE = process.env.NEXT_PUBLIC_API_BASE || "";
const BASE = RAW_BASE.replace(/\/+$/, "") || "http://localhost:8000";

export async function GET(req: NextRequest) {
  if (!RAW_BASE) {
    return NextResponse.json(
      { ok: false, error: "NEXT_PUBLIC_API_BASE is empty on server" },
      { status: 500 }
    );
  }

  const url = new URL(req.url);
  const search = url.search || "";

  // Правильний маршрут на FastAPI: /api/admin/players
  const targetUrl = `${BASE}/api/admin/players${search}`;

  const headers = new Headers();
  const adminToken = req.headers.get("x-admin-token");
  if (adminToken) {
    headers.set("x-admin-token", adminToken);
  }

  const resp = await fetch(targetUrl, {
    method: "GET",
    headers,
  });

  const body = await resp.arrayBuffer();
  const outHeaders = new Headers(resp.headers);
  outHeaders.delete("transfer-encoding");

  return new NextResponse(body, {
    status: resp.status,
    statusText: resp.statusText,
    headers: outHeaders,
  });
}