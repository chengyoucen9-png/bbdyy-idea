import { Injectable, NotFoundException } from '@nestjs/common';
import { Talent, TalentMaterial, PlatformType, TalentMaterialType } from './talent.entity';

// 内存存储
class InMemoryStorage {
  private talents: Talent[] = [];
  private materials: TalentMaterial[] = [];
  private talentId = 1;
  private materialId = 1;

  // 达人相关
  async saveTalent(talent: Talent): Promise<Talent> {
    if (!talent.id) {
      talent.id = this.talentId++;
      talent.createdAt = new Date();
      talent.updatedAt = new Date();
      talent.isActive = true;
      talent.materials = [];
      this.talents.push(talent);
    } else {
      const index = this.talents.findIndex(t => t.id === talent.id);
      if (index !== -1) {
        talent.updatedAt = new Date();
        this.talents[index] = talent;
      }
    }
    return talent;
  }

  async findTalentById(id: number): Promise<Talent | undefined> {
    return this.talents.find(t => t.id === id);
  }

  async findAllTalents(params?: { platform?: PlatformType }): Promise<Talent[]> {
    let result = [...this.talents];
    if (params?.platform) {
      result = result.filter(t => t.platform === params.platform);
    }
    return result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async deleteTalent(id: number): Promise<void> {
    this.talents = this.talents.filter(t => t.id !== id);
    this.materials = this.materials.filter(m => m.talentId !== id);
  }

  // 素材相关
  async saveMaterial(material: TalentMaterial): Promise<TalentMaterial> {
    if (!material.id) {
      material.id = this.materialId++;
      material.createdAt = new Date();
      material.updatedAt = new Date();
      this.materials.push(material);
    }
    return material;
  }

  async findMaterialById(id: number): Promise<TalentMaterial | undefined> {
    return this.materials.find(m => m.id === id);
  }

  async findMaterials(params?: {
    talentId?: number;
    type?: TalentMaterialType;
    keywords?: string;
  }): Promise<TalentMaterial[]> {
    let result = [...this.materials];
    
    if (params?.talentId) {
      result = result.filter(m => m.talentId === params.talentId);
    }
    
    if (params?.type) {
      result = result.filter(m => m.type === params.type);
    }
    
    if (params?.keywords) {
      const keywords = params.keywords.toLowerCase();
      result = result.filter(m => 
        (m.title && m.title.toLowerCase().includes(keywords)) ||
        (m.scene && m.scene.toLowerCase().includes(keywords))
      );
    }
    
    return result.sort((a, b) => (b.crawlTime?.getTime() || 0) - (a.crawlTime?.getTime() || 0));
  }

  async deleteMaterial(id: number): Promise<void> {
    this.materials = this.materials.filter(m => m.id !== id);
  }

  // 统计数据
  async getStatistics(): Promise<{
    totalTalents: number;
    activeTalents: number;
    totalMaterials: number;
    videoMaterials: number;
  }> {
    return {
      totalTalents: this.talents.length,
      activeTalents: this.talents.filter(t => t.isActive).length,
      totalMaterials: this.materials.length,
      videoMaterials: this.materials.filter(m => m.type === TalentMaterialType.VIDEO).length,
    };
  }
}

@Injectable()
export class TalentService {
  private storage = new InMemoryStorage();

  // 获取达人列表
  async findAll(params?: {
    platform?: PlatformType;
  }) {
    const talents = await this.storage.findAllTalents(params);
    return { talents };
  }

  // 获取达人素材列表
  async getMaterials(params?: {
    talentId?: number;
    type?: TalentMaterialType;
    keywords?: string;
  }) {
    const materials = await this.storage.findMaterials(params);
    return { materials };
  }

  // 获取统计数据
  async getStatistics() {
    return this.storage.getStatistics();
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
    const talent: Talent = {
      id: 0,
      name: data.name,
      platform: data.platform,
      platformId: data.platformId,
      avatar: data.avatar || null,
      profileUrl: data.profileUrl || '',
      followers: data.followers || 0,
      description: data.description || null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      materials: [],
    };
    return this.storage.saveTalent(talent);
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
    const talent = await this.storage.findTalentById(id);
    if (!talent) {
      throw new NotFoundException('达人不存在');
    }

    Object.assign(talent, data);
    return this.storage.saveTalent(talent);
  }

  // 删除达人
  async delete(id: number) {
    const talent = await this.storage.findTalentById(id);
    if (!talent) {
      throw new NotFoundException('达人不存在');
    }

    await this.storage.deleteTalent(id);
    return { message: '删除成功' };
  }

  // 删除达人素材
  async deleteMaterial(id: number) {
    const material = await this.storage.findMaterialById(id);
    if (!material) {
      throw new NotFoundException('素材不存在');
    }

    await this.storage.deleteMaterial(id);
    return { message: '删除成功' };
  }
}
