"use client";

import { useEffect, useState } from "react";
import { NavBar } from "@/components/NavBar";
import { PixelCard } from "@/components/PixelCard";
import { PixelButton } from "@/components/PixelButton";
import { LoadingRune } from "@/components/LoadingRune";
import { api } from "@/lib/api";
import { Toast } from "@/components/Toast";

export default function ShopPage() {
  const [offers, setOffers] = useState<any[] | null>(null);
  const [toast, setToast] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        await api.me();
        const r = await api.shopOffers();
        setOffers(r.offers);
      } catch {
        window.location.href = "/login";
      }
    })();
  }, []);

  if (!offers) return <div className="p-6 max-w-5xl mx-auto"><LoadingRune /></div>;

  return (
    <div className="min-h-screen p-4 space-y-4 max-w-5xl mx-auto">
      <NavBar />
      <PixelCard title="Крамниця (готовність під Telegram Stars)">
        <div className="grid md:grid-cols-2 gap-3">
          {offers.map((o) => (
            <div key={o.id} className="pixel-border bg-black/30 p-3">
              <div className="font-black">{o.title}</div>
              <div className="text-xs text-[var(--muted)] mt-1">{o.description}</div>
              <div className="text-sm mt-2">
                Ціна: <span className="font-bold">{o.price?.amount}</span> {o.price?.currency}
              </div>
              <div className="mt-3">
                <PixelButton
                  onClick={async () => {
                    const r = await api.shopPurchase(o.id, "test");
                    setToast({ kind: "info", msg: `Purchase pending: ${r.purchase.id}` });
                  }}
                >
                  Купити (test)
                </PixelButton>
              </div>
            </div>
          ))}
        </div>
      </PixelCard>

      {toast ? <Toast kind={toast.kind} message={toast.msg} onDone={() => setToast(null)} /> : null}
    </div>
  );
}