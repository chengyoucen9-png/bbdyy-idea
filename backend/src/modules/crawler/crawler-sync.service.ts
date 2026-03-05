import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Material, FileType, DownloadStatus } from '../materials/material.entity';
import { Client } from '@larksuiteoapi/node-sdk';
import axios from 'axios';
import { TalentService } from '../talent/talent.service';
import { PlatformType } from '../talent/talent.entity';
import { OssService } from '../oss/oss.service';

// 内存存储表格数据
class InMemoryTableStorage {
  private tableData: any[] = [];

  saveData(data: any[]) {
    this.tableData = data;
  }

  getData() {
    return this.tableData;
  }
}

@Injectable()
export class CrawlerSyncService {
  private readonly logger = new Logger(CrawlerSyncService.name);
  private readonly uploadDir = path.join(__dirname, '..', '..', '..', 'uploads', 'tables');
  private readonly videoDir = path.join(__dirname, '..', '..', '..', 'uploads', 'videos');
  private storage = new InMemoryTableStorage();

  constructor(
    @InjectRepository(Material) private materialsRepository: Repository<Material>,
    private configService: ConfigService,
    private talentService: TalentService,
    private ossService: OssService,
  ) {
    // 确保上传目录存在
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }

    // 确保视频目录存在
    if (!fs.existsSync(this.videoDir)) {
      fs.mkdirSync(this.videoDir, { recursive: true });
    }

