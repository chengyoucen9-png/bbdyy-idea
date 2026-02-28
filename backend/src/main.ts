import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { setupSwagger } from './config/swagger.config';
import { HttpExceptionFilter, AllExceptionsFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import helmet from "helmet";
import * as compression from 'compression';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });
  
  const configService = app.get(ConfigService);
  const port = configService.get('PORT') || 3000;
  const env = configService.get('NODE_ENV') || 'development';

  // 安全防护
  app.use(helmet());
  
  // Gzip压缩
  app.use(compression());

  // 记录所有请求的中间件
  app.use((req: any, res: any, next: any) => {
    if (req.method === 'POST' && req.url.includes('import-data')) {
      logger.log(`===== 收到POST请求 =====`);
      logger.log(`URL: ${req.url}`);
      logger.log(`Headers: ${JSON.stringify(req.headers, null, 2)}`);
      logger.log(`Body类型: ${typeof req.body}`);
      logger.log(`Body内容: ${JSON.stringify(req.body, null, 2)}`);
      logger.log(`===== 请求结束 =====`);
    }
    next();
  });

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // 全局异常过滤器
  
  app.use('/uploads', (req, res, next) => { res.header('Access-Control-Allow-Origin', '*'); res.header('Cross-Origin-Resource-Policy', 'cross-origin'); next(); }, require('express').static(require('path').join(__dirname, '..', 'uploads')));
  app.useGlobalFilters(
    new AllExceptionsFilter(),
    new HttpExceptionFilter(),
  );

  // 全局拦截器
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  // CORS配置
  app.enableCors({
    origin: configService.get('CORS_ORIGIN')?.split(',') || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // 全局API前缀
  const apiPrefix = configService.get('API_PREFIX') || 'api';
  app.setGlobalPrefix(apiPrefix);

  // Swagger API文档 (仅非生产环境)
  if (env !== 'production') {
    setupSwagger(app);
    logger.log(`📚 API Documentation: http://localhost:${port}/${apiPrefix}/docs`);
  }

  await app.listen(port);
  
  logger.log(`🚀 Application is running on: http://localhost:${port}/${apiPrefix}`);
  logger.log(`🌍 Environment: ${env}`);
  logger.log(`✅ Health Check: http://localhost:${port}/${apiPrefix}/health`);
}

bootstrap().catch((err) => {
  console.error('❌ Failed to start application:', err);
  process.exit(1);
});
