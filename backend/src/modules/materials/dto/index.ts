import { IsString, IsArray, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { FileType } from '../material.entity';

export class CreateMaterialDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  scene?: string;

  @IsArray()
  @IsOptional()
  tags?: string[];

  @IsString()
  @IsOptional()
  duration?: string;

  @IsString()
  @IsOptional()
  note?: string;

  @IsString()
  @IsOptional()
  thumbnail?: string;

  @IsEnum(FileType)
  @IsOptional()
  fileType?: FileType;

  @IsNumber()
  @IsOptional()
  fileSize?: number;
}

export class UpdateMaterialDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  scene?: string;

  @IsArray()
  @IsOptional()
  tags?: string[];

  @IsString()
  @IsOptional()
  duration?: string;

  @IsString()
  @IsOptional()
  note?: string;
}

export class QueryMaterialDto {
  @IsString()
  @IsOptional()
  search?: string;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  page?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  limit?: number;
}
