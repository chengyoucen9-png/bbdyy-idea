import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import axios from 'axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TopicsService } from './topics.service';
import { CreateTopicDto, UpdateTopicDto } from './dto';
import { Material } from '../materials/material.entity';

@Controller('topics')
@UseGuards(JwtAuthGuard)
export class TopicsController {
  constructor(
    private readonly topicsService: TopicsService,
    @InjectRepository(Material)
    private materialsRepository: Repository<Material>,
  ) {}

  @Get()
  async findAll(@Request() req) {
    return this.topicsService.findAll(req.user.id);
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id') id: number) {
    return this.topicsService.findOne(req.user.id, id);
  }

  @Post()
  async create(@Request() req, @Body() createTopicDto: CreateTopicDto) {
    return this.topicsService.create(req.user.id, createTopicDto);
  }

  @Put(':id')
  async update(@Request() req, @Param('id') id: number, @Body() updateTopicDto: UpdateTopicDto) {
    return this.topicsService.update(req.user.id, id, updateTopicDto);
  }

  @Delete(':id')
  async remove(@Request() req, @Param('id') id: number) {
    return this.topicsService.remove(req.user.id, id);
  }

  @Get('stats/summary')
  async getStats(@Request() req) {
    return this.topicsService.getStatistics(req.user.id);
  }

  @Post(':id/search-materials')
  async searchRelatedMaterials(@Request() req, @Param('id') id: number) {
    const topic = await this.topicsService.findOne(req.user.id, id);
    const keywords = [topic.title, ...(topic.description?.split(/[，,。\s]+/).slice(0, 3) || [])].filter(Boolean);
    const seen = new Set();
    const results: any[] = [];
    for (const kw of keywords) {
      const items = await this.materialsRepository.createQueryBuilder('m')
        .where('m.userId = :uid', { uid: req.user.id })
        .andWhere('(m.name LIKE :kw OR m.note LIKE :kw OR m.scene LIKE :kw)', { kw: `%${kw}%` })
        .take(3).getMany();
      for (const item of items) {
        if (!seen.has(item.id)) { seen.add(item.id); results.push(item); }
      }
    }
    return { materials: results, keywords };
  }

  @Post(':id/generate-script')
  async generateScript(@Request() req, @Param('id') id: number, @Body() body: { materialIds?: number[] }) {
    const topic = await this.topicsService.findOne(req.user.id, id);
    let materialContext = '';
    if (body.materialIds?.length) {
      const mats = await this.materialsRepository.findByIds(body.materialIds);
      materialContext = mats.map((m) => m.note).filter(Boolean).join('\n\n').substring(0, 800);
    }
    const prompt = `你是专业短视频文案创作者。根据以下选题创作短视频文稿。\n\n选题：${topic.title}\n描述：${topic.description || '无'}\n${materialContext ? '\n参考素材：\n' + materialContext : ''}\n\n要求：1.开头5秒强钩子 2.口语化 3.约300-400字 4.结尾有引导\n\n直接输出文稿。`;
    const aiRes = await axios.post(
      process.env.AI_TEXT_ENDPOINT || 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
      { model: process.env.AI_TEXT_MODEL || 'qwen-turbo', input: { messages: [{ role: 'user', content: prompt }] } },
      { headers: { Authorization: 'Bearer ' + process.env.DASHSCOPE_API_KEY, 'Content-Type': 'application/json' }, timeout: 60000 },
    );
    const script = (aiRes.data as any)?.output?.text || '';
    await this.topicsService.update(req.user.id, id, { script } as any);
    return { script };
  }

  @Post(':id/generate-titles')
  async generateTitles(@Request() req, @Param('id') id: number, @Body() body: { platform?: string }) {
    const topic = await this.topicsService.findOne(req.user.id, id);
    const platform = body.platform || '小红书';
    const script = (topic as any).script?.substring(0, 200) || topic.description || '';
    const prompt = `你是${platform}爆款标题专家。选题：${topic.title}，文稿：${script}。生成5个标题，返回JSON：{"titles":["标题1","标题2","标题3","标题4","标题5"]}只返回JSON。`;
    const aiRes = await axios.post(
      process.env.AI_TEXT_ENDPOINT || 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
      { model: process.env.AI_TEXT_MODEL || 'qwen-turbo', input: { messages: [{ role: 'user', content: prompt }] } },
      { headers: { Authorization: 'Bearer ' + process.env.DASHSCOPE_API_KEY, 'Content-Type': 'application/json' }, timeout: 30000 },
    );
    const text = (aiRes.data as any)?.output?.text || '';
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    const titles = parsed.titles || [];
    await this.topicsService.update(req.user.id, id, { titles } as any);
    return { titles };
  }

  @Post(':id/optimize-opening')
  async optimizeOpening(@Request() req, @Param('id') id: number) {
    const topic = await this.topicsService.findOne(req.user.id, id);
    const script = (topic as any).script;
    if (!script) return { error: '请先生成文稿' };
    const prompt = `优化以下短视频开头前5秒，给3个风格方案，返回JSON：{"openings":[{"style":"提问式","content":"..."},{"style":"反常识","content":"..."},{"style":"数字冲击","content":"..."}]}只返回JSON。\n原始开头：${script.substring(0, 100)}`;
    const aiRes = await axios.post(
      process.env.AI_TEXT_ENDPOINT || 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
      { model: process.env.AI_TEXT_MODEL || 'qwen-turbo', input: { messages: [{ role: 'user', content: prompt }] } },
      { headers: { Authorization: 'Bearer ' + process.env.DASHSCOPE_API_KEY, 'Content-Type': 'application/json' }, timeout: 30000 },
    );
    const text = (aiRes.data as any)?.output?.text || '';
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  }
}
