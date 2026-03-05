import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ReferralsService } from './referrals.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('ReferralsService', () => {
  let service: ReferralsService;

  const mockPrismaService: any = {
    referral: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    booking: {
      findUnique: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn((cb: any) => cb(mockPrismaService)),
  };

  const mockNotificationsService = {
    sendToUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferralsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<ReferralsService>(ReferralsService);
    jest.clearAllMocks();
    // Re-set $transaction since clearAllMocks clears it
    mockPrismaService.$transaction.mockImplementation((cb: any) => cb(mockPrismaService));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ===========================================================================
  // create
  // ===========================================================================

  describe('create', () => {
    const dto = {
      patientId: 'patient-1',
      reason: 'Specialist consultation needed',
      urgency: 'ROUTINE',
      referredPractitionerId: 'practitioner-2',
      bookingId: 'booking-1',
    };

    it('should create a referral when patient exists', async () => {
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce({ id: 'patient-1', role: 'PATIENT', firstName: 'John', lastName: 'Doe' })
        .mockResolvedValueOnce({ id: 'practitioner-2', role: 'DOCTOR' });
      mockPrismaService.booking.findUnique.mockResolvedValue({ id: 'booking-1' });
      mockPrismaService.referral.create.mockResolvedValue({
        id: 'referral-1',
        status: 'SENT',
        patientId: 'patient-1',
        referringPractitionerId: 'practitioner-1',
        referredPractitionerId: 'practitioner-2',
      });

      const result = await service.create('practitioner-1', dto as any);

      expect(result).toBeDefined();
      expect(result.status).toBe('SENT');
      expect(mockPrismaService.referral.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException when patient not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.create('practitioner-1', dto as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when referred practitioner not found', async () => {
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce({ id: 'patient-1', role: 'PATIENT', firstName: 'John', lastName: 'Doe' })
        .mockResolvedValueOnce(null);

      await expect(service.create('practitioner-1', dto as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when booking not found', async () => {
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce({ id: 'patient-1', role: 'PATIENT', firstName: 'John', lastName: 'Doe' })
        .mockResolvedValueOnce({ id: 'practitioner-2', role: 'DOCTOR' });
      mockPrismaService.booking.findUnique.mockResolvedValue(null);

      await expect(service.create('practitioner-1', dto as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ===========================================================================
  // findAll
  // ===========================================================================

  describe('findAll', () => {
    const mockReferrals = [
      { id: 'referral-1', status: 'SENT', patientId: 'patient-1' },
    ];

    it('should return paginated results for patient role', async () => {
      mockPrismaService.referral.findMany.mockResolvedValue(mockReferrals);
      mockPrismaService.referral.count.mockResolvedValue(1);

      const result = await service.findAll('patient-1', 'PATIENT', { page: 1, limit: 20 });

      expect(result.data).toEqual(mockReferrals);
      expect(result.meta.total).toBe(1);
    });

    it('should return paginated results for practitioner role', async () => {
      mockPrismaService.referral.findMany.mockResolvedValue(mockReferrals);
      mockPrismaService.referral.count.mockResolvedValue(1);

      const result = await service.findAll('practitioner-1', 'DOCTOR', { page: 1, limit: 20 });

      expect(result.data).toEqual(mockReferrals);
      expect(result.meta.total).toBe(1);
    });

    it('should return all for admin role', async () => {
      mockPrismaService.referral.findMany.mockResolvedValue(mockReferrals);
      mockPrismaService.referral.count.mockResolvedValue(1);

      const result = await service.findAll('admin-1', 'ADMIN', { page: 1, limit: 20 });

      expect(result.data).toEqual(mockReferrals);
    });
  });

  // ===========================================================================
  // findById
  // ===========================================================================

  describe('findById', () => {
    const mockReferral = {
      id: 'referral-1',
      patientId: 'patient-1',
      referringPractitionerId: 'practitioner-1',
      referredPractitionerId: 'practitioner-2',
    };

    it('should return referral with relations', async () => {
      mockPrismaService.referral.findUnique.mockResolvedValue(mockReferral);

      const result = await service.findById('patient-1', 'PATIENT', 'referral-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('referral-1');
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrismaService.referral.findUnique.mockResolvedValue(null);

      await expect(
        service.findById('patient-1', 'PATIENT', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not involved', async () => {
      mockPrismaService.referral.findUnique.mockResolvedValue(mockReferral);

      await expect(
        service.findById('other-user', 'DOCTOR', 'referral-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ===========================================================================
  // accept
  // ===========================================================================

  describe('accept', () => {
    it('should accept when referred practitioner owns it and status is SENT', async () => {
      const referral = {
        id: 'referral-1',
        referredPractitionerId: 'practitioner-2',
        referringPractitionerId: 'practitioner-1',
        patientId: 'patient-1',
        status: 'SENT',
      };

      mockPrismaService.referral.findUnique.mockResolvedValue(referral);
      mockPrismaService.referral.update.mockResolvedValue({
        ...referral,
        status: 'ACCEPTED',
      });
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.accept('practitioner-2', 'referral-1');

      expect(result.status).toBe('ACCEPTED');
      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'REFERRAL_ACCEPTED' }),
        }),
      );
    });

    it('should throw ForbiddenException when not referred practitioner', async () => {
      const referral = {
        id: 'referral-1',
        referredPractitionerId: 'practitioner-2',
        status: 'SENT',
      };

      mockPrismaService.referral.findUnique.mockResolvedValue(referral);

      await expect(
        service.accept('practitioner-1', 'referral-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when status is not SENT', async () => {
      const referral = {
        id: 'referral-1',
        referredPractitionerId: 'practitioner-2',
        status: 'COMPLETED',
      };

      mockPrismaService.referral.findUnique.mockResolvedValue(referral);

      await expect(
        service.accept('practitioner-2', 'referral-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ===========================================================================
  // decline
  // ===========================================================================

  describe('decline', () => {
    it('should decline with reason', async () => {
      const referral = {
        id: 'referral-1',
        referredPractitionerId: 'practitioner-2',
        referringPractitionerId: 'practitioner-1',
        patientId: 'patient-1',
        status: 'SENT',
      };

      mockPrismaService.referral.findUnique.mockResolvedValue(referral);
      mockPrismaService.referral.update.mockResolvedValue({
        ...referral,
        status: 'DECLINED',
      });
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.decline('practitioner-2', 'referral-1', {
        reason: 'Not available',
      });

      expect(result.status).toBe('DECLINED');
      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'REFERRAL_DECLINED' }),
        }),
      );
    });

    it('should throw ForbiddenException when not referred practitioner', async () => {
      const referral = {
        id: 'referral-1',
        referredPractitionerId: 'practitioner-2',
        status: 'SENT',
      };

      mockPrismaService.referral.findUnique.mockResolvedValue(referral);

      await expect(
        service.decline('practitioner-1', 'referral-1', { reason: 'Nope' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ===========================================================================
  // complete
  // ===========================================================================

  describe('complete', () => {
    it('should complete when either practitioner and status is ACCEPTED', async () => {
      const referral = {
        id: 'referral-1',
        referringPractitionerId: 'practitioner-1',
        referredPractitionerId: 'practitioner-2',
        patientId: 'patient-1',
        status: 'ACCEPTED',
      };

      mockPrismaService.referral.findUnique.mockResolvedValue(referral);
      mockPrismaService.referral.update.mockResolvedValue({
        ...referral,
        status: 'COMPLETED',
      });
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.complete('practitioner-1', 'referral-1', {});

      expect(result.status).toBe('COMPLETED');
      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'REFERRAL_COMPLETED' }),
        }),
      );
    });

    it('should throw BadRequestException on terminal status', async () => {
      const referral = {
        id: 'referral-1',
        referringPractitionerId: 'practitioner-1',
        referredPractitionerId: 'practitioner-2',
        status: 'DECLINED',
      };

      mockPrismaService.referral.findUnique.mockResolvedValue(referral);

      await expect(
        service.complete('practitioner-1', 'referral-1', {}),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ===========================================================================
  // cancel
  // ===========================================================================

  describe('cancel', () => {
    it('should cancel when referring practitioner and status is non-terminal', async () => {
      const referral = {
        id: 'referral-1',
        referringPractitionerId: 'practitioner-1',
        referredPractitionerId: 'practitioner-2',
        patientId: 'patient-1',
        status: 'SENT',
      };

      mockPrismaService.referral.findUnique.mockResolvedValue(referral);
      mockPrismaService.referral.update.mockResolvedValue({
        ...referral,
        status: 'CANCELLED',
      });
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.cancel('practitioner-1', 'referral-1');

      expect(result.status).toBe('CANCELLED');
      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'REFERRAL_CANCELLED' }),
        }),
      );
    });

    it('should throw ForbiddenException when not referring practitioner', async () => {
      const referral = {
        id: 'referral-1',
        referringPractitionerId: 'practitioner-1',
        status: 'SENT',
      };

      mockPrismaService.referral.findUnique.mockResolvedValue(referral);

      await expect(
        service.cancel('practitioner-2', 'referral-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException on terminal status', async () => {
      const referral = {
        id: 'referral-1',
        referringPractitionerId: 'practitioner-1',
        status: 'COMPLETED',
      };

      mockPrismaService.referral.findUnique.mockResolvedValue(referral);

      await expect(
        service.cancel('practitioner-1', 'referral-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
