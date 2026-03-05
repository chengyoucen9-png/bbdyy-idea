import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class OssService {
  private readonly logger = new Logger(OssService.name);
  private client: any = null;
  private uploadDir: string;
  private bucket: string;
  private endpoint: string;
  private publicEndpoint: string;

  constructor(configService: ConfigService) {
    this.uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }

    const region = configService.get('OSS_REGION');
    const accessKeyId = configService.get('OSS_ACCESS_KEY_ID');
    const accessKeySecret = configService.get('OSS_ACCESS_KEY_SECRET');
    const bucket = configService.get('OSS_BUCKET');
    const endpoint = configService.get('OSS_ENDPOINT') || 'https://oss-cn-hangzhou-internal.aliyuncs.com';

    this.bucket = bucket;
    this.endpoint = endpoint;
    this.publicEndpoint = endpoint.replace('-internal', '');

    if (region && accessKeyId && accessKeySecret && bucket && bucket !== 'your-bucket-name') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const OSS = require('ali-oss');
        this.client = new OSS({
          region,
          accessKeyId,
          accessKeySecret,
          bucket,
          endpoint,
          internal: endpoint.includes('-internal'),
          secure: true,
          timeout: 120000,
        });
        this.logger.log(`阿里云OSS已初始化，bucket: ${bucket}, endpoint: ${endpoint}`);
      } catch (e) {
        this.logger.warn('OSS初始化失败: ' + e.message);
      }
    } else {
      this.logger.log('OSS未配置，使用本地存储');
    }
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  async uploadFile(file: Express.Multer.File, folder = 'materials') {
    const ext = file.originalname.split('.').pop();
    const filename = `${Date.now()}-${uuidv4()}.${ext}`;

    if (this.client) {
      const key = `${folder}/${filename}`;
      const result = await this.client.put(key, file.buffer);
      const publicUrl = result.url.replace(this.endpoint, this.publicEndpoint);
      return { url: publicUrl, name: key, size: file.size };
    }

    const folderPath = path.join(this.uploadDir, folder);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    const filePath = path.join(folderPath, filename);
    fs.writeFileSync(filePath, file.buffer);
    return {
      url: `/uploads/${folder}/${filename}`,
      name: `${folder}/${filename}`,
      size: file.size,
    };
  }

  async uploadLocalFile(localPath: string, key: string): Promise<string> {
    if (!this.client) throw new Error('OSS未配置');
    const result = await this.client.put(key, path.normalize(localPath));
    return result.url.replace(this.endpoint, this.publicEndpoint);
  }

  async deleteFile(filename: string) {
    const filePath = path.join(this.uploadDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return { message: '删除成功' };
  }

  getPublicUrl(filename: string) {
    return `/uploads/${filename}`;
  }
}
