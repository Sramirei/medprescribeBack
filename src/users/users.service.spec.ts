import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  ConflictException,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

const baseUser = {
  id: 'user-1',
  email: 'test@test.com',
  name: 'Test User',
  role: 'doctor' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  doctorId: 'doctor-1',
  patientId: null,
  doctor: { id: 'doctor-1', specialty: 'General' },
  patient: null,
};

describe('UsersService', () => {
  let service: UsersService;
  let prisma: jest.Mocked<Partial<PrismaService>>;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      } as unknown as PrismaService['user'],
      doctor: {
        create: jest.fn(),
        deleteMany: jest.fn(),
      } as unknown as PrismaService['doctor'],
      patient: {
        create: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      } as unknown as PrismaService['patient'],
      prescription: {
        count: jest.fn(),
      } as unknown as PrismaService['prescription'],
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('create', () => {
    it('should throw ConflictException if email exists', async () => {
      (prisma.user!.findUnique as jest.Mock).mockResolvedValue(baseUser);
      await expect(
        service.create({ email: 'test@test.com', password: '123456', name: 'Test', role: 'doctor' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create user and doctor record for role doctor', async () => {
      (prisma.user!.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user!.create as jest.Mock).mockResolvedValue({ id: 'user-1', role: 'doctor' });
      (prisma.doctor!.create as jest.Mock).mockResolvedValue({ id: 'doctor-1' });
      (prisma.user!.update as jest.Mock).mockResolvedValue({});
      (prisma.user!.findFirst as jest.Mock).mockResolvedValue(baseUser);

      const result = await service.create({
        email: 'new@test.com',
        password: '123456',
        name: 'New Doctor',
        role: 'doctor',
        specialty: 'Cardiology',
      });

      expect(prisma.doctor!.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', specialty: 'Cardiology' },
      });
      expect(result).toEqual(baseUser);
    });

    it('should create user without profile for admin role', async () => {
      (prisma.user!.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user!.create as jest.Mock).mockResolvedValue({ id: 'admin-1', role: 'admin' });
      (prisma.user!.findFirst as jest.Mock).mockResolvedValue({
        ...baseUser, id: 'admin-1', role: 'admin', doctorId: null, doctor: null,
      });

      await service.create({ email: 'admin2@test.com', password: '123456', name: 'Admin', role: 'admin' });

      expect(prisma.doctor!.create).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException for unknown id', async () => {
      (prisma.user!.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should return user without password', async () => {
      (prisma.user!.findFirst as jest.Mock).mockResolvedValue(baseUser);
      const result = await service.findOne('user-1');
      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('refreshToken');
    });
  });

  describe('remove', () => {
    it('should throw ForbiddenException when deleting own account', async () => {
      (prisma.user!.findFirst as jest.Mock).mockResolvedValue(baseUser);
      await expect(service.remove('user-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when deleting last admin', async () => {
      const admin = { ...baseUser, id: 'admin-1', role: 'admin' as const };
      (prisma.user!.findFirst as jest.Mock).mockResolvedValue(admin);
      (prisma.user!.findUnique as jest.Mock).mockResolvedValue({ role: 'admin' });
      (prisma.user!.count as jest.Mock).mockResolvedValue(1);

      await expect(service.remove('admin-1', 'other-user')).rejects.toThrow(BadRequestException);
    });

    it('should soft delete user', async () => {
      (prisma.user!.findFirst as jest.Mock).mockResolvedValue(baseUser);
      (prisma.user!.findUnique as jest.Mock).mockResolvedValue({ role: 'doctor' });
      (prisma.user!.update as jest.Mock).mockResolvedValue({});

      const result = await service.remove('user-1', 'other-admin');
      expect(prisma.user!.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: expect.objectContaining({ deletedAt: expect.any(Date), refreshToken: null }),
      });
      expect(result.message).toBe('User deleted successfully');
    });
  });

  describe('resetPassword', () => {
    it('should update password and clear refresh token', async () => {
      (prisma.user!.findFirst as jest.Mock).mockResolvedValue(baseUser);
      (prisma.user!.update as jest.Mock).mockResolvedValue({});

      const result = await service.resetPassword('user-1', { newPassword: 'newpass123' });
      expect(prisma.user!.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: expect.objectContaining({ refreshToken: null }),
      });
      expect(result.message).toBe('Password reset successfully');
    });
  });
});
