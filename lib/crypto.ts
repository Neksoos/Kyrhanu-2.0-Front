/**
 * Client helpers for anti-cheat.
 *
 * Note: the server does not rely on any client-held secret.
 * We only generate a per-action nonce to make replay harder.
 */

export function generateNonce(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}
