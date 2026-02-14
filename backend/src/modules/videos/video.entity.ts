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
import { Topic } from '../topics/topic.entity';

@Entity('videos')
export class Video {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'topic_id', nullable: true })
  topicId: number;

  @Column({ length: 200 })
  title: string;

  @Column({ name: 'publish_date', type: 'date', nullable: true })
  publishDate: Date;

  @Column({ length: 50, nullable: true })
  platform: string;

  @Column({ default: 0 })
  views: number;

  @Column({ default: 0 })
  likes: number;

  @Column({ default: 0 })
  comments: number;

  @Column({ default: 0 })
  shares: number;

  @Column({
    name: 'completion_rate',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
  })
  completionRate: number;

  @Column({ name: 'material_ids', type: 'json', nullable: true })
  materialIds: number[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.videos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Topic, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'topic_id' })
  topic: Topic;
}
