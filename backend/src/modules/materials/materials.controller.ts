import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UploadedFile,
  UseInterceptors,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MaterialsService } from './materials.service';
import { OssService } from '../oss/oss.service';
import { TranscriptionService } from '../transcription/transcription.service';
import { CreateMaterialDto, UpdateMaterialDto, QueryMaterialDto } from './dto';

@ApiTags('素材')
@Controller('materials')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MaterialsController {
  constructor(
    private readonly materialsService: MaterialsService,
    private readonly ossService: OssService,
    private readonly transcriptionService: TranscriptionService,
  ) {}

  @Post('upload')
  @ApiOperation({ summary: '上传素材文件' })
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB
  }))
  async uploadFile(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: any,
  ) {
    try {
      console.log('📤 收到文件上传请求:', file.originalname, file.size);
      
      // 1. 上传文件到OSS（或返回本地URL）
      const uploadResult = await this.ossService.uploadFile(file, 'materials');
      console.log('✅ 文件上传成功:', uploadResult.url);

      // 2. 判断文件类型
      const fileType = this.getFileType(file.mimetype);
      console.log('📝 文件类型:', fileType);

      // 3. 创建素材记录（先不转写，避免失败）
      const material = await this.materialsService.create(req.user.id, {
        name: dto.name || file.originalname,
        scene: dto.scene || '',
        tags: dto.tags ? JSON.parse(dto.tags) : [],
        thumbnail: uploadResult.url,
        fileType: fileType,
        fileSize: file.size,
        note: '上传成功，可点击转写按钮进行AI转写',
      });

      console.log('✅ 素材记录创建成功, ID:', material.id);
      return material;
    } catch (error) {
      console.error('❌ 上传失败:', error.message, error.stack);
      throw error;
    }
  }

  @Post(':id/transcribe')
  @ApiOperation({ summary: '手动转写素材' })
  async transcribe(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const material = await this.materialsService.findOne(id, req.user.id);
    
    try {
      const result = await this.transcriptionService.transcribe({
        fileUrl: material.thumbnail,
        fileType: material.fileType as any,
        language: 'zh-CN',
      });
      
      await this.materialsService.update(id, req.user.id, {
        note: result.text,
      });
      
      return { success: true, text: result.text };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  private getFileType(mimetype: string): string {
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.startsWith('video/')) return 'video';
    if (mimetype.startsWith('audio/')) return 'audio';
    return 'image';
  }

  @Get()
  @ApiOperation({ summary: '获取素材列表' })
  findAll(@Request() req, @Query() query: QueryMaterialDto) {
    return this.materialsService.findAll(req.user.id, query);
  }

  @Get('stats/summary')
  @ApiOperation({ summary: '获取素材统计' })
  getStats(@Request() req) {
    return this.materialsService.getStatistics(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取素材详情' })
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.materialsService.findOne(id, req.user.id);
  }

  @Post()
  @ApiOperation({ summary: '创建素材' })
  create(@Request() req, @Body() dto: CreateMaterialDto) {
    return this.materialsService.create(req.user.id, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新素材' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
    @Body() dto: UpdateMaterialDto,
  ) {
    return this.materialsService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除素材' })
  delete(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.materialsService.remove(req.user.id, id);
  }

  @Post(':id/mark-used')
  @ApiOperation({ summary: '标记素材使用' })
  markUsed(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.materialsService.markAsUsed(id, req.user.id);
  }
}
