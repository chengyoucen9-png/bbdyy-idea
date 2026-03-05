import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Material, FileType } from './material.entity';
import { CreateMaterialDto, UpdateMaterialDto, QueryMaterialDto } from './dto';

@Injectable()
export class MaterialsService {
  constructor(
    @InjectRepository(Material)
    private materialsRepository: Repository<Material>,
  ) {}

  async findAll(userId: number, query: QueryMaterialDto) {
    const { search, page = 1, limit = 20, type } = query;
    const queryBuilder = this.materialsRepository
      .createQueryBuilder('material');

    // 过滤素材类型
    if (type === 'bbdyy') {
      // bbdyy素材：作者为bbdyy
      queryBuilder.where('material.authorName = \'bbdyy\'');
    } else if (type === 'talent') {
      // 达人素材：有作者信息且不为bbdyy
      queryBuilder.where('(material.authorName IS NOT NULL AND material.authorName != \'\')');
    }

    if (search) {
      if (type) {
        queryBuilder.andWhere(
          '(material.name LIKE :search OR material.scene LIKE :search OR material.note LIKE :search)',
          { search: `%${search}%` },
        );
      } else {
        queryBuilder.where(
          '(material.name LIKE :search OR material.scene LIKE :search OR material.note LIKE :search)',
          { search: `%${search}%` },
        );
      }
    }

    const [items, total] = await queryBuilder
      .orderBy('material.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(userId: number, id: number) {
    const material = await this.materialsRepository.findOne({
      where: { id },
    });
    if (!material) throw new NotFoundException('素材不存在');
    return material;
  }

  async create(userId: number, createMaterialDto: CreateMaterialDto) {
    const material = this.materialsRepository.create({ ...createMaterialDto, userId });
    return this.materialsRepository.save(material);
  }

  async update(userId: number, id: number, updateMaterialDto: UpdateMaterialDto) {
    const material = await this.findOne(userId, id);
    Object.assign(material, updateMaterialDto);
    return this.materialsRepository.save(material);
  }

  async findDuplicate(userId: number, filename: string, fileSize: number) {
    return this.materialsRepository.findOne({ where: { name: filename, fileSize } });
  }

  async remove(userId: number, id: number) {
    const material = await this.findOne(userId, id);
    await this.materialsRepository.remove(material);
    return { message: '删除成功' };
  }

  async markAsUsed(userId: number, id: number) {
    const material = await this.findOne(userId, id);
    material.usageCount += 1;
    material.lastUsed = new Date();
    return this.materialsRepository.save(material);
  }

  async getStatistics(userId: number, type?: string) {
    let baseQuery = this.materialsRepository.createQueryBuilder('material');
    
    // 过滤素材类型
    if (type === 'bbdyy') {
      // bbdyy素材：作者为bbdyy
      baseQuery = baseQuery.where('material.authorName = \'bbdyy\'');
    } else if (type === 'talent') {
      // 达人素材：有作者信息且不为bbdyy
      baseQuery = baseQuery.where('(material.authorName IS NOT NULL AND material.authorName != \'\')');
    }
    
    const [total, imageCount, videoCount] = await Promise.all([
      baseQuery.getCount(),
      baseQuery.clone().andWhere('material.fileType = :fileType', { fileType: FileType.IMAGE }).getCount(),
      baseQuery.clone().andWhere('material.fileType = :fileType', { fileType: FileType.VIDEO }).getCount(),
    ]);
    return { total, imageCount, videoCount };
  }

  /**
   * 根据关键词列表搜索匹配素材（不需要 topicId，直接用关键词）
   * 在 name、scene、note、tags 中模糊匹配，按匹配关键词数量排序
   */
  async searchByKeywords(userId: number, keywords: string[]): Promise<Material[]> {
    if (!keywords || keywords.length === 0) return [];

    const all = await this.materialsRepository.find();

    // 对每个素材打分：匹配到几个关键词
    const scored = all.map((mat) => {
      const text = [
        mat.name || '',
        mat.scene || '',
        mat.note || '',
        (mat.tags || []).join(' '),
      ].join(' ').toLowerCase();

      const score = keywords.reduce((acc, kw) => {
        return acc + (text.includes(kw.toLowerCase()) ? 1 : 0);
      }, 0);

      return { mat, score };
    });

    const seen = new Set<string>();
    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .filter((s) => {
        if (seen.has(s.mat.name)) return false;
        seen.add(s.mat.name);
        return true;
      })
      .slice(0, 10)
      .map((s) => s.mat);
  }
}
