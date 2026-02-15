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

interface ModelConfig {
  enabled: boolean;
  apiEndpoint: string;
  model: string;
  apiKey: string;
}

@Entity('ai_providers')
export class AiProvider {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 50 })
  type: string;

  @Column({ length: 10, default: '🤖' })
  icon: string;

  @Column({ length: 500, nullable: true })
  description: string;

  @Column({ name: 'vision_config', type: 'json', nullable: true })
  visionConfig: ModelConfig;

  @Column({ name: 'text_config', type: 'json', nullable: true })
  textConfig: ModelConfig;

  @Column({ name: 'is_default', default: 0 })
  isDefault: number;

  @Column({ default: 1 })
  enabled: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.aiProviders, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
