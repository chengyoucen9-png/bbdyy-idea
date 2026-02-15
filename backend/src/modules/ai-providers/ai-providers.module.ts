import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiProvidersController } from './ai-providers.controller';
import { AiProvidersService } from './ai-providers.service';
import { AiProvider } from './ai-provider.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AiProvider])],
  controllers: [AiProvidersController],
  providers: [AiProvidersService],
  exports: [AiProvidersService],
})
export class AiProvidersModule {}
