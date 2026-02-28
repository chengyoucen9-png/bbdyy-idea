import { Controller, Post, Get, Delete, Body, UploadedFile, UseInterceptors, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CrawlerSyncService } from './crawler-sync.service';

@Controller('crawler/sync')
export class CrawlerSyncController {
  constructor(private crawlerSyncService: CrawlerSyncService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadTable(@UploadedFile() file: Express.Multer.File) {
    return this.crawlerSyncService.uploadTable(file);
  }

  @Get('data')
  async getTableData() {
    return this.crawlerSyncService.getTableData();
  }

  @Post('to-materials')
  async syncToMaterials(@Body() data: any[]) {
    return this.crawlerSyncService.syncToMaterials(data);
  }

  @Post('from-feishu')
  async syncFromFeishuTable(@Body() body: { url: string }) {
    return this.crawlerSyncService.syncFromFeishuTable(body.url);
  }

  @Post('import-data')
  async importData(@Body() body: any) {
    // 支持两种数据格式：
    // 1. { data: [...] }
    // 2. 单个对象或对象数组
    let data = [];
    if (body.data && Array.isArray(body.data)) {
      data = body.data;
    } else if (Array.isArray(body)) {
      data = body;
    } else if (typeof body === 'object' && body !== null) {
      data = [body];
    }
    
    return this.crawlerSyncService.importData(data);
  }

  @Get('imported-data')
  async getImportedData(@Query() query: any) {
    return this.crawlerSyncService.getImportedData(query);
  }

  @Delete('clear-data')
  async clearAllData() {
    return this.crawlerSyncService.clearAllData();
  }
}
