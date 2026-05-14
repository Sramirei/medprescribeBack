import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

const mockUser = {
  id: 'user-id-1',
  email: 'dr@test.com',
  password: '',
  name: 'Dr. Smith',
  role: 'doctor' as const,
  refreshToken: null,
  createdAt: new Date(),
  doctorId: 'doctor-id-1',
  patientId: null,
  doctor: { id: 'doctor-id-1', userId: 'user-id-1', specialty: 'General' },
  patient: null,
};

describe('AuthService', () => {
  let service: AuthService;
  let prisma: jest.Mocked<Partial<PrismaService>>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    mockUser.password = await bcrypt.hash('dr123', 10);

    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      } as unknown as PrismaService['user'],
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('mock-token'),
            verify: jest.fn().mockReturnValue({ sub: 'user-id-1', email: 'dr@test.com', role: 'doctor' }),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              const config: Record<string, string> = {
                'jwt.accessSecret': 'test-access-secret',
                'jwt.refreshSecret': 'test-refresh-secret',
                'jwt.accessTtl': '15m',
                'jwt.refreshTtl': '7d',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get(JwtService);
  });

  describe('login', () => {
    it('should return tokens and user on valid credentials', async () => {
      (prisma.user!.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user!.update as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.login({ email: 'dr@test.com', password: 'dr123' });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe('dr@test.com');
      expect(result.user.role).toBe('doctor');
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      (prisma.user!.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        service.login({ email: 'dr@test.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for unknown email', async () => {
      (prisma.user!.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@test.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
