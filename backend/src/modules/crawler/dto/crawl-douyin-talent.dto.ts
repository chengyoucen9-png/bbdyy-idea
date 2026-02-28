import { IsOptional, IsString, IsNumber, IsDateString, IsBoolean } from 'class-validator';

export class CrawlDouyinTalentDto {
  @IsOptional()
  @IsString()
  taskTitle?: string;

  @IsOptional()
  @IsString()
  talentUrl?: string;

  @IsOptional()
  @IsDateString()
  crawlStartTime?: string;

  @IsOptional()
  @IsDateString()
  crawlEndTime?: string;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}

export class CrawlDouyinTalentResponse {
  message: string;
  taskId?: number;
}
