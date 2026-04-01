import { z } from 'zod'

export const locationContextSchema = z.object({
  continent: z.string(),
  country: z.string(),
  city: z.string(),
})

export const metadataSchema = z.object({
  garment_type: z.string(),
  style: z.string(),
  material: z.string(),
  color_palette: z.array(z.string()),
  pattern: z.string(),
  season: z.string(),
  occasion: z.string(),
  consumer_profile: z.string(),
  trend_notes: z.string(),
  location_context: locationContextSchema,
})

export const classificationSchema = z.object({
  description: z.string(),
  metadata: metadataSchema,
})

export type Classification = z.infer<typeof classificationSchema>

export function parseClassification(raw: unknown): Classification {
  let parsed: unknown = raw

  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw)
    } catch (error) {
      throw new Error('Invalid JSON response: ' + String(error))
    }
  }

  return classificationSchema.parse(parsed)
}
