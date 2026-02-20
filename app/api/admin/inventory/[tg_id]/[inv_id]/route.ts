import { NextRequest, NextResponse } from "next/server";

const RAW_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";
const BASE = RAW_BASE.replace(/\/+$/, "");

type Params = { tg_id: string; inv_id: string };

/**
 * Proxy for deleting a specific item from a player's inventory.
 *
 * Accepts DELETE requests and forwards them to the backend with the
 * admin token. The backend will remove the inventory entry identified
 * by `inv_id` from the player's inventory.
 */
export async function DELETE(request: NextRequest, ctx: { params: any }) {
  if (!BASE) {
    return NextResponse.json(
      { ok: false, error: "NEXT_PUBLIC_API_BASE is empty" },
      { status: 500 }
    );
  }

  // Next може передавати params як Promise — робимо сумісно
  const params = (await Promise.resolve(ctx.params)) as Params;
  const tg_id = params?.tg_id;
  const inv_id = params?.inv_id;

  if (!tg_id || !inv_id) {
    return NextResponse.json(
      { ok: false, error: "Missing tg_id or inv_id" },
      { status: 400 }
    );
  }

  const targetUrl = `${BASE}/api/admin/inventory/${encodeURIComponent(
    tg_id
  )}/${encodeURIComponent(inv_id)}`;

  const adminToken = request.headers.get("x-admin-token") || "";

  const resp = await fetch(targetUrl, {
    method: "DELETE",
    headers: {
      "X-Admin-Token": adminToken,
    },
  });

  const headers = new Headers(resp.headers);
  return new NextResponse(resp.body, { status: resp.status, headers });
}
