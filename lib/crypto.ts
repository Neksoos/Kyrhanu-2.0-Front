/**
 * HMAC signing for anti-cheat.
 */
import CryptoJS from 'crypto-js'

export function signAction(
  userId: number,
  sequence: number,
  timestamp: number,
  nonce: string,
  key: string
): string {
  const message = `${userId}:${sequence}:${timestamp}:${nonce}`
  return CryptoJS.HmacSHA256(message, key).toString().substring(0, 32)
}

export function generateNonce(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}