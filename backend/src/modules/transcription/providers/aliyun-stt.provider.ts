import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';
import {
  ITranscriptionProvider,
  TranscriptionRequest,
  TranscriptionResult,
} from '../interfaces/transcription.interface';

@Injectable()
export class AliyunSTTProvider implements ITranscriptionProvider {
  private readonly logger = new Logger(AliyunSTTProvider.name);
  private readonly accessKeyId: string;
  private readonly accessKeySecret: string;
  private readonly appKey: string;

  constructor(private configService: ConfigService) {
    this.accessKeyId = configService.get('ALIYUN_ACCESS_KEY_ID');
    this.accessKeySecret = configService.get('ALIYUN_ACCESS_KEY_SECRET');
    this.appKey = configService.get('ALIYUN_NLS_APP_KEY');
  }

  async isAvailable(): Promise<boolean> {
    return !!(this.accessKeyId && this.accessKeySecret && this.appKey);
  }

  async transcribe(request: TranscriptionRequest): Promise<TranscriptionResult> {
    this.logger.log(`开始阿里云转写: ${request.fileUrl}`);
    
    try {
      // 1. 提交转写任务
      const taskId = await this.submitTask(request);
      
      // 2. 轮询任务状态
      const result = await this.pollTaskStatus(taskId);
      
      // 3. 解析结果
      return this.parseResult(result, 'aliyun');
    } catch (error) {
      this.logger.error('阿里云转写失败', error.stack);
      throw error;
    }
  }

  private async submitTask(request: TranscriptionRequest) {
    const url = 'https://nls-filetrans.cn-shanghai.aliyuncs.com/filetrans';
    
    const params = {
      appkey: this.appKey,
      file_link: request.fileUrl,
      version: '4.0',
      enable_words: true,
      enable_punctuation_prediction: request.enablePunctuation ?? true,
      enable_inverse_text_normalization: true,
      enable_diarization: request.enableDiarization ?? false,
    };

    const response = await axios.post(url, params, {
      headers: {
        'Content-Type': 'application/json',
        ...this.generateAuthHeaders('POST', '/filetrans'),
      },
    });

    if (response.data.StatusCode !== 200) {
      throw new Error(`阿里云STT提交失败: ${response.data.StatusText}`);
    }

    return response.data.TaskId;
  }

  private async pollTaskStatus(taskId: string, maxAttempts = 60): Promise<any> {
    const url = `https://nls-filetrans.cn-shanghai.aliyuncs.com/filetrans?TaskId=${taskId}`;
    
    for (let i = 0; i < maxAttempts; i++) {
      const response = await axios.get(url, {
        headers: this.generateAuthHeaders('GET', `/filetrans?TaskId=${taskId}`),
      });

      const status = response.data.StatusText;
      
      if (status === 'SUCCESS') {
        return response.data;
      } else if (status === 'FAILED') {
        throw new Error(`转写失败: ${response.data.ErrorMessage}`);
      }
      
      // 等待5秒后重试
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    throw new Error('转写超时');
  }

  private parseResult(data: any, provider: string): TranscriptionResult {
    const sentences = data.Result?.Sentences || [];
    
    const text = sentences.map((s: any) => s.Text).join('');
    
    const segments = sentences.map((s: any) => ({
      text: s.Text,
      startTime: s.BeginTime,
      endTime: s.EndTime,
      speaker: s.SpeakerId,
    }));

    return {
      text,
      segments,
      confidence: data.Result?.Confidence || 0,
      duration: data.Result?.Duration || 0,
      provider: provider as any,
      timestamp: Date.now(),
    };
  }

  private generateAuthHeaders(method: string, path: string) {
    const date = new Date().toUTCString();
    const signature = this.calculateSignature(method, path, date);
    
    return {
      'Date': date,
      'Authorization': `acs ${this.accessKeyId}:${signature}`,
    };
  }

  private calculateSignature(method: string, path: string, date: string): string {
    const stringToSign = `${method}\n\napplication/json\n${date}\n${path}`;
    
    return crypto
      .createHmac('sha1', this.accessKeySecret)
      .update(stringToSign)
      .digest('base64');
  }
}
