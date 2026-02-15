import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ description: '用户名', example: 'testuser' })
  @IsString()
  username: string;

  @ApiProperty({ description: '密码', example: '123456' })
  @IsString()
  @MinLength(6, { message: '密码至少6个字符' })
  password: string;
}
