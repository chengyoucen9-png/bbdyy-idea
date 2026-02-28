import { Module } from '@nestjs/common';
import { TalentService } from './talent.service';
import { TalentController } from './talent.controller';

@Module({
  imports: [],
  providers: [TalentService],
  controllers: [TalentController],
  exports: [TalentService],
})
export class TalentModule {}
