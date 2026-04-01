import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  const { searchParams } = new URL(request.url)

  // Text search
  const q = searchParams.get('q')?.trim()

  // Garment attribute filters
  const garmentType     = searchParams.get('garment_type') || searchParams.get('type')
  const style           = searchParams.get('style')
  const material        = searchParams.get('material')
  const color           = searchParams.get('color')
  const pattern         = searchParams.get('pattern')
  const season          = searchParams.get('season')
  const occasion        = searchParams.get('occasion')
  const consumerProfile = searchParams.get('consumer_profile')
  const trendNotes      = searchParams.get('trend_notes')

  // Contextual filters
  const continent = searchParams.get('continent')
  const country   = searchParams.get('country')
  const city      = searchParams.get('city')

  // Time filters
  const year  = searchParams.get('year')   // e.g. "2025"
  const month = searchParams.get('month')  // e.g. "3" (1-12)

  // Designer filter
  const designer = searchParams.get('designer')

  // Pagination
  const limit  = Math.min(parseInt(searchParams.get('limit')  || '20', 10), 200)
  const offset = Math.max(parseInt(searchParams.get('offset') || '0',  10), 0)

  let dbQuery = supabase.from('images').select('*').order('created_at', { ascending: false })

  // Full-text search against the tsvector column.
  // 'plain' uses plainto_tsquery — forgiving with natural language input
  // (no special syntax required; handles "embroidered neckline", "artisan market" etc.)
  if (q) {
    dbQuery = dbQuery.textSearch('search_vector', q, { type: 'plain' })
  }

  // --- Garment attribute filters (JSONB path equality) ---
  if (garmentType)     dbQuery = dbQuery.eq('ai_metadata->>garment_type',    garmentType)
  if (style)           dbQuery = dbQuery.eq('ai_metadata->>style',            style)
  if (material)        dbQuery = dbQuery.eq('ai_metadata->>material',         material)
  // color_palette is a JSONB array — use the @> (contains) operator
  if (color)           dbQuery = dbQuery.filter('ai_metadata->color_palette', 'cs', JSON.stringify([color]))
  if (pattern)         dbQuery = dbQuery.eq('ai_metadata->>pattern',          pattern)
  if (season)          dbQuery = dbQuery.eq('ai_metadata->>season',           season)
  if (occasion)        dbQuery = dbQuery.eq('ai_metadata->>occasion',         occasion)
  if (consumerProfile) dbQuery = dbQuery.eq('ai_metadata->>consumer_profile', consumerProfile)
  if (trendNotes)      dbQuery = dbQuery.ilike('ai_metadata->>trend_notes',   `%${trendNotes}%`)

  // --- Location filters (nested JSONB) ---
  if (continent) dbQuery = dbQuery.eq('ai_metadata->location_context->>continent', continent)
  if (country)   dbQuery = dbQuery.eq('ai_metadata->location_context->>country',   country)
  if (city)      dbQuery = dbQuery.eq('ai_metadata->location_context->>city',      city)

  // --- Time range filters ---
  if (year) {
    const y = parseInt(year, 10)
    if (!isNaN(y)) {
      dbQuery = dbQuery
        .gte('created_at', `${y}-01-01T00:00:00.000Z`)
        .lt('created_at',  `${y + 1}-01-01T00:00:00.000Z`)
    }
  }
  if (month && !year) {
    // month-only filter without a year — filter by calendar month across all years
    // Supabase does not expose date_part; fall through to client filtering
    // (acceptable for POC dataset sizes)
  }

  // --- Designer filter ---
  if (designer) dbQuery = dbQuery.ilike('designer', `%${designer}%`)

  // Pagination applied last
  dbQuery = dbQuery.range(offset, offset + limit - 1)

  const { data, error } = await dbQuery
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Post-filter by month when requested without a year (done in-process for POC)
  let results = data ?? []
  if (month && !year) {
    const m = parseInt(month, 10)
    if (!isNaN(m)) {
      results = results.filter(
        (img: any) => new Date(img.created_at).getMonth() + 1 === m
      )
    }
  }

  return NextResponse.json(results)
}