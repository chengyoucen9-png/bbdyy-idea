import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import {
  ITranscriptionProvider,
  TranscriptionRequest,
  TranscriptionResult,
} from '../interfaces/transcription.interface';

@Injectable()
export class AIModelSTTProvider implements ITranscriptionProvider {
  private readonly logger = new Logger(AIModelSTTProvider.name);

  async isAvailable(): Promise<boolean> {
    return !!process.env.DASHSCOPE_API_KEY;
  }

  async transcribe(request: TranscriptionRequest): Promise<TranscriptionResult> {
    this.logger.log(`使用通义千问转写: ${request.fileUrl}`);

    let localPath: string;
    const audioPath = path.join(process.cwd(), 'uploads', `temp_${Date.now()}_audio.mp3`);

    try {
      // 检查是否是网络URL
      if (request.fileUrl.startsWith('http://') || request.fileUrl.startsWith('https://')) {
        // 下载网络文件到临时目录
        this.logger.log(`下载网络文件: ${request.fileUrl}`);
        localPath = path.join(process.cwd(), 'uploads', `temp_${Date.now()}_input`);
        const response = await axios.get(request.fileUrl, { responseType: 'stream' });
        const writer = fs.createWriteStream(localPath);
        await new Promise((resolve, reject) => {
          (response.data as any).pipe(writer);
          writer.on('finish', () => resolve(undefined));
          writer.on('error', reject);
        });
      } else {
        // 本地文件路径
        localPath = this.urlToLocalPath(request.fileUrl);
      }

      // 用 ffmpeg 提取音频，压缩到 16kHz 单声道
      this.logger.log(`提取音频: ${localPath} -> ${audioPath}`);
      execSync(`ffmpeg -i "${localPath}" -vn -ar 16000 -ac 1 -b:a 64k "${audioPath}" -y`, {
        timeout: 60000,
      });

      const fileBuffer = fs.readFileSync(audioPath);
      const fileSizeMB = fileBuffer.length / 1024 / 1024;
      this.logger.log(`音频大小: ${fileSizeMB.toFixed(2)}MB`);

      const base64 = `data:audio/mp3;base64,${fileBuffer.toString('base64')}`;

      const response = await axios.post(
        'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
        {
          model: process.env.AI_TRANSCRIPTION_MODEL || 'qwen-omni-turbo',
          input: {
            messages: [{
              role: 'user',
              content: [
                { audio: base64 },
                { text: '请将这段音频转写成文字，保持原意，添加标点符号，只输出转写文字不要其他内容。' },
              ],
            }],
          },
          parameters: {
            result_format: 'message',
            modalities: ['text'],
          },
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 120000,
        },
      );

      // 兼容 result_format=message 和默认格式
      const output = (response.data as any).output;
      const rawContent = output?.choices?.[0]?.message?.content ?? output?.text ?? '';
      const text = Array.isArray(rawContent) ? rawContent.map((c: any) => c.text || '').join('') : String(rawContent);
      this.logger.log(`转写完成，文字长度: ${text.length}`);

      return {
        text,
        segments: this.splitIntoSegments(text),
        confidence: 0.85,
        duration: 0,
        provider: 'ai_model',
        timestamp: Date.now(),
      };
    } catch (error) {
      this.logger.error('转写失败详情: ' + JSON.stringify(error.response?.data) + ' ' + error.message);
      throw error;
    } finally {
      // 清理临时文件
      if (fs.existsSync(audioPath)) {
        fs.unlinkSync(audioPath);
      }
      if (localPath && fs.existsSync(localPath) && localPath.includes('temp_')) {
        fs.unlinkSync(localPath);
      }
    }
  }

  private urlToLocalPath(url: string): string {
    const urlPath = url
      .replace(/^https?:\/\/[^/]+/, '')
      .replace(/^\/uploads\//, '');
    return path.join(process.cwd(), 'uploads', urlPath);
  }

  private splitIntoSegments(text: string): any[] {
    const sentences = text.split(/[。！？.!?]+/);
    let currentTime = 0;
    return sentences
      .filter(s => s.trim())
      .map(sentence => {
        const duration = sentence.length * 200;
        const segment = { text: sentence.trim(), startTime: currentTime, endTime: currentTime + duration };
        currentTime += duration;
        return segment;
      });
  }
}
