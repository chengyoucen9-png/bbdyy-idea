import { Injectable, Logger } from '@nestjs/common';
import * as ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly tempDir = '/tmp/media-processing';

  constructor() {
    // 确保临时目录存在
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * 从视频提取音频
   */
  async extractAudioFromVideo(videoPath: string): Promise<string> {
    this.logger.log(`开始从视频提取音频: ${videoPath}`);
    
    const outputPath = path.join(
      this.tempDir,
      `${uuidv4()}.wav`,
    );

    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .toFormat('wav')
        .audioCodec('pcm_s16le')
        .audioFrequency(16000)  // 16kHz采样率
        .audioChannels(1)        // 单声道
        .on('start', (commandLine) => {
          this.logger.debug(`FFmpeg command: ${commandLine}`);
        })
        .on('progress', (progress) => {
          this.logger.debug(`处理进度: ${progress.percent}%`);
        })
        .on('end', () => {
          this.logger.log(`音频提取成功: ${outputPath}`);
          resolve(outputPath);
        })
        .on('error', (err) => {
          this.logger.error(`音频提取失败: ${err.message}`);
          reject(err);
        })
        .save(outputPath);
    });
  }

  /**
   * 转换音频格式
   */
  async convertAudioFormat(
    inputPath: string,
    targetFormat: 'wav' | 'mp3' | 'aac',
  ): Promise<string> {
    const outputPath = inputPath.replace(/\.\w+$/, `.${targetFormat}`);

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .toFormat(targetFormat)
        .on('end', () => resolve(outputPath))
        .on('error', reject)
        .save(outputPath);
    });
  }

  /**
   * 获取媒体文件信息
   */
  async getMediaInfo(filePath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(err);
        } else {
          resolve({
            duration: metadata.format.duration,
            size: metadata.format.size,
            format: metadata.format.format_name,
            streams: metadata.streams.map(s => ({
              type: s.codec_type,
              codec: s.codec_name,
              bitrate: s.bit_rate,
            })),
          });
        }
      });
    });
  }

  /**
   * 生成视频缩略图
   */
  async generateThumbnail(
    videoPath: string,
    timestamp: string = '00:00:01',
  ): Promise<string> {
    const outputPath = path.join(
      this.tempDir,
      `${uuidv4()}.jpg`,
    );

    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .screenshots({
          timestamps: [timestamp],
          filename: path.basename(outputPath),
          folder: path.dirname(outputPath),
          size: '640x360',
        })
        .on('end', () => resolve(outputPath))
        .on('error', reject);
    });
  }

  /**
   * 检查文件是否为视频
   */
  isVideo(mimetype: string): boolean {
    return mimetype.startsWith('video/');
  }

  /**
   * 检查文件是否为音频
   */
  isAudio(mimetype: string): boolean {
    return mimetype.startsWith('audio/');
  }

  /**
   * 清理临时文件
   */
  async cleanupTempFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.logger.log(`临时文件已删除: ${filePath}`);
      }
    } catch (error) {
      this.logger.error(`删除临时文件失败: ${error.message}`);
    }
  }

  /**
   * 清理所有过期的临时文件（超过1小时）
   */
  async cleanupOldTempFiles(): Promise<void> {
    const files = fs.readdirSync(this.tempDir);
    const now = Date.now();
    const oneHour = 3600000;

    for (const file of files) {
      const filePath = path.join(this.tempDir, file);
      const stats = fs.statSync(filePath);
      
      if (now - stats.mtimeMs > oneHour) {
        await this.cleanupTempFile(filePath);
      }
    }
  }
}
