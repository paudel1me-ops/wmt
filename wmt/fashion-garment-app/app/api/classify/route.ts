import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import { parseClassification } from '@/lib/classification'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const CLASSIFICATION_PROMPT = `Analyze this fashion/garment photo. Output ONLY valid JSON with no markdown fences.
Schema: {
  "description": "<rich natural-language description of the garment>",
  "metadata": {
    "garment_type": "<e.g. dress|shirt|pants|jacket|skirt|shoes|accessory>",
    "style": "<e.g. bohemian|casual|formal|streetwear|vintage|modern>",
    "material": "<e.g. cotton|silk|wool|denim|linen|leather>",
    "color_palette": ["<color1>", "<color2>"],
    "pattern": "<e.g. solid|striped|floral|plaid|geometric>",
    "season": "<summer|winter|spring|fall|all-season>",
    "occasion": "<casual|formal|party|work|athletic>",
    "consumer_profile": "<e.g. young professional|student|executive|artist>",
    "trend_notes": "<brief trend observation>",
    "location_context": {
      "continent": "<continent name or empty string>",
      "country": "<country name or empty string>",
      "city": "<city name or empty string>"
    }
  }
}`

export async function POST(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  const formData = await request.formData()
  const file = formData.get('image') as File | null
  const designer = (formData.get('designer') as string | null)?.trim() ?? ''

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'No image provided' }, { status: 400 })
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large' }, { status: 400 })
  }
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  const base64 = Buffer.from(bytes).toString('base64')

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: CLASSIFICATION_PROMPT },
          {
            type: 'image_url',
            image_url: { url: `data:${file.type};base64,${base64}` },
          },
        ],
      },
    ],
  })

  const rawContent = response.choices?.[0]?.message?.content ?? ''

  // Strip optional markdown code fences GPT-4o sometimes emits
  const content = rawContent.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

  if (!content) {
    return NextResponse.json({ error: 'No response from model' }, { status: 500 })
  }

  let classification
  try {
    classification = parseClassification(content)
  } catch (error) {
    return NextResponse.json({ error: 'Invalid classification data' }, { status: 500 })
  }

  // POC: no authenticated user — user_id stored as null
  const storagePath = `${Date.now()}-${file.name}`
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('uploads')
    .upload(storagePath, file)

  if (uploadError || !uploadData?.path) {
    return NextResponse.json(
      { error: uploadError?.message ?? 'Storage upload failed' },
      { status: 500 }
    )
  }

  const fileUrl = supabase.storage.from('uploads').getPublicUrl(uploadData.path).data.publicUrl

  const { data: imageData, error: dbError } = await supabase
    .from('images')
    .insert({
      user_id: null,
      file_url: fileUrl,
      ai_description: classification.description,
      ai_metadata: classification.metadata,
      designer: designer || null,
    })
    .select()
    .single()

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json(imageData)
}
