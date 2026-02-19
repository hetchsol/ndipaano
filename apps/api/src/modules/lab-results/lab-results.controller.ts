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
import { LabResultsService } from './lab-results.service';
import {
  CreateLabOrderDto,
  UpdateLabOrderStatusDto,
  CreateLabResultDto,
  ListLabOrdersDto,
  PatientLabOrdersDto,
} from './dto/lab-results.dto';
import {
  JwtAuthGuard,
  RolesGuard,
  Roles,
  PRACTITIONER_ROLES,
  UserRole,
} from '../../common';

@ApiTags('Lab Results')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'lab-results', version: '1' })
export class LabResultsController {
  constructor(private readonly labResultsService: LabResultsService) {}

  // ---------------------------------------------------------------------------
  // POST /lab-results/orders
  // ---------------------------------------------------------------------------

  @Post('orders')
  @Roles(...PRACTITIONER_ROLES)
  @ApiOperation({
    summary: 'Create a lab order',
    description:
      'Creates a new lab order for a patient. Only practitioners may create orders.',
  })
  @ApiResponse({ status: 201, description: 'Lab order created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Patient or diagnostic test not found' })
  async createOrder(@Request() req: any, @Body() dto: CreateLabOrderDto) {
    const userId = req.user.sub || req.user.id;
    return this.labResultsService.createOrder(userId, dto);
  }

  // ---------------------------------------------------------------------------
  // GET /lab-results/orders
  // ---------------------------------------------------------------------------

  @Get('orders')
  @ApiOperation({
    summary: 'List lab orders',
    description:
      'Lists lab orders with pagination. Patients see their own orders; ' +
      'practitioners see orders they created.',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of lab orders' })
  async listOrders(@Request() req: any, @Query() query: ListLabOrdersDto) {
    const userId = req.user.sub || req.user.id;
    const role = req.user.role;
    return this.labResultsService.listOrders(userId, role, query);
  }

  // ---------------------------------------------------------------------------
  // GET /lab-results/orders/:id
  // ---------------------------------------------------------------------------

  @Get('orders/:id')
  @ApiOperation({
    summary: 'Get a lab order',
    description:
      'Returns details of a specific lab order including results. ' +
      'The requesting user must be the patient or practitioner on the order.',
  })
  @ApiParam({ name: 'id', description: 'Lab order UUID' })
  @ApiResponse({ status: 200, description: 'Lab order details' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  @ApiResponse({ status: 404, description: 'Lab order not found' })
  async getOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.labResultsService.getOrder(userId, id);
  }

  // ---------------------------------------------------------------------------
  // PATCH /lab-results/orders/:id/status
  // ---------------------------------------------------------------------------

  @Patch('orders/:id/status')
  @Roles(...PRACTITIONER_ROLES)
  @ApiOperation({
    summary: 'Update lab order status',
    description:
      'Updates the status of a lab order. Only the ordering practitioner may update. ' +
      'Valid transitions: ORDERED->SAMPLE_COLLECTED, SAMPLE_COLLECTED->PROCESSING, ' +
      'PROCESSING->COMPLETED, any non-COMPLETED->CANCELLED.',
  })
  @ApiParam({ name: 'id', description: 'Lab order UUID' })
  @ApiResponse({ status: 200, description: 'Lab order status updated' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  @ApiResponse({ status: 404, description: 'Lab order not found' })
  async updateOrderStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Body() dto: UpdateLabOrderStatusDto,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.labResultsService.updateOrderStatus(userId, id, dto);
  }

  // ---------------------------------------------------------------------------
  // POST /lab-results/results
  // ---------------------------------------------------------------------------

  @Post('results')
  @Roles(...PRACTITIONER_ROLES)
  @ApiOperation({
    summary: 'Create a lab result',
    description:
      'Submits a lab result for an order. Auto-completes the order and sends ' +
      'notifications to the patient. Critical results trigger additional alerts.',
  })
  @ApiResponse({ status: 201, description: 'Lab result created' })
  @ApiResponse({ status: 400, description: 'Validation error or invalid order status' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  @ApiResponse({ status: 404, description: 'Lab order not found' })
  async createResult(@Request() req: any, @Body() dto: CreateLabResultDto) {
    const userId = req.user.sub || req.user.id;
    return this.labResultsService.createResult(userId, dto);
  }

  // ---------------------------------------------------------------------------
  // GET /lab-results/results/:id
  // ---------------------------------------------------------------------------

  @Get('results/:id')
  @ApiOperation({
    summary: 'Get a lab result',
    description:
      'Returns details of a specific lab result with the associated order information. ' +
      'The requesting user must be the patient or practitioner on the order.',
  })
  @ApiParam({ name: 'id', description: 'Lab result UUID' })
  @ApiResponse({ status: 200, description: 'Lab result details' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  @ApiResponse({ status: 404, description: 'Lab result not found' })
  async getResult(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.labResultsService.getResult(userId, id);
  }

  // ---------------------------------------------------------------------------
  // GET /lab-results/patient/orders
  // ---------------------------------------------------------------------------

  @Get('patient/orders')
  @Roles(UserRole.PATIENT)
  @ApiOperation({
    summary: 'Get my lab orders (patient)',
    description:
      'Returns lab orders for the authenticated patient with optional status filter and pagination.',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of patient lab orders' })
  async getOrdersByPatient(
    @Request() req: any,
    @Query() query: PatientLabOrdersDto,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.labResultsService.getOrdersByPatient(userId, query);
  }

  // ---------------------------------------------------------------------------
  // GET /lab-results/patient/results
  // ---------------------------------------------------------------------------

  @Get('patient/results')
  @Roles(UserRole.PATIENT)
  @ApiOperation({
    summary: 'Get my lab results (patient)',
    description:
      'Returns all lab results for the authenticated patient with pagination.',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of patient lab results' })
  async getResultsByPatient(
    @Request() req: any,
    @Query() query: PatientLabOrdersDto,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.labResultsService.getResultsByPatient(userId, {
      page: query.page,
      limit: query.limit,
    });
  }

  // ---------------------------------------------------------------------------
  // GET /lab-results/patient/trends/:testId
  // ---------------------------------------------------------------------------

  @Get('patient/trends/:testId')
  @Roles(UserRole.PATIENT)
  @ApiOperation({
    summary: 'Get result trend for a diagnostic test (patient)',
    description:
      'Returns all results for a specific diagnostic test in chronological order ' +
      'for the authenticated patient. Useful for charting trends over time.',
  })
  @ApiParam({ name: 'testId', description: 'Diagnostic test UUID' })
  @ApiResponse({ status: 200, description: 'Array of lab results in chronological order' })
  async getResultTrend(
    @Param('testId', ParseUUIDPipe) testId: string,
    @Request() req: any,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.labResultsService.getResultTrend(userId, testId);
  }
}
