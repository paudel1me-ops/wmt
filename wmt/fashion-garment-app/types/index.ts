export interface Image {
  id: string
  user_id: string
  file_url: string
  ai_description: string
  ai_metadata: any
  user_tags: string[]
  user_notes: string
  created_at: string
  designer?: string
}

export interface Classification {
  description: string
  metadata: {
    garment_type: string
    style: string
    material: string
    color_palette: string[]
    pattern: string
    season: string
    occasion: string
    consumer_profile: string
    trend_notes: string
    location_context: {
      continent: string
      country: string
      city: string
    }
  }
}