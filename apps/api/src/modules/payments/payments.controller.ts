import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiHeader,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import {
  InitiatePaymentDto,
  PaystackWebhookDto,
  PaymentQueryDto,
  InsuranceClaimDto,
  PayoutRequestDto,
  EarningsQueryDto,
} from './dto/payment.dto';
import {
  CurrentUser,
  Roles,
  UserRole,
  PRACTITIONER_ROLES,
  Public,
  RolesGuard,
  JwtAuthGuard,
} from '../../common';

@ApiTags('Payments')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'payments', version: '1' })
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // ---------------------------------------------------------------------------
  // POST /payments/initiate
  // ---------------------------------------------------------------------------

  @Post('initiate')
  @Roles(UserRole.PATIENT)
  @ApiOperation({
    summary: 'Initiate a payment for a booking',
    description:
      'Creates a payment record and returns either a payment URL (card) or reference (mobile money) for the patient to complete payment.',
  })
  @ApiResponse({ status: 201, description: 'Payment initiated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid booking or duplicate payment' })
  @ApiResponse({ status: 403, description: 'Forbidden - not your booking' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async initiatePayment(
    @CurrentUser('id') userId: string,
    @Body() dto: InitiatePaymentDto,
  ) {
    return this.paymentsService.initiatePayment(userId, dto);
  }

  // ---------------------------------------------------------------------------
  // POST /payments/webhook/paystack
  // ---------------------------------------------------------------------------

  @Post('webhook/paystack')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Paystack webhook handler',
    description:
      'Receives and processes Paystack webhook events. Verifies signature with HMAC SHA512. This endpoint is public but signature-protected.',
  })
  @ApiHeader({
    name: 'x-paystack-signature',
    description: 'HMAC SHA512 signature from Paystack',
    required: true,
  })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  @ApiResponse({ status: 403, description: 'Invalid signature' })
  async handlePaystackWebhook(
    @Headers('x-paystack-signature') signature: string,
    @Body() payload: PaystackWebhookDto,
  ) {
    return this.paymentsService.handlePaystackWebhook(signature, payload);
  }

  // ---------------------------------------------------------------------------
  // GET /payments
  // ---------------------------------------------------------------------------

  @Get()
  @ApiOperation({
    summary: 'List own payments',
    description:
      'Patients see their payments; practitioners see payments where they are the provider. Supports filtering and pagination.',
  })
  @ApiResponse({ status: 200, description: 'List of payments with pagination' })
  async getPayments(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Query() query: PaymentQueryDto,
  ) {
    return this.paymentsService.getPaymentsByUser(userId, role, query);
  }

  // ---------------------------------------------------------------------------
  // GET /payments/earnings
  // ---------------------------------------------------------------------------

  @Get('earnings')
  @Roles(...PRACTITIONER_ROLES)
  @ApiOperation({
    summary: 'Get earnings summary',
    description:
      'Returns earnings breakdown for a practitioner including total, commission, net, by-month totals, and pending payouts.',
  })
  @ApiResponse({ status: 200, description: 'Earnings summary' })
  async getEarnings(
    @CurrentUser('id') userId: string,
    @Query() query: EarningsQueryDto,
  ) {
    return this.paymentsService.getEarnings(userId, query);
  }

  // ---------------------------------------------------------------------------
  // GET /payments/insurance-claims
  // ---------------------------------------------------------------------------

  @Get('insurance-claims')
  @Roles(UserRole.PATIENT)
  @ApiOperation({
    summary: 'List own insurance claims',
    description: 'Returns all insurance claims submitted by the authenticated patient.',
  })
  @ApiResponse({ status: 200, description: 'List of insurance claims' })
  async getInsuranceClaims(@CurrentUser('id') userId: string) {
    return this.paymentsService.getInsuranceClaims(userId);
  }

  // ---------------------------------------------------------------------------
  // GET /payments/booking/:bookingId
  // ---------------------------------------------------------------------------

  @Get('booking/:bookingId')
  @ApiOperation({
    summary: 'Get payment by booking ID',
    description: 'Returns the payment record associated with a specific booking.',
  })
  @ApiParam({ name: 'bookingId', description: 'Booking UUID' })
  @ApiResponse({ status: 200, description: 'Payment details' })
  @ApiResponse({ status: 404, description: 'Payment not found for booking' })
  async getPaymentByBooking(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
  ) {
    return this.paymentsService.getPaymentByBooking(bookingId);
  }

  // ---------------------------------------------------------------------------
  // GET /payments/:id
  // ---------------------------------------------------------------------------

  @Get(':id')
  @ApiOperation({
    summary: 'Get payment details',
    description: 'Returns full details of a specific payment including booking information.',
  })
  @ApiParam({ name: 'id', description: 'Payment UUID' })
  @ApiResponse({ status: 200, description: 'Payment details' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async getPayment(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.getPaymentById(id);
  }

  // ---------------------------------------------------------------------------
  // POST /payments/payout-request
  // ---------------------------------------------------------------------------

  @Post('payout-request')
  @Roles(...PRACTITIONER_ROLES)
  @ApiOperation({
    summary: 'Request payout of earned funds',
    description:
      'Marks all unpaid completed payments as processing for bank/mobile money transfer. ' +
      'Optionally filter by date range.',
  })
  @ApiResponse({ status: 201, description: 'Payout request submitted' })
  @ApiResponse({ status: 400, description: 'No pending payouts available' })
  async requestPayout(
    @CurrentUser('id') userId: string,
    @Body() dto: PayoutRequestDto,
  ) {
    return this.paymentsService.requestPayout(userId, dto);
  }

  // ---------------------------------------------------------------------------
  // POST /payments/insurance-claims
  // ---------------------------------------------------------------------------

  @Post('insurance-claims')
  @Roles(UserRole.PATIENT)
  @ApiOperation({
    summary: 'Submit an insurance claim',
    description:
      'Submits an insurance claim for a completed booking. Only one claim per booking is allowed.',
  })
  @ApiResponse({ status: 201, description: 'Insurance claim submitted' })
  @ApiResponse({ status: 400, description: 'Duplicate claim or invalid data' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async submitInsuranceClaim(
    @CurrentUser('id') userId: string,
    @Body() dto: InsuranceClaimDto,
  ) {
    return this.paymentsService.submitInsuranceClaim(userId, dto);
  }
}
