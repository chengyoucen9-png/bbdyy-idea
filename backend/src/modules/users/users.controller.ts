import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { AuthService } from '../auth/auth.service';
import { OssService } from '../oss/oss.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
    private readonly ossService: OssService,
  ) {}

  // ── 当前用户 ──────────────────────────────────────────────────────────────

  @Get('me')
  async getProfile(@Request() req) {
    return req.user;
  }

  @Put('me')
  async updateProfile(@Request() req, @Body() data: any) {
    return this.usersService.update(req.user.id, data);
  }

  @Post('avatar')
  @UseInterceptors(FileInterceptor('file'))
  async updateAvatar(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const result = await this.ossService.uploadFile(file, 'avatars');
    return this.usersService.updateAvatar(req.user.id, result.url);
  }

  // ── 用户管理 ──────────────────────────────────────────────────────────────

  @Get()
  async findAll() {
    return this.usersService.findAll();
  }

  @Post()
  async create(
    @Body()
    body: {
      username: string;
      email: string;
      password: string;
      nickname?: string;
      role?: 'user' | 'admin';
    },
  ) {
    return this.usersService.create(body as any);
  }

  @Put(':id')
  async update(@Param('id') id: number, @Body() data: any) {
    return this.usersService.update(id, data);
  }

  @Patch(':id/toggle-status')
  async toggleStatus(@Param('id') id: number) {
    return this.usersService.toggleStatus(id);
  }

  @Delete(':id')
  async remove(@Param('id') id: number) {
    return this.usersService.remove(id);
  }

  /** 以指定用户身份生成 Token，前端可直接用于免密登录 */
  @Post(':id/login-as')
  async loginAs(@Param('id') id: number) {
    const user = await this.usersService.findOne(id);
    return this.authService.generateTokenForUser(user);
  }
}
