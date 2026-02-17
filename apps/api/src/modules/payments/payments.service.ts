import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentStatus, PaymentMethod } from '@prisma/client';
import {
  InitiatePaymentDto,
  PaystackWebhookDto,
  PaymentQueryDto,
  InsuranceClaimDto,
  PayoutRequestDto,
  EarningsQueryDto,
} from './dto/payment.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly paystackSecretKey: string;
  private readonly paystackBaseUrl: string;
  private readonly webhookSecret: string;
  private readonly commissionPercent: number;
  private readonly currency: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.paystackSecretKey =
      this.configService.get<string>('payments.apiKey') || '';
    this.paystackBaseUrl =
      this.configService.get<string>('payments.apiUrl') ||
      'https://api.paystack.co';
    this.webhookSecret =
      this.configService.get<string>('payments.webhookSecret') || '';
    this.commissionPercent =
      this.configService.get<number>('payments.commissionPercent') || 15;
    this.currency =
      this.configService.get<string>('payments.currency') || 'ZMW';
  }

  // ---------------------------------------------------------------------------
  // Initiate Payment
  // ---------------------------------------------------------------------------

  async initiatePayment(patientUserId: string, dto: InitiatePaymentDto) {
    // Fetch the booking and validate ownership
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: {
        patient: { select: { id: true, email: true, firstName: true, lastName: true } },
        practitioner: { select: { id: true } },
        payment: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.patientId !== patientUserId) {
      throw new ForbiddenException('You can only pay for your own bookings');
    }

    if (booking.payment) {
      throw new BadRequestException(
        'A payment already exists for this booking. ' +
          `Current status: ${booking.payment.status}`,
      );
    }

    if (booking.status === 'CANCELLED') {
      throw new BadRequestException('Cannot pay for a cancelled booking');
    }

    // Determine the payment amount from the practitioner's consultation fee
    const practitionerProfile = await this.prisma.practitionerProfile.findUnique(
      {
        where: { userId: booking.practitionerId },
        select: { baseConsultationFee: true },
      },
    );

    const amount = practitionerProfile?.baseConsultationFee
      ? Number(practitionerProfile.baseConsultationFee)
      : 0;

    if (amount <= 0) {
      throw new BadRequestException(
        'Unable to determine payment amount. Practitioner has no consultation fee configured.',
      );
    }

    const reference = `NDI-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    // Create the payment record with PENDING status
    const payment = await this.prisma.payment.create({
      data: {
        bookingId: dto.bookingId,
        patientId: patientUserId,
        practitionerId: booking.practitionerId,
        amount,
        currency: this.currency,
        paymentMethod: dto.paymentMethod,
        paymentProvider: this.resolveProvider(dto.paymentMethod),
        providerReference: reference,
        status: PaymentStatus.PENDING,
        metadata: {
          callbackUrl: dto.callbackUrl || null,
          initiatedAt: new Date().toISOString(),
        },
      },
    });

    // Determine flow based on payment method
    const isMobileMoney = ([
      PaymentMethod.MOBILE_MONEY_MTN,
      PaymentMethod.MOBILE_MONEY_AIRTEL,
      PaymentMethod.MOBILE_MONEY_ZAMTEL,
    ] as PaymentMethod[]).includes(dto.paymentMethod);

    if (isMobileMoney) {
      // Mobile money: return a payment intent (reference) for the client
      // to complete via USSD or provider SDK
      return {
        paymentId: payment.id,
        reference,
        amount,
        currency: this.currency,
        paymentMethod: dto.paymentMethod,
        status: PaymentStatus.PENDING,
        message:
          'Mobile money payment initiated. Use the reference to complete payment via your mobile money provider.',
      };
    }

    // Card payments (Visa/Mastercard) or bank transfer: Initialize via Paystack
    try {
      const paystackResponse = await firstValueFrom(
        this.httpService.post(
          `${this.paystackBaseUrl}/transaction/initialize`,
          {
            email: booking.patient.email,
            // Paystack expects amount in lowest currency unit (ngwee for ZMW)
            amount: Math.round(amount * 100),
            currency: this.currency,
            reference,
            callback_url: dto.callbackUrl || undefined,
            metadata: {
              paymentId: payment.id,
              bookingId: dto.bookingId,
              patientName: `${booking.patient.firstName} ${booking.patient.lastName}`,
            },
          },
          {
            headers: {
              Authorization: `Bearer ${this.paystackSecretKey}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const { authorization_url, access_code } =
        paystackResponse.data?.data || {};

      // Update payment with provider details
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.PROCESSING,
          metadata: {
            ...(payment.metadata as object),
            accessCode: access_code,
            authorizationUrl: authorization_url,
          },
        },
      });

      return {
        paymentId: payment.id,
        reference,
        amount,
        currency: this.currency,
        paymentMethod: dto.paymentMethod,
        status: PaymentStatus.PROCESSING,
        authorizationUrl: authorization_url,
        accessCode: access_code,
      };
    } catch (error) {
      this.logger.error(
        `Paystack initialization failed for payment ${payment.id}`,
        (error as any)?.response?.data || (error as Error).message,
      );

      // Update payment to FAILED
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          metadata: {
            ...(payment.metadata as object),
            error: (error as any)?.response?.data?.message || (error as Error).message,
          },
        },
      });

      throw new InternalServerErrorException(
        'Failed to initialize payment with provider. Please try again.',
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Handle Paystack Webhook
  // ---------------------------------------------------------------------------

  async handlePaystackWebhook(
    signature: string,
    payload: PaystackWebhookDto,
  ) {
    // Verify webhook signature using HMAC SHA512
    const hash = crypto
      .createHmac('sha512', this.webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (hash !== signature) {
      this.logger.warn('Invalid Paystack webhook signature received');
      throw new ForbiddenException('Invalid webhook signature');
    }

    const { event, data } = payload;

    this.logger.log(
      `Paystack webhook received: ${event} | reference: ${data.reference}`,
    );

    // Find the payment by provider reference
    const payment = await this.prisma.payment.findFirst({
      where: { providerReference: data.reference },
    });

    if (!payment) {
      this.logger.warn(
        `Payment not found for reference: ${data.reference}`,
      );
      // Return 200 to Paystack so it does not retry
      return { received: true, processed: false };
    }

    if (event === 'charge.success' && data.status === 'success') {
      const { commission, payout } = this.calculateCommission(
        Number(payment.amount),
      );

      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.COMPLETED,
          commissionAmount: commission,
          practitionerPayout: payout,
          metadata: {
            ...(payment.metadata as object),
            webhookEvent: event,
            gatewayResponse: data.gateway_response || null,
            completedAt: new Date().toISOString(),
          },
        },
      });

      this.logger.log(
        `Payment ${payment.id} completed. Amount: ${payment.amount}, ` +
          `Commission: ${commission}, Payout: ${payout}`,
      );

      return { received: true, processed: true, status: 'completed' };
    }

    if (event === 'charge.failed' || data.status === 'failed') {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          metadata: {
            ...(payment.metadata as object),
            webhookEvent: event,
            gatewayResponse: data.gateway_response || null,
            failedAt: new Date().toISOString(),
          },
        },
      });

      this.logger.log(`Payment ${payment.id} failed.`);

      return { received: true, processed: true, status: 'failed' };
    }

    // For other events, just acknowledge
    return { received: true, processed: false, event };
  }

  // ---------------------------------------------------------------------------
  // Get Payment By ID
  // ---------------------------------------------------------------------------

  async getPaymentById(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        booking: {
          select: {
            id: true,
            serviceType: true,
            status: true,
            scheduledAt: true,
            address: true,
            city: true,
          },
        },
        patient: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        practitioner: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  // ---------------------------------------------------------------------------
  // Get Payments By User
  // ---------------------------------------------------------------------------

  async getPaymentsByUser(
    userId: string,
    role: string,
    query: PaymentQueryDto,
  ) {
    const { status, page = 1, limit = 20, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    // Filter by role
    if (role === 'PATIENT') {
      where.patientId = userId;
    } else {
      // Practitioner and admin roles see practitioner payments
      where.practitionerId = userId;
    }

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        (where.createdAt as Record<string, unknown>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.createdAt as Record<string, unknown>).lte = new Date(endDate);
      }
    }

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: {
          booking: {
            select: {
              id: true,
              serviceType: true,
              status: true,
              scheduledAt: true,
            },
          },
          patient: {
            select: { id: true, firstName: true, lastName: true },
          },
          practitioner: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      data: payments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Get Payment By Booking
  // ---------------------------------------------------------------------------

  async getPaymentByBooking(bookingId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { bookingId },
      include: {
        booking: {
          select: {
            id: true,
            serviceType: true,
            status: true,
            scheduledAt: true,
          },
        },
        patient: {
          select: { id: true, firstName: true, lastName: true },
        },
        practitioner: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('No payment found for this booking');
    }

    return payment;
  }

  // ---------------------------------------------------------------------------
  // Calculate Commission
  // ---------------------------------------------------------------------------

  calculateCommission(amount: number): { commission: number; payout: number } {
    const commission = parseFloat(
      ((amount * this.commissionPercent) / 100).toFixed(2),
    );
    const payout = parseFloat((amount - commission).toFixed(2));
    return { commission, payout };
  }

  // ---------------------------------------------------------------------------
  // Request Payout
  // ---------------------------------------------------------------------------

  async requestPayout(practitionerUserId: string, dto?: PayoutRequestDto) {
    // Find all COMPLETED payments for this practitioner that haven't been paid out
    const where: Record<string, unknown> = {
      practitionerId: practitionerUserId,
      status: PaymentStatus.COMPLETED,
      paidOutAt: null,
    };

    if (dto?.startDate || dto?.endDate) {
      where.createdAt = {};
      if (dto.startDate) {
        (where.createdAt as Record<string, unknown>).gte = new Date(
          dto.startDate,
        );
      }
      if (dto.endDate) {
        (where.createdAt as Record<string, unknown>).lte = new Date(
          dto.endDate,
        );
      }
    }

    const pendingPayouts = await this.prisma.payment.findMany({
      where,
      select: {
        id: true,
        amount: true,
        practitionerPayout: true,
      },
    });

    if (pendingPayouts.length === 0) {
      throw new BadRequestException('No pending payouts available');
    }

    const totalPayout = pendingPayouts.reduce(
      (sum, p) => sum + Number(p.practitionerPayout || 0),
      0,
    );

    // Mark payments as processing (stub for actual bank/mobile money transfer)
    const paymentIds = pendingPayouts.map((p) => p.id);

    await this.prisma.payment.updateMany({
      where: { id: { in: paymentIds } },
      data: {
        status: PaymentStatus.PROCESSING,
        metadata: {
          payoutRequestedAt: new Date().toISOString(),
        },
      },
    });

    this.logger.log(
      `Payout requested by practitioner ${practitionerUserId}. ` +
        `${paymentIds.length} payments, total: ${totalPayout} ${this.currency}`,
    );

    return {
      message: 'Payout request submitted successfully',
      paymentCount: paymentIds.length,
      totalPayout,
      currency: this.currency,
      status: 'PROCESSING',
    };
  }

  // ---------------------------------------------------------------------------
  // Get Earnings
  // ---------------------------------------------------------------------------

  async getEarnings(
    practitionerUserId: string,
    query: EarningsQueryDto,
  ) {
    const { period = 'month' } = query;

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case 'year':
        startDate = new Date(now);
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case 'all':
      default:
        startDate = new Date(0);
        break;
    }

    // Get completed payments for the practitioner within the period
    const completedPayments = await this.prisma.payment.findMany({
      where: {
        practitionerId: practitionerUserId,
        status: PaymentStatus.COMPLETED,
        createdAt: { gte: startDate },
      },
      select: {
        amount: true,
        commissionAmount: true,
        practitionerPayout: true,
        paidOutAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const totalEarnings = completedPayments.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );
    const totalCommission = completedPayments.reduce(
      (sum, p) => sum + Number(p.commissionAmount || 0),
      0,
    );
    const totalNet = completedPayments.reduce(
      (sum, p) => sum + Number(p.practitionerPayout || 0),
      0,
    );
    const totalPaidOut = completedPayments
      .filter((p) => p.paidOutAt !== null)
      .reduce((sum, p) => sum + Number(p.practitionerPayout || 0), 0);
    const pendingPayout = totalNet - totalPaidOut;

    // Group earnings by month
    const byMonth: Record<
      string,
      { total: number; commission: number; net: number; count: number }
    > = {};

    for (const payment of completedPayments) {
      const monthKey = `${payment.createdAt.getFullYear()}-${String(payment.createdAt.getMonth() + 1).padStart(2, '0')}`;
      if (!byMonth[monthKey]) {
        byMonth[monthKey] = { total: 0, commission: 0, net: 0, count: 0 };
      }
      byMonth[monthKey].total += Number(payment.amount);
      byMonth[monthKey].commission += Number(payment.commissionAmount || 0);
      byMonth[monthKey].net += Number(payment.practitionerPayout || 0);
      byMonth[monthKey].count += 1;
    }

    return {
      period,
      currency: this.currency,
      summary: {
        totalEarnings: parseFloat(totalEarnings.toFixed(2)),
        totalCommission: parseFloat(totalCommission.toFixed(2)),
        totalNet: parseFloat(totalNet.toFixed(2)),
        totalPaidOut: parseFloat(totalPaidOut.toFixed(2)),
        pendingPayout: parseFloat(pendingPayout.toFixed(2)),
        transactionCount: completedPayments.length,
      },
      byMonth: Object.entries(byMonth).map(([month, data]) => ({
        month,
        ...data,
      })),
    };
  }

  // ---------------------------------------------------------------------------
  // Submit Insurance Claim
  // ---------------------------------------------------------------------------

  async submitInsuranceClaim(patientUserId: string, dto: InsuranceClaimDto) {
    // Verify the booking exists and belongs to the patient
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: { insuranceClaim: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.patientId !== patientUserId) {
      throw new ForbiddenException(
        'You can only submit claims for your own bookings',
      );
    }

    if (booking.insuranceClaim) {
      throw new BadRequestException(
        'An insurance claim already exists for this booking',
      );
    }

    const claimReference = `CLM-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const claim = await this.prisma.insuranceClaim.create({
      data: {
        bookingId: dto.bookingId,
        patientId: patientUserId,
        insuranceProvider: dto.insuranceProvider,
        claimReference,
        amount: dto.amount,
        status: 'SUBMITTED',
        notes: dto.notes || null,
      },
      include: {
        booking: {
          select: {
            id: true,
            serviceType: true,
            scheduledAt: true,
          },
        },
      },
    });

    this.logger.log(
      `Insurance claim ${claimReference} submitted by patient ${patientUserId} for booking ${dto.bookingId}`,
    );

    return claim;
  }

  // ---------------------------------------------------------------------------
  // Get Insurance Claims
  // ---------------------------------------------------------------------------

  async getInsuranceClaims(patientUserId: string) {
    const claims = await this.prisma.insuranceClaim.findMany({
      where: { patientId: patientUserId },
      include: {
        booking: {
          select: {
            id: true,
            serviceType: true,
            status: true,
            scheduledAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return claims;
  }

  // ---------------------------------------------------------------------------
  // Private Helpers
  // ---------------------------------------------------------------------------

  private resolveProvider(method: PaymentMethod): string {
    switch (method) {
      case PaymentMethod.MOBILE_MONEY_MTN:
        return 'mtn_momo';
      case PaymentMethod.MOBILE_MONEY_AIRTEL:
        return 'airtel_money';
      case PaymentMethod.MOBILE_MONEY_ZAMTEL:
        return 'zamtel_kwacha';
      case PaymentMethod.VISA:
      case PaymentMethod.MASTERCARD:
        return 'paystack';
      case PaymentMethod.BANK_TRANSFER:
        return 'paystack';
      case PaymentMethod.INSURANCE:
        return 'insurance';
      case PaymentMethod.CASH:
        return 'cash';
      default:
        return 'unknown';
    }
  }
}
