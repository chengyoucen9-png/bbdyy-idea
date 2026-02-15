import { Controller, Post, UseGuards, Request, UploadedFile, UseInterceptors, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MaterialsService } from './materials.service';

@Controller('materials')
@UseGuards(JwtAuthGuard)
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 100 * 1024 * 1024 } }))
  async uploadFile(@Request() req, @UploadedFile() file: Express.Multer.File, @Body() dto: any) {
    console.log('=== 上传开始 ===');
    console.log('文件:', file.originalname, file.size);
    console.log('用户:', req.user.id);
    
    const fileType = file.mimetype.startsWith('image/') ? 'image' : file.mimetype.startsWith('video/') ? 'video' : 'audio';
    
    const result = await this.materialsService.create(req.user.id, {
      name: dto.name || file.originalname,
      scene: '',
      tags: [],
      thumbnail: 'http://localhost:3000/placeholder.jpg',
      fileType: fileType,
      fileSize: file.size,
      note: '已上传',
    });
    
    console.log('=== 上传成功 ===', result.id);
    return result;
  }
}
