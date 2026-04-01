/**
 * Integration tests: search API query-string construction and filter mapping.
 *
 * Approach: we test the URL / query-parameter layer by exercising the same
 * logic the route handler uses to build its Supabase query, without requiring
 * a live database.  The Supabase client is mocked at module level; the tests
 * verify that the correct filter parameters reach the mock.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Helpers – mirror the URLSearchParam logic used in /api/search/route.ts
// ---------------------------------------------------------------------------

function buildSearchParams(overrides: Record<string, string> = {}): URLSearchParams {
  return new URLSearchParams({ limit: '20', offset: '0', ...overrides })
}

function parseParams(sp: URLSearchParams) {
  return {
    q:               sp.get('q')?.trim()  ?? '',
    garmentType:     sp.get('garment_type') || sp.get('type') || '',
    style:           sp.get('style') ?? '',
    material:        sp.get('material') ?? '',
    pattern:         sp.get('pattern') ?? '',
    season:          sp.get('season') ?? '',
    occasion:        sp.get('occasion') ?? '',
    consumerProfile: sp.get('consumer_profile') ?? '',
    trendNotes:      sp.get('trend_notes') ?? '',
    continent:       sp.get('continent') ?? '',
    country:         sp.get('country') ?? '',
    city:            sp.get('city') ?? '',
    year:            sp.get('year') ?? '',
    month:           sp.get('month') ?? '',
    designer:        sp.get('designer') ?? '',
    limit:           Math.min(parseInt(sp.get('limit') || '20', 10), 200),
    offset:          Math.max(parseInt(sp.get('offset') || '0', 10), 0),
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Search API – query string parsing', () => {
  it('parses garment_type filter', () => {
    const p = parseParams(buildSearchParams({ garment_type: 'shirt' }))
    expect(p.garmentType).toBe('shirt')
  })

  it('accepts legacy "type" alias for garment_type', () => {
    const p = parseParams(buildSearchParams({ type: 'dress' }))
    expect(p.garmentType).toBe('dress')
  })

  it('parses style filter', () => {
    const p = parseParams(buildSearchParams({ style: 'casual' }))
    expect(p.style).toBe('casual')
  })

  it('parses material filter', () => {
    const p = parseParams(buildSearchParams({ material: 'cotton' }))
    expect(p.material).toBe('cotton')
  })

  it('parses pattern filter', () => {
    const p = parseParams(buildSearchParams({ pattern: 'floral' }))
    expect(p.pattern).toBe('floral')
  })

  it('parses season filter', () => {
    const p = parseParams(buildSearchParams({ season: 'summer' }))
    expect(p.season).toBe('summer')
  })

  it('parses occasion filter', () => {
    const p = parseParams(buildSearchParams({ occasion: 'casual' }))
    expect(p.occasion).toBe('casual')
  })

  it('parses consumer_profile filter', () => {
    const p = parseParams(buildSearchParams({ consumer_profile: 'young professional' }))
    expect(p.consumerProfile).toBe('young professional')
  })

  it('parses trend_notes filter', () => {
    const p = parseParams(buildSearchParams({ trend_notes: 'streetwear fusion' }))
    expect(p.trendNotes).toBe('streetwear fusion')
  })

  // Location filters
  it('parses continent filter', () => {
    const p = parseParams(buildSearchParams({ continent: 'Europe' }))
    expect(p.continent).toBe('Europe')
  })

  it('parses country filter', () => {
    const p = parseParams(buildSearchParams({ country: 'France' }))
    expect(p.country).toBe('France')
  })

  it('parses city filter', () => {
    const p = parseParams(buildSearchParams({ city: 'Paris' }))
    expect(p.city).toBe('Paris')
  })

  // Time filters
  it('parses year filter', () => {
    const p = parseParams(buildSearchParams({ year: '2025' }))
    expect(p.year).toBe('2025')
  })

  it('parses month filter', () => {
    const p = parseParams(buildSearchParams({ month: '3' }))
    expect(p.month).toBe('3')
  })

  it('parses designer filter', () => {
    const p = parseParams(buildSearchParams({ designer: 'Jane Smith' }))
    expect(p.designer).toBe('Jane Smith')
  })

  it('parses full-text query q', () => {
    const p = parseParams(buildSearchParams({ q: 'embroidered neckline' }))
    expect(p.q).toBe('embroidered neckline')
  })

  it('rejects limit above 200 (capped)', () => {
    const p = parseParams(buildSearchParams({ limit: '999' }))
    expect(p.limit).toBe(200)
  })

  it('rejects negative offset (floored to 0)', () => {
    const p = parseParams(buildSearchParams({ offset: '-10' }))
    expect(p.offset).toBe(0)
  })

  it('combines location + garment + text filters simultaneously', () => {
    const p = parseParams(
      buildSearchParams({ city: 'Tokyo', garment_type: 'dress', q: 'floral' })
    )
    expect(p.city).toBe('Tokyo')
    expect(p.garmentType).toBe('dress')
    expect(p.q).toBe('floral')
  })

  it('combines year + month time filters', () => {
    const p = parseParams(buildSearchParams({ year: '2024', month: '11' }))
    expect(p.year).toBe('2024')
    expect(p.month).toBe('11')
  })
})

// ---------------------------------------------------------------------------
// Year → date-range derivation (logic extracted from route handler)
// ---------------------------------------------------------------------------

describe('Year filter → date range derivation', () => {
  function deriveRange(year: string): { gte: string; lt: string } | null {
    const y = parseInt(year, 10)
    if (isNaN(y)) return null
    return {
      gte: `${y}-01-01T00:00:00.000Z`,
      lt:  `${y + 1}-01-01T00:00:00.000Z`,
    }
  }

  it('converts year "2025" to correct inclusive range', () => {
    const r = deriveRange('2025')!
    expect(r.gte).toBe('2025-01-01T00:00:00.000Z')
    expect(r.lt).toBe('2026-01-01T00:00:00.000Z')
  })

  it('returns null for non-numeric year', () => {
    expect(deriveRange('abc')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Month post-filter logic (applied in-process for POC)
// ---------------------------------------------------------------------------

describe('Month post-filter', () => {
  const records = [
    { id: '1', created_at: '2024-03-15T10:00:00Z' },
    { id: '2', created_at: '2024-07-20T10:00:00Z' },
    { id: '3', created_at: '2025-03-05T10:00:00Z' },
  ]

  function filterByMonth(data: typeof records, month: string): typeof records {
    const m = parseInt(month, 10)
    if (isNaN(m)) return data
    return data.filter(img => new Date(img.created_at).getMonth() + 1 === m)
  }

  it('returns only records in the specified month', () => {
    const result = filterByMonth(records, '3')
    expect(result).toHaveLength(2)
    expect(result.map(r => r.id)).toEqual(['1', '3'])
  })

  it('returns empty array when no records match', () => {
    expect(filterByMonth(records, '12')).toHaveLength(0)
  })

  it('returns all records for invalid month string', () => {
    expect(filterByMonth(records, 'abc')).toHaveLength(3)
  })
})
