"use client";

import { useEffect, useState } from "react";
import { NavBar } from "@/components/NavBar";
import { PixelCard } from "@/components/PixelCard";
import { PixelButton } from "@/components/PixelButton";
import { api } from "@/lib/api";
import { Toast } from "@/components/Toast";
import { LoadingRune } from "@/components/LoadingRune";

export default function GuildPage() {
  const [guild, setGuild] = useState<any>(undefined);
  const [joinCode, setJoinCode] = useState("");
  const [name, setName] = useState("Курганні");
  const [tag, setTag] = useState("KRG");
  const [toast, setToast] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        await api.me();
        const r = await api.guilds();
        setGuild(r.guild);
      } catch {
        window.location.href = "/login";
      }
    })();
  }, []);

  if (guild === undefined) return <div className="p-6 max-w-5xl mx-auto"><LoadingRune /></div>;

  return (
    <div className="min-h-screen p-4 space-y-4 max-w-5xl mx-auto">
      <NavBar />
      <PixelCard title="Гільдія">
        {guild ? (
          <div className="space-y-3">
            <div className="text-lg font-black">{guild.name} [{guild.tag}]</div>
            <div className="text-sm text-[var(--muted)]">Join code: {guild.join_code}</div>
            <PixelButton
              variant="danger"
              onClick={async () => {
                await api.guildLeave();
                setGuild(null);
                setToast({ kind: "info", msg: "Ти покинув гільдію." });
              }}
            >
              Покинути
            </PixelButton>
          </div>
        ) : (
          <div className="grid gap-3">
            <div className="grid sm:grid-cols-2 gap-2">
              <input className="pixel-border bg-black/30 p-3 outline-none" value={name} onChange={(e) => setName(e.target.value)} />
              <input className="pixel-border bg-black/30 p-3 outline-none" value={tag} onChange={(e) => setTag(e.target.value)} />
            </div>
            <PixelButton
              onClick={async () => {
                try {
                  const r = await api.guildCreate(name, tag);
                  setGuild(r.guild);
                  setToast({ kind: "info", msg: "Гільдію створено!" });
                } catch (e: any) {
                  setToast({ kind: "error", msg: e.message ?? "Create failed" });
                }
              }}
            >
              Створити гільдію
            </PixelButton>

            <div className="h-px bg-white/10 my-2" />

            <input
              className="pixel-border bg-black/30 p-3 outline-none"
              placeholder="Join code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
            />
            <PixelButton
              variant="ghost"
              onClick={async () => {
                try {
                  const r = await api.guildJoin(joinCode);
                  setGuild(r.guild);
                  setToast({ kind: "info", msg: "Ти приєднався!" });
                } catch (e: any) {
                  setToast({ kind: "error", msg: e.message ?? "Join failed" });
                }
              }}
            >
              Приєднатись
            </PixelButton>
          </div>
        )}
      </PixelCard>

      {toast ? <Toast kind={toast.kind} message={toast.msg} onDone={() => setToast(null)} /> : null}
    </div>
  );
}