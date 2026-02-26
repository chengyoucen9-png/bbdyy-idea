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
  Patch,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiProvidersService } from './ai-providers.service';

@Controller('ai-providers')
@UseGuards(JwtAuthGuard)
export class AiProvidersController {
  constructor(private readonly aiProvidersService: AiProvidersService) {}

  @Get()
  async findAll(@Request() req) {
    return this.aiProvidersService.findAll(req.user.id);
  }

  @Get('default')
  async findDefault(@Request() req) {
    return this.aiProvidersService.findDefault(req.user.id);
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id') id: number) {
    return this.aiProvidersService.findOne(req.user.id, id);
  }

  @Post()
  async create(@Request() req, @Body() data: any) {
    return this.aiProvidersService.create(req.user.id, data);
  }

  @Put(':id')
  async update(@Request() req, @Param('id') id: number, @Body() data: any) {
    return this.aiProvidersService.update(req.user.id, id, data);
  }

  @Patch(':id/set-default')
  async setDefault(@Request() req, @Param('id') id: number) {
    return this.aiProvidersService.setDefault(req.user.id, id);
  }

  @Delete(':id')
  async remove(@Request() req, @Param('id') id: number) {
    return this.aiProvidersService.remove(req.user.id, id);
  }

  @Post('chat')
  async chat(@Body() body: { model: string; messages: { role: string; content: string }[] }) {
    const { model, messages } = body;

    let endpoint: string;
    let apiKey: string;
    let keyName: string;

    if (model.startsWith('deepseek')) {
      endpoint = 'https://api.deepseek.com/v1/chat/completions';
      apiKey = process.env.DEEPSEEK_API_KEY || '';
      keyName = 'DEEPSEEK_API_KEY';
    } else if (model.startsWith('moonshot')) {
      endpoint = 'https://api.moonshot.cn/v1/chat/completions';
      apiKey = process.env.KIMI_API_KEY || '';
      keyName = 'KIMI_API_KEY';
    } else {
      endpoint = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
      apiKey = process.env.DASHSCOPE_API_KEY || '';
      keyName = 'DASHSCOPE_API_KEY';
    }

    if (!apiKey) {
      throw new HttpException(
        `${keyName} 未配置，请在服务器 .env 文件中添加该 API Key 后重启后端`,
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const axios = require('axios');
      const response = await axios.default.post(
        endpoint,
        { model, messages, stream: false },
        {
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          timeout: 60000,
        },
      );
      return { content: response.data?.choices?.[0]?.message?.content || '' };
    } catch (error) {
      const detail =
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        error.message ||
        '调用 AI 接口失败';
      throw new HttpException(detail, HttpStatus.BAD_GATEWAY);
    }
  }
}
