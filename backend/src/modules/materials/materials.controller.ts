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
  UseInterceptors,
  UploadedFile,
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
@ApiBearerAuth('JWT-auth')
export class MaterialsController {
  constructor(
    private readonly materialsService: MaterialsService,
    private readonly ossService: OssService,
    private readonly transcriptionService: TranscriptionService,
  ) {}

  @Get()
  @ApiOperation({ summary: '获取素材列表' })
  async findAll(@Request() req, @Query() query: QueryMaterialDto) {
    return this.materialsService.findAll(req.user.id, query);
  }

  @Get('stats/summary')
  @ApiOperation({ summary: '获取素材统计' })
  async getStats(@Request() req) {
    return this.materialsService.getStatistics(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单个素材' })
  async findOne(@Request() req, @Param('id') id: number) {
    return this.materialsService.findOne(req.user.id, id);
  }

  @Post()
  @ApiOperation({ summary: '创建素材' })
  async create(@Request() req, @Body() createMaterialDto: CreateMaterialDto) {
    return this.materialsService.create(req.user.id, createMaterialDto);
  }

  @Post('upload')
  @ApiOperation({ summary: '上传素材文件（音视频自动转写）' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: any,
  ) {
    // 1. 上传文件到OSS
    const uploadResult = await this.ossService.uploadFile(file, 'materials');

    // 2. 判断文件类型
    const fileType = this.getFileType(file.mimetype);

    // 3. 如果是音频或视频，自动转写
    let transcriptionText = null;
    if (fileType === 'audio' || fileType === 'video') {
      try {
        const transcriptResult = await this.transcriptionService.transcribe({
          fileUrl: uploadResult.url,
          fileType: fileType as 'audio' | 'video',
          language: 'zh-CN',
          enablePunctuation: true,
        });
        transcriptionText = transcriptResult.text;
      } catch (error) {
        console.error('自动转写失败:', error.message);
      }
    }

    // 4. 创建素材记录
    return this.materialsService.create(req.user.id, {
      name: dto.name || file.originalname,
      scene: dto.scene || transcriptionText || '',
      tags: dto.tags ? JSON.parse(dto.tags) : [],
      thumbnail: uploadResult.url,
      fileType,
      fileSize: file.size,
      note: transcriptionText || dto.note || '',
    });
  }

  @Put(':id')
  @ApiOperation({ summary: '更新素材' })
  async update(
    @Request() req,
    @Param('id') id: number,
    @Body() updateMaterialDto: UpdateMaterialDto,
  ) {
    return this.materialsService.update(req.user.id, id, updateMaterialDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除素材' })
  async remove(@Request() req, @Param('id') id: number) {
    return this.materialsService.remove(req.user.id, id);
  }

  @Post(':id/mark-used')
  @ApiOperation({ summary: '标记素材已使用' })
  async markAsUsed(@Request() req, @Param('id') id: number) {
    return this.materialsService.markAsUsed(req.user.id, id);
  }

  @Post(':id/transcribe')
  @ApiOperation({ summary: '手动转写素材' })
  async transcribeMaterial(@Request() req, @Param('id') id: number) {
    const material = await this.materialsService.findOne(req.user.id, id);
    
    if (!material.thumbnail) {
      throw new Error('素材没有关联文件');
    }

    const result = await this.transcriptionService.transcribe({
      fileUrl: material.thumbnail,
      fileType: material.fileType as 'audio' | 'video',
      language: 'zh-CN',
      enablePunctuation: true,
    });

    await this.materialsService.update(req.user.id, id, {
      note: result.text,
      scene: result.text.substring(0, 100),
    });

    return result;
  }

  private getFileType(mimetype: string): string {
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.startsWith('video/')) return 'video';
    if (mimetype.startsWith('audio/')) return 'audio';
    return 'other';
  }
}
