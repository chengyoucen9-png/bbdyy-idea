import { IsString, IsOptional, IsObject, IsNumber } from 'class-validator';

export class CreateProviderDto {
  @IsString()
  name: string;

  @IsString()
  type: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsOptional()
  visionConfig?: any;

  @IsObject()
  @IsOptional()
  textConfig?: any;

  @IsNumber()
  @IsOptional()
  isDefault?: number;

  @IsNumber()
  @IsOptional()
  enabled?: number;
}

export class UpdateProviderDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsOptional()
  visionConfig?: any;

  @IsObject()
  @IsOptional()
  textConfig?: any;

  @IsNumber()
  @IsOptional()
  isDefault?: number;

  @IsNumber()
  @IsOptional()
  enabled?: number;
}
