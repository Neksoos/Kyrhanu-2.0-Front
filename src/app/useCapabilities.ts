import { useQuery } from '@tanstack/react-query'
import { buildCapabilities } from './capabilities'

export function useCapabilities() {
  return useQuery({
    queryKey: ['capabilities'],
    queryFn: buildCapabilities,
    staleTime: 60_000,
    retry: 1,
  })
}