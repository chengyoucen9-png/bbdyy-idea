import { Controller, Post, Get, Param, Body, Delete } from '@nestjs/common';
import { CrawlerService } from './crawler.service';
import { CrawlDouyinTalentDto, CrawlDouyinTalentResponse, BatchCrawlDto, BatchCrawlResponse } from './dto';

@Controller('crawler')
export class CrawlerController {
  constructor(private crawlerService: CrawlerService) {}

  @Post('douyin/talent/:talentId')
  async crawlDouyinTalent(
    @Param('talentId') talentId: number,
    @Body() dto: CrawlDouyinTalentDto,
  ): Promise<CrawlDouyinTalentResponse> {
    return this.crawlerService.crawlDouyinTalent(talentId, dto);
  }

  @Post('batch')
  async batchCrawl(
    @Body() dto: BatchCrawlDto,
  ): Promise<BatchCrawlResponse> {
    return this.crawlerService.batchCrawl(dto);
  }

  @Get('tasks')
  async getTasks() {
    return this.crawlerService.getTasks();
  }

  @Get('tasks/:id')
  async getTaskById(@Param('id') id: number) {
    return this.crawlerService.getTaskById(id);
  }

  @Get('tasks/:id/records')
  async getTaskRecords(@Param('id') id: number) {
    return this.crawlerService.getRecords(id);
  }

  @Delete('tasks/:id')
  async deleteTask(@Param('id') id: number) {
    return this.crawlerService.deleteTask(id);
  }
}
