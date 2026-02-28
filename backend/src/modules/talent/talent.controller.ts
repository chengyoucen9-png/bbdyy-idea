import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TalentService } from './talent.service';
import { PlatformType, TalentMaterialType } from './talent.entity';

@ApiTags('达人')
@Controller('talents')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class TalentController {
  constructor(private readonly talentService: TalentService) {}

  @Get()
  @ApiOperation({ summary: '获取达人列表' })
  async findAll(@Query('platform') platform?: PlatformType) {
    return this.talentService.findAll({ platform });
  }

  @Get('materials')
  @ApiOperation({ summary: '获取达人素材列表' })
  async getMaterials(
    @Query('talentId') talentId?: number,
    @Query('type') type?: TalentMaterialType,
    @Query('keywords') keywords?: string,
  ) {
    return this.talentService.getMaterials({ talentId, type, keywords });
  }

  @Get('stats')
  @ApiOperation({ summary: '获取达人统计数据' })
  async getStats() {
    return this.talentService.getStatistics();
  }

  @Post()
  @ApiOperation({ summary: '创建达人' })
  async create(@Body() data: {
    name: string;
    platform: PlatformType;
    platformId: string;
    avatar?: string;
    profileUrl?: string;
    followers?: number;
    description?: string;
  }) {
    return this.talentService.create(data);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新达人' })
  async update(
    @Param('id') id: number,
    @Body() data: {
      name?: string;
      platform?: PlatformType;
      avatar?: string;
      profileUrl?: string;
      followers?: number;
      description?: string;
      isActive?: boolean;
    },
  ) {
    return this.talentService.update(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除达人' })
  async delete(@Param('id') id: number) {
    return this.talentService.delete(id);
  }

  @Delete('materials/:id')
  @ApiOperation({ summary: '删除达人素材' })
  async deleteMaterial(@Param('id') id: number) {
    return this.talentService.deleteMaterial(id);
  }
}
