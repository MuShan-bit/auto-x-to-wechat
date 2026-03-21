import { CrawlMode, ReportType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

function trimOptionalString(value: unknown) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : undefined;
}

function toOptionalInt(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  return Number(value);
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

  return normalizedValues.length > 0 ? normalizedValues : undefined;
}

export class GenerateReportDto {
  @IsEnum(ReportType)
  reportType!: ReportType;

  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  periodStart!: string;

  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  periodEnd!: string;

  @IsOptional()
  @Transform(({ value }) => toOptionalStringArray(value))
  @IsArray()
  @IsString({ each: true })
  bindingIds?: string[];

  @IsOptional()
  @Transform(({ value }) => toOptionalStringArray(value))
  @IsArray()
  @IsString({ each: true })
  categoryIds?: string[];

  @IsOptional()
  @Transform(({ value }) => toOptionalStringArray(value))
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];

  @IsOptional()
  @Transform(({ value }) => toOptionalStringArray(value))
  @IsArray()
  @IsEnum(CrawlMode, { each: true })
  modes?: CrawlMode[];

  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  @Max(200)
  postLimit?: number;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  modelConfigId?: string;
}
