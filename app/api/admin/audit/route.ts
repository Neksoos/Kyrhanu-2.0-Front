import { NextRequest, NextResponse } from 'next/server'

const RAW_BASE = process.env.NEXT_PUBLIC_API_BASE
const BASE = RAW_BASE?.replace(/\/$/, '')

/**
 * Proxy for retrieving the audit log from the backend.
 *
 * Supports GET requests with optional query parameters to filter by
 * player, action type, actor type, or date range. The admin token
 * is forwarded to authenticate the request.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.toString()
  const targetUrl = `${BASE}/api/admin/audit${query ? `?${query}` : ''}`
  const adminToken = request.headers.get('x-admin-token') || ''
  const resp = await fetch(targetUrl, {
    method: 'GET',
    headers: {
      'X-Admin-Token': adminToken,
    },
  })
  const headers = new Headers(resp.headers)
  return new NextResponse(resp.body, { status: resp.status, headers })
}
