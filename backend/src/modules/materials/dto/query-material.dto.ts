import { IsOptional, IsString, IsNumber } from 'class-validator';

export class QueryMaterialDto {
  @IsOptional()
  @IsString()
  fileType?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;
}
