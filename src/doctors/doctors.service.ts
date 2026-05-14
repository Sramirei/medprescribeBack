import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { paginate, getPaginationParams } from '../common/utils/pagination.util';

@Injectable()
export class DoctorsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(pagination: PaginationDto) {
    const { page = 1, limit = 10, order = 'desc' } = pagination;
    const { skip, take } = getPaginationParams(page, limit);

    const [doctors, total] = await Promise.all([
      this.prisma.doctor.findMany({
        skip,
        take,
        orderBy: { user: { createdAt: order } },
        include: {
          user: { select: { id: true, email: true, name: true, createdAt: true } },
          _count: { select: { prescriptions: true } },
        },
      }),
      this.prisma.doctor.count(),
    ]);

    return paginate(doctors, total, page, limit);
  }

  async findOne(id: string) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, name: true, createdAt: true } },
        _count: { select: { prescriptions: true } },
      },
    });

    if (!doctor) throw new NotFoundException(`Doctor ${id} not found`);
    return doctor;
  }

  async update(id: string, dto: UpdateDoctorDto) {
    await this.findOne(id);
    return this.prisma.doctor.update({
      where: { id },
      data: { specialty: dto.specialty },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
  }
}
