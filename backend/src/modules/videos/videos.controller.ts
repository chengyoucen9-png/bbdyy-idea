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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { VideosService } from './videos.service';

@Controller('videos')
@UseGuards(JwtAuthGuard)
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  @Get()
  async findAll(@Request() req) {
    return this.videosService.findAll(req.user.id);
  }

  @Get('stats/summary')
  async getStats(@Request() req) {
    return this.videosService.getStatistics(req.user.id);
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id') id: number) {
    return this.videosService.findOne(req.user.id, id);
  }

  @Post()
  async create(@Request() req, @Body() data: any) {
    return this.videosService.create(req.user.id, data);
  }

  @Put(':id')
  async update(@Request() req, @Param('id') id: number, @Body() data: any) {
    return this.videosService.update(req.user.id, id, data);
  }

  @Delete(':id')
  async remove(@Request() req, @Param('id') id: number) {
    return this.videosService.remove(req.user.id, id);
  }
}
