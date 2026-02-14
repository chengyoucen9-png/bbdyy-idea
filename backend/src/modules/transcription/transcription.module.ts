import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TranscriptionController } from './transcription.controller';
import { TranscriptionService } from './transcription.service';
import { AliyunSTTProvider } from './providers/aliyun-stt.provider';
import { AIModelSTTProvider } from './providers/ai-model-stt.provider';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [ConfigModule, MediaModule],
  controllers: [TranscriptionController],
  providers: [
    TranscriptionService,
    AliyunSTTProvider,
    AIModelSTTProvider,
  ],
  exports: [TranscriptionService],
})
export class TranscriptionModule {}
