import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUsersDto, UserOrderBy } from './dto/query-users.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { paginate, getPaginationParams } from '../common/utils/pagination.util';
import * as bcrypt from 'bcrypt';

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  doctorId: true,
  patientId: true,
  doctor: { select: { id: true, specialty: true } },
  patient: { select: { id: true, birthDate: true } },
  password: false,
  refreshToken: false,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already registered');

    const hashed = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashed,
        name: dto.name,
        role: dto.role,
      },
      select: { id: true, role: true },
    });

    if (dto.role === 'doctor') {
      const doctor = await this.prisma.doctor.create({
        data: { userId: user.id, specialty: dto.specialty ?? null },
      });
      await this.prisma.user.update({
        where: { id: user.id },
        data: { doctorId: doctor.id },
      });
    }

    if (dto.role === 'patient') {
      const patient = await this.prisma.patient.create({
        data: {
          userId: user.id,
          birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
        },
      });
      await this.prisma.user.update({
        where: { id: user.id },
        data: { patientId: patient.id },
      });
    }

    return this.findOne(user.id);
  }

  async findAll(query: QueryUsersDto) {
    const {
      page = 1,
      limit = 10,
      order = 'desc',
      orderBy = UserOrderBy.CREATED_AT,
      role,
      query: search,
    } = query;

    const { skip, take } = getPaginationParams(page, limit);

    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(role && { role }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const orderByClause: Prisma.UserOrderByWithRelationInput = {
      [orderBy]: order,
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: orderByClause,
        select: USER_SELECT,
      }),
      this.prisma.user.count({ where }),
    ]);

    return paginate(users, total, page, limit);
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: USER_SELECT,
    });

    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async update(id: string, dto: UpdateUserDto, requesterId: string) {
    const current = await this.findOne(id);

    // Email uniqueness check
    if (dto.email && dto.email !== current.email) {
      const taken = await this.prisma.user.findFirst({
        where: { email: dto.email, NOT: { id }, deletedAt: null },
      });
      if (taken) throw new ConflictException('Email already in use');
    }

    // Role change logic
    if (dto.role && dto.role !== current.role) {
      await this.handleRoleChange(id, current.role, dto.role, {
        specialty: dto.specialty,
        birthDate: dto.birthDate,
      });
    }

    const updateData: Prisma.UserUpdateInput = {};
    if (dto.name) updateData.name = dto.name;
    if (dto.email) updateData.email = dto.email;
    if (dto.password) updateData.password = await bcrypt.hash(dto.password, 10);
    if (dto.role) updateData.role = dto.role;

    await this.prisma.user.update({ where: { id }, data: updateData });

    return this.findOne(id);
  }

  async remove(id: string, requesterId: string) {
    await this.findOne(id);

    // Prevent self-deletion
    if (id === requesterId) {
      throw new ForbiddenException('You cannot delete your own account');
    }

    // Prevent deleting last admin
    const user = await this.prisma.user.findUnique({ where: { id }, select: { role: true } });
    if (user?.role === 'admin') {
      const adminCount = await this.prisma.user.count({
        where: { role: 'admin', deletedAt: null },
      });
      if (adminCount <= 1) {
        throw new BadRequestException('Cannot delete the last admin user');
      }
    }

    // Soft delete
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), refreshToken: null },
    });

    return { message: 'User deleted successfully' };
  }

  async resetPassword(id: string, dto: ResetPasswordDto) {
    await this.findOne(id);
    const hashed = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id },
      data: { password: hashed, refreshToken: null },
    });
    return { message: 'Password reset successfully' };
  }

  private async handleRoleChange(
    userId: string,
    oldRole: Role,
    newRole: Role,
    extra: { specialty?: string; birthDate?: string },
  ) {
    // Remove old role record
    if (oldRole === 'doctor') {
      await this.prisma.doctor.deleteMany({ where: { userId } });
      await this.prisma.user.update({ where: { id: userId }, data: { doctorId: null } });
    }
    if (oldRole === 'patient') {
      // Check if patient has prescriptions before removal
      const patient = await this.prisma.patient.findUnique({ where: { userId } });
      if (patient) {
        const rxCount = await this.prisma.prescription.count({
          where: { patientId: patient.id },
        });
        if (rxCount > 0) {
          throw new BadRequestException(
            'Cannot change role: patient has existing prescriptions',
          );
        }
        await this.prisma.patient.delete({ where: { userId } });
        await this.prisma.user.update({ where: { id: userId }, data: { patientId: null } });
      }
    }

    // Create new role record
    if (newRole === 'doctor') {
      const doctor = await this.prisma.doctor.create({
        data: { userId, specialty: extra.specialty ?? null },
      });
      await this.prisma.user.update({
        where: { id: userId },
        data: { doctorId: doctor.id },
      });
    }
    if (newRole === 'patient') {
      const patient = await this.prisma.patient.create({
        data: {
          userId,
          birthDate: extra.birthDate ? new Date(extra.birthDate) : null,
        },
      });
      await this.prisma.user.update({
        where: { id: userId },
        data: { patientId: patient.id },
      });
    }
    if (newRole === 'admin') {
      // admin has no profile record, just clear any dangling references
      await this.prisma.user.update({
        where: { id: userId },
        data: { doctorId: null, patientId: null },
      });
    }
  }
}
