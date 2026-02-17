import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { UserRole as PrismaUserRole } from '@prisma/client';
import { BookingsService } from './bookings.service';
import {
  CreateBookingDto,
  BookingQueryDto,
  RejectBookingDto,
  CancelBookingDto,
} from './dto/booking.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles, UserRole, PRACTITIONER_ROLES } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

/**
 * Prisma practitioner roles used for internal role-based branching.
 */
const PRISMA_PRACTITIONER_ROLES: PrismaUserRole[] = [
  PrismaUserRole.NURSE,
  PrismaUserRole.CLINICAL_OFFICER,
  PrismaUserRole.DOCTOR,
  PrismaUserRole.PHYSIOTHERAPIST,
  PrismaUserRole.PHARMACIST,
];

@ApiTags('Bookings')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'bookings', version: '1' })
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  // ===========================================================================
  // POST /bookings - Create a new booking
  // ===========================================================================

  @Post()
  @Roles(UserRole.PATIENT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new booking',
    description:
      'Create a new booking request for a home care visit. Only patients can create bookings.',
  })
  @ApiResponse({ status: 201, description: 'Booking created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or practitioner not available' })
  @ApiResponse({ status: 404, description: 'Practitioner not found' })
  @ApiResponse({ status: 409, description: 'Scheduling conflict' })
  async create(
    @CurrentUser('id') patientUserId: string,
    @Body() dto: CreateBookingDto,
  ) {
    return this.bookingsService.create(patientUserId, dto);
  }

  // ===========================================================================
  // GET /bookings - List own bookings
  // ===========================================================================

  @Get()
  @ApiOperation({
    summary: 'List own bookings',
    description:
      'Get a paginated list of bookings. Patients see their own bookings. ' +
      'Practitioners see bookings assigned to them.',
  })
  @ApiResponse({ status: 200, description: 'Bookings retrieved successfully' })
  async findAll(
    @CurrentUser() user: { id: string; role: PrismaUserRole },
    @Query() query: BookingQueryDto,
  ) {
    if (PRISMA_PRACTITIONER_ROLES.includes(user.role)) {
      return this.bookingsService.findByPractitioner(user.id, query);
    }

    return this.bookingsService.findByPatient(user.id, query);
  }

  // ===========================================================================
  // GET /bookings/upcoming - Get upcoming bookings
  // ===========================================================================

  @Get('upcoming')
  @ApiOperation({
    summary: 'Get upcoming bookings',
    description: 'Get the next 5 upcoming bookings for the authenticated user.',
  })
  @ApiResponse({ status: 200, description: 'Upcoming bookings retrieved' })
  async getUpcoming(
    @CurrentUser() user: { id: string; role: PrismaUserRole },
  ) {
    return this.bookingsService.getUpcoming(user.id, user.role);
  }

  // ===========================================================================
  // GET /bookings/stats - Get practitioner stats
  // ===========================================================================

  @Get('stats')
  @Roles(...PRACTITIONER_ROLES)
  @ApiOperation({
    summary: 'Get practitioner booking statistics',
    description:
      'Get booking statistics for the authenticated practitioner including ' +
      'total bookings, completed, cancelled, and average rating.',
  })
  @ApiResponse({ status: 200, description: 'Stats retrieved successfully' })
  async getStats(@CurrentUser('id') practitionerUserId: string) {
    return this.bookingsService.getStats(practitionerUserId);
  }

  // ===========================================================================
  // GET /bookings/:id - Get booking detail
  // ===========================================================================

  @Get(':id')
  @ApiOperation({
    summary: 'Get booking details',
    description: 'Get detailed information about a specific booking.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Booking UUID' })
  @ApiResponse({ status: 200, description: 'Booking retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.bookingsService.findById(id);
  }

  // ===========================================================================
  // PATCH /bookings/:id/accept - Accept a booking
  // ===========================================================================

  @Patch(':id/accept')
  @Roles(...PRACTITIONER_ROLES)
  @ApiOperation({
    summary: 'Accept a booking',
    description:
      'Accept a pending booking request. Only the assigned practitioner can accept.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Booking UUID' })
  @ApiResponse({ status: 200, description: 'Booking accepted' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 403, description: 'Not the assigned practitioner' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async accept(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') practitionerUserId: string,
  ) {
    return this.bookingsService.accept(id, practitionerUserId);
  }

  // ===========================================================================
  // PATCH /bookings/:id/reject - Reject a booking
  // ===========================================================================

  @Patch(':id/reject')
  @Roles(...PRACTITIONER_ROLES)
  @ApiOperation({
    summary: 'Reject a booking',
    description:
      'Reject a pending booking request with an optional reason. ' +
      'Only the assigned practitioner can reject.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Booking UUID' })
  @ApiResponse({ status: 200, description: 'Booking rejected' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 403, description: 'Not the assigned practitioner' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') practitionerUserId: string,
    @Body() dto: RejectBookingDto,
  ) {
    return this.bookingsService.reject(id, practitionerUserId, dto.reason);
  }

  // ===========================================================================
  // PATCH /bookings/:id/en-route - Mark en route
  // ===========================================================================

  @Patch(':id/en-route')
  @Roles(...PRACTITIONER_ROLES)
  @ApiOperation({
    summary: 'Mark practitioner en route',
    description:
      'Mark that the practitioner is on their way to the patient. ' +
      'Only the assigned practitioner can trigger this.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Booking UUID' })
  @ApiResponse({ status: 200, description: 'Booking marked as en route' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 403, description: 'Not the assigned practitioner' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async enRoute(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') practitionerUserId: string,
  ) {
    return this.bookingsService.enRoute(id, practitionerUserId);
  }

  // ===========================================================================
  // PATCH /bookings/:id/start - Start a visit
  // ===========================================================================

  @Patch(':id/start')
  @Roles(...PRACTITIONER_ROLES)
  @ApiOperation({
    summary: 'Start a visit',
    description:
      'Start the in-person visit. Transitions booking to IN_PROGRESS and creates a tracking record. ' +
      'Only the assigned practitioner can start.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Booking UUID' })
  @ApiResponse({ status: 200, description: 'Visit started' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 403, description: 'Not the assigned practitioner' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async startVisit(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') practitionerUserId: string,
  ) {
    return this.bookingsService.startVisit(id, practitionerUserId);
  }

  // ===========================================================================
  // PATCH /bookings/:id/complete - Complete a visit
  // ===========================================================================

  @Patch(':id/complete')
  @Roles(...PRACTITIONER_ROLES)
  @ApiOperation({
    summary: 'Complete a visit',
    description:
      'Mark a visit as completed. Only the assigned practitioner can complete.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Booking UUID' })
  @ApiResponse({ status: 200, description: 'Visit completed' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 403, description: 'Not the assigned practitioner' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async complete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') practitionerUserId: string,
  ) {
    return this.bookingsService.complete(id, practitionerUserId);
  }

  // ===========================================================================
  // PATCH /bookings/:id/cancel - Cancel a booking
  // ===========================================================================

  @Patch(':id/cancel')
  @ApiOperation({
    summary: 'Cancel a booking',
    description:
      'Cancel a booking. Either the patient or the practitioner can cancel. ' +
      'A reason is required when cancelling confirmed or in-progress bookings.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Booking UUID' })
  @ApiResponse({ status: 200, description: 'Booking cancelled' })
  @ApiResponse({ status: 400, description: 'Invalid status transition or missing reason' })
  @ApiResponse({ status: 403, description: 'Not authorized to cancel' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CancelBookingDto,
  ) {
    return this.bookingsService.cancel(id, userId, dto.reason);
  }
}
