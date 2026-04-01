# Fashion Garment Classification & Inspiration Web App

An AI-powered web app for uploading inspiration photos, classifying garments with GPT-4o Vision, and building a searchable, filterable image library with designer annotations.

---

## Tech Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Framework | Next.js 15 (App Router, TypeScript) | Full-stack SSR + API routes in one repo |
| UI | Tailwind CSS, react-masonry-css | Rapid responsive grid layout |
| AI | OpenAI GPT-4o Vision | Best-in-class multimodal model for fashion attributes |
| Database / Storage | Supabase (Postgres + RLS + Storage) | Hosted Postgres with built-in auth, realtime, and object storage |
| Validation | Zod | Runtime schema enforcement for AI output |
| Testing | Vitest (unit + integration), Playwright (E2E) | |

---

## Project Layout

```
app/               Next.js pages and API routes
  api/classify/    POST — upload image, call GPT-4o, store result
  api/search/      GET  — full-text + metadata + location + time filters
  dashboard/       Gallery view with filter/search
  upload/          Image upload with designer attribution
components/        Shared React components
lib/
  classification.ts  Zod schema + parseClassification()
  supabase.ts        Supabase client
supabase/
  migrations/001_initial.sql  DB schema (run once)
eval/
  eval.py            Model evaluation script (mock + real modes)
  expected-labels.csv  50-row hand-labelled ground truth
tests/
  unit/classification.test.ts   Zod parser tests
  integration/filters.test.ts   Filter query-string logic
  e2e/upload-flow.test.ts       Playwright end-to-end
```

---

## Quick Start (GitHub Codespaces / local)

### Prerequisites
- Node 20+
- Supabase CLI (`npm install -g supabase`)
- OpenAI API key

### Steps

```bash
# 1 – Install dependencies
npm install

# 2 – Start local Supabase (Docker required)
supabase start
supabase db reset          # runs migrations/001_initial.sql

# 3 – Configure environment
cp .env.example .env.local
# Fill in:
#   NEXT_PUBLIC_SUPABASE_URL=<from `supabase start` output>
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=<from `supabase start` output>
#   SUPABASE_SERVICE_KEY=<service role key>
#   OPENAI_API_KEY=<your key>

# 4 – Run dev server
npm run dev
# → http://localhost:3000  (redirects to /dashboard)
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `SUPABASE_SERVICE_KEY` | Yes (server-side) | Supabase service role key |
| `OPENAI_API_KEY` | Yes | OpenAI API key (GPT-4o access required) |

---

## Database Schema

The migration in `supabase/migrations/001_initial.sql` creates:

```sql
CREATE TABLE images (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid,                      -- nullable: POC anonymous mode
  file_url        text NOT NULL,
  ai_description  text DEFAULT '',
  ai_metadata     jsonb DEFAULT '{}',        -- all structured attributes
  user_tags       text[] DEFAULT '{}',
  user_notes      text DEFAULT '',
  created_at      timestamptz DEFAULT now(),
  designer        text DEFAULT '',
  search_vector   tsvector GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(ai_description,'') || ' ' ||
      coalesce(array_to_string(user_tags,' '),'') || ' ' ||
      coalesce(user_notes,'') || ' ' ||
      coalesce(ai_metadata->>'trend_notes','')
    )
  ) STORED
);
```

**Indexes:** `gin(search_vector)` for full-text; `gin(ai_metadata)` for JSONB attribute filters; `btree(created_at)`, `btree(designer)`.

**RLS:** Open policies for POC (no user isolation). To re-enable per-user auth replace `USING (true)` with `USING (auth.uid() = user_id)`.

---

## AI Classification

GPT-4o Vision receives the image as base64 and is asked to return a single JSON block with:

| Field | Type | Example |
|-------|------|---------|
| description | string | "A flowing summer dress with embroidered neckline" |
| garment_type | string | "dress" |
| style | string | "bohemian" |
| material | string | "cotton" |
| color_palette | string[] | ["terracotta","cream"] |
| pattern | string | "floral" |
| season | string | "summer" |
| occasion | string | "casual" |
| consumer_profile | string | "young professional" |
| trend_notes | string | "vintage revival" |
| location_context.continent | string | "Europe" |
| location_context.country | string | "France" |
| location_context.city | string | "Paris" |

Output is validated with Zod before DB insert; markdown code fences are stripped automatically.

---

## Search & Filtering

`GET /api/search` supports all of the following query parameters simultaneously:

**Text search**
- `q` — web-search full-text query against `search_vector` (description + tags + notes + trend_notes)

**Garment attributes** (exact match unless noted)
- `garment_type`, `style`, `material`, `pattern`, `season`, `occasion`, `consumer_profile`
- `trend_notes` — partial substring match (ILIKE)

**Location**
- `continent`, `country`, `city` — exact match against `location_context` JSONB

**Time**
- `year` — translates to `created_at >= YYYY-01-01` and `< (YYYY+1)-01-01`
- `month` — post-filtered in-process (1–12) when used without a year

**Other**
- `designer` — partial match (ILIKE)
- `limit` (default 20, max 200), `offset` (default 0)

All filter values are **derived dynamically from the database** — nothing is hardcoded in the UI.

---

## Designer Annotations

- Each image card has an **Annotate** button that opens a modal.
- Users can add comma-separated **tags** and free-text **notes**.
- Annotations appear on the card with a distinct `user:` prefix (blue badges) vs AI attributes (green/purple badges).
- Annotations are stored in `user_tags[]` and `user_notes` and are included in `search_vector` for full-text search.

---

## Running Tests

```bash
# Unit + integration (Vitest)
npm test

