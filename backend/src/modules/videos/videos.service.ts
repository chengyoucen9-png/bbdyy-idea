import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Video } from './video.entity';

@Injectable()
export class VideosService {
  constructor(
    @InjectRepository(Video)
    private videosRepository: Repository<Video>,
  ) {}

  async findAll(userId: number) {
    return this.videosRepository.find({
      where: { userId },
      order: { publishDate: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(userId: number, id: number) {
    const video = await this.videosRepository.findOne({
      where: { id, userId },
    });
    if (!video) throw new NotFoundException('视频不存在');
    return video;
  }

  async create(userId: number, data: Partial<Video>) {
    const video = this.videosRepository.create({ ...data, userId });
    return this.videosRepository.save(video);
  }

  async update(userId: number, id: number, data: Partial<Video>) {
    await this.findOne(userId, id);
    await this.videosRepository.update({ id, userId }, data);
    return this.findOne(userId, id);
  }

  async remove(userId: number, id: number) {
    const video = await this.findOne(userId, id);
    await this.videosRepository.remove(video);
    return { message: '删除成功' };
  }

  async getStatistics(userId: number) {
    const videos = await this.videosRepository.find({ where: { userId } });
    
    const totalVideos = videos.length;
    const totalViews = videos.reduce((sum, v) => sum + v.views, 0);
    const totalLikes = videos.reduce((sum, v) => sum + v.likes, 0);
    const avgCompletionRate = totalVideos > 0 
      ? videos.reduce((sum, v) => sum + Number(v.completionRate), 0) / totalVideos 
      : 0;

    return {
      totalVideos,
      totalViews,
      totalLikes,
      avgCompletionRate: Number(avgCompletionRate.toFixed(2)),
    };
  }
}
