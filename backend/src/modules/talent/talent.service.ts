import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Talent, PlatformType, TalentMaterialType } from './talent.entity';
import { Material, FileType } from '../materials/material.entity';
import { TranscriptionService } from '../transcription/transcription.service';

@Injectable()
export class TalentService {
  constructor(
    @InjectRepository(Talent) private talentRepository: Repository<Talent>,
    @InjectRepository(Material) private materialRepository: Repository<Material>,
    private transcriptionService: TranscriptionService,
  ) {}

  // 获取达人列表
  async findAll(params?: {
    platform?: PlatformType;
  }) {
    const query = this.talentRepository.createQueryBuilder('talent');
    
    if (params?.platform) {
      query.where('talent.platform = :platform', { platform: params.platform });
    }
    
    const talents = await query.orderBy('talent.createdAt', 'DESC').getMany();
    return { talents };
  }

  // 获取达人素材列表
  async getMaterials(params?: {
    talentId?: number;
    type?: TalentMaterialType;
    keywords?: string;
  }) {
    const query = this.materialRepository.createQueryBuilder('material');
    
    // 过滤掉作者为bbdyy的素材，只显示达人素材
    query.where('(material.authorName IS NOT NULL AND material.authorName != \'\' AND material.authorName != \'bbdyy\')');
    
    if (params?.talentId) {
      const talent = await this.talentRepository.findOne({ where: { id: params.talentId } });
      if (talent) {
        query.andWhere('material.authorName = :authorName', { authorName: talent.name });
      }
    }
    
    if (params?.type) {
      let fileType: FileType;
      switch (params.type) {
        case TalentMaterialType.VIDEO:
          fileType = FileType.VIDEO;
          break;
        case TalentMaterialType.IMAGE:
          fileType = FileType.IMAGE;
          break;
        case TalentMaterialType.TEXT:
          fileType = FileType.TEXT;
          break;
        default:
          fileType = FileType.VIDEO;
      }
      query.andWhere('material.fileType = :fileType', { fileType });
    }
    
    if (params?.keywords) {
      const keywords = params.keywords.toLowerCase();
      query.andWhere(
        'LOWER(material.name) LIKE :keywords OR LOWER(material.scene) LIKE :keywords OR LOWER(material.description) LIKE :keywords',
        { keywords: `%${keywords}%` }
      );
    }
    
    const materials = await query.orderBy('material.createdAt', 'DESC').getMany();
    
    // 转换为前端需要的格式
    const formattedMaterials = materials.map(material => ({
      id: material.id,
      talentId: 0, // 暂时设为0，因为数据库中没有直接关联
      type: material.fileType as unknown as TalentMaterialType,
      title: material.name,
      scene: material.scene,
      tags: material.tags || [],
      ossUrl: material.ossUrl,
      thumbnail: material.thumbnail,
      duration: material.duration,
      crawlTime: material.createdAt,
      publishTime: material.publishTime ? new Date(material.publishTime) : null,
      likeCount: material.likeCount || 0,
      commentCount: material.commentCount || 0,
      shareCount: material.shareCount || 0,
      collectCount: material.collectCount || 0,
      description: material.description,
      videoId: material.videoId,
      downloadUrl: material.downloadUrl,
      note: material.note,
      authorName: material.authorName,
      createdAt: material.createdAt,
      updatedAt: material.updatedAt
    }));
    
    return { materials: formattedMaterials };
  }

  // 获取统计数据
  async getStatistics() {
    const totalTalents = await this.talentRepository.count();
    const activeTalents = await this.talentRepository.count({ where: { isActive: true } });
    
    // 只统计达人素材（有作者信息且不为bbdyy）
    const talentMaterialsQuery = this.materialRepository.createQueryBuilder('material')
      .where('(material.authorName IS NOT NULL AND material.authorName != \'\' AND material.authorName != \'bbdyy\')');
    
    const totalMaterials = await talentMaterialsQuery.getCount();
    const videoMaterials = await talentMaterialsQuery.clone()
      .andWhere('material.fileType = :fileType', { fileType: FileType.VIDEO })
      .getCount();
    const imageMaterials = await talentMaterialsQuery.clone()
      .andWhere('material.fileType = :fileType', { fileType: FileType.IMAGE })
      .getCount();

    return {
      totalTalents,
      activeTalents,
      totalMaterials,
      videoMaterials,
      imageMaterials,
    };
  }

  // 创建达人
  async create(data: {
    name: string;
    platform: PlatformType;
    platformId: string;
    avatar?: string;
    profileUrl?: string;
    followers?: number;
    description?: string;
  }) {
    const talent = this.talentRepository.create({
      name: data.name,
      platform: data.platform,
      platformId: data.platformId,
      avatar: data.avatar || null,
      profileUrl: data.profileUrl || '',
      followers: data.followers || 0,
      description: data.description || null,
      isActive: true,
    });
    
    return this.talentRepository.save(talent);
  }

