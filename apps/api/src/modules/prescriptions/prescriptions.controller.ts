import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { PrescriptionsService } from './prescriptions.service';
import {
  CreatePrescriptionDto,
  AssignPharmacyDto,
  PrescriptionQueryDto,
} from './dto/prescription.dto';
import {
  CurrentUser,
  Roles,
  UserRole,
  JwtAuthGuard,
  RolesGuard,
  HpczVerifiedGuard,
} from '../../common';

@ApiTags('Prescriptions')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'prescriptions', version: '1' })
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  // ---------------------------------------------------------------------------
  // POST /prescriptions
  // ---------------------------------------------------------------------------
  @Post()
  @Roles(UserRole.PRACTITIONER)
  @UseGuards(HpczVerifiedGuard)
  @ApiOperation({
    summary: 'Create a new prescription',
    description:
      'Creates a prescription for a patient linked to a medical record. ' +
      'Requires HPCZ verification. Controlled substances require ZAMRA registration.',
  })
  @ApiResponse({ status: 201, description: 'Prescription created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Medical record or pharmacy not found' })
  async create(
    @CurrentUser('id') practitionerUserId: string,
    @Body() dto: CreatePrescriptionDto,
  ) {
    return this.prescriptionsService.create(practitionerUserId, dto);
  }

  // ---------------------------------------------------------------------------
  // GET /prescriptions
  // ---------------------------------------------------------------------------
  @Get()
  @ApiOperation({
    summary: 'List prescriptions (role-based)',
    description:
      'Patients see their own prescriptions. Practitioners see prescriptions they have written.',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of prescriptions' })
  async findAll(
    @CurrentUser() user: { id: string; role: string },
    @Query() query: PrescriptionQueryDto,
  ) {
    if (user.role === 'PATIENT') {
      return this.prescriptionsService.findByPatient(user.id, query);
    }

    // Practitioners, pharmacists - show prescriptions they wrote
    // Admins can also call this but would typically use more specific endpoints
    return this.prescriptionsService.findByPractitioner(user.id, query);
  }

  // ---------------------------------------------------------------------------
  // GET /prescriptions/controlled-substances
  // (must be above :id route to avoid param conflict)
  // ---------------------------------------------------------------------------
  @Get('controlled-substances')
  @Roles(UserRole.PRACTITIONER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'List controlled substance prescriptions',
    description:
      'Lists controlled substance prescriptions for ZAMRA compliance reporting. ' +
      'Practitioners see their own; admins see all.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of controlled substance prescriptions',
  })
  async getControlledSubstances(
    @CurrentUser() user: { id: string; role: string },
    @Query() query: PrescriptionQueryDto,
  ) {
    return this.prescriptionsService.getControlledSubstances(user.id, query);
  }

  // ---------------------------------------------------------------------------
  // GET /prescriptions/medical-record/:recordId
  // (must be above :id route to avoid param conflict)
  // ---------------------------------------------------------------------------
  @Get('medical-record/:recordId')
  @ApiOperation({
    summary: 'Get prescriptions by medical record',
    description: 'Retrieves all prescriptions associated with a specific medical record.',
  })
  @ApiParam({ name: 'recordId', description: 'UUID of the medical record' })
  @ApiResponse({ status: 200, description: 'List of prescriptions for the medical record' })
  @ApiResponse({ status: 404, description: 'Medical record not found' })
  async findByMedicalRecord(
    @Param('recordId', ParseUUIDPipe) recordId: string,
  ) {
    return this.prescriptionsService.findByMedicalRecord(recordId);
  }

  // ---------------------------------------------------------------------------
  // GET /prescriptions/:id
  // ---------------------------------------------------------------------------
  @Get(':id')
  @ApiOperation({
    summary: 'Get prescription detail',
    description:
      'Retrieves a single prescription. Accessible by the patient, ' +
      'the creating practitioner, assigned pharmacy, or an admin.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the prescription' })
  @ApiResponse({ status: 200, description: 'Prescription details' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Prescription not found' })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') requestingUserId: string,
  ) {
    return this.prescriptionsService.findById(id, requestingUserId);
  }

  // ---------------------------------------------------------------------------
  // PATCH /prescriptions/:id/assign-pharmacy
  // ---------------------------------------------------------------------------
  @Patch(':id/assign-pharmacy')
  @ApiOperation({
    summary: 'Assign a pharmacy to a prescription',
    description:
      'Assigns a pharmacy for dispensing. Can be done by the patient or the prescribing practitioner.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the prescription' })
  @ApiResponse({ status: 200, description: 'Pharmacy assigned successfully' })
  @ApiResponse({ status: 400, description: 'Prescription already dispensed' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Prescription or pharmacy not found' })
  async assignPharmacy(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignPharmacyDto,
    @CurrentUser('id') requestingUserId: string,
  ) {
    return this.prescriptionsService.assignPharmacy(
      id,
      dto.pharmacyId,
      requestingUserId,
    );
  }

  // ---------------------------------------------------------------------------
  // PATCH /prescriptions/:id/dispense
  // ---------------------------------------------------------------------------
  @Patch(':id/dispense')
  @ApiOperation({
    summary: 'Mark prescription as dispensed',
    description:
      'Marks a prescription as dispensed and records the timestamp. ' +
      'Restricted to admin users or pharmacists. Authorization is enforced at the service level ' +
      'to support the PHARMACIST role from the Prisma schema.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the prescription' })
  @ApiResponse({ status: 200, description: 'Prescription marked as dispensed' })
  @ApiResponse({ status: 400, description: 'Prescription already dispensed' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Prescription not found' })
  async markDispensed(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') pharmacyUserId: string,
  ) {
    return this.prescriptionsService.markDispensed(id, pharmacyUserId);
  }
}
