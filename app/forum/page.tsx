// app/forum/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  MessageCircle,
  Flame,
  Clock,
  User,
  Plus,
  Loader2,
  ChevronRight,
  FolderPlus,
  Coins,
  Gem,
} from "lucide-react";
import { getJSON, postJSON } from "@/lib/api";

type CategoryDTO = {
  id: number;
  slug: string;
  title: string;
  sort_order: number;
};

type TopicShortDTO = {
  id: number;
  category_id: number;
  title: string;
  author_tg: number;
  author_name: string;
  author_level: number;
  created_at: string;
  replies_cnt: number;
  last_post_at: string;
  is_closed: boolean;
  is_pinned: boolean;
};

type TopicsListResponse = {
  ok: boolean;
  topics: TopicShortDTO[];
  page: number;
  per_page: number;
  has_more: boolean;
};

type TopicFullDTO = {
  id: number;
  category_id: number;
  title: string;
  body: string;
  author_tg: number;
  author_name: string;
  author_level: number;
  created_at: string;
  replies_cnt: number;
  last_post_at: string;
  is_closed: boolean;
  is_pinned: boolean;
};

type OrderTab = "hot" | "new" | "mine";

type CategoryCreatePaidResponse = {
  ok: boolean;
  category: CategoryDTO;
  paid_currency: "chervontsi" | "kleynody";
  paid_amount: number;
};

