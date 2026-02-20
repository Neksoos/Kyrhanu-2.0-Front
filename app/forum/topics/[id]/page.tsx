// app/forum/topics/[id]/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  Send,
  ThumbsUp,
  Lock,
  CornerUpLeft,
  X,
} from "lucide-react";
import { apiFetch, getJSON, postJSON } from "@/lib/api";

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

type PostDTO = {
  id: number;
  topic_id: number;
  author_tg: number;
  author_name: string;
  author_level: number;
  body: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;

  // ✅ reply-to (як у твоєму бекенді)
  reply_to_post_id?: number | null;
  reply_to_author_tg?: number | null;
  reply_to_author_name?: string | null;
  reply_to_body_snippet?: string | null;

  // ✅ лайки
  likes_cnt?: number;
  liked?: boolean;
};

type TopicWithPostsResponse = {
  ok: boolean;
  topic: TopicFullDTO;
  posts: PostDTO[];
  page: number;
  per_page: number;
  has_more: boolean;
};

export default function TopicPage() {
  const router = useRouter();
  const params = useParams();

  const paramId = (params as any)?.id;

  const topicId = useMemo(() => {
    const raw = paramId;
    const idStr = Array.isArray(raw) ? raw[0] : raw;
    const n = Number(idStr);
    return Number.isFinite(n) ? n : NaN;
  }, [paramId]);

  const [data, setData] = useState<TopicWithPostsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [replyBody, setReplyBody] = useState("");
  const [sending, setSending] = useState(false);

  const [likeBusyId, setLikeBusyId] = useState<number | null>(null);

  // ✅ reply composer state
  const [replyTo, setReplyTo] = useState<PostDTO | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const page = 1;

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

  function declLikes(n: number) {
    if (n === 1) return "подяка";
    if (n >= 2 && n <= 4) return "подяки";
    return "подяк";
  }

  async function loadTopic() {
    if (Number.isNaN(topicId)) {
      setLoading(false);
      setError("Неправильний ID теми.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const resp = await getJSON<TopicWithPostsResponse>(
        `/api/forum/topics/${topicId}?page=${page}&per_page=50`
      );

      if (!resp || (resp as any).ok === false || !(resp as any).topic) {
        setData(null);
        setError("Не вдалося завантажити тему (нема даних).");
        return;
      }

      const patched: TopicWithPostsResponse = {
        ...resp,
        posts: (resp.posts || []).map((p) => ({
          ...p,
          likes_cnt: Number.isFinite((p as any).likes_cnt) ? (p as any).likes_cnt : 0,
          liked: !!(p as any).liked,
          reply_to_post_id: (p as any).reply_to_post_id ?? null,
          reply_to_author_tg: (p as any).reply_to_author_tg ?? null,
          reply_to_author_name: (p as any).reply_to_author_name ?? null,
          reply_to_body_snippet: (p as any).reply_to_body_snippet ?? null,
        })),
      };

      setData(patched);
    } catch (e: any) {
      setData(null);
      setError(e?.message || "Помилка завантаження теми");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (paramId == null) return;
    loadTopic();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramId, topicId]);

  function beginReplyTo(post: PostDTO) {
    setReplyTo(post);
    // фокус у textarea
    setTimeout(() => textareaRef.current?.focus(), 50);
  }

  function cancelReplyTo() {
    setReplyTo(null);
  }

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!data || data.topic.is_closed) return;

    const text = replyBody.trim();
    if (!text) return;

    const reply_to_post_id = replyTo?.id ?? null;

    try {
      setSending(true);

      const created = await postJSON<PostDTO>(
        `/api/forum/topics/${topicId}/posts`,
        reply_to_post_id ? { body: text, reply_to_post_id } : { body: text }
      );

      if (!created || !created.id) return;

      setData((prev) =>
        prev
          ? {
              ...prev,
              topic: {
                ...prev.topic,
                replies_cnt: prev.topic.replies_cnt + 1,
                last_post_at: created.created_at,
              },
              posts: [
                ...(prev.posts || []),
                {
                  ...created,
                  likes_cnt: Number.isFinite((created as any).likes_cnt)
                    ? (created as any).likes_cnt
                    : 0,
                  liked: !!(created as any).liked,
                  reply_to_post_id: (created as any).reply_to_post_id ?? reply_to_post_id,
                  reply_to_author_tg: (created as any).reply_to_author_tg ?? replyTo?.author_tg ?? null,
                  reply_to_author_name: (created as any).reply_to_author_name ?? replyTo?.author_name ?? null,
                  reply_to_body_snippet:
                    (created as any).reply_to_body_snippet ??
                    (replyTo ? (replyTo.body || "").slice(0, 120) : null),
                },
              ],
            }
          : prev
      );

      setReplyBody("");
      setReplyTo(null);
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  }

  async function toggleLike(postId: number) {
    if (!data) return;
    if (likeBusyId === postId) return;

    const before = data;

    // optimistic
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        posts: prev.posts.map((p) => {
          if (p.id !== postId) return p;
          const liked = !!p.liked;
          const cnt = Number(p.likes_cnt ?? 0);
          return {
            ...p,
            liked: !liked,
            likes_cnt: Math.max(0, cnt + (liked ? -1 : 1)),
          };
        }),
      };
    });

    try {
      setLikeBusyId(postId);

      const r = await apiFetch(`/api/forum/posts/${postId}/like`, { method: "POST" });

      if (!r.ok) {
        setData(before);
        console.error("like failed", r.status);
        return;
      }

      try {
        const j = await r.json();
        if (j && typeof j === "object" && "likes_cnt" in j) {
          const likesCnt = Number((j as any).likes_cnt);
          const liked = !!(j as any).liked;
          if (Number.isFinite(likesCnt)) {
            setData((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                posts: prev.posts.map((p) =>
                  p.id === postId ? { ...p, likes_cnt: likesCnt, liked } : p
                ),
              };
            });
          }
        }
      } catch {
        // ok
      }
    } catch (e) {
      setData(before);
      console.error(e);
    } finally {
      setLikeBusyId(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center px-4 py-6">
      <div className="w-full max-w-2xl">
        {/* Top buttons */}
        <div className="mt-6 mb-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center justify-center gap-2 text-sm text-slate-100 px-4 py-3 rounded-2xl border border-slate-700 bg-slate-900/80 active:scale-[0.99] w-full"
          >
            <ArrowLeft className="w-4 h-4" />
            Назад
          </button>
        </div>

        {/* States */}
        {loading && (
          <div className="flex items-center justify-center py-10 text-sm text-slate-400">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Завантаження теми…
          </div>
        )}

        {!loading && error && (
          <div className="py-6 px-4 text-sm text-red-400">{error}</div>
        )}

        {!loading && !error && !data?.topic && (
          <div className="py-6 px-4 text-sm text-slate-400">
            Тему не знайдено або відповідь сервера порожня.
          </div>
        )}

        {!loading && !error && data?.topic && (
          <>
            {/* Topic */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-slate-800 bg-slate-900/80 shadow-lg p-4 mb-4"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h1 className="text-lg font-semibold leading-snug">
                  {data.topic.title}
                </h1>
                {data.topic.is_closed && (
                  <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/40">
                    <Lock className="w-3 h-3" />
                    Закрита
                  </span>
                )}
              </div>

              <div className="text-xs text-slate-400 mb-3">
                {data.topic.author_name} · lvl {data.topic.author_level} ·{" "}
                {formatDate(data.topic.created_at)}
              </div>

              <div className="text-sm whitespace-pre-wrap text-slate-100">
                {data.topic.body}
              </div>
            </motion.div>

            {/* Posts */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 shadow-lg">
              <div className="px-4 py-2 border-b border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                <span>Відповіді ({data.topic.replies_cnt})</span>
              </div>

              {(data.posts || []).length === 0 && (
                <div className="px-4 py-6 text-sm text-slate-400">
                  Поки що ніхто не відповів. Напиши перший коментар.
                </div>
              )}

              {(data.posts || []).length > 0 && (
                <div className="divide-y divide-slate-800">
                  {data.posts.map((p) => {
                    const liked = !!p.liked;
                    const likesCnt = Number(p.likes_cnt ?? 0);

                    return (
                      <div key={p.id} className="px-4 py-3 text-sm">
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-xs text-slate-300">
                            {p.author_name} · lvl {p.author_level}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {formatDate(p.created_at)}
                          </div>
                        </div>

                        {/* ✅ reply-to preview */}
                        {!!p.reply_to_post_id && (
                          <div className="mb-2 text-[11px] text-slate-300/90">
                            <div className="inline-flex items-start gap-2 px-2 py-1 rounded-xl border border-slate-700 bg-slate-950/60">
                              <CornerUpLeft className="w-3 h-3 mt-0.5 opacity-70" />
                              <div className="leading-snug">
                                <div className="text-slate-200">
                                  Відповідь до{" "}
                                  <span className="font-semibold">
                                    {p.reply_to_author_name || "гравця"}
                                  </span>
                                </div>
                                {!!p.reply_to_body_snippet && (
                                  <div className="text-slate-400">
                                    “{p.reply_to_body_snippet}”
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="text-sm text-slate-100 whitespace-pre-wrap mb-2">
                          {p.body}
                        </div>

                        <div className="flex items-end justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => beginReplyTo(p)}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl border border-slate-700 bg-slate-900/80 text-slate-200 active:scale-[0.99]"
                          >
                            <CornerUpLeft className="w-4 h-4" />
                            Відповісти
                          </button>

                          <div className="flex flex-col items-end">
                            <button
                              type="button"
                              onClick={() => toggleLike(p.id)}
                              disabled={likeBusyId === p.id}
                              className={`inline-flex items-center gap-2 px-3 py-2 rounded-2xl border bg-slate-900/80 active:scale-[0.99] disabled:opacity-50 ${
                                liked
                                  ? "border-emerald-400/70 text-emerald-200"
                                  : "border-slate-700 text-slate-200"
                              }`}
                            >
                              {likeBusyId === p.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <ThumbsUp className="w-4 h-4" />
                              )}
                              {liked ? "Подякував" : "Подякувати"}
                            </button>

                            <div className="mt-1 text-[11px] text-slate-400">
                              {likesCnt} {declLikes(likesCnt)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Reply composer */}
            <div className="mt-4">
              {data.topic.is_closed ? (
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <Lock className="w-3 h-3" />
                  Тема закрита. Нові відповіді неможливі.
                </div>
              ) : (
                <form
                  className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3 space-y-2"
                  onSubmit={handleReply}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-slate-400">Твоя відповідь</div>

                    {/* ✅ reply-to badge */}
                    {replyTo && (
                      <div className="inline-flex items-center gap-2 text-[11px] px-2 py-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-200">
                        <CornerUpLeft className="w-3 h-3" />
                        До: {replyTo.author_name}
                        <button
                          type="button"
                          onClick={cancelReplyTo}
                          className="ml-1 text-emerald-200/90 hover:text-emerald-100"
                          title="Скасувати відповідь"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  {replyTo && (
                    <div className="text-[11px] text-slate-400 px-2">
                      “{(replyTo.body || "").slice(0, 160)}
                      {(replyTo.body || "").length > 160 ? "…" : ""}”
                    </div>
                  )}

                  <textarea
                    ref={textareaRef}
                    className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm min-h-[90px]"
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    maxLength={4000}
                    placeholder="Поділись думкою, порадою чи історією…"
                  />

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={sending || !replyBody.trim()}
                      className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-emerald-500 text-slate-950 text-sm font-semibold active:scale-[0.99] disabled:opacity-60"
                    >
                      {sending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Надіслати
                    </button>
                  </div>
                </form>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}