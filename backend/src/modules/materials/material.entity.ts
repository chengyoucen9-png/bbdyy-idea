import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

export enum FileType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  TEXT = 'text',
}

@Entity('materials')
export class Material {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  scene: string;

  @Column({ type: 'json', nullable: true })
  tags: string[];

  @Column({ length: 50, nullable: true })
  duration: string;

  @Column({ type: 'text', nullable: true })
  note: string;

  @Column({ name: 'oss_url', length: 1000, nullable: true })
  ossUrl: string;

  @Column({ length: 500, nullable: true })
  thumbnail: string;

  @Column({
    name: 'file_type',
    type: 'enum',
    enum: FileType,
    default: FileType.IMAGE,
  })
  fileType: FileType;

  @Column({ name: 'file_size', nullable: true })
  fileSize: number;

  @Column({ name: 'usage_count', default: 0 })
  usageCount: number;

  @Column({ name: 'last_used', type: 'date', nullable: true })
  lastUsed: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.materials, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // 新增字段：用于存储从飞书同步的数据
  @Column({ name: 'author_name', length: 200, nullable: true })
  authorName: string;

  @Column({ name: 'author_id', length: 200, nullable: true })
  authorId: string;

  @Column({ name: 'publish_time', type: 'bigint', nullable: true })
  publishTime: number;

  @Column({ name: 'like_count', type: 'int', nullable: true })
  likeCount: number;

  @Column({ name: 'comment_count', type: 'int', nullable: true })
  commentCount: number;

  @Column({ name: 'share_count', type: 'int', nullable: true })
  shareCount: number;

  @Column({ name: 'collect_count', type: 'int', nullable: true })
  collectCount: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'video_id', length: 200, nullable: true })
  videoId: string;

  @Column({ name: 'download_url', length: 1000, nullable: true })
  downloadUrl: string;

  @Column({ name: 'cover_url', length: 1000, nullable: true })
  coverUrl: string;

  @Column({ name: 'content_tags', type: 'json', nullable: true })
  contentTags: string[];

  @Column({ name: 'danmaku_count', type: 'int', nullable: true })
  danmakuCount: number;
}
