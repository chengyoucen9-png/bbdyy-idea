import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';
import { TranscriptionRequest, TranscriptionResult } from '../interfaces/transcription.interface';

@Injectable()
export class AliyunSTTProvider {
  private readonly logger = new Logger(AliyunSTTProvider.name);

  constructor(private configService: ConfigService) {}

  async isAvailable(): Promise<boolean> {
    const keyId = this.configService.get('OSS_ACCESS_KEY_ID');
    const keySecret = this.configService.get('OSS_ACCESS_KEY_SECRET');
    return !!(keyId && keySecret && keyId !== 'your_oss_access_key_id');
  }

  async transcribe(request: TranscriptionRequest): Promise<TranscriptionResult> {
    const accessKeyId = this.configService.get('OSS_ACCESS_KEY_ID');
    const accessKeySecret = this.configService.get('OSS_ACCESS_KEY_SECRET');

    const taskId = await this.submitTask(request.fileUrl, accessKeyId, accessKeySecret);
    this.logger.log(`转写任务提交成功，TaskId: ${taskId}`);

    const result = await this.pollResult(taskId, accessKeyId, accessKeySecret);
    return result;
  }

  private sign(params: Record<string, string>, secret: string): string {
    const sortedKeys = Object.keys(params).sort();
    const canonicalQuery = sortedKeys
      .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
      .join('&');
    const stringToSign = `POST&${encodeURIComponent('/')}&${encodeURIComponent(canonicalQuery)}`;
    return crypto.createHmac('sha1', secret + '&').update(stringToSign).digest('base64');
  }

  private buildParams(action: string, extraParams: Record<string, string>, accessKeyId: string) {
    const params: Record<string, string> = {
      Action: action,
      Version: '2019-08-19',
      AccessKeyId: accessKeyId,
      Timestamp: new Date().toISOString(),
      SignatureMethod: 'HMAC-SHA1',
      SignatureVersion: '1.0',
      SignatureNonce: Math.random().toString(36).substring(2),
      Format: 'JSON',
      ...extraParams,
    };
    return params;
  }

  private async submitTask(fileUrl: string, accessKeyId: string, accessKeySecret: string): Promise<string> {
    const extraParams = {
      FileLink: fileUrl,
      LanguageId: 'zh-cn',
    };
    const params = this.buildParams('SubmitTask', extraParams, accessKeyId);
    params.Signature = this.sign(params, accessKeySecret);

    const response = await axios.post(
      'https://nls-filetrans.cn-shanghai.aliyuncs.com/',
      new URLSearchParams(params).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const data = response.data as any;
    if (data.StatusCode !== 21050000) {
      throw new Error(`提交转写失败: ${data.StatusText}`);
    }
    return data.TaskId;
  }

  private async pollResult(taskId: string, accessKeyId: string, accessKeySecret: string): Promise<TranscriptionResult> {
    const maxRetries = 60;
    for (let i = 0; i < maxRetries; i++) {
      await new Promise(r => setTimeout(r, 3000));

      const params = this.buildParams('GetTaskResult', { TaskId: taskId }, accessKeyId);
      params.Signature = this.sign(params, accessKeySecret);

      const response = await axios.post(
        'https://nls-filetrans.cn-shanghai.aliyuncs.com/',
        new URLSearchParams(params).toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

      const data = response.data as any;
      this.logger.log(`轮询状态: ${data.StatusText}`);

      if (data.StatusText === 'SUCCESS') {
        const result = JSON.parse(data.Result);
        const sentences = result.Sentences || [];
        const text = sentences.map((s: any) => s.Text).join('');
        return {
          text,
          segments: sentences.map((s: any) => ({
            text: s.Text,
            startTime: s.BeginTime,
            endTime: s.EndTime,
          })),
          confidence: 0.95,
          duration: sentences.length > 0 ? sentences[sentences.length - 1].EndTime : 0,
          provider: 'aliyun',
          timestamp: Date.now(),
        };
      } else if (data.StatusText === 'FAILED') {
        throw new Error(`转写失败: ${data.StatusText}`);
      }
    }
    throw new Error('转写超时，请稍后重试');
  }
}
