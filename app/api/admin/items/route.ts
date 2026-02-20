import { NextResponse, NextRequest } from 'next/server'

// Base API URL for the backend, configured via environment variable
const RAW_BASE = process.env.NEXT_PUBLIC_API_BASE
// Remove any trailing slash to avoid duplicated slashes when constructing URLs
const BASE = RAW_BASE?.replace(/\/$/, '')

/**
 * List items or create a new item in the backend.
 *
 * This route proxies requests to the FastAPI backend. For GET requests, it
 * forwards query parameters to filter or paginate items. For POST requests,
 * it forwards the request body and content‑type header so the backend can
 * create a new item. The admin token is passed via the `X-Admin-Token` header.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.toString()
  // Build the target URL on the backend
  const targetUrl = `${BASE}/api/admin/items${query ? `?${query}` : ''}`
  const adminToken = request.headers.get('x-admin-token') || ''
  // Proxy the GET request to the backend
  const resp = await fetch(targetUrl, {
    headers: {
      'X-Admin-Token': adminToken,
    },
    // Explicitly set method to GET
    method: 'GET',
  })
  // Forward response body and headers unchanged
  const headers = new Headers(resp.headers)
  return new NextResponse(resp.body, { status: resp.status, headers })
}

export async function POST(request: NextRequest) {
  const targetUrl = `${BASE}/api/admin/items`
  const adminToken = request.headers.get('x-admin-token') || ''
  const contentType = request.headers.get('content-type') || ''
  const body = await request.arrayBuffer()
  const resp = await fetch(targetUrl, {
    method: 'POST',
    headers: {
      'X-Admin-Token': adminToken,
      'Content-Type': contentType,
    },
    body: body,
  })
  const headers = new Headers(resp.headers)
  return new NextResponse(resp.body, { status: resp.status, headers })
}
