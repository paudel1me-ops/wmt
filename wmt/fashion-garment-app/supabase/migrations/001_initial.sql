-- 1) Enable crypto extension (needed for gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2) Drop table if it already exists (optional; helps for copy/paste debugging)
DROP TABLE IF EXISTS images;

-- 3) Create table WITHOUT generated column
CREATE TABLE images (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,

  -- nullable: POC supports anonymous uploads without an authenticated user
  user_id uuid,

  file_url text NOT NULL,

  ai_description text DEFAULT '',
  ai_metadata jsonb DEFAULT '{}',
  user_tags text[] DEFAULT '{}',
  user_notes text DEFAULT '',

  created_at timestamptz DEFAULT now(),
  designer text DEFAULT '',

  -- Full-text search vector populated by trigger
  search_vector tsvector
);

-- 4) Trigger function to populate search_vector
--    Indexes ALL searchable fields so natural-language queries like
--    "embroidered neckline", "blue floral dress", "artisan market" all work.
CREATE OR REPLACE FUNCTION images_set_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    to_tsvector(
      'english',
      coalesce(NEW.ai_description, '')                              || ' ' ||
      coalesce(array_to_string(NEW.user_tags, ' '), '')             || ' ' ||
      coalesce(NEW.user_notes, '')                                  || ' ' ||
      coalesce(NEW.designer, '')                                    || ' ' ||
      coalesce(NEW.ai_metadata->>'garment_type', '')                || ' ' ||
      coalesce(NEW.ai_metadata->>'style', '')                       || ' ' ||
      coalesce(NEW.ai_metadata->>'material', '')                    || ' ' ||
      coalesce(NEW.ai_metadata->>'pattern', '')                     || ' ' ||
      coalesce(NEW.ai_metadata->>'season', '')                      || ' ' ||
      coalesce(NEW.ai_metadata->>'occasion', '')                    || ' ' ||
      coalesce(NEW.ai_metadata->>'consumer_profile', '')            || ' ' ||
      coalesce(NEW.ai_metadata->>'trend_notes', '')                 || ' ' ||
      coalesce(NEW.ai_metadata->'location_context'->>'continent', '') || ' ' ||
      coalesce(NEW.ai_metadata->'location_context'->>'country', '')   || ' ' ||
      coalesce(NEW.ai_metadata->'location_context'->>'city', '')      || ' ' ||
      (SELECT coalesce(string_agg(color_val, ' '), '')
       FROM jsonb_array_elements_text(
         CASE WHEN jsonb_typeof(NEW.ai_metadata->'color_palette') = 'array'
              THEN NEW.ai_metadata->'color_palette'
              ELSE '[]'::jsonb END
       ) AS color_val)
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5) Attach trigger for INSERT/UPDATE
DROP TRIGGER IF EXISTS images_search_vector_biu ON images;
CREATE TRIGGER images_search_vector_biu
BEFORE INSERT OR UPDATE ON images
FOR EACH ROW
EXECUTE FUNCTION images_set_search_vector();

-- 6) RLS
ALTER TABLE images ENABLE ROW LEVEL SECURITY;

-- POC open policies — no per-user isolation required for proof-of-concept.
-- To re-enable per-user isolation, replace USING (true) with USING (auth.uid() = user_id).
DROP POLICY IF EXISTS "POC read all images" ON images;
DROP POLICY IF EXISTS "POC insert images" ON images;
DROP POLICY IF EXISTS "POC update images" ON images;
DROP POLICY IF EXISTS "POC delete images" ON images;

CREATE POLICY "POC read all images"
  ON images FOR SELECT
  USING (true);

CREATE POLICY "POC insert images"
  ON images FOR INSERT
  WITH CHECK (true);

CREATE POLICY "POC update images"
  ON images FOR UPDATE
  USING (true);

CREATE POLICY "POC delete images"
  ON images FOR DELETE
  USING (true);

-- 7) Indexes
CREATE INDEX idx_images_created_at     ON images(created_at);
CREATE INDEX idx_images_designer       ON images(designer);

-- GIN index for full-text search
CREATE INDEX idx_images_search_vector  ON images USING gin(search_vector);

-- GIN index for JSONB attribute filtering
CREATE INDEX idx_images_ai_metadata_gin ON images USING gin(ai_metadata);