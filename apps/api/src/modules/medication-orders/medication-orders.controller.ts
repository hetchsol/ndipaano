import {
  Controller,
  Get,
  Post,
  Patch,
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
import { MedicationOrdersService } from './medication-orders.service';
import { CurrentUser, Roles, UserRole } from '../../common';
import {
  CreateMedicationOrderDto,
  MedicationOrderQueryDto,
  CancelMedicationOrderDto,
} from './dto/medication-order.dto';

@ApiTags('Medication Orders')
@ApiBearerAuth('access-token')
@Controller('medication-orders')
export class MedicationOrdersController {
  constructor(private readonly service: MedicationOrdersService) {}

  @Post()
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: 'Create a medication order from a prescription' })
  @ApiResponse({ status: 201, description: 'Order created' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateMedicationOrderDto,
  ) {
    return this.service.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List medication orders for the current patient' })
  @ApiResponse({ status: 200, description: 'Paginated list of orders' })
  async list(
    @CurrentUser('id') userId: string,
    @Query() query: MedicationOrderQueryDto,
  ) {
    return this.service.findByPatient(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get medication order details' })
  @ApiParam({ name: 'id', description: 'Order UUID' })
  @ApiResponse({ status: 200, description: 'Order details' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.findById(id, userId);
  }

  @Patch(':id/confirm')
  @Roles(UserRole.PHARMACIST, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Confirm a medication order' })
  @ApiParam({ name: 'id', description: 'Order UUID' })
  @ApiResponse({ status: 200, description: 'Order confirmed' })
  async confirm(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.confirm(id);
  }

  @Patch(':id/ready')
  @Roles(UserRole.PHARMACIST, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Mark order as ready for pickup/delivery' })
  @ApiParam({ name: 'id', description: 'Order UUID' })
  @ApiResponse({ status: 200, description: 'Order marked ready' })
  async markReady(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.markReady(id);
  }

  @Patch(':id/dispatch')
  @Roles(UserRole.PHARMACIST, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Mark order as dispatched' })
  @ApiParam({ name: 'id', description: 'Order UUID' })
  @ApiResponse({ status: 200, description: 'Order dispatched' })
  async dispatch(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.dispatch(id);
  }

  @Patch(':id/deliver')
  @Roles(UserRole.PHARMACIST, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Mark order as delivered' })
  @ApiParam({ name: 'id', description: 'Order UUID' })
  @ApiResponse({ status: 200, description: 'Order delivered' })
  async deliver(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.deliver(id);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel a medication order' })
  @ApiParam({ name: 'id', description: 'Order UUID' })
  @ApiResponse({ status: 200, description: 'Order cancelled' })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CancelMedicationOrderDto,
  ) {
    return this.service.cancel(id, userId, dto);
  }
}
