import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { EmergencyService } from './emergency.service';
import { CurrentUser, Public } from '../../common';
import {
  TriggerPanicDto,
  EmergencyContactDto,
  NearbyServicesQueryDto,
} from './dto/emergency.dto';

@ApiTags('Emergency')
@Controller('emergency')
export class EmergencyController {
  constructor(private readonly emergencyService: EmergencyService) {}

  // ---------------------------------------------------------------------------
  // Panic
  // ---------------------------------------------------------------------------

  @Post('panic')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Trigger emergency panic button',
    description:
      'Sends emergency alerts to all registered emergency contacts and returns Zambian emergency numbers.',
  })
  @ApiResponse({
    status: 201,
    description: 'Panic alert sent successfully',
  })
  async triggerPanic(
    @CurrentUser('id') userId: string,
    @Body() dto: TriggerPanicDto,
  ) {
    return this.emergencyService.triggerPanic(
      userId,
      dto.latitude,
      dto.longitude,
      dto.message,
    );
  }

  // ---------------------------------------------------------------------------
  // Emergency Contacts
  // ---------------------------------------------------------------------------

  @Get('contacts')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List emergency contacts' })
  @ApiResponse({ status: 200, description: 'List of emergency contacts' })
  async getEmergencyContacts(@CurrentUser('id') userId: string) {
    return this.emergencyService.getEmergencyContacts(userId);
  }

  @Post('contacts')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Add an emergency contact' })
  @ApiResponse({ status: 201, description: 'Emergency contact added' })
  async addEmergencyContact(
    @CurrentUser('id') userId: string,
    @Body() dto: EmergencyContactDto,
  ) {
    return this.emergencyService.addEmergencyContact(userId, dto);
  }

  @Patch('contacts/:id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update an emergency contact' })
  @ApiParam({ name: 'id', description: 'Emergency contact UUID' })
  @ApiResponse({ status: 200, description: 'Emergency contact updated' })
  @ApiResponse({ status: 404, description: 'Emergency contact not found' })
  async updateEmergencyContact(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) contactId: string,
    @Body() dto: EmergencyContactDto,
  ) {
    return this.emergencyService.updateEmergencyContact(userId, contactId, dto);
  }

  @Delete('contacts/:id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Remove an emergency contact' })
  @ApiParam({ name: 'id', description: 'Emergency contact UUID' })
  @ApiResponse({ status: 200, description: 'Emergency contact removed' })
  @ApiResponse({ status: 404, description: 'Emergency contact not found' })
  async removeEmergencyContact(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) contactId: string,
  ) {
    return this.emergencyService.removeEmergencyContact(userId, contactId);
  }

  // ---------------------------------------------------------------------------
  // Nearby Emergency Services
  // ---------------------------------------------------------------------------

  @Get('nearby-services')
  @Public()
  @ApiOperation({
    summary: 'Get nearby emergency services',
    description:
      'Returns Zambian emergency numbers and nearest pharmacies based on location.',
  })
  @ApiResponse({
    status: 200,
    description: 'Emergency services and nearby pharmacies',
  })
  async getNearbyEmergencyServices(@Query() query: NearbyServicesQueryDto) {
    return this.emergencyService.getNearbyEmergencyServices(
      query.latitude,
      query.longitude,
    );
  }
}
