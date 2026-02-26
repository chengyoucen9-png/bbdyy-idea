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

export enum TopicStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'inProgress',
  COMPLETED = 'completed',
}

export enum TopicPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

@Entity('topics')
export class Topic {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'final_draft', type: 'longtext', nullable: true })
  finalDraft: string;

  @Column({ length: 100, nullable: true })
  source: string;

  @Column({ type: 'enum', enum: TopicStatus, default: TopicStatus.PENDING })
  status: TopicStatus;

  @Column({ type: 'enum', enum: TopicPriority, default: TopicPriority.MEDIUM })
  priority: TopicPriority;

  @Column({ default: 1 })
  difficulty: number;

  @Column({ name: 'content_type', length: 50, nullable: true })
  contentType: string;

  @Column({ type: 'text', nullable: true })
  script: string;

  @Column({ type: 'json', nullable: true })
  titles: string[];

  @Column({ length: 100, nullable: true })
  platform: string;

  @Column({ name: 'related_materials', type: 'json', nullable: true })
  relatedMaterials: number[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.topics, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
