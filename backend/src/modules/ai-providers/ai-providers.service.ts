import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiProvider } from './ai-provider.entity';

@Injectable()
export class AiProvidersService {
  constructor(
    @InjectRepository(AiProvider)
    private aiProvidersRepository: Repository<AiProvider>,
  ) {}

  async findAll(userId: number) {
    return this.aiProvidersRepository.find({
      where: { userId },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(userId: number, id: number) {
    const provider = await this.aiProvidersRepository.findOne({
      where: { id, userId },
    });
    if (!provider) throw new NotFoundException('AI配置不存在');
    return provider;
  }

  async findDefault(userId: number) {
    return this.aiProvidersRepository.findOne({
      where: { userId, isDefault: 1 },
    });
  }

  async create(userId: number, data: Partial<AiProvider>) {
    const provider = this.aiProvidersRepository.create({ ...data, userId });
    return this.aiProvidersRepository.save(provider);
  }

  async update(userId: number, id: number, data: Partial<AiProvider>) {
    await this.findOne(userId, id);
    await this.aiProvidersRepository.update({ id, userId }, data);
    return this.findOne(userId, id);
  }

  async setDefault(userId: number, id: number) {
    // 取消其他默认配置
    await this.aiProvidersRepository.update(
      { userId, isDefault: 1 },
      { isDefault: 0 },
    );
    
    // 设置新的默认配置
    await this.aiProvidersRepository.update({ id, userId }, { isDefault: 1 });
    return this.findOne(userId, id);
  }

  async remove(userId: number, id: number) {
    const provider = await this.findOne(userId, id);
    await this.aiProvidersRepository.remove(provider);
    return { message: '删除成功' };
  }
}
