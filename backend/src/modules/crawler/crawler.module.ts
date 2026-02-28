import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrawlerTask, CrawlerRecord } from './crawler.entity';
import { CrawlerController } from './crawler.controller';
import { CrawlerService } from './crawler.service';
import { CrawlerSyncController } from './crawler-sync.controller';
import { CrawlerSyncService } from './crawler-sync.service';
import { TalentModule } from '../talent/talent.module';
import { MediaModule } from '../media/media.module';
import { OssModule } from '../oss/oss.module';
import { MaterialsModule } from '../materials/materials.module';
import { Talent, TalentMaterial } from '../talent/talent.entity';
import { Material } from '../materials/material.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([CrawlerTask, CrawlerRecord, Talent, TalentMaterial, Material]),
    TalentModule,
    MediaModule,
    OssModule,
    MaterialsModule,
  ],
  controllers: [CrawlerController, CrawlerSyncController],
  providers: [CrawlerService, CrawlerSyncService],
  exports: [CrawlerService, CrawlerSyncService],
})
export class CrawlerModule {}
