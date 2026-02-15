import { IsString, IsOptional, IsNumber, IsArray, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateVideoDto {
  @IsString()
  title: string;

  @IsNumber()
  @IsOptional()
  topicId?: number;

  @IsDateString()
  @IsOptional()
  publishDate?: string;

  @IsString()
  @IsOptional()
  platform?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  views?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  likes?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  comments?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  shares?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  completionRate?: number;

  @IsArray()
  @IsOptional()
  materialIds?: number[];
}

export class UpdateVideoDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsNumber()
  @IsOptional()
  topicId?: number;

  @IsDateString()
  @IsOptional()
  publishDate?: string;

  @IsString()
  @IsOptional()
  platform?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  views?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  likes?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  comments?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  shares?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  completionRate?: number;

  @IsArray()
  @IsOptional()
  materialIds?: number[];
}

export class QueryVideoDto {
  @IsString()
  @IsOptional()
  platform?: string;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  page?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  limit?: number;
}
