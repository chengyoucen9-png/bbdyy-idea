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
  InternalServerErrorException,
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
  async getStats(@Request() req, @Query('type') type?: string) {
    return this.materialsService.getStatistics(req.user.id, type);
  }

  /**
   * 根据关键词搜索匹配素材（供选题页AI推荐用，不需要topicId）
   * POST /materials/search-by-keywords
   * body: { keywords: string[] } 或 { text: string }
   */
  @Post('search-by-keywords')
  @ApiOperation({ summary: '按关键词匹配素材' })
  async searchByKeywords(
    @Request() req,
    @Body() body: { keywords?: string[]; text?: string },
  ) {
    let keywords: string[] = [];

    if (body.keywords && body.keywords.length > 0) {
      keywords = body.keywords;
    } else if (body.text) {
      // 简单分词：按标点、空格切割，过滤掉1字以下的
      keywords = body.text
        .split(/[\s，。！？、；：""''【】《》\n,!?.;:]+/)
        .map((s) => s.trim())
        .filter((s) => s.length >= 2)
        .slice(0, 20);
    }

    const materials = await this.materialsService.searchByKeywords(req.user.id, keywords);
    return { materials, keywords };
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
    const filename = dto.name || file.originalname;
    const existing = await this.materialsService.findDuplicate(req.user.id, filename, file.size);
    if (existing) return existing;

    const uploadResult = await this.ossService.uploadFile(file, 'materials');
    const fileUrl = uploadResult.url;
    const fileType = this.getFileType(file.mimetype);

    let transcriptionText = null;
    if (fileType === 'audio' || fileType === 'video') {
      try {
        const transcriptResult = await this.transcriptionService.transcribe({
          fileUrl,
          fileType: fileType as 'audio' | 'video',
          language: 'zh-CN',
          enablePunctuation: true,
        });
        transcriptionText = transcriptResult.text;
      } catch (error) {
        console.error('自动转写失败:', error.message);
      }
    }

    // AI 提炼标签和场景
    let tags: string[] = [];
    let scene = dto.scene || '';
    if (transcriptionText) {
      try {
        const axios = require('axios');
        const aiRes = await axios.default.post(
          process.env.AI_TEXT_ENDPOINT || 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
          {
            model: process.env.AI_TEXT_MODEL || 'qwen-turbo',
            input: {
              messages: [{
                role: 'user',
                content: `请根据以下视频转写文本，提炼3-6个简短标签（每个标签2-6个字），以及一句话场景描述（不超过20字）。\n返回格式为JSON：{tags: [标签1, 标签2, ...], scene: 场景描述}\n只返回JSON，不要其他内容。\n\n转写文本：${transcriptionText.substring(0, 500)}`
              }]
            }
          },
          {
            headers: { 'Authorization': 'Bearer ' + process.env.DASHSCOPE_API_KEY, 'Content-Type': 'application/json' },
            timeout: 30000,
          }
        );
        const aiText = aiRes.data?.output?.text || '';
        const cleaned = aiText.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        tags = parsed.tags || [];
        scene = parsed.scene || transcriptionText.substring(0, 20);
      } catch {
        scene = transcriptionText.substring(0, 20);
      }
    } else if (fileType === 'image') {
      try {
        const axios = require('axios');
        const base64Image = file.buffer.toString('base64');
        const aiRes = await axios.default.post(
          process.env.AI_VISION_ENDPOINT || 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
          {
            model: process.env.AI_VISION_MODEL || 'qwen-vl-plus',
            input: {
              messages: [{
                role: 'user',
                content: [
                  { image: `data:${file.mimetype};base64,${base64Image}` },
                  { text: '请分析这张图片，提炼3-6个简短标签（每个2-6字），以及一句话场景描述（不超过20字）。返回格式为JSON：{"tags":["标签1","标签2"],"scene":"场景描述"}，只返回JSON，不要其他内容。' },
                ],
              }],
            },
          },
          {
            headers: { 'Authorization': 'Bearer ' + process.env.DASHSCOPE_API_KEY, 'Content-Type': 'application/json' },
            timeout: 30000,
          }
        );
        const aiText = aiRes.data?.output?.choices?.[0]?.message?.content?.[0]?.text || '';
        const cleaned = aiText.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        tags = parsed.tags || [];
        scene = parsed.scene || dto.scene || '';
      } catch (error) {
        console.error('图片AI分析失败:', error.message);
      }
    }

    return this.materialsService.create(req.user.id, {
      name: filename,
      scene,
      tags,
      ossUrl: fileUrl,
      fileType: fileType as any,
      fileSize: file.size,
      note: transcriptionText || dto.note || '',
      authorName: dto.authorName || null,
    });
  }

  @Put(':id')
  async update(@Request() req, @Param('id') id: number, @Body() updateMaterialDto: UpdateMaterialDto) {
    return this.materialsService.update(req.user.id, id, updateMaterialDto);
  }

  @Delete(':id')
  async remove(@Request() req, @Param('id') id: number) {
    return this.materialsService.remove(req.user.id, id);
  }

  @Post(':id/mark-used')
  async markAsUsed(@Request() req, @Param('id') id: number) {
    return this.materialsService.markAsUsed(req.user.id, id);
  }

  @Post(':id/transcribe')
  async transcribeMaterial(@Request() req, @Param('id') id: number) {
    const material = await this.materialsService.findOne(req.user.id, id);
    const fileUrl = (material as any).ossUrl || material.thumbnail;
    if (!fileUrl) throw new InternalServerErrorException('素材没有关联文件');

    let result: any;
    try {
      result = await this.transcriptionService.transcribe({
        fileUrl,
        fileType: material.fileType as 'audio' | 'video',
        language: 'zh-CN',
        enablePunctuation: true,
      });
    } catch (err) {
      throw new InternalServerErrorException(err.message || '转写失败');
    }

    let tags: string[] = [], scene = '';
    try {
      const axios = require('axios');
      const aiRes = await axios.default.post(
        process.env.AI_TEXT_ENDPOINT || 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
        { model: process.env.AI_TEXT_MODEL || 'qwen-turbo', input: { messages: [{ role: 'user', content: `提炼标签和场景。返回JSON：{tags:[],scene:""}。转写：${result.text.substring(0, 500)}` }] } },
        { headers: { 'Authorization': 'Bearer ' + process.env.DASHSCOPE_API_KEY, 'Content-Type': 'application/json' }, timeout: 30000 }
      );
      const parsed = JSON.parse((aiRes.data?.output?.text || '').replace(/```json|```/g, '').trim());
      tags = parsed.tags || []; scene = parsed.scene || '';
    } catch { scene = result.text.substring(0, 20); }

    await this.materialsService.update(req.user.id, id, { note: result.text, tags, scene });
    return { ...result, tags, scene };
  }

  private getFileType(mimetype: string): string {
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.startsWith('video/')) return 'video';
    if (mimetype.startsWith('audio/')) return 'audio';
    return 'other';
  }
}
