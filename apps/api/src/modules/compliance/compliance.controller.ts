import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Query,
  Body,
  Req,
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
import { Request } from 'express';
import { ComplianceService } from './compliance.service';
import { CurrentUser, Roles, UserRole } from '../../common';
import {
  AuditLogQueryDto,
  UpdateConsentDto,
  ProcessDataRequestDto,
  CreateBreachNotificationDto,
  UpdateBreachNotificationDto,
  BreachQueryDto,
} from './dto/compliance.dto';

@ApiTags('Compliance')
@ApiBearerAuth('access-token')
@Controller('compliance')
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  // ---------------------------------------------------------------------------
  // Audit Logs
  // ---------------------------------------------------------------------------

  @Get('audit-logs')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List audit logs with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Paginated list of audit logs' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin access required' })
  async getAuditLogs(@Query() query: AuditLogQueryDto) {
    return this.complianceService.getAuditLogs(query);
  }

  @Get('audit-logs/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get a single audit log by ID' })
  @ApiParam({ name: 'id', description: 'Audit log UUID' })
  @ApiResponse({ status: 200, description: 'Audit log details' })
  @ApiResponse({ status: 404, description: 'Audit log not found' })
  async getAuditLogById(@Param('id', ParseUUIDPipe) id: string) {
    return this.complianceService.getAuditLogById(id);
  }

  // ---------------------------------------------------------------------------
  // Consents
  // ---------------------------------------------------------------------------

  @Get('consents')
  @ApiOperation({ summary: 'Get current user consent records' })
  @ApiResponse({ status: 200, description: 'List of consent records' })
  async getUserConsents(@CurrentUser('id') userId: string) {
    return this.complianceService.getUserConsents(userId);
  }

  @Patch('consents')
  @ApiOperation({ summary: 'Update own consent (grant or revoke)' })
  @ApiResponse({ status: 200, description: 'Consent updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid consent operation' })
  async updateConsent(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateConsentDto,
    @Req() req: Request,
  ) {
    const ipAddress =
      (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    return this.complianceService.updateConsent(
      userId,
      dto.consentType,
      dto.granted,
      ipAddress,
      userAgent,
    );
  }

  // ---------------------------------------------------------------------------
  // Data Subject Requests
  // ---------------------------------------------------------------------------

  @Get('data-requests')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all data subject requests' })
  @ApiResponse({ status: 200, description: 'Paginated list of data subject requests' })
  async getDataSubjectRequests(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    return this.complianceService.getDataSubjectRequests({ page, limit, status });
  }

  @Patch('data-requests/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Process a data subject request' })
  @ApiParam({ name: 'id', description: 'Data subject request UUID' })
  @ApiResponse({ status: 200, description: 'Data subject request processed' })
  @ApiResponse({ status: 404, description: 'Data subject request not found' })
  async processDataSubjectRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminUserId: string,
    @Body() dto: ProcessDataRequestDto,
  ) {
    return this.complianceService.processDataSubjectRequest(id, adminUserId, dto);
  }

  // ---------------------------------------------------------------------------
  // Breach Notifications
  // ---------------------------------------------------------------------------

  @Post('breach-notifications')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a breach notification' })
  @ApiResponse({ status: 201, description: 'Breach notification created' })
  async createBreachNotification(
    @Body() dto: CreateBreachNotificationDto,
    @CurrentUser('id') adminUserId: string,
  ) {
    return this.complianceService.createBreachNotification(dto, adminUserId);
  }

  @Get('breach-notifications')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List breach notifications' })
  @ApiResponse({ status: 200, description: 'Paginated list of breach notifications' })
  async getBreachNotifications(@Query() query: BreachQueryDto) {
    return this.complianceService.getBreachNotifications(query);
  }

  @Patch('breach-notifications/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update a breach notification' })
  @ApiParam({ name: 'id', description: 'Breach notification UUID' })
  @ApiResponse({ status: 200, description: 'Breach notification updated' })
  @ApiResponse({ status: 404, description: 'Breach notification not found' })
  async updateBreachNotification(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBreachNotificationDto,
  ) {
    return this.complianceService.updateBreachNotification(id, dto);
  }

  // ---------------------------------------------------------------------------
  // Dashboard
  // ---------------------------------------------------------------------------

  @Get('dashboard')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get compliance dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Compliance dashboard stats' })
  async getComplianceDashboard() {
    return this.complianceService.getComplianceDashboard();
  }
}
