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
import { TopicsService } from './topics.service';
import { CreateTopicDto, UpdateTopicDto } from './dto';

@Controller('topics')
@UseGuards(JwtAuthGuard)
export class TopicsController {
  constructor(private readonly topicsService: TopicsService) {}

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
  async update(
    @Request() req,
    @Param('id') id: number,
    @Body() updateTopicDto: UpdateTopicDto,
  ) {
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
}
