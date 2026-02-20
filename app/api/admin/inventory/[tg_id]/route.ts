import { NextRequest, NextResponse } from "next/server";

const RAW_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";
const BASE = RAW_BASE.replace(/\/+$/, "");

type Params = { tg_id: string };

/**
 * Proxy for retrieving a player's inventory.
 *
 * Handles GET requests and forwards them to the backend with the
 * provided player telegram ID. The admin token is forwarded in
 * the `X-Admin-Token` header.
 */
export async function GET(request: NextRequest, ctx: { params: any }) {
  if (!BASE) {
    return NextResponse.json(
      { ok: false, error: "NEXT_PUBLIC_API_BASE is empty" },
      { status: 500 }
    );
  }

  // Next може передавати params як Promise — робимо сумісно
  const params = (await Promise.resolve(ctx.params)) as Params;
  const tg_id = params?.tg_id;

  if (!tg_id) {
    return NextResponse.json(
      { ok: false, error: "Missing tg_id" },
      { status: 400 }
    );
  }

  const targetUrl = `${BASE}/api/admin/inventory/${encodeURIComponent(tg_id)}`;
  const adminToken = request.headers.get("x-admin-token") || "";

  const resp = await fetch(targetUrl, {
    method: "GET",
    headers: {
      "X-Admin-Token": adminToken,
    },
  });

  const headers = new Headers(resp.headers);
  return new NextResponse(resp.body, { status: resp.status, headers });
}
