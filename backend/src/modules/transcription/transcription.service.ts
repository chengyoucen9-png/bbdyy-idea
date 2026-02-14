import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  TranscriptionRequest,
  TranscriptionResult,
} from './interfaces/transcription.interface';
import { AliyunSTTProvider } from './providers/aliyun-stt.provider';
import { AIModelSTTProvider } from './providers/ai-model-stt.provider';

@Injectable()
export class TranscriptionService {
  private readonly logger = new Logger(TranscriptionService.name);
  private cacheMap = new Map<string, TranscriptionResult>();

  constructor(
    private readonly aliyunSTT: AliyunSTTProvider,
    private readonly aiModelSTT: AIModelSTTProvider,
    private configService: ConfigService,
  ) {}

  /**
   * 主转写方法：优先阿里云STT，失败后降级到AI模型
   */
  async transcribe(request: TranscriptionRequest): Promise<TranscriptionResult> {
    // 检查缓存
    const cacheKey = this.getCacheKey(request.fileUrl);
    if (this.cacheMap.has(cacheKey)) {
      this.logger.log('使用缓存的转写结果');
      return this.cacheMap.get(cacheKey)!;
    }

    let result: TranscriptionResult;

    try {
      // 策略1：优先使用阿里云STT（专业、准确、便宜）
      if (await this.aliyunSTT.isAvailable()) {
        this.logger.log('使用阿里云STT服务');
        result = await this.aliyunSTT.transcribe(request);
      } else {
        throw new Error('阿里云STT不可用');
      }
    } catch (error) {
      this.logger.warn(`阿里云STT失败: ${error.message}，降级到AI模型`);

      try {
        // 策略2：降级到AI模型（兜底方案）
        this.logger.log('使用AI模型进行转写');
        result = await this.aiModelSTT.transcribe(request);
      } catch (error2) {
        this.logger.error('所有转写服务都失败', error2.stack);
        throw new Error('转写服务不可用，请稍后重试');
      }
    }

    // 缓存结果（1小时）
    this.cacheMap.set(cacheKey, result);
    setTimeout(() => this.cacheMap.delete(cacheKey), 3600000);

    return result;
  }

  /**
   * 视频转文字（自动提取音频）
   */
  async transcribeVideo(videoUrl: string): Promise<TranscriptionResult> {
    return this.transcribe({
      fileUrl: videoUrl,
      fileType: 'video',
      language: 'zh-CN',
      enablePunctuation: true,
    });
  }

  /**
   * 音频转文字
   */
  async transcribeAudio(audioUrl: string): Promise<TranscriptionResult> {
    return this.transcribe({
      fileUrl: audioUrl,
      fileType: 'audio',
      language: 'zh-CN',
      enablePunctuation: true,
    });
  }

  /**
   * 生成SRT字幕文件
   */
  generateSRT(segments: any[]): string {
    return segments
      .map((segment, index) => {
        const startTime = this.formatSRTTime(segment.startTime);
        const endTime = this.formatSRTTime(segment.endTime);
        
        return `${index + 1}\n${startTime} --> ${endTime}\n${segment.text}\n`;
      })
      .join('\n');
  }

  private formatSRTTime(milliseconds: number): string {
    const hours = Math.floor(milliseconds / 3600000);
    const minutes = Math.floor((milliseconds % 3600000) / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    const ms = milliseconds % 1000;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
  }

  private getCacheKey(fileUrl: string): string {
    return crypto.createHash('md5').update(fileUrl).digest('hex');
  }

  /**
   * 清除缓存
   */
  clearCache(fileUrl?: string) {
    if (fileUrl) {
      const cacheKey = this.getCacheKey(fileUrl);
      this.cacheMap.delete(cacheKey);
    } else {
      this.cacheMap.clear();
    }
  }
}
