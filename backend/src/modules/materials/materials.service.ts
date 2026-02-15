import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Material } from './material.entity';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { QueryMaterialDto } from './dto/query-material.dto';

@Injectable()
export class MaterialsService {
  constructor(
    @InjectRepository(Material)
    private materialsRepository: Repository<Material>,
  ) {}

  async findAll(userId: number, query: QueryMaterialDto) {
    const { search, page = 1, limit = 20 } = query;
    const queryBuilder = this.materialsRepository
      .createQueryBuilder('material')
      .where('material.userId = :userId', { userId });

    if (search) {
      queryBuilder.andWhere(
        '(material.name LIKE :search OR material.scene LIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [items, total] = await queryBuilder
      .orderBy('material.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(userId: number, id: number) {
    const material = await this.materialsRepository.findOne({
      where: { id, userId },
    });

    if (!material) {
      throw new NotFoundException('素材不存在');
    }

    return material;
  }

  async create(userId: number, createMaterialDto: CreateMaterialDto) {
    const material = this.materialsRepository.create({
      ...createMaterialDto,
      userId,
    });

    return this.materialsRepository.save(material);
  }

  async update(
    userId: number,
    id: number,
    updateMaterialDto: UpdateMaterialDto,
  ) {
    const material = await this.findOne(userId, id);
    Object.assign(material, updateMaterialDto);
    return this.materialsRepository.save(material);
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

  async getStatistics(userId: number) {
    const [total, imageCount, videoCount] = await Promise.all([
      this.materialsRepository.count({ where: { userId } }),
      this.materialsRepository.count({
        where: { userId, fileType: 'image' },
      }),
      this.materialsRepository.count({
        where: { userId, fileType: 'video' },
      }),
    ]);

    return {
      total,
      imageCount,
      videoCount,
    };
  }
}
