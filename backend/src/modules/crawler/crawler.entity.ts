import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { Talent } from '../talent/talent.entity';

export enum CrawlerStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum CrawlerType {
  DOUYIN_TALENT = 'douyin_talent',
  BATCH = 'batch',
}

@Entity('crawler_tasks')
export class CrawlerTask {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: CrawlerType })
  type: CrawlerType;

  @Column({ type: 'enum', enum: CrawlerStatus, default: CrawlerStatus.PENDING })
  status: CrawlerStatus;

  @Column({ nullable: true })
  talentId: number;

  @ManyToOne(() => Talent, { nullable: true })
  talent: Talent;

  @Column({ type: 'text', nullable: true })
  talentUrl: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  taskTitle: string;

  @Column({ type: 'json', nullable: true })
  config: any;

  @Column({ default: 0 })
  progress: number;

  @Column({ default: 0 })
  materialsCount: number;

  @Column({ type: 'timestamp', nullable: true })
  crawlStartTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  crawlEndTime: Date;

  @Column({ type: 'text', nullable: true })
  error: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('crawler_records')
export class CrawlerRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  taskId: number;

  @ManyToOne(() => CrawlerTask)
  task: CrawlerTask;

  @Column({ type: 'json' })
  data: any;

  @Column({ type: 'boolean', default: false })
  success: boolean;

  @Column({ type: 'text', nullable: true })
  error: string;

  @CreateDateColumn()
  createdAt: Date;
}
