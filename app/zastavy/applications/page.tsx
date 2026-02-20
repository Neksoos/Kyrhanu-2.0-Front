"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getJSON, postJSON } from "@/lib/api";
import { resolveTgId } from "@/lib/tg";

type ApplicationItem = {
  id: number;
  tg_id: number;
  player_name: string;
  created_at: string;
};

type ApplicationsResponse = {
  ok: boolean;
  applications: ApplicationItem[];
  error?: string;
};

type DecisionResponse = {
  ok: boolean;
  error?: string;
};

export default function ZastavyApplicationsPage() {
  const router = useRouter();

  const [apps, setApps] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tgId, setTgId] = useState<number | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);

  // завантаження заявок
  async function loadApplications(currentTgId: number) {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("tg_id", String(currentTgId));

      const data = (await getJSON(
        `/api/zastavy/applications?${params.toString()}`
      )) as ApplicationsResponse;

      if (!data.ok) {
        throw new Error(data.error || "Не вдалося завантажити заявки.");
      }

      setApps(data.applications || []);
    } catch (e: any) {
      setError(e.message || "Сталася помилка при завантаженні заявок.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const id = resolveTgId();
    if (!id) {
      setError(
        "Не вдалося визначити Telegram ID. Відкрий мініап з чату бота й спробуй ще раз."
      );
      setLoading(false);
      return;
    }
    setTgId(id);
    loadApplications(id);
  }, []);

  async function handleDecision(appId: number, decision: "approve" | "reject") {
    if (!tgId) return;
    setError(null);
    setProcessingId(appId);

    try {
      const url =
        decision === "approve"
          ? "/api/zastavy/applications/approve"
          : "/api/zastavy/applications/reject";

      const resp = (await postJSON(url, {
        tg_id: tgId,
        application_id: appId,
      })) as DecisionResponse;

      if (!resp.ok) {
        throw new Error(
          resp.error ||
            (decision === "approve"
              ? "Не вдалося прийняти заявку."
              : "Не вдалося відхилити заявку.")
        );
      }

      // прибираємо з локального списку
      setApps((prev) => prev.filter((a) => a.id !== appId));
    } catch (e: any) {
      setError(e.message || "Сталася помилка при обробці заявки.");
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col items-stretch">
      {/* Хедер */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-2">
        <button
          onClick={() => router.back()}
          className="text-sm text-slate-400 hover:text-slate-200"
        >
          ← Назад
        </button>
        <h1 className="mx-auto text-lg font-semibold">Заявки до застави</h1>
        <div className="w-10" />
      </div>

      <div className="px-4 pb-2 text-xs text-slate-400">
        Тут гетьман бачить усі заявки на вступ і може їх прийняти або
        відхилити.
      </div>

      {/* Контент */}
      <div className="flex-1 px-4 pb-4">
        {loading && (
          <div className="text-center text-sm text-slate-400 mt-6">
            Завантаження заявок...
          </div>
        )}

        {error && !loading && (
          <div className="text-center text-sm text-red-400 mt-6">{error}</div>
        )}

        {!loading && !error && apps.length === 0 && (
          <div className="text-center text-sm text-slate-400 mt-6">
            Поки що заявок немає.
          </div>
        )}

        {!loading && !error && apps.length > 0 && (
          <div className="space-y-3 mt-2">
            {apps.map((app) => (
              <div
                key={app.id}
                className="rounded-2xl bg-slate-900 border border-slate-800 px-4 py-3 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold">
                    {app.player_name || "Безіменний козак"}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    tg_id: {app.tg_id}
                  </div>
                </div>

                <div className="text-[11px] text-slate-500">
                  Подано:{" "}
                  {new Date(app.created_at).toLocaleString("uk-UA", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleDecision(app.id, "approve")}
                    disabled={processingId === app.id}
                    className="flex-1 rounded-xl bg-emerald-500/90 hover:bg-emerald-400 text-slate-950 text-sm font-medium py-2 disabled:opacity-60 disabled:hover:bg-emerald-500/90"
                  >
                    {processingId === app.id ? "Приймаємо..." : "Прийняти"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDecision(app.id, "reject")}
                    disabled={processingId === app.id}
                    className="flex-1 rounded-xl bg-rose-500/90 hover:bg-rose-400 text-slate-950 text-sm font-medium py-2 disabled:opacity-60 disabled:hover:bg-rose-500/90"
                  >
                    {processingId === app.id ? "Відхиляємо..." : "Відхилити"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}