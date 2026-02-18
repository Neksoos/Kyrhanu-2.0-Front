import type { Location, To } from 'react-router-dom'
import { HAS_INITIAL_TG_PARAMS, INITIAL_TG_HASH, INITIAL_TG_SEARCH } from '@/lib/tgParams'

type LocPick = Pick<Location, 'search' | 'hash'>

export function withTgParams(pathname: string, loc?: LocPick): To {
  if (!HAS_INITIAL_TG_PARAMS) return pathname

  const search = loc?.search || INITIAL_TG_SEARCH || ''
  const hash = loc?.hash || INITIAL_TG_HASH || ''

  const to: { pathname: string; search?: string; hash?: string } = { pathname }
  if (search) to.search = search
  if (hash) to.hash = hash

  return to
}