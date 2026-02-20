import { NextResponse } from "next/server";

/**
 * Простий діагностичний маршрут без fs/path, щоб не ламався вебпаком.
 * Показує, що Next бачить із env і який очікуваний BACKEND_HOST.
 */
export async function GET() {
  const raw = process.env.NEXT_PUBLIC_API_BASE || "";
  const backendHost = raw.replace(/\/+$/, "") || null;

  const summary = {
    runtimeEnv_NOW: {
      NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE || null,
      NODE_ENV: process.env.NODE_ENV || null,
    },
    backendHost_EXPECTED: backendHost,
    note: "Легкий діагностичний ендпоінт без читання .next/*",
  };

  // нічого не скануємо — лише повертаємо summary
  return NextResponse.json({ summary, hits: [] }, { status: 200 });
}