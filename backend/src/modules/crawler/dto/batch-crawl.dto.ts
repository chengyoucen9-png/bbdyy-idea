import { IsOptional, IsArray, IsNumber } from 'class-validator';

export class BatchCrawlDto {
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  talentIds?: number[];
}

export class BatchCrawlResponse {
  message: string;
  results?: Array<{
    talentId: number;
    talentName: string;
    success: boolean;
    message?: string;
    data?: any[];
  }>;
}
