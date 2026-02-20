import { NextRequest, NextResponse } from "next/server";

const RAW_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";
const BASE = RAW_BASE.replace(/\/+$/, "");

type Params = { tg_id: string };

/**
 * Proxy for giving an item to a player's inventory.
 *
 * Accepts POST requests with a JSON body describing the item and
 * quantity to grant. The request body and content type are forwarded
 * to the backend along with the admin token.
 */
export async function POST(request: NextRequest, ctx: { params: any }) {
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

  const targetUrl = `${BASE}/api/admin/inventory/${encodeURIComponent(
    tg_id
  )}/give`;

  const adminToken = request.headers.get("x-admin-token") || "";
  const contentType = request.headers.get("content-type") || "application/json";

  const body = await request.arrayBuffer();

  const resp = await fetch(targetUrl, {
    method: "POST",
    headers: {
      "X-Admin-Token": adminToken,
      "Content-Type": contentType,
    },
    body,
  });

  const headers = new Headers(resp.headers);
  return new NextResponse(resp.body, { status: resp.status, headers });
}
