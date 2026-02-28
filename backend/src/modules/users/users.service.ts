import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './user.entity';
import * as bcrypt from 'bcrypt';

export interface CreateUserDto {
  username: string;
  email: string;
  password: string;
  nickname?: string;
  role?: UserRole;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findAll(): Promise<Omit<User, 'password'>[]> {
    const users = await this.usersRepository.find({
      order: { createdAt: 'DESC' },
    });
    return users.map(({ password: _pw, ...rest }) => rest as any);
  }

  async findOne(id: number) {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('用户不存在');
    return user;
  }

  async create(dto: CreateUserDto): Promise<Omit<User, 'password'>> {
    const exists = await this.usersRepository.findOne({
      where: [{ username: dto.username }, { email: dto.email }],
    });
    if (exists) throw new ConflictException('用户名或邮箱已存在');

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = this.usersRepository.create({
      username: dto.username,
      email: dto.email,
      password: hashed,
      nickname: dto.nickname || dto.username,
      role: dto.role || UserRole.USER,
    });
    const saved = await this.usersRepository.save(user);
    const { password: _pw, ...rest } = saved;
    return rest as any;
  }

  async update(id: number, data: Partial<User>) {
    await this.findOne(id);
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }
    await this.usersRepository.update(id, data);
    return this.findOne(id);
  }

  async toggleStatus(id: number) {
    const user = await this.findOne(id);
    const newStatus = user.status === 1 ? 0 : 1;
    await this.usersRepository.update(id, { status: newStatus });
    return { id, status: newStatus };
  }

  async remove(id: number) {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
    return { message: '删除成功' };
  }

  async updateAvatar(id: number, avatarUrl: string) {
    await this.findOne(id);
    await this.usersRepository.update(id, { avatar: avatarUrl });
    return this.findOne(id);
  }

  // 添加一个方法用于认证时查找用户
  async findByUsername(username: string): Promise<User | undefined> {
    return this.usersRepository.findOne({ where: { username } });
  }
}
