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

  @Column({ length: 100, nullable: true })
  source: string;

  @Column({
    type: 'enum',
    enum: TopicStatus,
    default: TopicStatus.PENDING,
  })
  status: TopicStatus;

  @Column({
    type: 'enum',
    enum: TopicPriority,
    default: TopicPriority.MEDIUM,
  })
  priority: TopicPriority;

  @Column({ default: 1 })
  difficulty: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.topics, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
