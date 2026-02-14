import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findOne(id: number) {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('用户不存在');
    return user;
  }

  async update(id: number, data: Partial<User>) {
    await this.findOne(id);
    
    // 如果更新密码，需要加密
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }
    
    await this.usersRepository.update(id, data);
    return this.findOne(id);
  }

  async updateAvatar(id: number, avatarUrl: string) {
    await this.findOne(id);
    await this.usersRepository.update(id, { avatar: avatarUrl });
    return this.findOne(id);
  }
}
