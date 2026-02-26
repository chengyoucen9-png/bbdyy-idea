import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Topic, TopicStatus } from './topic.entity';
import { CreateTopicDto } from './dto';

@Injectable()
export class TopicsService {
  constructor(
    @InjectRepository(Topic)
    private topicsRepository: Repository<Topic>,
  ) {}

  async findAll(userId: number) {
    return this.topicsRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(userId: number, id: number) {
    const topic = await this.topicsRepository.findOne({
      where: { id, userId },
    });
    if (!topic) throw new NotFoundException('选题不存在');
    return topic;
  }

  async create(userId: number, createTopicDto: CreateTopicDto) {
    const topic = this.topicsRepository.create({ 
      ...createTopicDto, 
      userId 
    });
    return this.topicsRepository.save(topic);
  }

  async update(userId: number, id: number, data: Partial<Topic>) {
    await this.findOne(userId, id);
    await this.topicsRepository.update({ id, userId }, data);
    return this.findOne(userId, id);
  }

  async remove(userId: number, id: number) {
    const topic = await this.findOne(userId, id);
    await this.topicsRepository.remove(topic);
    return { message: '删除成功' };
  }

  async getStatistics(userId: number) {
    const [total, pending, inProgress, completed] = await Promise.all([
      this.topicsRepository.count({ where: { userId } }),
      this.topicsRepository.count({ where: { userId, status: TopicStatus.PENDING } }),
      this.topicsRepository.count({ where: { userId, status: TopicStatus.IN_PROGRESS } }),
      this.topicsRepository.count({ where: { userId, status: TopicStatus.COMPLETED } }),
    ]);

    return {
      total,
      pending,
      inProgress,
      completed,
    };
  }
}
