import { IsString, IsOptional, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { TopicStatus, TopicPriority } from '../topic.entity';

export class CreateTopicDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  source?: string;

  @IsEnum(TopicStatus)
  @IsOptional()
  status?: TopicStatus;

  @IsEnum(TopicPriority)
  @IsOptional()
  priority?: TopicPriority;

  @IsNumber()
  @Min(1)
  @Max(3)
  @IsOptional()
  difficulty?: number;
}

export class UpdateTopicDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  source?: string;

  @IsEnum(TopicStatus)
  @IsOptional()
  status?: TopicStatus;

  @IsEnum(TopicPriority)
  @IsOptional()
  priority?: TopicPriority;

  @IsNumber()
  @Min(1)
  @Max(3)
  @IsOptional()
  difficulty?: number;
}
