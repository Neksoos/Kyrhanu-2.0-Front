import { NextRequest, NextResponse } from "next/server";

const RAW_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";
const BASE = RAW_BASE.replace(/\/+$/, "");

type Params = { code: string };

function baseGuard() {
  if (!BASE) {
    return NextResponse.json(
      { ok: false, error: "NEXT_PUBLIC_API_BASE is empty" },
      { status: 500 }
    );
  }
  return null;
}

async function getParams(ctx: { params: any }): Promise<Params> {
  return (await Promise.resolve(ctx.params)) as Params;
}

export async function GET(request: NextRequest, ctx: { params: any }) {
  const guard = baseGuard();
  if (guard) return guard;

  const { code } = await getParams(ctx);
  if (!code) {
    return NextResponse.json({ ok: false, error: "Missing code" }, { status: 400 });
  }

  const targetUrl = `${BASE}/api/admin/items/${encodeURIComponent(code)}`;
  const adminToken = request.headers.get("x-admin-token") || "";

  const resp = await fetch(targetUrl, {
    method: "GET",
    headers: { "X-Admin-Token": adminToken },
  });

  const headers = new Headers(resp.headers);
  return new NextResponse(resp.body, { status: resp.status, headers });
}

export async function PUT(request: NextRequest, ctx: { params: any }) {
  const guard = baseGuard();
  if (guard) return guard;

  const { code } = await getParams(ctx);
  if (!code) {
    return NextResponse.json({ ok: false, error: "Missing code" }, { status: 400 });
  }

  const targetUrl = `${BASE}/api/admin/items/${encodeURIComponent(code)}`;
  const adminToken = request.headers.get("x-admin-token") || "";
  const contentType = request.headers.get("content-type") || "application/json";
  const body = await request.arrayBuffer();

  const resp = await fetch(targetUrl, {
    method: "PUT",
    headers: {
      "X-Admin-Token": adminToken,
      "Content-Type": contentType,
    },
    body,
  });

  const headers = new Headers(resp.headers);
  return new NextResponse(resp.body, { status: resp.status, headers });
}

export async function DELETE(request: NextRequest, ctx: { params: any }) {
  const guard = baseGuard();
  if (guard) return guard;

  const { code } = await getParams(ctx);
  if (!code) {
    return NextResponse.json({ ok: false, error: "Missing code" }, { status: 400 });
  }

  const targetUrl = `${BASE}/api/admin/items/${encodeURIComponent(code)}`;
  const adminToken = request.headers.get("x-admin-token") || "";

  const resp = await fetch(targetUrl, {
    method: "DELETE",
    headers: { "X-Admin-Token": adminToken },
  });

  const headers = new Headers(resp.headers);
  return new NextResponse(resp.body, { status: resp.status, headers });
}

export async function PATCH(request: NextRequest, ctx: { params: any }) {
  const guard = baseGuard();
  if (guard) return guard;

  const { code } = await getParams(ctx);
  if (!code) {
    return NextResponse.json({ ok: false, error: "Missing code" }, { status: 400 });
  }

  const targetUrl = `${BASE}/api/admin/items/${encodeURIComponent(code)}`;
  const adminToken = request.headers.get("x-admin-token") || "";
  const contentType = request.headers.get("content-type") || "application/json";
  const body = await request.arrayBuffer();

  const resp = await fetch(targetUrl, {
    method: "PATCH",
    headers: {
      "X-Admin-Token": adminToken,
      "Content-Type": contentType,
    },
    body,
  });

  const headers = new Headers(resp.headers);
  return new NextResponse(resp.body, { status: resp.status, headers });
}
