import { Transform } from 'class-transformer';
import { IsArray, IsOptional, IsString } from 'class-validator';

function normalizeNullableString(value: unknown) {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function toOptionalStringArray(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const values = Array.isArray(value)
    ? value.flatMap((item) =>
        typeof item === 'string' ? item.split(',') : [String(item)],
      )
    : typeof value === 'string'
      ? value.split(',')
      : [String(value)];

  const normalizedValues = values
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return normalizedValues.length > 0 ? normalizedValues : [];
}

export class UpdateArchiveTaxonomyDto {
  @IsOptional()
  @Transform(({ value }) => normalizeNullableString(value))
  @IsString()
  primaryCategoryId?: string | null;

  @IsOptional()
  @Transform(({ value }) => toOptionalStringArray(value))
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];
}
