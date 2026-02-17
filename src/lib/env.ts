function normalizeBaseUrl(v?: string): string {
  if (!v) return "";
  return v.replace(/\/$/, "");
}

export const env = {
  apiBaseUrl: normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL),
} as const;