import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';

// Mock bcrypt
jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    patientProfile: {
      create: jest.fn(),
    },
    practitionerProfile: {
      create: jest.fn(),
    },
    consentRecord: {
      createMany: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-token'),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        JWT_SECRET: 'test-secret',
        JWT_REFRESH_SECRET: 'test-refresh-secret',
        JWT_EXPIRATION: '15m',
        JWT_REFRESH_EXPIRATION: '7d',
        TOTP_ISSUER: 'Ndiipano',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@test.com',
        passwordHash: 'hashed-password',
        role: 'PATIENT',
        isActive: true,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@test.com', 'password');

      expect(result).toBeDefined();
      expect(result.email).toBe('test@test.com');
    });

    it('should return null when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.validateUser('notfound@test.com', 'password');

      expect(result).toBeNull();
    });

    it('should return null when password is invalid', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@test.com',
        passwordHash: 'hashed-password',
        isActive: true,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser('test@test.com', 'wrongpassword');

      expect(result).toBeNull();
    });

    it('should return null when user is inactive', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@test.com',
        passwordHash: 'hashed-password',
        isActive: false,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.validateUser('test@test.com', 'password');

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return tokens for valid user', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@test.com',
        role: 'PATIENT',
        twoFactorEnabled: false,
      };

      const result = await service.login(mockUser as any);

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(mockJwtService.sign).toHaveBeenCalledTimes(2);
    });
  });

  describe('register', () => {
    it('should throw ConflictException when email already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'existing' });

      const dto = {
        email: 'existing@test.com',
        phone: '+260971234567',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        dateOfBirth: '1990-01-01',
        gender: 'MALE',
        consentDataProcessing: true,
        consentTerms: true,
      };

      await expect(service.register(dto as any, 'PATIENT')).rejects.toThrow(ConflictException);
    });

    it('should create patient user and profile', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      const mockCreatedUser = {
        id: 'new-user-1',
        email: 'new@test.com',
        role: 'PATIENT',
        firstName: 'New',
        lastName: 'User',
        twoFactorEnabled: false,
      };

      mockPrismaService.user.create.mockResolvedValue(mockCreatedUser);
      mockPrismaService.consentRecord.createMany.mockResolvedValue({ count: 2 });

      const dto = {
        email: 'new@test.com',
        phone: '+260971234567',
        password: 'Password123!',
        firstName: 'New',
        lastName: 'User',
        dateOfBirth: '1990-01-01',
        gender: 'MALE',
        consentDataProcessing: true,
        consentTerms: true,
      };

      const result = await service.register(dto as any, 'PATIENT');

      expect(result.accessToken).toBeDefined();
      expect(result.user.email).toBe('new@test.com');
      expect(mockPrismaService.user.create).toHaveBeenCalled();
    });
  });
});
