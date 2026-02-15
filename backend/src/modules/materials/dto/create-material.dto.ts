import { IsString, IsOptional, IsArray, IsNumber } from 'class-validator';

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
  thumbnail?: string;

  @IsString()
  @IsOptional()
  fileType?: string;

  @IsNumber()
  @IsOptional()
  fileSize?: number;

  @IsString()
  @IsOptional()
  note?: string;
}
