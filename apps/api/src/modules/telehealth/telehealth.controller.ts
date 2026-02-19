import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Request,
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
import { TelehealthService } from './telehealth.service';
import {
  CreateTelehealthSessionDto,
  RecordConsentDto,
} from './dto/telehealth.dto';
import {
  JwtAuthGuard,
  RolesGuard,
  Roles,
  PRACTITIONER_ROLES,
} from '../../common';

@ApiTags('Telehealth')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'telehealth', version: '1' })
export class TelehealthController {
  constructor(private readonly telehealthService: TelehealthService) {}

  // ---------------------------------------------------------------------------
  // POST /telehealth/sessions
  // ---------------------------------------------------------------------------

  @Post('sessions')
  @Roles(...PRACTITIONER_ROLES)
  @ApiOperation({
    summary: 'Create a telehealth session',
    description:
      'Creates a new telehealth session for a confirmed virtual consultation booking. ' +
      'Only the assigned practitioner can create the session.',
  })
  @ApiResponse({ status: 201, description: 'Telehealth session created' })
  @ApiResponse({ status: 400, description: 'Invalid booking status or service type' })
  @ApiResponse({ status: 403, description: 'Not the assigned practitioner' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async createSession(
    @Request() req: any,
    @Body() dto: CreateTelehealthSessionDto,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.telehealthService.createSession(userId, dto);
  }

  // ---------------------------------------------------------------------------
  // GET /telehealth/my-sessions
  // (must be above :id routes to avoid param conflict)
  // ---------------------------------------------------------------------------

  @Get('my-sessions')
  @ApiOperation({
    summary: 'Get my telehealth sessions',
    description:
      'Returns a paginated list of telehealth sessions where the authenticated user ' +
      'is either the patient or the practitioner.',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of telehealth sessions' })
  async getSessionsByUser(
    @Request() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.telehealthService.getSessionsByUser(userId, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  // ---------------------------------------------------------------------------
  // GET /telehealth/sessions/:id
  // ---------------------------------------------------------------------------

  @Get('sessions/:id')
  @ApiOperation({
    summary: 'Get telehealth session details',
    description:
      'Returns details of a specific telehealth session. ' +
      'The authenticated user must be a participant (patient or practitioner).',
  })
  @ApiParam({ name: 'id', description: 'Telehealth session UUID' })
  @ApiResponse({ status: 200, description: 'Telehealth session details' })
  @ApiResponse({ status: 403, description: 'Not a participant' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async getSession(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.telehealthService.getSession(userId, id);
  }

  // ---------------------------------------------------------------------------
  // PATCH /telehealth/sessions/:id/start
  // ---------------------------------------------------------------------------

  @Patch('sessions/:id/start')
  @ApiOperation({
    summary: 'Start a telehealth session',
    description:
      'Transitions a telehealth session from WAITING to ACTIVE. ' +
      'Only the assigned practitioner can start the session.',
  })
  @ApiParam({ name: 'id', description: 'Telehealth session UUID' })
  @ApiResponse({ status: 200, description: 'Session started' })
  @ApiResponse({ status: 400, description: 'Session not in WAITING status' })
  @ApiResponse({ status: 403, description: 'Not the assigned practitioner' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async startSession(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.telehealthService.startSession(userId, id);
  }

  // ---------------------------------------------------------------------------
  // PATCH /telehealth/sessions/:id/end
  // ---------------------------------------------------------------------------

  @Patch('sessions/:id/end')
  @ApiOperation({
    summary: 'End a telehealth session',
    description:
      'Ends an active telehealth session. Either the patient or practitioner can end it. ' +
      'Optionally include practitioner notes.',
  })
  @ApiParam({ name: 'id', description: 'Telehealth session UUID' })
  @ApiResponse({ status: 200, description: 'Session ended' })
  @ApiResponse({ status: 403, description: 'Not a participant' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async endSession(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Body() body: { practitionerNotes?: string },
  ) {
    const userId = req.user.sub || req.user.id;
    return this.telehealthService.endSession(userId, id, body);
  }

  // ---------------------------------------------------------------------------
  // PATCH /telehealth/sessions/:id/consent
  // ---------------------------------------------------------------------------

  @Patch('sessions/:id/consent')
  @ApiOperation({
    summary: 'Record telehealth recording consent',
    description:
      'Records whether the patient consents to the telehealth session being recorded. ' +
      'Only the patient can update recording consent.',
  })
  @ApiParam({ name: 'id', description: 'Telehealth session UUID' })
  @ApiResponse({ status: 200, description: 'Consent recorded' })
  @ApiResponse({ status: 403, description: 'Not the patient' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async recordConsent(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Body() dto: RecordConsentDto,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.telehealthService.recordConsent(userId, id, dto);
  }
}
