import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SchedulingService } from './scheduling.service';
import {
  CreateAvailabilityDto,
  UpdateAvailabilityDto,
  BulkAvailabilityDto,
} from './dto/availability.dto';
import {
  CreateBlackoutDto,
  BlackoutQueryDto,
  AvailableSlotsQueryDto,
  CalendarQueryDto,
  RescheduleBookingDto,
  UpdateSchedulingSettingsDto,
} from './dto/scheduling.dto';

@Controller('scheduling')
export class SchedulingController {
  constructor(private readonly schedulingService: SchedulingService) {}

  // ===========================================================================
  // Availability Endpoints (practitioner-only)
  // ===========================================================================

  @Get('availability')
  async getMyAvailability(@Request() req: any) {
    const userId = req.user.sub || req.user.id;
    return this.schedulingService.getAvailability(userId);
  }

  @Post('availability')
  @HttpCode(HttpStatus.CREATED)
  async createAvailability(
    @Request() req: any,
    @Body() dto: CreateAvailabilityDto,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.schedulingService.createAvailability(userId, dto);
  }

  @Put('availability/:id')
  async updateAvailability(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAvailabilityDto,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.schedulingService.updateAvailability(userId, id, dto);
  }

  @Delete('availability/:id')
  async deleteAvailability(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.schedulingService.deleteAvailability(userId, id);
  }

  @Post('availability/bulk')
  @HttpCode(HttpStatus.CREATED)
  async setBulkAvailability(
    @Request() req: any,
    @Body() dto: BulkAvailabilityDto,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.schedulingService.setBulkAvailability(userId, dto);
  }

  // ===========================================================================
  // Blackout Endpoints (practitioner-only)
  // ===========================================================================

  @Get('blackouts')
  async getBlackouts(
    @Request() req: any,
    @Query() query: BlackoutQueryDto,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.schedulingService.getBlackouts(userId, query);
  }

  @Post('blackouts')
  @HttpCode(HttpStatus.CREATED)
  async createBlackout(
    @Request() req: any,
    @Body() dto: CreateBlackoutDto,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.schedulingService.createBlackout(userId, dto);
  }

  @Delete('blackouts/:id')
  async deleteBlackout(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.schedulingService.deleteBlackout(userId, id);
  }

  // ===========================================================================
  // Public Practitioner Slots / Calendar (any authenticated user)
  // ===========================================================================

  @Get('practitioners/:id/slots')
  async getAvailableSlots(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: AvailableSlotsQueryDto,
  ) {
    return this.schedulingService.getAvailableSlots(
      id,
      query.startDate,
      query.endDate,
    );
  }

  @Get('practitioners/:id/calendar')
  async getCalendarView(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: CalendarQueryDto,
  ) {
    return this.schedulingService.getCalendarView(id, query.year, query.month);
  }

  // ===========================================================================
  // Reschedule (patient or practitioner)
  // ===========================================================================

  @Patch('bookings/:id/reschedule')
  async rescheduleBooking(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Body() dto: RescheduleBookingDto,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.schedulingService.rescheduleBooking(id, userId, dto);
  }

  // ===========================================================================
  // Settings (practitioner-only)
  // ===========================================================================

  @Get('settings')
  async getSettings(@Request() req: any) {
    const userId = req.user.sub || req.user.id;
    return this.schedulingService.getSettings(userId);
  }

  @Patch('settings')
  async updateSettings(
    @Request() req: any,
    @Body() dto: UpdateSchedulingSettingsDto,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.schedulingService.updateSettings(userId, dto);
  }
}
