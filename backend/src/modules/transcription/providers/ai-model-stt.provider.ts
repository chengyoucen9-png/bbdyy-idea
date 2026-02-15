import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import {
  ITranscriptionProvider,
  TranscriptionRequest,
  TranscriptionResult,
} from '../interfaces/transcription.interface';

@Injectable()
export class AIModelSTTProvider implements ITranscriptionProvider {
  private readonly logger = new Logger(AIModelSTTProvider.name);

  async isAvailable(): Promise<boolean> {
    return true; // AI模型作为兜底，始终可用
  }

  async transcribe(request: TranscriptionRequest): Promise<TranscriptionResult> {
    this.logger.log(`使用AI模型转写（兜底方案）: ${request.fileUrl}`);
    
    try {
      // 这里可以集成Qwen-Audio或OpenAI Whisper
      // 示例使用通义千问的音频理解能力
      
      const response = await axios.post(
        'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
        {
          model: 'qwen-audio-turbo',
          input: {
            messages: [
              {
                role: 'user',
                content: [
                  {
                    audio: request.fileUrl,
                  },
                  {
                    text: '请将这段音频转写成文字，保持原意，添加标点符号。',
                  },
                ],
              },
            ],
          },
          parameters: {},
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.DASHSCOPE_API_KEY}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const text = response.data.output?.text || '';

      return {
        text,
        segments: this.splitIntoSegments(text),
        confidence: 0.85, // AI模型估计置信度
        duration: 0,
        provider: 'ai_model',
        timestamp: Date.now(),
      };
    } catch (error) {
      this.logger.error('AI模型转写失败', error.stack);
      throw error;
    }
  }

  private splitIntoSegments(text: string, segmentLength = 50): any[] {
    // 简单分段逻辑：按句子分割
    const sentences = text.split(/[。！？.!?]+/);
    let currentTime = 0;
    
    return sentences
      .filter(s => s.trim())
      .map((sentence, index) => {
        const duration = sentence.length * 200; // 估算：每字200ms
        const segment = {
          text: sentence.trim(),
          startTime: currentTime,
          endTime: currentTime + duration,
        };
        currentTime += duration;
        return segment;
      });
  }
}
