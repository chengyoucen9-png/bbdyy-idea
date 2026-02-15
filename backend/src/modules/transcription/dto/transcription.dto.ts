import { IsString, IsEnum, IsOptional, IsBoolean, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TranscriptionDto {
  @ApiProperty({ description: '文件URL（OSS地址）', example: 'https://oss.example.com/video.mp4' })
  @IsUrl()
  @IsString()
  fileUrl: string;

  @ApiProperty({ description: '文件类型', enum: ['audio', 'video'], example: 'video' })
  @IsEnum(['audio', 'video'])
  fileType: 'audio' | 'video';

  @ApiProperty({ description: '语言', example: 'zh-CN', required: false })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiProperty({ description: '是否启用智能标点', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  enablePunctuation?: boolean;

  @ApiProperty({ description: '是否启用说话人分离', example: false, required: false })
  @IsOptional()
  @IsBoolean()
  enableDiarization?: boolean;
}
