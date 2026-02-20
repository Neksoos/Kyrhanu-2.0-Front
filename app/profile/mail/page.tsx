// app/mail/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { getJSON, postJSON } from "@/lib/api";

type MailListItem = {
  id: number;
  peer_name: string;
  preview: string;
  sent_at: string;
  is_read?: boolean | null;
};

type MailPageDto = {
  items: MailListItem[];
  page: number;
  pages: number;
  total: number;
};

type MailMessage = {
  id: number;
  from_name?: string | null;
  to_name?: string | null;
  body: string;
  sent_at: string;
  is_read?: boolean | null;
};

type SearchPlayer = {
  tg_id: number;
  name: string;
};

type Tab = "in" | "out";

function detectTgId(): number | null {
  if (typeof window === "undefined") return null;

  // 1) Telegram WebApp
  const w = window as any;
  const tgIdFromTelegram =
    w?.Telegram?.WebApp?.initDataUnsafe?.user?.id ??
    w?.Telegram?.WebApp?.initDataUnsafe?.user?.tg_id;

  if (tgIdFromTelegram) {
    return Number(tgIdFromTelegram);
  }

  // 2) query param ?tg_id=
  const url = new URL(window.location.href);
  const param = url.searchParams.get("tg_id");
  if (param) {
    const n = Number(param);
    if (!Number.isNaN(n) && n > 0) return n;
  }

  return null;
}

function formatDateTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MailPage() {
  const [tgId, setTgId] = useState<number | null>(null);

  const [tab, setTab] = useState<Tab>("in");
  const [page, setPage] = useState(0);
  const [pageData, setPageData] = useState<MailPageDto | null>(null);
  const [loadingList, setLoadingList] = useState(false);

  const [selectedMsg, setSelectedMsg] = useState<MailMessage | null>(null);
  const [loadingMsg, setLoadingMsg] = useState(false);

  const [composeOpen, setComposeOpen] = useState(false);
  const [recipientInput, setRecipientInput] = useState("");
  const [searchResults, setSearchResults] = useState<SearchPlayer[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<SearchPlayer | null>(null);
  const [composeBody, setComposeBody] = useState("");
  const [sending, setSending] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // ініціалізація tg_id
  useEffect(() => {
    const id = detectTgId();
    if (id) {
      setTgId(id);
    } else {
      setError("Не вдалося визначити tg_id. Запустіть мініап з Telegram.");
    }
  }, []);

  // завантаження списку листів
  useEffect(() => {
    if (!tgId) return;
    setSelectedMsg(null);
    setError(null);
    setLoadingList(true);

    const controller = new AbortController();
    const load = async () => {
      try {
        const base = tab === "in" ? "/api/mail/inbox" : "/api/mail/outbox";
        const dto = await getJSON<MailPageDto>(
          `${base}?tg_id=${tgId}&page=${page}&page_size=7`,
          { signal: controller.signal }
        );
        setPageData(dto);
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        console.error(e);
        setError("Не вдалося завантажити список листів.");
      } finally {
        setLoadingList(false);
      }
    };
    load();

    return () => controller.abort();
  }, [tgId, tab, page]);

  const canPrev = useMemo(() => (pageData ? page > 0 : false), [page, pageData]);
  const canNext = useMemo(
    () => (pageData ? page < pageData.pages - 1 : false),
    [pageData, page]
  );

  // завантаження конкретного листа
  const openMessage = async (msgId: number) => {
    if (!tgId) return;
    setLoadingMsg(true);
    setError(null);
    try {
      const dto = await getJSON<MailMessage>(
        `/api/mail/message/${msgId}?tg_id=${tgId}&box=${tab}`,
      );
      setSelectedMsg(dto);

      // оновити статус прочитаного у списку
      if (tab === "in" && pageData) {
        setPageData({
          ...pageData,
          items: pageData.items.map((it) =>
            it.id === msgId ? { ...it, is_read: true } : it
          ),
        });
      }
    } catch (e: any) {
      console.error(e);
      setError("Не вдалося завантажити лист.");
    } finally {
      setLoadingMsg(false);
    }
  };

  // видалення листа
  const deleteMessage = async () => {
    if (!tgId || !selectedMsg) return;
    try {
      const box = tab === "in" ? "inbox" : "outbox";
      const url = `/api/mail/${box}/${selectedMsg.id}?tg_id=${tgId}`;
      await fetch(url, { method: "DELETE" });

      // перезавантажуємо список
      setSelectedMsg(null);
      setLoadingList(true);
      const base = tab === "in" ? "/api/mail/inbox" : "/api/mail/outbox";
      const dto = await getJSON<MailPageDto>(
        `${base}?tg_id=${tgId}&page=${page}&page_size=7`
      );
      setPageData(dto);
    } catch (e: any) {
      console.error(e);
      setError("Не вдалося видалити лист.");
    } finally {
      setLoadingList(false);
    }
  };

  // пошук отримувачів
  useEffect(() => {
    if (!recipientInput || recipientInput.trim().length < 2) {
      setSearchResults([]);
      setSelectedRecipient(null);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const res = await getJSON<SearchPlayer[]>(
          `/api/mail/search?name=${encodeURIComponent(recipientInput.trim())}`,
          { signal: controller.signal }
        );
        setSearchResults(res);
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        console.error(e);
      }
    }, 300);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [recipientInput]);

  const onSelectRecipient = (p: SearchPlayer) => {
    setSelectedRecipient(p);
    setRecipientInput(p.name);
    setSearchResults([]);
  };

  // надсилання листа
  const onSend = async () => {
    if (!tgId) return;
    const body = (composeBody || "").trim();
    if (!body) {
      setError("Тіло листа порожнє.");
      return;
    }
    if (!recipientInput.trim() && !selectedRecipient) {
      setError("Не вказано отримувача.");
      return;
    }

    setSending(true);
    setError(null);
    try {
      const payload: any = {
        from_tg: tgId,
        body,
      };
      if (selectedRecipient) {
        payload.to_tg = selectedRecipient.tg_id;
      } else {
        payload.to_name = recipientInput.trim();
      }

      await postJSON<{ ok: boolean; id?: number }>("/api/mail/send", payload);

      // очистка форми
      setComposeBody("");
      setRecipientInput("");
      setSelectedRecipient(null);
      setSearchResults([]);
      setComposeOpen(false);

      // оновити список вихідних
      if (tab === "out" && tgId) {
        setLoadingList(true);
        const dto = await getJSON<MailPageDto>(
          `/api/mail/outbox?tg_id=${tgId}&page=0&page_size=7`
        );
        setPage(0);
        setPageData(dto);
        setLoadingList(false);
      }
    } catch (e: any) {
      console.error(e);
      const msg =
        e?.response?.status === 404
          ? "Гравця не знайдено."
          : "Не вдалося надіслати лист.";
      setError(msg);
    } finally {
      setSending(false);
    }
  };

  const currentTitle =
    tab === "in" ? "Вхідні листи" : "Вихідні листи";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col items-center px-3 py-4">
      <div className="w-full max-w-xl bg-slate-900/80 border border-slate-700 rounded-2xl shadow-lg p-3 flex flex-col gap-3">
        {/* Заголовок + таби */}
        <header className="flex items-center justify-between gap-2">
          <h1 className="text-lg font-semibold tracking-wide">
            Пошта
          </h1>
          <button
            onClick={() => setComposeOpen(true)}
            className="px-3 py-1.5 rounded-full text-sm font-medium bg-emerald-500 hover:bg-emerald-400 active:scale-95 transition"
          >
            ✉️ Новий лист
          </button>
        </header>

        <div className="flex rounded-full bg-slate-800 p-1 text-sm font-medium">
          <button
            onClick={() => {
              setTab("in");
              setPage(0);
            }}
            className={`flex-1 py-1.5 rounded-full transition ${
              tab === "in"
                ? "bg-slate-100 text-slate-900"
                : "text-slate-300"
            }`}
          >
            Вхідні
          </button>
          <button
            onClick={() => {
              setTab("out");
              setPage(0);
            }}
            className={`flex-1 py-1.5 rounded-full transition ${
              tab === "out"
                ? "bg-slate-100 text-slate-900"
                : "text-slate-300"
            }`}
          >
            Вихідні
          </button>
        </div>

        {/* Помилка */}
        {error && (
          <div className="text-xs text-red-400 bg-red-950/40 border border-red-800/60 rounded-lg px-2 py-1.5">
            {error}
          </div>
        )}

        {/* Список + деталі */}
        <div className="flex flex-col md:flex-row gap-3">
          {/* Список */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400">{currentTitle}</span>
              {pageData && (
                <span className="text-xs text-slate-500">
                  {pageData.total} всього
                </span>
              )}
            </div>

            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/60">
              {loadingList && (
                <div className="p-4 text-sm text-slate-400 text-center">
                  Завантаження…
                </div>
              )}

              {!loadingList && (!pageData || pageData.items.length === 0) && (
                <div className="p-4 text-sm text-slate-400 text-center">
                  Листів немає.
                </div>
              )}

              {!loadingList &&
                pageData &&
                pageData.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => openMessage(item.id)}
                    className={`w-full text-left px-3 py-2 border-b border-slate-800/80 last:border-b-0 hover:bg-slate-800/60 transition flex flex-col gap-0.5 ${
                      tab === "in" && item.is_read === false
                        ? "bg-slate-800/70"
                        : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-slate-100 truncate">
                        {item.peer_name}
                      </span>
                      <span className="text-[11px] text-slate-400 whitespace-nowrap">
                        {formatDateTime(item.sent_at)}
                      </span>
                    </div>
                    <div className="text-xs text-slate-300 line-clamp-2">
                      {item.preview}
                    </div>
                    {tab === "in" && item.is_read === false && (
                      <span className="mt-0.5 inline-flex items-center justify-center rounded-full bg-emerald-500/80 text-[10px] px-2 py-0.5 text-slate-950 font-semibold">
                        Новий
                      </span>
                    )}
                  </button>
                ))}
            </div>

            {/* Пагінація */}
            {pageData && pageData.pages > 1 && (
              <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                <button
                  onClick={() => canPrev && setPage((p) => Math.max(0, p - 1))}
                  disabled={!canPrev}
                  className={`px-2 py-1 rounded-lg border border-slate-700 ${
                    canPrev
                      ? "hover:bg-slate-800"
                      : "opacity-40 cursor-not-allowed"
                  }`}
                >
                  ← Назад
                </button>
                <span>
                  Сторінка {pageData.page + 1} / {pageData.pages}
                </span>
                <button
                  onClick={() =>
                    canNext && setPage((p) => (pageData ? Math.min(pageData.pages - 1, p + 1) : p))
                  }
                  disabled={!canNext}
                  className={`px-2 py-1 rounded-lg border border-slate-700 ${
                    canNext
                      ? "hover:bg-slate-800"
                      : "opacity-40 cursor-not-allowed"
                  }`}
                >
                  Вперед →
                </button>
              </div>
            )}
          </div>

          {/* Деталі листа */}
          <div className="flex-1 min-w-0 border border-slate-800 rounded-xl bg-slate-900/60 p-3 text-sm">
            {!selectedMsg && !loadingMsg && (
              <div className="h-full flex items-center justify-center text-xs text-slate-500 text-center px-2">
                Оберіть лист у списку, щоб переглянути вміст.
              </div>
            )}

            {loadingMsg && (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Завантаження листа…
              </div>
            )}

            {selectedMsg && !loadingMsg && (
              <div className="flex flex-col h-full gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-0.5">
                    <div className="text-xs text-slate-400">
                      {selectedMsg.from_name && (
                        <>
                          <span className="text-slate-500">Від: </span>
                          <span className="font-medium text-slate-100">
                            {selectedMsg.from_name}
                          </span>
                        </>
                      )}
                      {selectedMsg.to_name && (
                        <>
                          <span className="text-slate-500">Кому: </span>
                          <span className="font-medium text-slate-100">
                            {selectedMsg.to_name}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {formatDateTime(selectedMsg.sent_at)}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <button
                      onClick={() => setSelectedMsg(null)}
                      className="text-[11px] px-2 py-0.5 rounded-full border border-slate-700 hover:bg-slate-800"
                    >
                      Закрити
                    </button>
                    <button
                      onClick={deleteMessage}
                      className="text-[11px] px-2 py-0.5 rounded-full border border-red-700 text-red-300 hover:bg-red-900/40"
                    >
                      Видалити
                    </button>
                  </div>
                </div>

                <div className="mt-1 flex-1 overflow-auto bg-slate-950/40 border border-slate-800 rounded-lg p-2 whitespace-pre-wrap">
                  {selectedMsg.body}
                </div>

                <div className="flex justify-end mt-1 gap-2 text-xs">
                  {selectedMsg.from_name && (
                    <button
                      onClick={() => {
                        setComposeOpen(true);
                        setRecipientInput(selectedMsg.from_name || "");
                        setSelectedRecipient(null);
                      }}
                      className="px-2 py-1 rounded-full border border-slate-700 hover:bg-slate-800"
                    >
                      Відповісти
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setComposeOpen(true);
                      setRecipientInput("");
                      setSelectedRecipient(null);
                    }}
                    className="px-2 py-1 rounded-full border border-slate-700 hover:bg-slate-800"
                  >
                    Новий лист
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Модал створення листа */}
      {composeOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-semibold">Новий лист</h2>
              <button
                onClick={() => {
                  if (!sending) {
                    setComposeOpen(false);
                    setSearchResults([]);
                  }
                }}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-2 text-sm">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Отримувач (ім&apos;я персонажа)
                </label>
                <input
                  type="text"
                  value={recipientInput}
                  onChange={(e) => {
                    setRecipientInput(e.target.value);
                    setSelectedRecipient(null);
                  }}
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 px-2 py-1.5 text-sm outline-none focus:border-emerald-500"
                  placeholder="Наприклад, Степан"
                />
                {searchResults.length > 0 && (
                  <div className="mt-1 max-h-32 overflow-auto rounded-lg border border-slate-700 bg-slate-950 text-xs">
                    {searchResults.map((p) => (
                      <button
                        key={p.tg_id}
                        type="button"
                        onClick={() => onSelectRecipient(p)}
                        className="w-full text-left px-2 py-1 hover:bg-slate-800"
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Текст листа
                </label>
                <textarea
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  rows={5}
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 px-2 py-1.5 text-sm outline-none focus:border-emerald-500 resize-none"
                  placeholder="Напишіть свій лист…"
                />
              </div>
            </div>

            <div className="flex items-center justify-between mt-1 text-xs">
              <span className="text-slate-500">
                Макс. 2000 символів.
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (!sending) {
                      setComposeOpen(false);
                      setSearchResults([]);
                    }
                  }}
                  className="px-3 py-1 rounded-full border border-slate-700 hover:bg-slate-800"
                >
                  Скасувати
                </button>
                <button
                  onClick={onSend}
                  disabled={sending}
                  className={`px-3 py-1 rounded-full bg-emerald-500 text-slate-950 font-medium hover:bg-emerald-400 active:scale-95 transition ${
                    sending ? "opacity-60 cursor-not-allowed" : ""
                  }`}
                >
                  {sending ? "Надсилання…" : "Надіслати"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}