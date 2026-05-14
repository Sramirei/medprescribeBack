import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { QueryPrescriptionDto } from './dto/query-prescription.dto';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { paginate, getPaginationParams } from '../common/utils/pagination.util';
import { nanoid } from './utils/code.util';

const PRESCRIPTION_INCLUDE = {
  patient: {
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  },
  author: {
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  },
  items: true,
} as const;

@Injectable()
export class PrescriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePrescriptionDto, user: JwtPayload) {
    if (!user.doctorId) {
      throw new ForbiddenException('Only doctors can create prescriptions');
    }

    const patient = await this.prisma.patient.findUnique({ where: { id: dto.patientId } });
    if (!patient) throw new NotFoundException(`Patient ${dto.patientId} not found`);

    const code = `RX-${Date.now()}-${nanoid(6)}`;

    return this.prisma.prescription.create({
      data: {
        code,
        notes: dto.notes,
        patientId: dto.patientId,
        authorId: user.doctorId,
        items: {
          create: dto.items.map((item) => ({
            name: item.name,
            dosage: item.dosage,
            quantity: item.quantity,
            instructions: item.instructions,
          })),
        },
      },
      include: PRESCRIPTION_INCLUDE,
    });
  }

  async findAll(query: QueryPrescriptionDto, user: JwtPayload) {
    const { page = 1, limit = 10, order = 'desc', status, from, to } = query;
    const { skip, take } = getPaginationParams(page, limit);

    const where = this.buildWhereClause(user, { status, from, to });

    const [prescriptions, total] = await Promise.all([
      this.prisma.prescription.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: order },
        include: PRESCRIPTION_INCLUDE,
      }),
      this.prisma.prescription.count({ where }),
    ]);

    return paginate(prescriptions, total, page, limit);
  }

  async findOne(id: string, user: JwtPayload) {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id },
      include: PRESCRIPTION_INCLUDE,
    });

    if (!prescription) throw new NotFoundException(`Prescription ${id} not found`);

    this.checkAccess(prescription, user);
    return prescription;
  }

  async consume(id: string, user: JwtPayload) {
    const prescription = await this.findOne(id, user);

    if (prescription.status === 'consumed') {
      throw new BadRequestException('Prescription already consumed');
    }

    if (user.role !== 'patient' && user.role !== 'admin') {
      throw new ForbiddenException('Only patients can consume prescriptions');
    }

    if (user.role === 'patient' && prescription.patient.userId !== user.sub) {
      throw new ForbiddenException('You can only consume your own prescriptions');
    }

    return this.prisma.prescription.update({
      where: { id },
      data: { status: 'consumed', consumedAt: new Date() },
      include: PRESCRIPTION_INCLUDE,
    });
  }

  private buildWhereClause(
    user: JwtPayload,
    filters: { status?: string; from?: string; to?: string },
  ) {
    const where: Record<string, unknown> = {};

    if (user.role === 'doctor' && user.doctorId) {
      where['authorId'] = user.doctorId;
    } else if (user.role === 'patient' && user.patientId) {
      where['patientId'] = user.patientId;
    }

    if (filters.status) where['status'] = filters.status;

    if (filters.from || filters.to) {
      where['createdAt'] = {
        ...(filters.from && { gte: new Date(filters.from) }),
        ...(filters.to && { lte: new Date(filters.to) }),
      };
    }

    return where;
  }

  private checkAccess(
    prescription: { author: { id: string }; patient: { userId: string } },
    user: JwtPayload,
  ) {
    if (user.role === 'admin') return;

    if (user.role === 'doctor' && prescription.author.id !== user.doctorId) {
      throw new ForbiddenException('You can only access your own prescriptions');
    }

    if (user.role === 'patient' && prescription.patient.userId !== user.sub) {
      throw new ForbiddenException('You can only access your own prescriptions');
    }
  }
}
