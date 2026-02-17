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
  ParseIntPipe,
  DefaultValuePipe,
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
import { PractitionersService } from './practitioners.service';
import {
  UpdatePractitionerProfileDto,
  UploadDocumentDto,
  SearchPractitionersDto,
  VerifyDocumentDto,
  UpdateLocationDto,
} from './dto/practitioner.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

/**
 * All practitioner-type roles from the Prisma UserRole enum.
 * Used with the @Roles() decorator to allow any practitioner role access.
 */
const PRACTITIONER_ROLES = [
  'NURSE',
  'CLINICAL_OFFICER',
  'DOCTOR',
  'PHYSIOTHERAPIST',
  'PHARMACIST',
] as any[];

@ApiTags('Practitioners')
@Controller('practitioners')
export class PractitionersController {
  constructor(
    private readonly practitionersService: PractitionersService,
  ) {}

  // =========================================================================
  // Static routes MUST be defined before parameterized `:id` routes to
  // prevent NestJS from matching "profile", "search", etc. as a UUID param.
  // =========================================================================

  // ---- Public static routes -----------------------------------------------

  @Public()
  @Get('search')
  @ApiOperation({
    summary: 'Search practitioners',
    description:
      'Public endpoint to search for practitioners with optional filters including location-based search using the Haversine formula.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of practitioners',
  })
  async search(@Query() query: SearchPractitionersDto) {
    return this.practitionersService.search(query);
  }

  // ---- Practitioner-authenticated static routes ---------------------------

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...PRACTITIONER_ROLES)
  @Get('profile')
  @ApiOperation({ summary: 'Get own practitioner profile' })
  @ApiResponse({
    status: 200,
    description: 'Practitioner profile retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Practitioner role required' })
  @ApiResponse({ status: 404, description: 'Practitioner profile not found' })
  async getProfile(@CurrentUser('id') userId: string) {
    return this.practitionersService.getProfile(userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...PRACTITIONER_ROLES)
  @Patch('profile')
  @ApiOperation({ summary: 'Update own practitioner profile' })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Practitioner role required' })
  @ApiResponse({ status: 404, description: 'Practitioner profile not found' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdatePractitionerProfileDto,
  ) {
    return this.practitionersService.updateProfile(userId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...PRACTITIONER_ROLES)
  @Post('documents')
  @ApiOperation({ summary: 'Upload document metadata' })
  @ApiResponse({
    status: 201,
    description: 'Document metadata saved successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Practitioner role required' })
  @ApiResponse({ status: 404, description: 'Practitioner profile not found' })
  async uploadDocument(
    @CurrentUser('id') userId: string,
    @Body() dto: UploadDocumentDto,
  ) {
    return this.practitionersService.uploadDocument(userId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...PRACTITIONER_ROLES)
  @Get('documents')
  @ApiOperation({ summary: 'List own documents' })
  @ApiResponse({
    status: 200,
    description: 'Documents retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Practitioner role required' })
  @ApiResponse({ status: 404, description: 'Practitioner profile not found' })
  async getDocuments(@CurrentUser('id') userId: string) {
    return this.practitionersService.getDocuments(userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...PRACTITIONER_ROLES)
  @Patch('availability')
  @ApiOperation({ summary: 'Toggle availability status' })
  @ApiResponse({
    status: 200,
    description: 'Availability updated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Practitioner role required' })
  @ApiResponse({ status: 404, description: 'Practitioner profile not found' })
  async toggleAvailability(
    @CurrentUser('id') userId: string,
    @Body('isAvailable') isAvailable: boolean,
  ) {
    return this.practitionersService.toggleAvailability(userId, isAvailable);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...PRACTITIONER_ROLES)
  @Patch('location')
  @ApiOperation({ summary: 'Update current location' })
  @ApiResponse({
    status: 200,
    description: 'Location updated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Practitioner role required' })
  @ApiResponse({ status: 404, description: 'Practitioner profile not found' })
  async updateLocation(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateLocationDto,
  ) {
    return this.practitionersService.updateLocation(userId, dto);
  }

  // ---- Admin static routes ------------------------------------------------

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @Get('pending-verifications')
  @ApiOperation({ summary: 'List practitioners pending verification (Admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of unverified practitioners',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async getPendingVerifications(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.practitionersService.getPendingVerifications(page, limit);
  }

  // =========================================================================
  // Parameterized routes (`:id` patterns) - MUST come after all static routes
  // =========================================================================

  @Public()
  @Get(':id/reviews')
  @ApiOperation({ summary: 'Get reviews for a practitioner' })
  @ApiParam({ name: 'id', description: 'Practitioner profile UUID' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of reviews',
  })
  @ApiResponse({ status: 404, description: 'Practitioner not found' })
  async getReviews(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.practitionersService.getReviews(id, page, limit);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get practitioner public profile' })
  @ApiParam({ name: 'id', description: 'Practitioner profile UUID' })
  @ApiResponse({
    status: 200,
    description: 'Practitioner profile retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Practitioner not found' })
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.practitionersService.getById(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...PRACTITIONER_ROLES)
  @Delete('documents/:id')
  @ApiOperation({ summary: 'Delete an unverified document' })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @ApiResponse({
    status: 200,
    description: 'Document deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Verified documents cannot be deleted',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Not authorized to delete this document',
  })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async deleteDocument(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) documentId: string,
  ) {
    return this.practitionersService.deleteDocument(userId, documentId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @Post('verify-document/:id')
  @ApiOperation({ summary: 'Verify or reject a practitioner document (Admin)' })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @ApiResponse({
    status: 200,
    description: 'Document verification processed',
  })
  @ApiResponse({
    status: 400,
    description: 'Rejection reason required when rejecting',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async verifyDocument(
    @CurrentUser('id') adminUserId: string,
    @Param('id', ParseUUIDPipe) documentId: string,
    @Body() dto: VerifyDocumentDto,
  ) {
    return this.practitionersService.verifyDocument(
      adminUserId,
      documentId,
      dto,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @Post('verify/:id')
  @ApiOperation({ summary: 'Mark practitioner as HPCZ verified (Admin)' })
  @ApiParam({ name: 'id', description: 'Practitioner profile UUID' })
  @ApiResponse({
    status: 200,
    description: 'Practitioner verified successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Practitioner is already verified',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'Practitioner not found' })
  async verifyPractitioner(
    @CurrentUser('id') adminUserId: string,
    @Param('id', ParseUUIDPipe) practitionerId: string,
  ) {
    return this.practitionersService.verifyPractitioner(
      adminUserId,
      practitionerId,
    );
  }
}
