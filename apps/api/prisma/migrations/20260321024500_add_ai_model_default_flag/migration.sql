ALTER TABLE "ai_model_configs"
ADD COLUMN IF NOT EXISTS "is_default" BOOLEAN NOT NULL DEFAULT false;

WITH ranked_models AS (
  SELECT
    amc."id",
    ROW_NUMBER() OVER (
      PARTITION BY apc."user_id", amc."task_type"
      ORDER BY amc."created_at" ASC
    ) AS row_number
  FROM "ai_model_configs" amc
  INNER JOIN "ai_provider_configs" apc
    ON apc."id" = amc."provider_config_id"
  WHERE amc."enabled" = true
)
UPDATE "ai_model_configs" amc
SET "is_default" = CASE WHEN ranked_models.row_number = 1 THEN true ELSE false END
FROM ranked_models
WHERE amc."id" = ranked_models."id";
