import { Test, TestingModule } from '@nestjs/testing';
import { PrescriptionsService } from './prescriptions.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

const doctorUser: JwtPayload = {
  sub: 'user-doctor-1',
  email: 'dr@test.com',
  role: 'doctor',
  name: 'Dr. Smith',
  doctorId: 'doctor-id-1',
  patientId: null,
};

const patientUser: JwtPayload = {
  sub: 'user-patient-1',
  email: 'patient@test.com',
  role: 'patient',
  name: 'Jane Doe',
  doctorId: null,
  patientId: 'patient-id-1',
};

const mockPrescription = {
  id: 'rx-1',
  code: 'RX-001',
  status: 'pending',
  notes: null,
  createdAt: new Date(),
  consumedAt: null,
  patientId: 'patient-id-1',
  authorId: 'doctor-id-1',
  patient: { id: 'patient-id-1', userId: 'user-patient-1', user: { name: 'Jane', email: 'p@t.com' } },
  author: { id: 'doctor-id-1', userId: 'user-doctor-1', specialty: null, user: { name: 'Dr. Smith', email: 'dr@t.com' } },
  items: [],
};

describe('PrescriptionsService', () => {
  let service: PrescriptionsService;
  let prisma: jest.Mocked<Partial<PrismaService>>;

  beforeEach(async () => {
    prisma = {
      prescription: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      } as unknown as PrismaService['prescription'],
      patient: {
        findUnique: jest.fn(),
      } as unknown as PrismaService['patient'],
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrescriptionsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<PrescriptionsService>(PrescriptionsService);
  });

  describe('create', () => {
    it('should create prescription for doctor', async () => {
      (prisma.patient!.findUnique as jest.Mock).mockResolvedValue({ id: 'patient-id-1' });
      (prisma.prescription!.create as jest.Mock).mockResolvedValue(mockPrescription);

      const result = await service.create(
        { patientId: 'patient-id-1', items: [{ name: 'Aspirin' }] },
        doctorUser,
      );

      expect(result.code).toBe('RX-001');
      expect(prisma.prescription!.create).toHaveBeenCalled();
    });

    it('should throw ForbiddenException for non-doctor', async () => {
      await expect(
        service.create({ patientId: 'patient-id-1', items: [] }, patientUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException for unknown patient', async () => {
      (prisma.patient!.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.create({ patientId: 'non-existent', items: [] }, doctorUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('consume', () => {
    it('should allow patient to consume their prescription', async () => {
      (prisma.prescription!.findUnique as jest.Mock).mockResolvedValue(mockPrescription);
      (prisma.prescription!.update as jest.Mock).mockResolvedValue({
        ...mockPrescription,
        status: 'consumed',
        consumedAt: new Date(),
      });

      const result = await service.consume('rx-1', patientUser);
      expect(result.status).toBe('consumed');
    });

    it('should throw ForbiddenException when doctor tries to consume', async () => {
      (prisma.prescription!.findUnique as jest.Mock).mockResolvedValue(mockPrescription);

      await expect(service.consume('rx-1', doctorUser)).rejects.toThrow(ForbiddenException);
    });
  });
});
