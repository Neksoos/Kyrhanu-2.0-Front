import { NextRequest, NextResponse } from "next/server";

const RAW_BASE = process.env.NEXT_PUBLIC_API_BASE || "";
const BASE = RAW_BASE.replace(/\/+$/, "");

export async function GET(req: NextRequest) {
  if (!BASE) {
    return NextResponse.json(
      { ok: false, error: "NEXT_PUBLIC_API_BASE is empty on server" },
      { status: 500 }
    );
  }

  // "/api/admin/players/12345" → ["", "api", "admin", "players", "12345"]
  const parts = req.nextUrl.pathname.split("/");
  const tgId = parts[parts.length - 1];

  const backendUrl = `${BASE}/api/admin/players/${tgId}${req.nextUrl.search}`;

  const headers = new Headers();
  const adminToken = req.headers.get("x-admin-token");
  if (adminToken) headers.set("X-Admin-Token", adminToken);

  const resp = await fetch(backendUrl, { method: "GET", headers });
  const buf = await resp.arrayBuffer();

  return new NextResponse(buf, {
    status: resp.status,
    headers: {
      "Content-Type": resp.headers.get("content-type") || "application/json",
    },
  });
}