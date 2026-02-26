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
  ApiQuery,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { Roles, UserRole } from '../../common';
import {
  UserQueryDto,
  AnalyticsPeriodDto,
  CreatePharmacyDto,
  UpdatePharmacyDto,
  CreateInventoryItemDto,
  UpdateInventoryItemDto,
} from './dto/admin.dto';

@ApiTags('Admin')
@ApiBearerAuth('access-token')
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ---------------------------------------------------------------------------
  // Dashboard
  // ---------------------------------------------------------------------------

  @Get('dashboard')
  @ApiOperation({ summary: 'Get platform dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Platform dashboard stats' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin access required' })
  async getDashboard() {
    return this.adminService.getDashboard();
  }

  // ---------------------------------------------------------------------------
  // Users
  // ---------------------------------------------------------------------------

  @Get('users')
  @ApiOperation({ summary: 'List all users with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Paginated list of users' })
  async getUsers(@Query() query: UserQueryDto) {
    return this.adminService.getUsers(query);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user detail by ID' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User detail with full profile' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getUserById(id);
  }

  @Patch('users/:id/toggle-active')
  @ApiOperation({ summary: 'Toggle user active status' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiQuery({ name: 'isActive', type: Boolean, description: 'Set active status' })
  @ApiResponse({ status: 200, description: 'User active status toggled' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async toggleUserActive(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('isActive') isActive: boolean,
  ) {
    return this.adminService.toggleUserActive(id, isActive);
  }

  // ---------------------------------------------------------------------------
  // Analytics
  // ---------------------------------------------------------------------------

  @Get('analytics')
  @ApiOperation({ summary: 'Get platform revenue analytics' })
  @ApiResponse({ status: 200, description: 'Platform analytics data' })
  async getPlatformAnalytics(@Query() query: AnalyticsPeriodDto) {
    return this.adminService.getPlatformAnalytics(query);
  }

  // ---------------------------------------------------------------------------
  // Verification Queue
  // ---------------------------------------------------------------------------

  @Get('verification-queue')
  @ApiOperation({ summary: 'List practitioners pending HPCZ verification' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated verification queue' })
  async getVerificationQueue(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getVerificationQueue(page, limit);
  }

  // ---------------------------------------------------------------------------
  // Pharmacies
  // ---------------------------------------------------------------------------

  @Get('pharmacies')
  @ApiOperation({ summary: 'List pharmacies' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Paginated list of pharmacies' })
  async getPharmacies(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.adminService.getPharmacies({ page, limit, search });
  }

  @Post('pharmacies')
  @ApiOperation({ summary: 'Register a new pharmacy' })
  @ApiResponse({ status: 201, description: 'Pharmacy created successfully' })
  @ApiResponse({ status: 400, description: 'Duplicate ZAMRA registration' })
  async createPharmacy(@Body() dto: CreatePharmacyDto) {
    return this.adminService.createPharmacy(dto);
  }

  @Patch('pharmacies/:id')
  @ApiOperation({ summary: 'Update pharmacy details' })
  @ApiParam({ name: 'id', description: 'Pharmacy UUID' })
  @ApiResponse({ status: 200, description: 'Pharmacy updated' })
  @ApiResponse({ status: 404, description: 'Pharmacy not found' })
  async updatePharmacy(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePharmacyDto,
  ) {
    return this.adminService.updatePharmacy(id, dto);
  }

  @Patch('pharmacies/:id/toggle-active')
  @ApiOperation({ summary: 'Toggle pharmacy active status' })
  @ApiParam({ name: 'id', description: 'Pharmacy UUID' })
  @ApiQuery({ name: 'isActive', type: Boolean, description: 'Set active status' })
  @ApiResponse({ status: 200, description: 'Pharmacy active status toggled' })
  @ApiResponse({ status: 404, description: 'Pharmacy not found' })
  async togglePharmacyActive(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('isActive') isActive: boolean,
  ) {
    return this.adminService.togglePharmacyActive(id, isActive);
  }

  // ---------------------------------------------------------------------------
  // Pharmacy Inventory
  // ---------------------------------------------------------------------------

  @Get('pharmacies/:id/inventory')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.PHARMACIST)
  @ApiOperation({ summary: 'List pharmacy inventory items' })
  @ApiParam({ name: 'id', description: 'Pharmacy UUID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Paginated list of inventory items' })
  async getPharmacyInventory(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.adminService.getPharmacyInventory(id, { page, limit, search });
  }

  @Post('pharmacies/:id/inventory')
  @ApiOperation({ summary: 'Add inventory item to pharmacy' })
  @ApiParam({ name: 'id', description: 'Pharmacy UUID' })
  @ApiResponse({ status: 201, description: 'Inventory item created' })
  @ApiResponse({ status: 400, description: 'Duplicate medication name' })
  async createInventoryItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateInventoryItemDto,
  ) {
    return this.adminService.createInventoryItem(id, dto);
  }

  @Patch('pharmacies/:id/inventory/:itemId')
  @ApiOperation({ summary: 'Update inventory item' })
  @ApiParam({ name: 'id', description: 'Pharmacy UUID' })
  @ApiParam({ name: 'itemId', description: 'Inventory item UUID' })
  @ApiResponse({ status: 200, description: 'Inventory item updated' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async updateInventoryItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateInventoryItemDto,
  ) {
    return this.adminService.updateInventoryItem(id, itemId, dto);
  }

  @Delete('pharmacies/:id/inventory/:itemId')
  @ApiOperation({ summary: 'Delete inventory item' })
  @ApiParam({ name: 'id', description: 'Pharmacy UUID' })
  @ApiParam({ name: 'itemId', description: 'Inventory item UUID' })
  @ApiResponse({ status: 200, description: 'Inventory item deleted' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async deleteInventoryItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return this.adminService.deleteInventoryItem(id, itemId);
  }
}