export default function ForumPage() {
  const router = useRouter();

  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [topics, setTopics] = useState<TopicShortDTO[]>([]);
  const [order, setOrder] = useState<OrderTab>("hot");
  const [categoryId, setCategoryId] = useState<number | "all">("all");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // create topic modal
  const [createOpen, setCreateOpen] = useState(false);
  const [createCategoryId, setCreateCategoryId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // create category (paid) modal
  const [catOpen, setCatOpen] = useState(false);
  const [catTitle, setCatTitle] = useState("");
  const [catDescr, setCatDescr] = useState("");
  const [catCurrency, setCatCurrency] = useState<"chervontsi" | "kleynody">(
    "chervontsi"
  );
  const [catCreating, setCatCreating] = useState(false);
  const [catError, setCatError] = useState<string | null>(null);

  // ───────────────── loaders ─────────────────

  async function loadCategories() {
    try {
      const data = await getJSON<CategoryDTO[]>("/api/forum/categories");
      const list = data || [];
      setCategories(list);
      if (!createCategoryId && list.length > 0) {
        setCreateCategoryId(list[0].id);
      }
    } catch (e) {
      console.error("loadCategories failed", e);
    }
  }

  async function loadTopics(opts?: { resetPage?: boolean; targetPage?: number }) {
    const targetPage = opts?.targetPage ?? (opts?.resetPage ? 1 : page);

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set("page", String(targetPage));
      params.set("per_page", String(20));
      params.set("order", order);

      if (categoryId !== "all") {
        params.set("category_id", String(categoryId));
      }

      const resp = await getJSON<TopicsListResponse>(
        `/api/forum/topics?${params.toString()}`
      );

      if (!resp || resp.ok === false) {
        setError("Сервер повернув помилку");
        setTopics([]);
        setHasMore(false);
        return;
      }

      setTopics(resp.topics || []);
      setHasMore(!!resp.has_more);
      setPage(resp.page ?? targetPage);
    } catch (e: any) {
      setError(e?.message || "Помилка завантаження тем");
      setTopics([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadTopics({ resetPage: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, categoryId]);

  // ───────────── create new topic ───────────────

  async function handleCreateTopic(e: React.FormEvent) {
    e.preventDefault();

    if (!createCategoryId) {
      setCreateError("Оберіть розділ");
      return;
    }
    if (!title.trim() || !body.trim()) {
      setCreateError("Заповни заголовок і текст");
      return;
    }

    try {
      setCreating(true);
      setCreateError(null);

      const payload = {
        category_id: createCategoryId,
        title: title.trim(),
        body: body.trim(),
      };

      const created = await postJSON<TopicFullDTO>("/api/forum/topics", payload);

      if (!created || !created.id) {
        setCreateError("Не вдалось створити тему");
        return;
      }

      setTitle("");
      setBody("");
      setCreateOpen(false);

      router.push(`/forum/topics/${created.id}`);
    } catch (e: any) {
      setCreateError(e?.message || "Помилка створення теми");
    } finally {
      setCreating(false);
    }
  }

  // ───────────── create paid category ─────────────

  function currencyLabel(c: "chervontsi" | "kleynody") {
    return c === "chervontsi" ? "1000 червонців" : "10 клейнодів";
  }

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();

    const t = catTitle.trim();
    const d = catDescr.trim();

    if (!t) {
      setCatError("Введи назву розділу");
      return;
    }

    try {
      setCatCreating(true);
      setCatError(null);

      const payload = {
        title: t,
        description: d,
        pay_currency: catCurrency,
      };

      const resp = await postJSON<CategoryCreatePaidResponse>(
        "/api/forum/categories/create-paid",
        payload
      );

      if (!resp || !resp.category?.id) {
        setCatError("Не вдалося створити розділ");
        return;
      }

      // додамо в список
      setCategories((prev) => {
        const exists = prev.some((x) => x.id === resp.category.id);
        const next = exists ? prev : [...prev, resp.category];
        // сортуємо по sort_order (на всяк)
        return next.slice().sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      });

      // автоматично вибрати
      setCategoryId(resp.category.id);
      setCreateCategoryId(resp.category.id);

      // закрити модалку
      setCatTitle("");
      setCatDescr("");
      setCatCurrency("chervontsi");
      setCatOpen(false);
    } catch (e: any) {
      setCatError(e?.message || "Помилка створення розділу");
    } finally {
      setCatCreating(false);
    }
  }

  // ───────────────── ui helpers ─────────────────

  function currentCategoryTitle() {
    if (categoryId === "all") return "Усі розділи";
    const c = categories.find((x) => x.id === categoryId);
    return c ? c.title : "Розділ";
  }

  function formatDate(dt: string) {
    try {
      const d = new Date(dt);
      return d.toLocaleString("uk-UA", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dt;
    }
  }

  // ───────────────── render ─────────────────

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center px-4 py-6">
      <div className="w-full max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <h1 className="text-2xl font-bold tracking-wide flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-emerald-400" />
            Форум Берегинева
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            Питай, ділися стратегіями, розповідай історії та лови новини гри.
          </p>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4"
        >
          {/* Category chooser */}
          <div className="flex items-center gap-2">
            <div className="text-xs text-slate-400 hidden sm:block">Розділ:</div>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs sm:text-sm"
              onClick={() => {
                if (categoryId === "all") {
                  if (categories.length > 0) setCategoryId(categories[0].id);
                } else {
                  setCategoryId("all");
                }
              }}
            >
              <span className="truncate max-w-[140px] sm:max-w-[200px]">
                {currentCategoryTitle()}
              </span>
              <ChevronRight className="w-4 h-4 opacity-70" />
            </button>
          </div>

          {/* Order tabs */}
          <div className="inline-flex items-center rounded-full bg-slate-900/80 border border-slate-700 p-1 text-xs">
            <TabButton
              label={
                <span className="inline-flex items-center gap-1">
                  <Flame className="w-3 h-3" /> Гарячі
                </span>
              }
              active={order === "hot"}
              onClick={() => setOrder("hot")}
            />
            <TabButton
              label={
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Нові
                </span>
              }
              active={order === "new"}
              onClick={() => setOrder("new")}
            />
            <TabButton
              label="Мої"
              active={order === "mine"}
              onClick={() => setOrder("mine")}
            />
          </div>
        </motion.div>

        {/* Category pills + create category */}
        <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
          <button
            type="button"
            onClick={() => setCategoryId("all")}
            className={`px-2 py-1 rounded-full border ${
              categoryId === "all"
                ? "border-emerald-400 text-emerald-300 bg-emerald-500/10"
                : "border-slate-700 bg-slate-900/60"
            }`}
          >
            Усі
          </button>

          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryId(cat.id)}
              className={`px-2 py-1 rounded-full border ${
                categoryId === cat.id
                  ? "border-emerald-400 text-emerald-300 bg-emerald-500/10"
                  : "border-slate-700 bg-slate-900/60"
              }`}
            >
              {cat.title}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setCatOpen(true)}
            className="ml-auto inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/50 bg-emerald-500/10 text-emerald-200"
            title="Платне створення розділу (антиспам)"
          >
            <FolderPlus className="w-4 h-4" />
            Створити розділ
          </button>
        </div>

        {/* Create topic */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 text-slate-950 text-sm font-semibold py-2.5 shadow-lg shadow-emerald-700/40 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Створити нову тему
          </button>
        </div>

        {/* Topics list */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 shadow-lg divide-y divide-slate-800">
          {loading && (
            <div className="flex items-center justify-center py-10 text-sm text-slate-400">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Завантаження тем…
            </div>
          )}

          {error && !loading && (
            <div className="py-6 px-4 text-sm text-red-400">{error}</div>
          )}

          {!loading && !error && topics.length === 0 && (
            <div className="py-6 px-4 text-sm text-slate-400">
              Тут поки тихо. Стань першим, хто створить тему у цьому розділі.
            </div>
          )}

          {!loading &&
            !error &&
            topics.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => router.push(`/forum/topics/${t.id}`)}
                className="w-full text-left px-4 py-3 hover:bg-slate-800/80 transition flex flex-col gap-1"
              >
                <div className="flex items-center gap-2">
                  {t.is_pinned && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/40">
                      PIN
                    </span>
                  )}
                  {t.is_closed && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/40">
                      ЗАКРИТА
                    </span>
                  )}
                  <span className="font-semibold text-sm line-clamp-2">
                    {t.title}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-0.5">
                  <div className="inline-flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span>{t.author_name}</span>
                    <span className="opacity-70">·</span>
                    <span>lvl {t.author_level}</span>
                  </div>
                  <div className="inline-flex items-center gap-2">
                    <span className="inline-flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" />
                      {t.replies_cnt}
                    </span>
                    <span className="opacity-70">{formatDate(t.last_post_at)}</span>
                  </div>
                </div>
              </button>
            ))}
        </div>

        {/* Pagination */}
        {!loading && !error && topics.length > 0 && (
          <div className="flex items-center justify-between mt-4 text-xs text-slate-400">
            <button
              type="button"
              onClick={() => {
                const p = Math.max(1, page - 1);
                setPage(p);
                loadTopics({ targetPage: p });
              }}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-full border border-slate-700 disabled:opacity-40 disabled:cursor-default bg-slate-900/80"
            >
              Попередня
            </button>

            <div>
              Сторінка <span className="font-semibold">{page}</span>
            </div>

            <button
              type="button"
              onClick={() => {
                if (!hasMore) return;
                const p = page + 1;
                setPage(p);
                loadTopics({ targetPage: p });
              }}
              disabled={!hasMore}
              className="px-3 py-1.5 rounded-full border border-slate-700 disabled:opacity-40 disabled:cursor-default bg-slate-900/80"
            >
              Наступна
            </button>
          </div>
        )}
      </div>

      {/* Create topic modal */}
      {createOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-950 border border-slate-700 shadow-2xl p-4 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-semibold">Нова тема</h2>
              <button
                type="button"
                onClick={() => {
                  if (!creating) setCreateOpen(false);
                }}
                className="text-xs text-slate-400"
              >
                Закрити
              </button>
            </div>

            <form className="space-y-3" onSubmit={handleCreateTopic}>
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Розділ форуму</label>
                <select
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
                  value={createCategoryId ?? ""}
                  onChange={(e) =>
                    setCreateCategoryId(
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Заголовок</label>
                <input
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={150}
                  placeholder="Коротко опиши суть теми…"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Текст повідомлення</label>
                <textarea
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm min-h-[120px]"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  maxLength={4000}
                  placeholder="Розпиши питання, гайда чи історію…"
                />
              </div>

              {createError && (
                <div className="text-[11px] text-rose-400">{createError}</div>
              )}

              <button
                type="submit"
                disabled={creating}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 text-slate-950 text-sm font-semibold py-2.5 active:scale-95 disabled:opacity-60"
              >
                {creating && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                Створити тему
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Create category (paid) modal */}
      {catOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-950 border border-slate-700 shadow-2xl p-4 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-semibold">Створити розділ (антиспам)</h2>
              <button
                type="button"
                onClick={() => {
                  if (!catCreating) setCatOpen(false);
                }}
                className="text-xs text-slate-400"
              >
                Закрити
              </button>
            </div>

            <div className="text-[11px] text-slate-400">
              Створення розділу платне:{" "}
              <span className="text-slate-200 font-semibold">
                {currencyLabel(catCurrency)}
              </span>
            </div>

            <form className="space-y-3" onSubmit={handleCreateCategory}>
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Назва розділу</label>
                <input
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
                  value={catTitle}
                  onChange={(e) => setCatTitle(e.target.value)}
                  maxLength={60}
                  placeholder="Напр. Торгівля / Питання новачків / Гільдії…"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Опис (необовʼязково)</label>
                <textarea
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm min-h-[90px]"
                  value={catDescr}
                  onChange={(e) => setCatDescr(e.target.value)}
                  maxLength={400}
                  placeholder="Коротко: для чого цей розділ, які теми тут доречні…"
                />
              </div>

              <div className="space-y-2">
                <div className="text-[11px] text-slate-400">Оплата</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCatCurrency("chervontsi")}
                    className={`rounded-xl border px-3 py-2 text-xs flex items-center justify-center gap-2 ${
                      catCurrency === "chervontsi"
                        ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                        : "border-slate-700 bg-slate-900/60 text-slate-200"
                    }`}
                  >
                    <Coins className="w-4 h-4" />
                    1000 червонців
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatCurrency("kleynody")}
                    className={`rounded-xl border px-3 py-2 text-xs flex items-center justify-center gap-2 ${
                      catCurrency === "kleynody"
                        ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                        : "border-slate-700 bg-slate-900/60 text-slate-200"
                    }`}
                  >
                    <Gem className="w-4 h-4" />
                    10 клейнодів
                  </button>
                </div>
              </div>

              {catError && <div className="text-[11px] text-rose-400">{catError}</div>}

              <button
                type="submit"
                disabled={catCreating}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 text-slate-950 text-sm font-semibold py-2.5 active:scale-95 disabled:opacity-60"
              >
                {catCreating && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                Створити розділ
              </button>

              <div className="text-[10px] text-slate-500">
                Якщо сервер відповість SLUG_TAKEN — значить схожий розділ вже існує.
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({
  label,
  active,
  onClick,
}: {
  label: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-[11px] sm:text-xs transition ${
        active ? "bg-emerald-500 text-slate-950 font-semibold" : "text-slate-300"
      }`}
    >
      {label}
    </button>
  );
}