    // 服务启动时将遗留的 downloading 状态重置为 failed
    this.materialsRepository.update(
      { downloadStatus: DownloadStatus.DOWNLOADING },
      { downloadStatus: DownloadStatus.FAILED },
    ).catch(() => {});
  }

  /** 每次调用时使用最新 env 创建飞书客户端，确保页面保存配置后无需重启即生效 */
  private createFeishuClient(): Client {
    return new Client({
      appId: process.env.FEISHU_APP_ID || this.configService.get('FEISHU_APP_ID'),
      appSecret: process.env.FEISHU_APP_SECRET || this.configService.get('FEISHU_APP_SECRET'),
      disableTokenCache: false,
    });
  }
  
  // 下载视频文件
  private async downloadVideo(downloadUrl: string, videoId: string, description?: string): Promise<{ localPath: string; fileName: string } | null> {
    try {
      this.logger.log(`开始下载视频: ${downloadUrl}`);
      
      // 使用详情作为文件名，如果没有详情则使用videoId
      let baseName = videoId;
      if (description && description.trim()) {
        // 移除特殊字符，只保留中文、英文、数字
        baseName = description.trim().replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '_');
        // 限制文件名长度
        if (baseName.length > 50) {
          baseName = baseName.substring(0, 50);
        }
      }
      
      const fileName = `${baseName}_${Date.now()}.mp4`;
      const localPath = path.join(this.videoDir, fileName);
      
      const response = await axios({
        method: 'GET',
        url: downloadUrl,
        responseType: 'arraybuffer',
        timeout: 60000,
      });
      
      fs.writeFileSync(localPath, Buffer.from(response.data as ArrayBuffer));
      this.logger.log(`视频下载完成: ${localPath}`);
      
      return { localPath, fileName };
    } catch (error) {
      this.logger.error(`下载视频失败: ${downloadUrl}`, error);
      return null;
    }
  }

  async uploadTable(file: Express.Multer.File) {
    try {
      this.logger.log(`开始处理表格文件: ${file.originalname}`);

      // 保存文件到本地
      const filePath = path.join(this.uploadDir, file.originalname);
      fs.writeFileSync(filePath, file.buffer);

      // 解析表格文件
      let data: any[] = [];
      const fileExtension = path.extname(file.originalname).toLowerCase();

      if (fileExtension === '.xlsx' || fileExtension === '.xls') {
        // 解析Excel文件
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        data = XLSX.utils.sheet_to_json(worksheet);
      } else if (fileExtension === '.csv') {
        // 解析CSV文件
        const csvContent = file.buffer.toString('utf8');
        const lines = csvContent.split('\n');
        const headers = lines[0].split(',');
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',');
          if (values.length === headers.length) {
            const row: any = {};
            headers.forEach((header, index) => {
              row[header] = values[index];
            });
            data.push(row);
          }
        }
      }

      // 为每条数据添加ID
      const dataWithId = data.map((item, index) => ({
        id: `row_${index + 1}`,
        ...item,
      }));

      // 存储数据到内存
      this.storage.saveData(dataWithId);

      this.logger.log(`成功解析表格文件，共 ${dataWithId.length} 条数据`);

      return { message: '表格上传成功', data: dataWithId };
    } catch (error) {
      this.logger.error('表格上传失败', error);
      throw error;
    }
  }

  async getTableData() {
    const data = this.storage.getData();
    return { message: '获取表格数据成功', data };
  }

  async syncToMaterials(data: any[]) {
    try {
      this.logger.log(`开始同步 ${data.length} 条数据到素材库`);

      for (const item of data) {
        // 创建素材实体
        const material = this.materialsRepository.create({
          userId: 3,
          name: item.name || item.title || item['详情'] || item.description || '无标题',
          scene: item.scene || item.description || null,
          tags: item.tags ? item.tags.split(',').map((tag: string) => tag.trim()) : null,
          duration: item.duration || null,
          note: item.note || item.content || null,
          ossUrl: item.url || item.link || null,
          thumbnail: item.thumbnail || item.cover || null,
          fileType: this.getFileType(item.type || item.fileType),
          fileSize: item.size || item.fileSize || 0,
          usageCount: 0,
          lastUsed: null,
        });

        await this.materialsRepository.save(material);
      }

      this.logger.log(`成功同步 ${data.length} 条数据到素材库`);

      return { message: `成功同步 ${data.length} 条数据到素材库` };
    } catch (error) {
      this.logger.error('同步到素材库失败', error);
      throw error;
    }
  }

  // 从飞书多维表格获取数据
  async syncFromFeishuTable(url: string) {
    try {
      this.logger.log(`开始从飞书多维表格同步数据: ${url}`);

      // 解析飞书表格地址
      const { appToken, tableId } = this.parseFeishuTableUrl(url);
      this.logger.log(`解析到 appToken: ${appToken}, tableId: ${tableId}`);

      // 使用飞书API获取表格记录（每次调用时读取最新配置）
      const response = await this.createFeishuClient().bitable.appTableRecord.list({
        path: {
          app_token: appToken,
          table_id: tableId,
        },
        params: {
          page_size: 100,
          user_id_type: 'open_id',
        },
      });

      this.logger.log(`飞书API响应: ${JSON.stringify(response)}`);

      // 解析表格数据
      const tableData = response.data?.items || [];
      this.logger.log(`获取到表格数据，共 ${tableData.length} 条`);

      // 转换数据格式
      const formattedData = tableData.map((item: any, index: number) => ({
        id: `row_${index + 1}`,
        sheetName: '多维表格',
        名称: item.fields?.名称 || '',
        类型: item.fields?.类型 || '',
        链接: item.fields?.链接 || '',
        ...item.fields,
      }));

      // 存储数据到内存
      this.storage.saveData(formattedData);

      this.logger.log(`成功从飞书多维表格同步数据，共 ${formattedData.length} 条数据`);

      return { message: '从飞书多维表格同步成功', data: formattedData };
    } catch (error) {
      this.logger.error('从飞书多维表格同步失败', error);
      throw error;
    }
  }

  // 解析飞书表格地址
  private parseFeishuTableUrl(url: string) {
    // 从URL中提取app_token和table_id
    // 匹配多种飞书表格URL格式
    let appToken = '';
    let tableId = '';
    
    // 格式1: wiki/{app_token}?table={table_id}&...
    const regex1 = /wiki\/([^?]+)\?table=(.+?)&/;
    const match1 = url.match(regex1);
    
    if (match1) {
      appToken = match1[1];
      tableId = match1[2];
    } else {
      // 格式2: app/{app_token}/table/{table_id}
      const regex2 = /app\/([^\/]+)\/table\/([^\/]+)/;
      const match2 = url.match(regex2);
      
      if (match2) {
        appToken = match2[1];
        tableId = match2[2];
      } else {
        // 格式3: 直接从URL参数中提取
        const urlObj = new URL(url);
        appToken = urlObj.searchParams.get('app_token') || urlObj.searchParams.get('appToken') || '';
        tableId = urlObj.searchParams.get('table_id') || urlObj.searchParams.get('tableId') || '';
      }
    }
    
    if (!appToken || !tableId) {
      throw new Error('无效的飞书表格地址，无法提取app_token和table_id');
    }

    return { appToken, tableId };
  }

  // 根据类型字符串获取文件类型枚举
  private getFileType(type: string): FileType {
    const lowerType = type?.toLowerCase();
    if (lowerType?.includes('image') || lowerType?.includes('图片')) {
      return FileType.IMAGE;
    } else if (lowerType?.includes('video') || lowerType?.includes('视频')) {
      return FileType.VIDEO;
    } else if (lowerType?.includes('audio') || lowerType?.includes('音频')) {
      return FileType.AUDIO;
    } else if (lowerType?.includes('text') || lowerType?.includes('文本')) {
      return FileType.TEXT;
    } else {
      return FileType.VIDEO; // 默认类型
    }
  }

  // 辅助函数：处理空值和空格字符串
  private getValue(value: any, defaultValue: any = null) {
    if (value === null || value === undefined) return defaultValue;
    if (typeof value === 'string' && value.trim() === '') return defaultValue;
    return value;
  }

  // 辅助函数：处理数字类型
  private getNumber(value: any, defaultValue: number = 0) {
    const val = this.getValue(value);
    if (val === null) return defaultValue;
    const num = Number(val);
    return isNaN(num) ? defaultValue : num;
  }

  // 辅助函数：处理时间字段（支持字符串格式和时间戳）
  private getTimestamp(value: any): number | null {
    const val = this.getValue(value);
    if (val === null) return null;
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const date = new Date(val);
      if (!isNaN(date.getTime())) return date.getTime();
    }
    return null;
  }

  // 后台处理单条数据：先保存记录（pending），再下载视频并更新状态
  private async processItemInBackground(item: any): Promise<void> {
    // 打印原始字段名，便于排查字段名映射问题
    this.logger.log(`[字段诊断] 原始字段: ${Object.keys(item).join(', ')}`);

    const downloadUrl = this.getValue(item['下载地址']) || this.getValue(item.downloadUrl) || null;
    const videoId = this.getValue(item['视频编号']) || this.getValue(item.videoId) || `video_${Date.now()}`;
    const description = this.getValue(item['详情']) || this.getValue(item.description) || null;

    // 第一步：立即保存素材记录
    const material = this.materialsRepository.create({
      userId: 3,
      name: this.getValue(item['名称']) || this.getValue(item.name) || this.getValue(item.title) || description || '无标题',
      scene: this.getValue(item.scene) || null,
      tags: this.getValue(item.tags) ? (Array.isArray(item.tags) ? item.tags : item.tags.split(',').map((tag: string) => tag.trim())) : null,
      duration: this.getValue(item['视频时长']) || this.getValue(item.duration) || null,
      note: this.getValue(item.note) || this.getValue(item.content) || null,
      ossUrl: this.getValue(item['链接']) || this.getValue(item.url) || this.getValue(item.link) || null,
      thumbnail: this.getValue(item['封面图链接']) || this.getValue(item.thumbnail) || this.getValue(item.cover) || null,
      fileType: FileType.VIDEO,
      fileSize: 0,
      usageCount: 0,
      lastUsed: null,
      authorName: this.getValue(item['博主名称']) || this.getValue(item['作者']) || this.getValue(item.authorName) || null,
      authorId: this.getValue(item['博主编号']) || this.getValue(item['作者ID']) || this.getValue(item.authorId) || null,
      publishTime: this.getTimestamp(item['发布时间']) || this.getTimestamp(item.publishTime) || this.getTimestamp(item['publish time']) || null,
      likeCount: this.getNumber(item['点赞量']) || this.getNumber(item['点赞数']) || this.getNumber(item['点赞']) || this.getNumber(item.likeCount) || 0,
      commentCount: this.getNumber(item['评论量']) || this.getNumber(item['评论数']) || this.getNumber(item['评论']) || this.getNumber(item.commentCount) || 0,
      shareCount: this.getNumber(item['转发量']) || this.getNumber(item['转发数']) || this.getNumber(item['转发']) || this.getNumber(item['分享量']) || this.getNumber(item['分享数']) || this.getNumber(item.shareCount) || 0,
      collectCount: this.getNumber(item['收藏量']) || this.getNumber(item['收藏数']) || this.getNumber(item['收藏']) || this.getNumber(item.collectCount) || 0,
      description,
      videoId,
      downloadUrl,
      coverUrl: this.getValue(item['封面图链接']) || this.getValue(item.coverUrl) || null,
      contentTags: this.getValue(item['内容标签']) || this.getValue(item.contentTags) || null,
      danmakuCount: this.getNumber(item['弹幕量']) || this.getNumber(item.danmakuCount) || 0,
      downloadStatus: downloadUrl ? DownloadStatus.PENDING : DownloadStatus.NO_URL,
    });

    try {
      await this.materialsRepository.save(material);
      this.logger.log(`素材记录已创建: ${material.id}`);
    } catch (error) {
      this.logger.error(`素材记录创建失败: ${JSON.stringify(item)}`, error);
      return;
    }

    // 关联达人
    if (material.authorName) {
      try {
        const talents = (await this.talentService.findAll({ platform: PlatformType.DOUYIN })).talents;
        let talent = talents.find(t => t.name === material.authorName || t.platformId === material.authorId);
        if (!talent) {
          talent = await this.talentService.create({
            name: material.authorName,
            platform: PlatformType.DOUYIN,
            platformId: material.authorId || `douyin_${Date.now()}`,
            avatar: material.thumbnail || null,
            description: material.description || null,
          });
          this.logger.log(`创建新达人: ${talent.name} (${talent.id})`);
        }
      } catch (error) {
        this.logger.error(`关联达人失败: ${material.authorName}`, error);
      }
    }

    // 第二步：后台下载视频并更新状态，下载完成后触发转写
    if (!downloadUrl) {
      // 没有下载地址但有原始链接，直接用原始链接转写
      if (material.ossUrl) {
        this.triggerTranscription(material.id);
      }
      return;
    }

    try {
      await this.materialsRepository.update(material.id, { downloadStatus: DownloadStatus.DOWNLOADING });
      const downloadResult = await this.downloadVideo(downloadUrl, videoId, description || undefined);

      if (downloadResult) {
        let ossUrl = `/uploads/videos/${downloadResult.fileName}`;
        const fileSize = fs.statSync(downloadResult.localPath).size;

        // 上传到阿里云OSS（如已配置）
        if (this.ossService.isConfigured()) {
          try {
            const key = `videos/${downloadResult.fileName}`;
            ossUrl = await this.ossService.uploadLocalFile(downloadResult.localPath, key);
            fs.unlinkSync(downloadResult.localPath);
            this.logger.log(`视频已上传至OSS: ${ossUrl}`);
          } catch (e) {
            this.logger.warn(`OSS上传失败，保留本地路径: ${e.message}`);
          }
        }

        await this.materialsRepository.update(material.id, {
          ossUrl,
          fileSize,
          downloadStatus: DownloadStatus.COMPLETED,
        });
        this.logger.log(`视频处理完成: ${ossUrl}`);
        // 下载完成后触发转写
        this.triggerTranscription(material.id);
      } else {
        await this.materialsRepository.update(material.id, { downloadStatus: DownloadStatus.FAILED });
        this.logger.warn(`视频下载失败: ${videoId}`);
      }
    } catch (error) {
      await this.materialsRepository.update(material.id, { downloadStatus: DownloadStatus.FAILED }).catch(() => {});
      this.logger.error(`视频下载异常: ${videoId}`, error);
    }
  }

  // 异步触发转写（不阻塞主流程）
  private triggerTranscription(materialId: number): void {
    this.talentService.transcribeMaterial(materialId)
      .then(() => this.logger.log(`转写完成: 素材 ${materialId}`))
      .catch((err) => this.logger.error(`转写失败: 素材 ${materialId}`, err));
  }

  // 导入数据到素材库（立即返回，后台异步处理）
  async importData(data: any[]) {
    try {
      this.logger.log(`收到导入请求，共 ${data.length} 条数据，开始后台处理`);

      // 将原始数据保存到日志文件
      const logPath = path.join(__dirname, '..', '..', '..', 'uploads', 'feishu-data.log');
      const timestamp = new Date().toISOString();
      fs.appendFileSync(logPath, `\n\n========== ${timestamp} ==========\n${JSON.stringify(data, null, 2)}\n`, 'utf8');

      // 立即响应，后台异步处理
      setImmediate(() => {
        Promise.all(data.map(item => this.processItemInBackground(item)))
          .then(() => this.logger.log(`后台处理完成，共 ${data.length} 条`))
          .catch(err => this.logger.error('后台处理出错', err));
      });

      return {
        message: `已接收 ${data.length} 条数据，正在后台处理`,
        count: data.length,
      };
    } catch (error) {
      this.logger.error('导入数据失败', error);
      throw error;
    }
  }

  // 获取已导入的数据
  async getImportedData(query: any) {
    try {
      const { page = 1, limit = 10, search = '' } = query;
      const skip = (page - 1) * limit;

      // 构建查询条件
      const queryBuilder = this.materialsRepository.createQueryBuilder('material');

      // 排除bbdyy素材
      queryBuilder.where('material.author_name != :authorName OR material.author_name IS NULL', { authorName: 'bbdyy' });

      if (search) {
        queryBuilder.andWhere(
          '(material.name LIKE :search OR material.author_name LIKE :search OR material.description LIKE :search)',
          { search: `%${search}%` }
        );
      }

      // 获取总数
      const total = await queryBuilder.getCount();

      // 获取分页数据
      const data = await queryBuilder
        .orderBy('material.publish_time', 'DESC')
        .addOrderBy('material.created_at', 'DESC')
        .skip(skip)
        .take(limit)
        .getMany();

      return {
        data,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error('获取已导入数据失败', error);
      throw error;
    }
  }

  // 重新下载失败的素材
  async retryDownload(id: number) {
    const material = await this.materialsRepository.findOne({ where: { id } });
    if (!material) throw new Error('素材不存在');
    if (!material.downloadUrl) throw new Error('该素材没有下载地址');

    await this.materialsRepository.update(id, { downloadStatus: DownloadStatus.DOWNLOADING });

    setImmediate(async () => {
      try {
        const downloadResult = await this.downloadVideo(material.downloadUrl, material.videoId || `video_${id}`, material.description || undefined);
        if (downloadResult) {
          let ossUrl = `/uploads/videos/${downloadResult.fileName}`;
          const fileSize = fs.statSync(downloadResult.localPath).size;
          if (this.ossService.isConfigured()) {
            try {
              const key = `videos/${downloadResult.fileName}`;
              ossUrl = await this.ossService.uploadLocalFile(downloadResult.localPath, key);
              fs.unlinkSync(downloadResult.localPath);
            } catch (e) {
              this.logger.warn(`OSS上传失败，保留本地路径: ${e.message}`);
            }
          }
          await this.materialsRepository.update(id, { ossUrl, fileSize, downloadStatus: DownloadStatus.COMPLETED });
          this.triggerTranscription(id);
        } else {
          await this.materialsRepository.update(id, { downloadStatus: DownloadStatus.FAILED });
        }
      } catch (error) {
        await this.materialsRepository.update(id, { downloadStatus: DownloadStatus.FAILED }).catch(() => {});
        this.logger.error(`重新下载失败: ${id}`, error);
      }
    });

    return { message: '已开始重新下载' };
  }

  // 清空所有数据
  async clearAllData() {
    try {
      this.logger.log('开始清空所有数据');
      
      // 只删除非bbdyy素材数据
      await this.materialsRepository.createQueryBuilder()
        .delete()
        .from('materials')
        .where('author_name != :authorName OR author_name IS NULL', { authorName: 'bbdyy' })
        .execute();
      
      // 清空内存存储
      this.storage.saveData([]);
      
      this.logger.log('数据清空完成');
      
      return { message: '数据清空成功' };
    } catch (error) {
      this.logger.error('清空数据失败', error);
      throw error;
    }
  }
}
