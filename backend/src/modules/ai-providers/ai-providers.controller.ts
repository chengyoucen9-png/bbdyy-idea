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
}
