import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Material, FileType } from '../materials/material.entity';
import { Client } from '@larksuiteoapi/node-sdk';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

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
  private feishuClient: Client;

  constructor(
    @InjectRepository(Material) private materialsRepository: Repository<Material>,
    private configService: ConfigService
  ) {
    // 确保上传目录存在
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
    
    // 确保视频目录存在
    if (!fs.existsSync(this.videoDir)) {
      fs.mkdirSync(this.videoDir, { recursive: true });
    }

    // 初始化飞书客户端
    this.feishuClient = new Client({
      appId: this.configService.get('FEISHU_APP_ID') || 'cli_a9aaf6bf4a79dbdc',
      appSecret: this.configService.get('FEISHU_APP_SECRET') || 'T8FAkBifDx74z1oBMHpUMcKyEtFiPCej',
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
          userId: 1, // 假设用户ID为1
          name: item.name || item.title || '无标题',
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
      const { spreadsheetToken, tableId } = this.parseFeishuTableUrl(url);
      this.logger.log(`解析到 spreadsheetToken: ${spreadsheetToken}, tableId: ${tableId}`);

      // 使用飞书API获取表格记录
      const response = await this.feishuClient.bitable.appTableRecord.list({
        path: {
          app_token: spreadsheetToken,
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
    // 从URL中提取spreadsheetToken和tableId
    const regex = /wiki\/([^?]+)\?table=(.+?)&/;
    const match = url.match(regex);
    
    if (!match) {
      throw new Error('无效的飞书表格地址');
    }

    const spreadsheetToken = match[1];
    const tableId = match[2];

    return { spreadsheetToken, tableId };
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

  // 导入数据到素材库
  async importData(data: any[]) {
    try {
      this.logger.log(`开始导入 ${data.length} 条数据到素材库`);
      
      // 将原始数据保存到文件
      const logPath = path.join(__dirname, '..', '..', '..', 'uploads', 'feishu-data.log');
      const timestamp = new Date().toISOString();
      const logContent = `\n\n========== ${timestamp} ==========\n${JSON.stringify(data, null, 2)}\n`;
      fs.appendFileSync(logPath, logContent, 'utf8');
      this.logger.log(`原始数据已保存到: ${logPath}`);
      
      // 打印完整数据结构
      this.logger.log(`===== 完整数据结构 =====`);
      this.logger.log(JSON.stringify(data, null, 2));
      this.logger.log(`===== 数据结构结束 =====`);

      let successCount = 0;
      let failCount = 0;

      for (const item of data) {
        try {
          // 辅助函数：处理空值和空格字符串
          const getValue = (value: any, defaultValue: any = null) => {
            if (value === null || value === undefined) return defaultValue;
            if (typeof value === 'string' && value.trim() === '') return defaultValue;
            return value;
          };

          // 辅助函数：处理数字类型
          const getNumber = (value: any, defaultValue: number = 0) => {
            const val = getValue(value);
            if (val === null) return defaultValue;
            const num = Number(val);
            return isNaN(num) ? defaultValue : num;
          };

          // 辅助函数：处理时间字段（支持字符串格式和时间戳）
          const getTimestamp = (value: any): number | null => {
            const val = getValue(value);
            if (val === null) return null;
            
            // 如果是数字，直接返回
            if (typeof val === 'number') {
              return val;
            }
            
            // 如果是字符串，尝试解析
            if (typeof val === 'string') {
              // 尝试解析日期字符串，如 "2025-08-22 19:15"
              const date = new Date(val);
              if (!isNaN(date.getTime())) {
                return date.getTime();
              }
            }
            
            return null;
          };

          // 打印每个条目的所有字段名和值
          this.logger.log(`===== 条目字段 =====`);
          Object.keys(item).forEach(key => {
            this.logger.log(`字段: ${key} = ${item[key]}`);
          });
          this.logger.log(`===== 条目字段结束 =====`);

          // 获取下载地址
          const downloadUrl = getValue(item.下载地址) || getValue(item.downloadUrl) || null;
          const videoId = getValue(item.视频编号) || getValue(item.videoId) || `video_${Date.now()}`;
          const description = getValue(item.详情) || getValue(item.description) || null;
          
          // 下载视频文件
          let localFilePath: string | null = null;
          let fileName: string | null = null;
          if (downloadUrl) {
            this.logger.log(`开始下载视频: ${videoId}`);
            const downloadResult = await this.downloadVideo(downloadUrl, videoId, description || undefined);
            if (downloadResult) {
              localFilePath = downloadResult.localPath;
              fileName = downloadResult.fileName;
              this.logger.log(`视频下载成功: ${fileName}`);
            } else {
              this.logger.warn(`视频下载失败: ${videoId}`);
            }
          }

          // 创建素材实体
          const material = this.materialsRepository.create({
            userId: 1, // 假设用户ID为1
            name: getValue(item.名称) || getValue(item.name) || getValue(item.title) || '无标题',
            scene: getValue(item.scene) || getValue(item.description) || null,
            tags: getValue(item.tags) ? (Array.isArray(item.tags) ? item.tags : item.tags.split(',').map((tag: string) => tag.trim())) : null,
            duration: getValue(item.视频时长) || getValue(item.duration) || null,
            note: getValue(item.note) || getValue(item.content) || null,
            ossUrl: localFilePath ? `/uploads/videos/${fileName}` : (getValue(item.链接) || getValue(item.url) || getValue(item.link) || null),
            thumbnail: getValue(item.封面图链接) || getValue(item.thumbnail) || getValue(item.cover) || null,
            fileType: FileType.VIDEO, // 默认为视频类型
            fileSize: localFilePath ? fs.statSync(localFilePath).size : 0,
            usageCount: 0,
            lastUsed: null,
            // 新增字段
            authorName: getValue(item.博主名称) || getValue(item.authorName) || null,
            authorId: getValue(item.博主编号) || getValue(item.authorId) || null,
            publishTime: getTimestamp(item.发布时间) || getTimestamp(item.publishTime) || getTimestamp(item['发布时间']) || getTimestamp(item['publish time']) || null,
            likeCount: getNumber(item.点赞量) || getNumber(item.likeCount) || 0,
            commentCount: getNumber(item.评论量) || getNumber(item.commentCount) || 0,
            shareCount: getNumber(item.转发量) || getNumber(item.shareCount) || 0,
            collectCount: getNumber(item.收藏量) || getNumber(item.collectCount) || 0,
            description: getValue(item.详情) || getValue(item.description) || null,
            videoId: videoId,
            downloadUrl: downloadUrl,
            coverUrl: getValue(item.封面图链接) || getValue(item.coverUrl) || null,
            contentTags: getValue(item.内容标签) || getValue(item.contentTags) || null,
            danmakuCount: getNumber(item.弹幕量) || getNumber(item.danmakuCount) || 0,
          });

          await this.materialsRepository.save(material);
          this.logger.log(`素材保存成功: ${material.id}, 附件: ${fileName || '无'}`);
          successCount++;
        } catch (error) {
          this.logger.error(`导入数据失败: ${JSON.stringify(item)}`, error);
          failCount++;
        }
      }

      this.logger.log(`数据导入完成，成功: ${successCount}，失败: ${failCount}`);

      return { 
        message: `数据导入完成，成功: ${successCount}，失败: ${failCount}`,
        successCount,
        failCount 
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

      if (search) {
        queryBuilder.where(
          '(material.name LIKE :search OR material.authorName LIKE :search OR material.description LIKE :search)',
          { search: `%${search}%` }
        );
      }

      // 获取总数
      const total = await queryBuilder.getCount();

      // 获取分页数据
      const data = await queryBuilder
        .orderBy('material.createdAt', 'DESC')
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

  // 清空所有数据
  async clearAllData() {
    try {
      this.logger.log('开始清空所有数据');
      
      // 删除所有素材数据
      await this.materialsRepository.clear();
      
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
