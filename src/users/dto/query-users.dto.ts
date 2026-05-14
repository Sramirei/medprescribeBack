import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString } from 'class-validator';
import { Role } from '@prisma/client';
import { PaginationDto } from '../../common/dto/pagination.dto';

export enum UserOrderBy {
  CREATED_AT = 'createdAt',
  NAME = 'name',
  EMAIL = 'email',
  ROLE = 'role',
}

export class QueryUsersDto extends PaginationDto {
  @ApiPropertyOptional({ example: 'john', description: 'Search by name or email' })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({ enum: UserOrderBy, default: UserOrderBy.CREATED_AT })
  @IsOptional()
  @IsEnum(UserOrderBy)
  orderBy?: UserOrderBy = UserOrderBy.CREATED_AT;
}
