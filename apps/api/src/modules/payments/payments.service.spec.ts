import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('PaymentsService', () => {
  let service: PaymentsService;

  const mockPrismaService = {
    payment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    booking: {
      findUnique: jest.fn(),
    },
    practitionerProfile: {
      findUnique: jest.fn(),
    },
    insuranceClaim: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockHttpService = {
    post: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, unknown> = {
        'payments.apiKey': 'sk_test_key',
        'payments.apiUrl': 'https://api.paystack.co',
        'payments.webhookSecret': 'webhook_secret',
        'payments.commissionPercent': 15,
        'payments.currency': 'ZMW',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateCommission', () => {
    it('should calculate 15% commission correctly', () => {
      const result = service.calculateCommission(1000);
      expect(result.commission).toBe(150);
      expect(result.payout).toBe(850);
    });

    it('should handle decimal amounts', () => {
      const result = service.calculateCommission(350);
      expect(result.commission).toBe(52.5);
      expect(result.payout).toBe(297.5);
    });

    it('should handle zero amount', () => {
      const result = service.calculateCommission(0);
      expect(result.commission).toBe(0);
      expect(result.payout).toBe(0);
    });
  });

  describe('getPaymentById', () => {
    it('should return payment with relations', async () => {
      const payment = {
        id: 'pay-1',
        bookingId: 'booking-1',
        amount: 350,
        status: 'COMPLETED',
        booking: { id: 'booking-1', serviceType: 'GENERAL_CONSULTATION' },
        patient: { id: 'patient-1', firstName: 'John', lastName: 'Doe', email: 'john@test.com' },
        practitioner: { id: 'prac-1', firstName: 'Dr', lastName: 'Smith' },
      };

      mockPrismaService.payment.findUnique.mockResolvedValue(payment);

      const result = await service.getPaymentById('pay-1');
      expect(result.id).toBe('pay-1');
      expect(result.amount).toBe(350);
    });

    it('should throw NotFoundException when payment not found', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue(null);

      await expect(service.getPaymentById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('initiatePayment', () => {
    it('should throw NotFoundException for non-existent booking', async () => {
      mockPrismaService.booking.findUnique.mockResolvedValue(null);

      const dto = {
        bookingId: 'nonexistent',
        paymentMethod: 'MOBILE_MONEY_MTN' as const,
      };

      await expect(
        service.initiatePayment('patient-1', dto as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when patient does not own booking', async () => {
      mockPrismaService.booking.findUnique.mockResolvedValue({
        id: 'booking-1',
        patientId: 'other-patient',
        practitionerId: 'prac-1',
        status: 'CONFIRMED',
        patient: { id: 'other-patient', email: 'other@test.com', firstName: 'Other', lastName: 'Patient' },
        practitioner: { id: 'prac-1' },
        payment: null,
      });

      const dto = {
        bookingId: 'booking-1',
        paymentMethod: 'MOBILE_MONEY_MTN' as const,
      };

      await expect(
        service.initiatePayment('patient-1', dto as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when payment already exists', async () => {
      mockPrismaService.booking.findUnique.mockResolvedValue({
        id: 'booking-1',
        patientId: 'patient-1',
        practitionerId: 'prac-1',
        status: 'CONFIRMED',
        patient: { id: 'patient-1', email: 'john@test.com', firstName: 'John', lastName: 'Doe' },
        practitioner: { id: 'prac-1' },
        payment: { id: 'existing-payment', status: 'PENDING' },
      });

      const dto = {
        bookingId: 'booking-1',
        paymentMethod: 'MOBILE_MONEY_MTN' as const,
      };

      await expect(
        service.initiatePayment('patient-1', dto as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPaymentByBooking', () => {
    it('should return payment for booking', async () => {
      const payment = {
        id: 'pay-1',
        bookingId: 'booking-1',
        amount: 350,
        booking: { id: 'booking-1', serviceType: 'GENERAL_CONSULTATION', status: 'COMPLETED', scheduledAt: new Date() },
        patient: { id: 'patient-1', firstName: 'John', lastName: 'Doe' },
        practitioner: { id: 'prac-1', firstName: 'Dr', lastName: 'Smith' },
      };

      mockPrismaService.payment.findUnique.mockResolvedValue(payment);

      const result = await service.getPaymentByBooking('booking-1');
      expect(result.bookingId).toBe('booking-1');
    });

    it('should throw NotFoundException when no payment for booking', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue(null);

      await expect(
        service.getPaymentByBooking('booking-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('requestPayout', () => {
    it('should throw BadRequestException when no pending payouts', async () => {
      mockPrismaService.payment.findMany.mockResolvedValue([]);

      await expect(
        service.requestPayout('prac-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should process payout for pending payments', async () => {
      mockPrismaService.payment.findMany.mockResolvedValue([
        { id: 'pay-1', amount: 350, practitionerPayout: 297.5 },
        { id: 'pay-2', amount: 500, practitionerPayout: 425 },
      ]);
      mockPrismaService.payment.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.requestPayout('prac-1');

      expect(result.paymentCount).toBe(2);
      expect(result.totalPayout).toBe(722.5);
      expect(result.status).toBe('PROCESSING');
    });
  });
});
