import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { MaterialsModule } from './modules/materials/materials.module';
import { TopicsModule } from './modules/topics/topics.module';
import { VideosModule } from './modules/videos/videos.module';
import { AiProvidersModule } from './modules/ai-providers/ai-providers.module';
import { OssModule } from './modules/oss/oss.module';
import { HealthModule } from './modules/health/health.module';
import { TranscriptionModule } from './modules/transcription/transcription.module';
import { MediaModule } from './modules/media/media.module';
import { SettingsModule } from './modules/settings/settings.module';

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // 数据库模块
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get('NODE_ENV') === 'development',
        logging: configService.get('NODE_ENV') === 'development',
        charset: 'utf8mb4',
        timezone: '+08:00',
        // 连接池配置
        extra: {
          connectionLimit: 10,
        },
      }),
    }),

    // 速率限制模块（防止暴力攻击）
    ThrottlerModule.forRoot([{
      ttl: 60000, // 60秒
      limit: 100, // 最多100个请求
    }]),

    // 业务模块
    AuthModule,
    UsersModule,
    MaterialsModule,
    TopicsModule,
    VideosModule,
    AiProvidersModule,
    OssModule,
    HealthModule,
    TranscriptionModule,
    MediaModule,
    SettingsModule,
  ],
})
export class AppModule {}
