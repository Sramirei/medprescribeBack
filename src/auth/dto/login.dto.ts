import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'dr@test.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'dr123' })
  @IsString()
  @MinLength(3)
  password: string;
}
