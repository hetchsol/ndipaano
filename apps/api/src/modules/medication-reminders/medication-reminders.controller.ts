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
import { MedicationRemindersService } from './medication-reminders.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles, UserRole, PRACTITIONER_ROLES } from '../../common/decorators/roles.decorator';
import {
  CreateMedicationReminderDto,
  UpdateMedicationReminderDto,
  LogAdherenceDto,
  MedicationReminderQueryDto,
  AdherenceSummaryQueryDto,
} from './dto/medication-reminder.dto';

@ApiTags('Medication Reminders')
@ApiBearerAuth('access-token')
@Controller('medication-reminders')
export class MedicationRemindersController {
  constructor(
    private readonly medicationRemindersService: MedicationRemindersService,
  ) {}

  // ===========================================================================
  // Patient endpoints
  // ===========================================================================

  @Post()
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: 'Create a medication reminder' })
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateMedicationReminderDto,
  ) {
    return this.medicationRemindersService.createReminder(userId, dto);
  }

  @Get()
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: 'List medication reminders' })
  list(
    @CurrentUser('id') userId: string,
    @Query() query: MedicationReminderQueryDto,
  ) {
    return this.medicationRemindersService.getReminders(userId, query);
  }

  @Get('today')
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: "Get today's dose schedule" })
  getToday(@CurrentUser('id') userId: string) {
    return this.medicationRemindersService.getTodaysReminders(userId);
  }

  @Get('summary')
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: 'Get adherence compliance summary' })
  getSummary(
    @CurrentUser('id') userId: string,
    @Query() query: AdherenceSummaryQueryDto,
  ) {
    return this.medicationRemindersService.getAdherenceSummary(userId, query);
  }

  @Post('log')
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: 'Log adherence (TAKEN or SKIPPED)' })
  logAdherence(
    @CurrentUser('id') userId: string,
    @Body() dto: LogAdherenceDto,
  ) {
    return this.medicationRemindersService.logAdherence(userId, dto);
  }

  @Get('patient/:patientId/adherence')
  @Roles(...PRACTITIONER_ROLES)
  @ApiOperation({ summary: 'View patient adherence (practitioner only)' })
  @ApiParam({ name: 'patientId', description: 'Patient user ID' })
  getPatientAdherence(
    @CurrentUser('id') practitionerId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.medicationRemindersService.getPatientAdherence(
      practitionerId,
      patientId,
    );
  }

  @Get(':id')
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: 'Get reminder detail' })
  @ApiParam({ name: 'id', description: 'Reminder ID' })
  getById(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.medicationRemindersService.getReminderById(userId, id);
  }

  @Patch(':id')
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: 'Update reminder settings' })
  @ApiParam({ name: 'id', description: 'Reminder ID' })
  update(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMedicationReminderDto,
  ) {
    return this.medicationRemindersService.updateReminder(userId, id, dto);
  }

  @Patch(':id/pause')
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: 'Pause a reminder' })
  @ApiParam({ name: 'id', description: 'Reminder ID' })
  pause(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.medicationRemindersService.pauseReminder(userId, id);
  }

  @Patch(':id/resume')
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: 'Resume a paused reminder' })
  @ApiParam({ name: 'id', description: 'Reminder ID' })
  resume(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.medicationRemindersService.resumeReminder(userId, id);
  }

  @Patch(':id/cancel')
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: 'Cancel a reminder' })
  @ApiParam({ name: 'id', description: 'Reminder ID' })
  cancel(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.medicationRemindersService.cancelReminder(userId, id);
  }

  @Get(':id/refill')
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: 'Get refill status' })
  @ApiParam({ name: 'id', description: 'Reminder ID' })
  getRefillStatus(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.medicationRemindersService.getRefillStatus(userId, id);
  }
}
