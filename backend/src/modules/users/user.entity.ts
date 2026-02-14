import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Material } from '../materials/material.entity';
import { Topic } from '../topics/topic.entity';
import { Video } from '../videos/video.entity';
import { AiProvider } from '../ai-providers/ai-provider.entity';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 50 })
  username: string;

  @Column({ unique: true, length: 100 })
  email: string;

  @Column({ length: 255 })
  @Exclude() // 在序列化时排除密码字段
  password: string;

  @Column({ nullable: true, length: 50 })
  nickname: string;

  @Column({ nullable: true, length: 500 })
  avatar: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({ default: 1 })
  status: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // 关联关系
  @OneToMany(() => Material, (material) => material.user)
  materials: Material[];

  @OneToMany(() => Topic, (topic) => topic.user)
  topics: Topic[];

  @OneToMany(() => Video, (video) => video.user)
  videos: Video[];

  @OneToMany(() => AiProvider, (aiProvider) => aiProvider.user)
  aiProviders: AiProvider[];
}
