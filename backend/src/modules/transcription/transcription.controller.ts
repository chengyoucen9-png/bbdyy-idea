import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TranscriptionService } from './transcription.service';
import { TranscriptionDto } from './dto/transcription.dto';

@ApiTags('语音转写')
@Controller('transcription')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class TranscriptionController {
  constructor(private readonly transcriptionService: TranscriptionService) {}

  @Post()
  @ApiOperation({ summary: '音频/视频转文字' })
  async transcribe(@Body() dto: TranscriptionDto) {
    return this.transcriptionService.transcribe({
      fileUrl: dto.fileUrl,
      fileType: dto.fileType,
      language: dto.language || 'zh-CN',
      enablePunctuation: dto.enablePunctuation ?? true,
      enableDiarization: dto.enableDiarization ?? false,
    });
  }

  @Post('video')
  @ApiOperation({ summary: '视频转文字' })
  async transcribeVideo(@Body() dto: { fileUrl: string }) {
    return this.transcriptionService.transcribeVideo(dto.fileUrl);
  }

  @Post('audio')
  @ApiOperation({ summary: '音频转文字' })
  async transcribeAudio(@Body() dto: { fileUrl: string }) {
    return this.transcriptionService.transcribeAudio(dto.fileUrl);
  }

  @Post('generate-srt')
  @ApiOperation({ summary: '生成SRT字幕' })
  async generateSubtitles(@Body() dto: { fileUrl: string }) {
    const result = await this.transcriptionService.transcribeVideo(dto.fileUrl);
    
    const srtContent = this.transcriptionService.generateSRT(result.segments || []);
    
    return {
      text: result.text,
      srt: srtContent,
      duration: result.duration,
      provider: result.provider,
    };
  }
}
