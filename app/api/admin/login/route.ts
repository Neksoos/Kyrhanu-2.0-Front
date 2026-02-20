// app/api/admin/login/route.ts
import { NextResponse } from "next/server";

// Базовий URL бекенда.
// Або читаємо з env, або fallback на твою прод-адресу.
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://kyrhanu-backend-production.up.railway.app";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as
      | { token?: string }
      | null;

    if (!body || !body.token) {
      return NextResponse.json(
        { ok: false, error: "NO_TOKEN" },
        { status: 400 }
      );
    }

    // Проксі на FastAPI /api/admin/login
    const backendRes = await fetch(`${API_BASE}/api/admin/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token: body.token }),
    });

    if (!backendRes.ok) {
      let errText = "INVALID_TOKEN";
      try {
        const data = (await backendRes.json()) as any;
        // FastAPI зараз робить raise HTTPException(..., detail={"error": "INVALID_TOKEN"})
        if (data && typeof data === "object") {
          errText = (data.error as string) || errText;
        }
      } catch {
        // якщо бек повернув не JSON – просто тримаємось за дефолт
      }

      return NextResponse.json(
        { ok: false, error: errText },
        { status: backendRes.status === 401 ? 401 : 400 }
      );
    }

    const data = (await backendRes.json().catch(() => ({}))) as any;

    return NextResponse.json({ ok: true, ...data }, { status: 200 });
  } catch (e) {
    console.error("Admin login proxy error:", e);
    return NextResponse.json(
      { ok: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}