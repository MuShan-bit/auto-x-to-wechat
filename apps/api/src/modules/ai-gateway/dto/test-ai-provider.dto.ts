import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { trimRequiredString } from '../../ai-config/dto/ai-config-dto.helpers';

export class TestAiProviderDto {
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null
      ? undefined
      : trimRequiredString(value),
  )
  @IsString()
  modelConfigId?: string;

  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null
      ? undefined
      : trimRequiredString(value),
  )
  @IsString()
  modelCode?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    return Number(value);
  })
  @IsInt()
  @Min(1000)
  @Max(60000)
  timeoutMs?: number;
}
