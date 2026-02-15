import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('短视频内容生产系统 API')
    .setDescription('企业级短视频内容生产管理系统 RESTful API 文档')
    .setVersion('1.0.0')
    .setContact(
      '技术支持',
      'https://your-domain.com',
      'support@your-domain.com',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: '输入JWT Token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('认证', '用户认证相关接口')
    .addTag('用户', '用户管理相关接口')
    .addTag('素材', '素材管理相关接口')
    .addTag('选题', '选题管理相关接口')
    .addTag('视频', '视频管理相关接口')
    .addTag('AI配置', 'AI模型配置相关接口')
    .addTag('文件上传', '文件上传相关接口')
    .addTag('系统健康', '系统健康检查接口')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
    },
    customSiteTitle: '短视频内容生产系统 - API文档',
  });
}
