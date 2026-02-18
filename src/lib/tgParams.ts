const TG_PARAM_RE = /tgWebAppData=|tgWebAppStartParam=/

export const INITIAL_URL_SEARCH = typeof window !== 'undefined' ? window.location.search : ''
export const INITIAL_URL_HASH = typeof window !== 'undefined' ? window.location.hash : ''

export const INITIAL_TG_SEARCH = TG_PARAM_RE.test(INITIAL_URL_SEARCH) ? INITIAL_URL_SEARCH : ''
export const INITIAL_TG_HASH = TG_PARAM_RE.test(INITIAL_URL_HASH) ? INITIAL_URL_HASH : ''

export const HAS_INITIAL_TG_PARAMS = Boolean(INITIAL_TG_SEARCH || INITIAL_TG_HASH)