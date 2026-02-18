import * as React from 'react'
import { useLocation, useNavigate, type Location, type NavigateOptions, type To } from 'react-router-dom'
import { HAS_INITIAL_TG_PARAMS, INITIAL_TG_HASH, INITIAL_TG_SEARCH } from '@/lib/tgParams'

type LocPick = Pick<Location, 'search' | 'hash'>

/**
 * Adds Telegram params from initial URL to target route.
 * Keeps tgWebAppData / start_param / hash that Telegram passes.
 */
export function withTgParams(pathname: string, loc?: LocPick): To {
  if (!HAS_INITIAL_TG_PARAMS) return pathname

  const sourceSearch = loc?.search ?? INITIAL_TG_SEARCH
  const sourceHash = loc?.hash ?? INITIAL_TG_HASH

  const curr = new URLSearchParams(sourceSearch || '')
  const init = new URLSearchParams(INITIAL_TG_SEARCH || '')

  // Merge initial TG params into current ones (don’t override existing)
  for (const [k, v] of init.entries()) {
    if (!curr.has(k)) curr.set(k, v)
  }

  const mergedSearch = curr.toString()
  const mergedHash = (sourceHash || INITIAL_TG_HASH || '').replace(/^#/, '')

  const to: To = {
    pathname,
    search: mergedSearch ? `?${mergedSearch}` : '',
    hash: mergedHash ? `#${mergedHash}` : '',
  }

  return to
}

/**
 * React Router navigate() wrapper that keeps Telegram Mini App query/hash params
 * between in-app navigations.
 */
export function useTgNavigate() {
  const navigate = useNavigate()
  const loc = useLocation()

  return React.useCallback(
    (to: string, options?: NavigateOptions) => {
      navigate(withTgParams(to, loc), options)
    },
    [navigate, loc],
  )
}