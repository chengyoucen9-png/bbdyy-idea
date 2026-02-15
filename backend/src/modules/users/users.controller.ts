import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  Request,
  Post,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { OssService } from '../oss/oss.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly ossService: OssService,
  ) {}

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
}
