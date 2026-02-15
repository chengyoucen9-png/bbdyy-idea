import { utilities as nestWinstonModuleUtilities, WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';
import { ConfigService } from '@nestjs/config';

export const createWinstonLogger = (configService: ConfigService) => {
  const env = configService.get('NODE_ENV') || 'development';
  const logLevel = configService.get('LOG_LEVEL') || 'info';

  // 日志格式
  const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json(),
  );

  // 控制台输出格式（开发环境友好）
  const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.ms(),
    nestWinstonModuleUtilities.format.nestLike('VideoProductionAPI', {
      colors: true,
      prettyPrint: true,
    }),
  );

  // Transports配置
  const transports: winston.transport[] = [
    // 控制台输出
    new winston.transports.Console({
      format: env === 'production' ? logFormat : consoleFormat,
    }),
  ];

  // 生产环境添加文件日志
  if (env === 'production') {
    // 错误日志文件
    transports.push(
      new DailyRotateFile({
        dirname: 'logs',
        filename: 'error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        maxSize: '20m',
        maxFiles: '30d',
        format: logFormat,
      }),
    );

    // 综合日志文件
    transports.push(
      new DailyRotateFile({
        dirname: 'logs',
        filename: 'combined-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        format: logFormat,
      }),
    );

    // HTTP请求日志
    transports.push(
      new DailyRotateFile({
        dirname: 'logs',
        filename: 'http-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '7d',
        level: 'http',
        format: logFormat,
      }),
    );
  }

  return WinstonModule.createLogger({
    level: logLevel,
    format: logFormat,
    transports,
    exceptionHandlers: [
      new winston.transports.File({ filename: 'logs/exceptions.log' }),
    ],
    rejectionHandlers: [
      new winston.transports.File({ filename: 'logs/rejections.log' }),
    ],
  });
};