  // 更新达人
  async update(id: number, data: {
    name?: string;
    platform?: PlatformType;
    avatar?: string;
    profileUrl?: string;
    followers?: number;
    description?: string;
    isActive?: boolean;
  }) {
    const talent = await this.talentRepository.findOne({ where: { id } });
    if (!talent) {
      throw new NotFoundException('达人不存在');
    }

    Object.assign(talent, data);
    return this.talentRepository.save(talent);
  }

  // 删除达人
  async delete(id: number) {
    const talent = await this.talentRepository.findOne({ where: { id } });
    if (!talent) {
      throw new NotFoundException('达人不存在');
    }

    await this.talentRepository.delete(id);
    return { message: '删除成功' };
  }

  // 删除达人素材
  async deleteMaterial(id: number) {
    if (!id || isNaN(id)) {
      throw new NotFoundException('素材不存在');
    }
    const material = await this.materialRepository.findOne({ where: { id } });
    if (!material) {
      throw new NotFoundException('素材不存在');
    }

    await this.materialRepository.delete(id);
    return { message: '删除成功' };
  }

  // 保存达人素材
  async saveMaterial(data: {
    talentId: number;
    type: TalentMaterialType;
    title: string;
    scene?: string;
    tags?: string[];
    ossUrl: string;
    thumbnail?: string;
    duration?: string;
    crawlTime: Date;
    publishTime?: Date;
    likeCount?: number;
    commentCount?: number;
    shareCount?: number;
    collectCount?: number;
    description?: string;
    videoId?: string;
    downloadUrl?: string;
  }) {
    const talent = await this.talentRepository.findOne({ where: { id: data.talentId } });
    if (!talent) {
      throw new NotFoundException('达人不存在');
    }

    let fileType: FileType;
    switch (data.type) {
      case TalentMaterialType.VIDEO:
        fileType = FileType.VIDEO;
        break;
      case TalentMaterialType.IMAGE:
        fileType = FileType.IMAGE;
        break;
      case TalentMaterialType.TEXT:
        fileType = FileType.TEXT;
        break;
      default:
        fileType = FileType.VIDEO;
    }

    const material = this.materialRepository.create({
      userId: 1, // 默认用户ID
      name: data.title,
      scene: data.scene || null,
      tags: data.tags || [],
      duration: data.duration || null,
      note: null,
      ossUrl: data.ossUrl,
      thumbnail: data.thumbnail || null,
      fileType,
      authorName: talent.name,
      authorId: talent.platformId,
      publishTime: data.publishTime ? data.publishTime.getTime() : null,
      likeCount: data.likeCount || 0,
      commentCount: data.commentCount || 0,
      shareCount: data.shareCount || 0,
      collectCount: data.collectCount || 0,
      description: data.description || null,
      videoId: data.videoId || null,
      downloadUrl: data.downloadUrl || null,
    });

    return this.materialRepository.save(material);
  }

  // 转写达人素材
  async transcribeMaterial(id: number) {
    const material = await this.materialRepository.findOne({ where: { id } });
    if (!material) {
      throw new NotFoundException('素材不存在');
    }

    const fileUrl = material.ossUrl || material.thumbnail;
    if (!fileUrl) {
      throw new Error('素材没有关联文件');
    }

    const result = await this.transcriptionService.transcribe({
      fileUrl,
      fileType: material.fileType as 'audio' | 'video',
      language: 'zh-CN',
      enablePunctuation: true,
    });

    let tags: string[] = [], scene = '';
    try {
      const axios = require('axios');
      const aiRes = await axios.default.post(
        process.env.AI_TEXT_ENDPOINT || 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
        { 
          model: process.env.AI_TEXT_MODEL || 'qwen-turbo', 
          input: { 
            messages: [{
              role: 'user', 
              content: `提炼标签和场景。返回JSON：{tags:[],scene:""}。转写：${result.text.substring(0, 500)}` 
            }]
          } 
        },
        { 
          headers: { 
            'Authorization': 'Bearer ' + process.env.DASHSCOPE_API_KEY, 
            'Content-Type': 'application/json' 
          }, 
          timeout: 30000 
        }
      );
      const parsed = JSON.parse((aiRes.data?.output?.text || '').replace(/```json|```/g, '').trim());
      tags = parsed.tags || []; 
      scene = parsed.scene || '';
    } catch (error) {
      console.error('AI标签生成失败:', error.message);
      scene = result.text.substring(0, 20);
    }

    await this.materialRepository.update(id, { 
      note: result.text, 
      tags: tags.length > 0 ? tags : material.tags,
      scene: scene || material.scene 
    });

    return { ...result, tags, scene };
  }

  // 清空所有达人素材
  async clearAllMaterials() {
    // 删除所有达人素材（有作者信息且不为bbdyy）
    await this.materialRepository.createQueryBuilder()
      .delete()
      .from('materials')
      .where('author_name IS NOT NULL')
      .andWhere('author_name != \'\'')
      .andWhere('author_name != \'bbdyy\'')
      .execute();

    return { message: '达人素材清空成功' };
  }
}
