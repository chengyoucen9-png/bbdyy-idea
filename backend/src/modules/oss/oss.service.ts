import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as OSS from 'ali-oss';

@Injectable()
export class OssService {
  private client: OSS | null = null;
  private readonly enabled: boolean;

  constructor(private configService: ConfigService) {
    const accessKeyId = configService.get('OSS_ACCESS_KEY_ID');
    const accessKeySecret = configService.get('OSS_ACCESS_KEY_SECRET');
    
    // 只有配置了密钥才初始化OSS
    if (accessKeyId && accessKeySecret) {
      this.client = new OSS({
        region: configService.get('OSS_REGION'),
        accessKeyId,
        accessKeySecret,
        bucket: configService.get('OSS_BUCKET'),
      });
      this.enabled = true;
    } else {
      this.enabled = false;
      console.log('⚠️  OSS未配置，文件上传功能将不可用');
    }
  }

  async uploadFile(file: Express.Multer.File, folder: string = 'uploads') {
    if (!this.enabled || !this.client) {
      // 如果OSS未配置，返回模拟数据
      return {
        url: `http://localhost:3000/uploads/${file.originalname}`,
        name: file.originalname,
      };
    }

    const filename = `${folder}/${Date.now()}-${file.originalname}`;
    const result = await this.client.put(filename, file.buffer);
    return {
      url: result.url,
      name: result.name,
    };
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}
