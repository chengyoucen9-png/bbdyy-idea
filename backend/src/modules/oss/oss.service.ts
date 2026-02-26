import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class OssService {
  private uploadDir: string;

  constructor(private configService: ConfigService) {
    this.uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadFile(file: Express.Multer.File, folder = 'materials') {
    const ext = file.originalname.split('.').pop();
    const filename = `${Date.now()}-${uuidv4()}.${ext}`;
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
