import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OssService } from './oss.service';

@Controller('oss')
@UseGuards(JwtAuthGuard)
export class OssController {
  constructor(private readonly ossService: OssService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    return this.ossService.uploadFile(file);
  }
}
