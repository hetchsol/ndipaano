import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AdoptionsService } from './adoptions.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles, UserRole, PRACTITIONER_ROLES } from '../../common/decorators/roles.decorator';
import {
  CreateConditionSummaryDto,
  UpdateConditionSummaryDto,
  ConditionSummaryQueryDto,
} from './dto/condition-summary.dto';
import {
  RequestByPractitionerDto,
  RequestByPatientDto,
  DeclineAdoptionDto,
  ReleaseAdoptionDto,
  AdoptionQueryDto,
  MatchedPatientsQueryDto,
} from './dto/adoption.dto';

@ApiTags('Adoptions')
@ApiBearerAuth('access-token')
@Controller('adoptions')
export class AdoptionsController {
  constructor(private readonly adoptionsService: AdoptionsService) {}

  // ===========================================================================
  // Condition Summaries
  // ===========================================================================

  @Post('condition-summaries')
  @Roles(UserRole.PATIENT)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Create a condition summary' })
  createConditionSummary(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateConditionSummaryDto,
  ) {
    return this.adoptionsService.createConditionSummary(userId, dto);
  }

  @Get('condition-summaries/mine')
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: 'List my condition summaries' })
  getMyConditionSummaries(
    @CurrentUser('id') userId: string,
    @Query() query: ConditionSummaryQueryDto,
  ) {
    return this.adoptionsService.getMyConditionSummaries(userId, query);
  }

  @Get('condition-summaries/:id')
  @ApiOperation({ summary: 'Get a condition summary by ID' })
  @ApiParam({ name: 'id', description: 'Condition Summary ID' })
  getConditionSummaryById(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.adoptionsService.getConditionSummaryById(userId, role, id);
  }

  @Patch('condition-summaries/:id')
  @Roles(UserRole.PATIENT)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Update a condition summary (ACTIVE only)' })
  @ApiParam({ name: 'id', description: 'Condition Summary ID' })
  updateConditionSummary(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateConditionSummaryDto,
  ) {
    return this.adoptionsService.updateConditionSummary(userId, id, dto);
  }

  @Patch('condition-summaries/:id/withdraw')
  @Roles(UserRole.PATIENT)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Withdraw a condition summary' })
  @ApiParam({ name: 'id', description: 'Condition Summary ID' })
  withdrawConditionSummary(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.adoptionsService.withdrawConditionSummary(userId, id);
  }

  // ===========================================================================
  // Matching
  // ===========================================================================

  @Get('matched-patients')
  @Roles(...PRACTITIONER_ROLES)
  @ApiOperation({ summary: 'Get matched patient feed' })
  getMatchedPatients(
    @CurrentUser('id') userId: string,
    @Query() query: MatchedPatientsQueryDto,
  ) {
    return this.adoptionsService.getMatchedPatients(userId, query);
  }

  // ===========================================================================
  // Adoption Requests
  // ===========================================================================

  @Post('request-by-practitioner')
  @Roles(...PRACTITIONER_ROLES)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Practitioner requests to adopt a patient' })
  requestByPractitioner(
    @CurrentUser('id') userId: string,
    @Body() dto: RequestByPractitionerDto,
  ) {
    return this.adoptionsService.requestByPractitioner(userId, dto);
  }

  @Post('request-by-patient')
  @Roles(UserRole.PATIENT)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Patient requests a specific practitioner' })
  requestByPatient(
    @CurrentUser('id') userId: string,
    @Body() dto: RequestByPatientDto,
  ) {
    return this.adoptionsService.requestByPatient(userId, dto);
  }

  // ===========================================================================
  // Consent / Decline / Release
  // ===========================================================================

  @Patch(':id/consent')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Consent to an adoption' })
  @ApiParam({ name: 'id', description: 'Adoption ID' })
  consent(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.adoptionsService.consent(userId, role, id);
  }

  @Patch(':id/decline')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Decline an adoption' })
  @ApiParam({ name: 'id', description: 'Adoption ID' })
  decline(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DeclineAdoptionDto,
  ) {
    return this.adoptionsService.decline(userId, role, id, dto);
  }

  @Patch(':id/release')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Release an active adoption' })
  @ApiParam({ name: 'id', description: 'Adoption ID' })
  release(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReleaseAdoptionDto,
  ) {
    return this.adoptionsService.release(userId, role, id, dto);
  }

  // ===========================================================================
  // List / Detail
  // ===========================================================================

  @Get('mine')
  @ApiOperation({ summary: 'List my adoptions' })
  getMyAdoptions(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Query() query: AdoptionQueryDto,
  ) {
    return this.adoptionsService.getMyAdoptions(userId, role, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get adoption detail' })
  @ApiParam({ name: 'id', description: 'Adoption ID' })
  getAdoptionById(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.adoptionsService.getAdoptionById(userId, role, id);
  }
}
