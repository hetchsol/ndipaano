import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import {
  UpdateProfileDto,
  UpdatePatientProfileDto,
  AddFamilyMemberDto,
  CreateDataSubjectRequestDto,
  SearchPatientsDto,
} from './dto/update-profile.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import {
  Roles,
  PRACTITIONER_ROLES,
} from '../../common/decorators/roles.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('patients')
  @UseGuards(RolesGuard)
  @Roles(...PRACTITIONER_ROLES)
  @ApiOperation({ summary: 'Search patients by name or UUID' })
  @ApiQuery({ name: 'search', required: false, description: 'Patient name or UUID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Patients retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden – practitioner role required' })
  async searchPatients(@Query() dto: SearchPatientsDto) {
    return this.usersService.searchPatients(dto);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get own profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getProfile(@CurrentUser('id') userId: string) {
    return this.usersService.findById(userId);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update own profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Get('patient-profile')
  @ApiOperation({ summary: 'Get own patient profile with family members' })
  @ApiResponse({
    status: 200,
    description: 'Patient profile retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Patient profile not found' })
  async getPatientProfile(@CurrentUser('id') userId: string) {
    return this.usersService.getPatientProfile(userId);
  }

  @Patch('patient-profile')
  @ApiOperation({ summary: 'Update own patient profile' })
  @ApiResponse({
    status: 200,
    description: 'Patient profile updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updatePatientProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdatePatientProfileDto,
  ) {
    return this.usersService.updatePatientProfile(userId, dto);
  }

  @Post('family-members')
  @ApiOperation({ summary: 'Add a family member to patient profile' })
  @ApiResponse({
    status: 201,
    description: 'Family member added successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Patient profile not found' })
  async addFamilyMember(
    @CurrentUser('id') userId: string,
    @Body() dto: AddFamilyMemberDto,
  ) {
    return this.usersService.addFamilyMember(userId, dto);
  }

  @Delete('family-members/:id')
  @ApiOperation({ summary: 'Remove a family member' })
  @ApiParam({ name: 'id', description: 'Family member UUID' })
  @ApiResponse({
    status: 200,
    description: 'Family member removed successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Not authorized to remove this family member',
  })
  @ApiResponse({ status: 404, description: 'Family member not found' })
  async removeFamilyMember(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) memberId: string,
  ) {
    return this.usersService.removeFamilyMember(userId, memberId);
  }

  @Post('data-requests')
  @ApiOperation({ summary: 'Create a GDPR/DPA data subject request' })
  @ApiResponse({
    status: 201,
    description: 'Data subject request created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or duplicate pending request',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async createDataSubjectRequest(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateDataSubjectRequestDto,
  ) {
    return this.usersService.createDataSubjectRequest(userId, dto);
  }

  @Get('data-requests')
  @ApiOperation({ summary: 'List own data subject requests' })
  @ApiResponse({
    status: 200,
    description: 'Data subject requests retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getDataSubjectRequests(@CurrentUser('id') userId: string) {
    return this.usersService.getDataSubjectRequests(userId);
  }

  @Get('data-export')
  @ApiOperation({
    summary: 'Export own data (data portability)',
    description:
      'Compiles all user data including profile, bookings, medical records, prescriptions, payments, reviews, and consent records into a single JSON export.',
  })
  @ApiResponse({
    status: 200,
    description: 'User data exported successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async exportUserData(@CurrentUser('id') userId: string) {
    return this.usersService.exportUserData(userId);
  }
}
