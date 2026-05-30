import { type NextRequest, NextResponse } from 'next/server'

// Ensure no trailing slash on base URL to avoid double slashes
const BASE_URL = (process.env.API_BASE_URL || 'https://indigo-vulture-707295.hostingersite.com').replace(/\/$/, '')

async function handler(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  // Filter empty segments and join cleanly to avoid double slashes
  const endpoint = '/' + path.filter(Boolean).join('/')

  // Forward query string if any
  const { searchParams } = new URL(request.url)
  const queryString = searchParams.toString()
  const targetUrl = `${BASE_URL}${endpoint}${queryString ? `?${queryString}` : ''}`

  console.log('[v0] Proxy forwarding:', request.method, targetUrl)

  // Forward headers (auth token, content-type, etc.) — strip host/origin
  const forwardHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
  const authorization = request.headers.get('authorization')
  if (authorization) {
    forwardHeaders['Authorization'] = authorization
  }

  let body: string | undefined
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    body = await request.text()
    console.log('[v0] Proxy body:', body)
  }

  try {
    const upstream = await fetch(targetUrl, {
      method: request.method,
      headers: forwardHeaders,
      body,
      // @ts-ignore — allow self-signed certs in dev if needed
      ...(process.env.NODE_ENV !== 'production' ? {} : {}),
    })

    const responseText = await upstream.text()
    console.log('[v0] Proxy response status:', upstream.status, 'body:', responseText.slice(0, 200))

    return new NextResponse(responseText, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') || 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error: any) {
    console.error('[v0] Proxy error for', endpoint, 'cause:', error?.cause ?? error)
    return NextResponse.json(
      { 
        error: 'Upstream service unreachable', 
        details: String(error),
        cause: String(error?.cause ?? ''),
        targetUrl,
      },
      { status: 502 }
    )
  }
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
