import { describe, expect, it } from 'vitest'
import { parseClassification } from '../../lib/classification'

const VALID_METADATA = {
  garment_type: 'shirt',
  style: 'casual',
  material: 'cotton',
  color_palette: ['red', 'white'],
  pattern: 'striped',
  season: 'summer',
  occasion: 'daily',
  consumer_profile: 'urban',
  trend_notes: 'retro vibes',
  location_context: { continent: 'Europe', country: 'France', city: 'Paris' },
}

const VALID_INPUT = JSON.stringify({
  description: 'A red cotton shirt with white stripes',
  metadata: VALID_METADATA,
})

describe('parseClassification', () => {
  it('parses a valid JSON string into a typed Classification', () => {
    const parsed = parseClassification(VALID_INPUT)
    expect(parsed.description).toBe('A red cotton shirt with white stripes')
    expect(parsed.metadata.garment_type).toBe('shirt')
    expect(parsed.metadata.color_palette).toEqual(['red', 'white'])
    expect(parsed.metadata.location_context.city).toBe('Paris')
  })

  it('accepts a pre-parsed object (not a string)', () => {
    const obj = { description: 'A dress', metadata: { ...VALID_METADATA, garment_type: 'dress' } }
    const parsed = parseClassification(obj)
    expect(parsed.metadata.garment_type).toBe('dress')
  })

  it('strips markdown code fences before parsing', () => {
    const fenced = '```json\n' + VALID_INPUT + '\n```'
    const stripped = fenced.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    const parsed = parseClassification(stripped)
    expect(parsed.description).toBe('A red cotton shirt with white stripes')
  })

  it('returns all required metadata fields', () => {
    const parsed = parseClassification(VALID_INPUT)
    const required = [
      'garment_type', 'style', 'material', 'color_palette', 'pattern',
      'season', 'occasion', 'consumer_profile', 'trend_notes', 'location_context',
    ]
    for (const field of required) {
      expect(parsed.metadata).toHaveProperty(field)
    }
  })

  it('returns location_context with continent/country/city', () => {
    const parsed = parseClassification(VALID_INPUT)
    expect(parsed.metadata.location_context).toMatchObject({
      continent: 'Europe',
      country: 'France',
      city: 'Paris',
    })
  })

  it('throws for structurally invalid JSON object', () => {
    const input = JSON.stringify({ description: 'oops', metadata: { unknown: true } })
    expect(() => parseClassification(input)).toThrow()
  })

  it('throws for unparseable JSON string', () => {
    expect(() => parseClassification('{bad-json}')).toThrow('Invalid JSON response')
  })

  it('throws when color_palette is not an array', () => {
    const bad = JSON.stringify({
      description: 'desc',
      metadata: { ...VALID_METADATA, color_palette: 'red' },
    })
    expect(() => parseClassification(bad)).toThrow()
  })

  it('throws when location_context is missing', () => {
    const { location_context, ...rest } = VALID_METADATA
    const bad = JSON.stringify({ description: 'desc', metadata: rest })
    expect(() => parseClassification(bad)).toThrow()
  })
})