# End-to-end (Playwright — requires dev server running)
npm run dev &
npm run test:e2e
```

### What each test suite covers

| Suite | File | What it tests |
|-------|------|---------------|
| Unit | `tests/unit/classification.test.ts` | `parseClassification()`: valid schema, object input, fence stripping, all required fields, invalid input rejection |
| Integration | `tests/integration/filters.test.ts` | URL query-string parsing for all 14 filter params, year→date-range conversion, month post-filter logic |
| E2E | `tests/e2e/upload-flow.test.ts` | Upload page UI, Classifying… state, success/error banners, designer field, gallery image cards, filter chips, annotation modal open/fill/close |

---

## Model Evaluation

Test set: 50 Pexels fashion images with hand-labelled ground truth in `eval/expected-labels.csv`.  
Source: https://www.pexels.com/search/fashion/

```bash
# Offline / CI (deterministic mock, no API key needed)
cd eval && python eval.py

# Real evaluation against GPT-4o
OPENAI_API_KEY=<key> USE_REAL_MODEL=1 python eval.py
```

### Reported accuracy (mock baseline)

The mock classifier uses a deterministic hash over the image URL to simulate variety. It serves as a reproducible baseline and sanity-check for the evaluation pipeline itself (accuracy ≈ 14–20% per field, matching random-choice rates across 6–8 classes).

### Expected real-model performance (from manual spot checks)

| Attribute | Expected accuracy | Notes |
|-----------|------------------|-------|
| Garment type | ~85–92% | Strong on main categories; weaker on accessories |
| Style | ~80–88% | Broad styles (casual/formal) reliable; subculture labels variable |
| Color palette | ~78–85% | Partial-match scoring; complex multi-color garments weaker |
| Material | ~65–75% | Obvious materials (denim, leather) good; blended fabrics harder |
| Location | ~50–65% | Relies entirely on visual context; no geotag data |
| Season | ~70–80% | Strong when clothing is clearly seasonal |

### Known limitations and improvement ideas

1. **Location accuracy is low** because GPT-4o has no GPS/EXIF data. Fix: extract EXIF at upload time.
2. **Multi-garment images** (full outfits with accessories) produce a single classification. Fix: detect and crop individual garment regions first.
3. **Material and fabric texture** are underrepresented in Pexels stock images — compressed JPEGs lose textile detail. Fix: use higher-resolution images or a purpose-built fashion dataset (DeepFashion, iMaterialist).
4. **Trend notes are subjective** — exact-match accuracy is misleadingly low for valid synonyms. Fix: use semantic similarity scoring instead.

---

## Architecture Diagram

```
Upload page → POST /api/classify
                 ├── OpenAI GPT-4o Vision
                 ├── Supabase Storage (image file)
                 └── Supabase Postgres (image record + AI metadata)

Dashboard → GET /api/search?<filters>
                 └── Postgres (tsvector FTS + JSONB filters + date range)
                       └── Image grid with infinite scroll

Image card → Annotate button
                 └── Supabase Postgres update (user_tags, user_notes)
```

---

## Deployment (Vercel)

1. Connect repo to Vercel.
2. Set all four environment variables in the Vercel project settings.
3. Point to a hosted Supabase project (run migration once via `supabase db push`).
4. Deploy.

---

## Known Limitations (honest POC notes)

- **No user isolation**: All images are globally visible. RLS is configured but `user_id` is null for anonymous uploads. Re-enable per-user auth with one policy change.
- **No rate limiting**: The classify endpoint has no request throttling.
- **No image de-duplication**: Uploading the same image twice creates two records.
- **Storage bucket must be created manually** in Supabase dashboard and set to public (or update `getPublicUrl` logic for signed URLs).
- **Month-only filter** does an in-process scan (acceptable for POC data volumes, not for production).
