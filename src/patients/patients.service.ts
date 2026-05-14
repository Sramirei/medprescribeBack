import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { paginate, getPaginationParams } from '../common/utils/pagination.util';

@Injectable()
export class PatientsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(pagination: PaginationDto) {
    const { page = 1, limit = 10, order = 'desc' } = pagination;
    const { skip, take } = getPaginationParams(page, limit);

    const [patients, total] = await Promise.all([
      this.prisma.patient.findMany({
        skip,
        take,
        orderBy: { user: { createdAt: order } },
        include: {
          user: { select: { id: true, email: true, name: true, createdAt: true } },
          _count: { select: { prescriptions: true } },
        },
      }),
      this.prisma.patient.count(),
    ]);

    return paginate(patients, total, page, limit);
  }

  async findOne(id: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, name: true, createdAt: true } },
        _count: { select: { prescriptions: true } },
      },
    });

    if (!patient) throw new NotFoundException(`Patient ${id} not found`);
    return patient;
  }

  async update(id: string, dto: UpdatePatientDto) {
    await this.findOne(id);
    return this.prisma.patient.update({
      where: { id },
      data: { birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
  }
}
