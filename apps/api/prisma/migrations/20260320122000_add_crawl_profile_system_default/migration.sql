ALTER TABLE "crawl_profiles"
ADD COLUMN "is_system_default" BOOLEAN NOT NULL DEFAULT FALSE;

WITH ranked_defaults AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY binding_id
      ORDER BY created_at ASC
    ) AS row_number
  FROM "crawl_profiles"
  WHERE
    mode = 'RECOMMENDED'
    AND query_text IS NULL
    AND region IS NULL
    AND language IS NULL
)
UPDATE "crawl_profiles" AS cp
SET "is_system_default" = TRUE
FROM ranked_defaults
WHERE cp.id = ranked_defaults.id
  AND ranked_defaults.row_number = 1;

CREATE UNIQUE INDEX "crawl_profiles_binding_default_profile_idx"
ON "crawl_profiles" ("binding_id")
WHERE "is_system_default" = TRUE;
