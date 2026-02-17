import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('BookingsService', () => {
  let service: BookingsService;

  const mockPrismaService = {
    booking: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    practitionerProfile: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    bookingTracking: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a booking when practitioner is available and verified', async () => {
      const practitionerProfile = {
        id: 'pp-1',
        userId: 'practitioner-1',
        hpczVerified: true,
        isAvailable: true,
        user: { id: 'practitioner-1', isActive: true },
      };

      mockPrismaService.practitionerProfile.findUnique.mockResolvedValue(practitionerProfile);
      mockPrismaService.booking.findMany.mockResolvedValue([]); // no conflicts
      mockPrismaService.booking.create.mockResolvedValue({
        id: 'booking-1',
        patientId: 'patient-1',
        practitionerId: 'practitioner-1',
        status: 'REQUESTED',
        serviceType: 'HOME_VISIT',
        scheduledAt: new Date('2025-01-15T09:00:00Z'),
      });

      const dto = {
        practitionerId: 'practitioner-1',
        serviceType: 'HOME_VISIT',
        scheduledAt: '2025-01-15T09:00:00Z',
        address: '123 Cairo Road',
        locationLat: -15.4167,
        locationLng: 28.2833,
      };

      const result = await service.create('patient-1', dto as any);

      expect(result).toBeDefined();
      expect(result.status).toBe('REQUESTED');
      expect(mockPrismaService.booking.create).toHaveBeenCalled();
    });

    it('should reject booking when practitioner is not verified', async () => {
      const practitionerProfile = {
        id: 'pp-1',
        userId: 'practitioner-1',
        hpczVerified: false,
        isAvailable: true,
        user: { id: 'practitioner-1', isActive: true },
      };

      mockPrismaService.practitionerProfile.findUnique.mockResolvedValue(practitionerProfile);

      const dto = {
        practitionerId: 'practitioner-1',
        serviceType: 'HOME_VISIT',
        scheduledAt: '2025-01-15T09:00:00Z',
      };

      await expect(service.create('patient-1', dto as any)).rejects.toThrow(BadRequestException);
    });

    it('should reject booking when practitioner is not available', async () => {
      const practitionerProfile = {
        id: 'pp-1',
        userId: 'practitioner-1',
        hpczVerified: true,
        isAvailable: false,
        user: { id: 'practitioner-1', isActive: true },
      };

      mockPrismaService.practitionerProfile.findUnique.mockResolvedValue(practitionerProfile);

      const dto = {
        practitionerId: 'practitioner-1',
        serviceType: 'HOME_VISIT',
        scheduledAt: '2025-01-15T09:00:00Z',
      };

      await expect(service.create('patient-1', dto as any)).rejects.toThrow(BadRequestException);
    });
  });

  describe('accept', () => {
    it('should accept a booking when practitioner owns it', async () => {
      const booking = {
        id: 'booking-1',
        practitionerId: 'practitioner-1',
        status: 'REQUESTED',
      };

      mockPrismaService.booking.findUnique.mockResolvedValue(booking);
      mockPrismaService.booking.update.mockResolvedValue({
        ...booking,
        status: 'ACCEPTED',
      });

      const result = await service.accept('booking-1', 'practitioner-1');

      expect(result.status).toBe('ACCEPTED');
    });

    it('should reject when practitioner does not own the booking', async () => {
      const booking = {
        id: 'booking-1',
        practitionerId: 'other-practitioner',
        status: 'REQUESTED',
      };

      mockPrismaService.booking.findUnique.mockResolvedValue(booking);

      await expect(service.accept('booking-1', 'practitioner-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should reject when booking is not in REQUESTED status', async () => {
      const booking = {
        id: 'booking-1',
        practitionerId: 'practitioner-1',
        status: 'COMPLETED',
      };

      mockPrismaService.booking.findUnique.mockResolvedValue(booking);

      await expect(service.accept('booking-1', 'practitioner-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('cancel', () => {
    it('should allow patient to cancel their booking', async () => {
      const booking = {
        id: 'booking-1',
        patientId: 'patient-1',
        practitionerId: 'practitioner-1',
        status: 'ACCEPTED',
      };

      mockPrismaService.booking.findUnique.mockResolvedValue(booking);
      mockPrismaService.booking.update.mockResolvedValue({
        ...booking,
        status: 'CANCELLED',
        cancellationReason: 'Change of plans',
        cancelledBy: 'patient-1',
      });

      const result = await service.cancel('booking-1', 'patient-1', 'Change of plans');

      expect(result.status).toBe('CANCELLED');
    });

    it('should not allow cancellation of completed bookings', async () => {
      const booking = {
        id: 'booking-1',
        patientId: 'patient-1',
        practitionerId: 'practitioner-1',
        status: 'COMPLETED',
      };

      mockPrismaService.booking.findUnique.mockResolvedValue(booking);

      await expect(
        service.cancel('booking-1', 'patient-1', 'Too late'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findById', () => {
    it('should return booking with relations', async () => {
      const booking = {
        id: 'booking-1',
        patientId: 'patient-1',
        practitionerId: 'practitioner-1',
        status: 'ACCEPTED',
        patient: { firstName: 'Test', lastName: 'Patient' },
        practitioner: { firstName: 'Dr. Test', lastName: 'Doctor' },
      };

      mockPrismaService.booking.findUnique.mockResolvedValue(booking);

      const result = await service.findById('booking-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('booking-1');
    });

    it('should throw NotFoundException when booking not found', async () => {
      mockPrismaService.booking.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
