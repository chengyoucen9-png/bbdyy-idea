import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TalentService } from './talent.service';
import { TalentController } from './talent.controller';
import { Talent } from './talent.entity';
import { Material } from '../materials/material.entity';
import { TranscriptionModule } from '../transcription/transcription.module';

@Module({
  imports: [TypeOrmModule.forFeature([Talent, Material]), TranscriptionModule],
  providers: [TalentService],
  controllers: [TalentController],
  exports: [TalentService],
})
export class TalentModule {}
