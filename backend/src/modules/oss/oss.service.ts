import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as OSS from 'ali-oss';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class OssService {
  private client: OSS;

  constructor(private configService: ConfigService) {
    this.client = new OSS({
      region: this.configService.get('OSS_REGION'),
      accessKeyId: this.configService.get('OSS_ACCESS_KEY_ID'),
      accessKeySecret: this.configService.get('OSS_ACCESS_KEY_SECRET'),
      bucket: this.configService.get('OSS_BUCKET'),
    });
  }

  async uploadFile(file: Express.Multer.File, folder = 'materials') {
    const ext = file.originalname.split('.').pop();
    const filename = `${folder}/${Date.now()}-${uuidv4()}.${ext}`;

    const result = await this.client.put(filename, file.buffer);

    return {
      url: result.url,
      name: result.name,
      size: file.size,
    };
  }

  async deleteFile(filename: string) {
    await this.client.delete(filename);
    return { message: '删除成功' };
  }

  getPublicUrl(filename: string) {
    const endpoint = this.configService.get('OSS_ENDPOINT');
    const bucket = this.configService.get('OSS_BUCKET');
    return `https://${bucket}.${endpoint}/${filename}`;
  }
}
