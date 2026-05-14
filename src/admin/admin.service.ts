import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getMetrics() {
    const [
      totalDoctors,
      totalPatients,
      totalPrescriptions,
      prescriptionsByStatus,
      prescriptionsByDay,
      topDoctors,
    ] = await Promise.all([
      this.prisma.doctor.count(),
      this.prisma.patient.count(),
      this.prisma.prescription.count(),
      this.prisma.prescription.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.$queryRaw<Array<{ day: string; count: bigint }>>`
        SELECT
          DATE_TRUNC('day', "createdAt")::date::text AS day,
          COUNT(*)::bigint AS count
        FROM "Prescription"
        GROUP BY DATE_TRUNC('day', "createdAt")
        ORDER BY day DESC
        LIMIT 30
      `,
      this.prisma.doctor.findMany({
        take: 5,
        include: {
          user: { select: { name: true, email: true } },
          _count: { select: { prescriptions: true } },
        },
        orderBy: {
          prescriptions: { _count: 'desc' },
        },
      }),
    ]);

    const statusMap = prescriptionsByStatus.reduce<Record<string, number>>(
      (acc, cur) => {
        acc[cur.status] = cur._count._all;
        return acc;
      },
      {},
    );

    return {
      totals: {
        doctors: totalDoctors,
        patients: totalPatients,
        prescriptions: totalPrescriptions,
      },
      byStatus: {
        pending: statusMap['pending'] ?? 0,
        consumed: statusMap['consumed'] ?? 0,
      },
      byDay: prescriptionsByDay.map((row) => ({
        day: row.day,
        count: Number(row.count),
      })),
      topDoctors: topDoctors.map((d) => ({
        id: d.id,
        name: d.user.name,
        email: d.user.email,
        specialty: d.specialty,
        prescriptionsCount: d._count.prescriptions,
      })),
    };
  }
}
