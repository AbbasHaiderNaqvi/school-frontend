import { type NextRequest, NextResponse } from 'next/server'

// Free geocoding via OpenStreetMap's Nominatim — no API key needed. Their usage
// policy caps unauthenticated use at ~1 req/sec and asks callers not to hammer it,
// so every unique query is cached for a day: many visitors landing on the same
// tenant's page all hit this cache instead of Nominatim directly.
export async function GET(request: NextRequest) {
  const q = new URL(request.url).searchParams.get('q')
  if (!q) return NextResponse.json({ error: 'Missing q param' }, { status: 400 })

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`,
      {
        headers: { 'User-Agent': 'Muddir-SMS/1.0 (school landing page map)' },
        next: { revalidate: 60 * 60 * 24 },
      }
    )
    if (!res.ok) return NextResponse.json({ error: 'Geocoding failed' }, { status: 502 })

    const results = await res.json()
    const first = results?.[0]
    if (!first) return NextResponse.json({ error: 'No results' }, { status: 404 })

    return NextResponse.json({ lat: parseFloat(first.lat), lon: parseFloat(first.lon) })
  } catch {
    return NextResponse.json({ error: 'Geocoding error' }, { status: 502 })
  }
}
