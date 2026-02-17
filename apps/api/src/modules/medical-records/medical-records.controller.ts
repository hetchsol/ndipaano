import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { MedicalRecordsService } from './medical-records.service';
import {
  CreateMedicalRecordDto,
  UpdateMedicalRecordDto,
  MedicalRecordQueryDto,
} from './dto/medical-record.dto';
import {
  CurrentUser,
  Roles,
  UserRole,
  PRACTITIONER_ROLES,
  RolesGuard,
  JwtAuthGuard,
  HpczVerifiedGuard,
} from '../../common';

@ApiTags('Medical Records')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'medical-records', version: '1' })
export class MedicalRecordsController {
  constructor(
    private readonly medicalRecordsService: MedicalRecordsService,
  ) {}

  // ---------------------------------------------------------------------------
  // POST /medical-records
  // ---------------------------------------------------------------------------

  @Post()
  @Roles(...PRACTITIONER_ROLES)
  @UseGuards(HpczVerifiedGuard)
  @ApiOperation({
    summary: 'Create a medical record',
    description:
      'Creates a new medical record for a patient. Only HPCZ-verified practitioners ' +
      'with a completed or in-progress booking with the patient can create records. ' +
      'Sensitive fields (diagnosis, treatment notes) are encrypted at rest using AES-256-GCM.',
  })
  @ApiResponse({ status: 201, description: 'Medical record created' })
  @ApiResponse({ status: 403, description: 'Forbidden - no valid booking or not HPCZ verified' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateMedicalRecordDto,
  ) {
    return this.medicalRecordsService.create(userId, dto);
  }

  // ---------------------------------------------------------------------------
  // GET /medical-records
  // ---------------------------------------------------------------------------

  @Get()
  @ApiOperation({
    summary: 'List medical records',
    description:
      'Patients see their own records (requires DATA_PROCESSING consent). ' +
      'Practitioners see records they have created. Supports date filtering and pagination.',
  })
  @ApiResponse({ status: 200, description: 'List of medical records with pagination' })
  @ApiResponse({
    status: 403,
    description: 'Patient has not granted data processing consent',
  })
  async findAll(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Query() query: MedicalRecordQueryDto,
  ) {
    if (role === 'PATIENT') {
      return this.medicalRecordsService.findByPatient(userId, query);
    }

    // Practitioner: return records they created
    return this.medicalRecordsService.findByPractitioner(userId, query);
  }

  // ---------------------------------------------------------------------------
  // GET /medical-records/booking/:bookingId
  // ---------------------------------------------------------------------------

  @Get('booking/:bookingId')
  @ApiOperation({
    summary: 'Get medical records by booking ID',
    description:
      'Returns all medical records associated with a specific booking. ' +
      'Access is restricted to the patient, the creating practitioner, or admins.',
  })
  @ApiParam({ name: 'bookingId', description: 'Booking UUID' })
  @ApiResponse({ status: 200, description: 'Medical records for the booking' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'No records found for booking' })
  async findByBooking(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.medicalRecordsService.findByBooking(bookingId, userId);
  }

  // ---------------------------------------------------------------------------
  // GET /medical-records/:id
  // ---------------------------------------------------------------------------

  @Get(':id')
  @ApiOperation({
    summary: 'Get medical record details',
    description:
      'Returns full details of a specific medical record with decrypted sensitive fields. ' +
      'Access is restricted to the patient (owner), the creating practitioner, or admins.',
  })
  @ApiParam({ name: 'id', description: 'Medical record UUID' })
  @ApiResponse({ status: 200, description: 'Medical record details' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Medical record not found' })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.medicalRecordsService.findById(id, userId);
  }

  // ---------------------------------------------------------------------------
  // PATCH /medical-records/:id
  // ---------------------------------------------------------------------------

  @Patch(':id')
  @Roles(...PRACTITIONER_ROLES)
  @UseGuards(HpczVerifiedGuard)
  @ApiOperation({
    summary: 'Update a medical record',
    description:
      'Updates an existing medical record. Only the practitioner who created the record ' +
      'can update it, and only within 24 hours of creation. Updated sensitive fields ' +
      'are re-encrypted.',
  })
  @ApiParam({ name: 'id', description: 'Medical record UUID' })
  @ApiResponse({ status: 200, description: 'Medical record updated' })
  @ApiResponse({ status: 400, description: 'Edit window expired (>24 hours)' })
  @ApiResponse({ status: 403, description: 'Forbidden - not the creating practitioner' })
  @ApiResponse({ status: 404, description: 'Medical record not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateMedicalRecordDto,
  ) {
    return this.medicalRecordsService.update(id, userId, dto);
  }
}
