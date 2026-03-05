import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

// 平台类型
export enum PlatformType {
  DOUYIN = 'douyin',
  KUAISHOU = 'kuaishou',
  BILI = 'bili',
  WEIBO = 'weibo',
}

// 素材类型
export enum TalentMaterialType {
  VIDEO = 'video',
  IMAGE = 'image',
  TEXT = 'text',
}

@Entity('talents')
export class Talent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({
    type: 'enum',
    enum: PlatformType,
    default: PlatformType.DOUYIN,
  })
  platform: PlatformType;

  @Column({ name: 'platform_id', length: 100 })
  platformId: string;

  @Column({ length: 500, nullable: true })
  avatar: string;

  @Column({ name: 'profile_url', length: 500, nullable: true })
  profileUrl: string;

  @Column({ default: 0 })
  followers: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => TalentMaterial, (material) => material.talent)
  materials: TalentMaterial[];
}

@Entity('talent_materials')
export class TalentMaterial {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'talent_id' })
  talentId: number;

  @ManyToOne(() => Talent, (talent) => talent.materials)
  @JoinColumn({ name: 'talent_id' })
  talent: Talent;

  @Column({ length: 200 })
  title: string;

  @Column({ length: 500, nullable: true })
  thumbnail: string;

  @Column({ length: 1000 })
  ossUrl: string;

  @Column({
    type: 'enum',
    enum: TalentMaterialType,
    default: TalentMaterialType.VIDEO,
  })
  type: TalentMaterialType;

  @Column({ name: 'like_count', default: 0 })
  likeCount: number;

  @Column({ name: 'comment_count', default: 0 })
  commentCount: number;

  @Column({ name: 'share_count', default: 0 })
  shareCount: number;

  @Column({ name: 'collect_count', default: 0 })
  collectCount: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  scene: string;

  @Column({ type: 'json', nullable: true })
  tags: string[];

  @Column({ name: 'crawl_time', type: 'datetime', nullable: true })
  crawlTime: Date;

  @Column({ name: 'publish_time', type: 'datetime', nullable: true })
  publishTime: Date;

  @Column({ name: 'video_id', length: 200, nullable: true })
  videoId: string;

  @Column({ name: 'download_url', length: 1000, nullable: true })
  downloadUrl: string;

  @Column({ name: 'duration', length: 50, nullable: true })
  duration: string;

  @Column({ name: 'note', type: 'text', nullable: true })
  note: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
