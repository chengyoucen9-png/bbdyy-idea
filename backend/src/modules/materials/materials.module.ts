import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaterialsController } from './materials.controller';
import { MaterialsService } from './materials.service';
import { Material } from './material.entity';
import { OssModule } from '../oss/oss.module';
import { TranscriptionModule } from '../transcription/transcription.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Material]),
    OssModule,
    TranscriptionModule,
  ],
  controllers: [MaterialsController],
  providers: [MaterialsService],
  exports: [MaterialsService],
})
export class MaterialsModule {}
