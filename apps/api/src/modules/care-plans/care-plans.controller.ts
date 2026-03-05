import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
import { CarePlansService } from './care-plans.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles, UserRole, PRACTITIONER_ROLES } from '../../common/decorators/roles.decorator';
import {
  CreateCarePlanDto,
  UpdateCarePlanDto,
  CreateMilestoneDto,
  UpdateMilestoneDto,
  AddPractitionerDto,
  CarePlanQueryDto,
} from './dto/care-plan.dto';

@ApiTags('Care Plans')
@ApiBearerAuth('access-token')
@Controller('care-plans')
export class CarePlansController {
  constructor(private readonly carePlansService: CarePlansService) {}

  @Post()
  @Roles(...PRACTITIONER_ROLES)
  @ApiOperation({ summary: 'Create a care plan' })
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCarePlanDto,
  ) {
    return this.carePlansService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List care plans (role-filtered)' })
  findAll(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Query() query: CarePlanQueryDto,
  ) {
    return this.carePlansService.findAll(userId, role, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get care plan detail' })
  @ApiParam({ name: 'id', description: 'Care Plan ID' })
  findById(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.carePlansService.findById(userId, role, id);
  }

  @Patch(':id')
  @Roles(...PRACTITIONER_ROLES)
  @ApiOperation({ summary: 'Update a care plan' })
  @ApiParam({ name: 'id', description: 'Care Plan ID' })
  update(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCarePlanDto,
  ) {
    return this.carePlansService.update(userId, id, dto);
  }

  // ===========================================================================
  // Milestones
  // ===========================================================================

  @Post(':id/milestones')
  @Roles(...PRACTITIONER_ROLES)
  @ApiOperation({ summary: 'Add a milestone to a care plan' })
  @ApiParam({ name: 'id', description: 'Care Plan ID' })
  addMilestone(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateMilestoneDto,
  ) {
    return this.carePlansService.addMilestone(userId, id, dto);
  }

  @Patch(':id/milestones/:milestoneId')
  @Roles(...PRACTITIONER_ROLES)
  @ApiOperation({ summary: 'Update a milestone' })
  @ApiParam({ name: 'id', description: 'Care Plan ID' })
  @ApiParam({ name: 'milestoneId', description: 'Milestone ID' })
  updateMilestone(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('milestoneId', ParseUUIDPipe) milestoneId: string,
    @Body() dto: UpdateMilestoneDto,
  ) {
    return this.carePlansService.updateMilestone(userId, id, milestoneId, dto);
  }

  // ===========================================================================
  // Practitioners
  // ===========================================================================

  @Post(':id/practitioners')
  @Roles(...PRACTITIONER_ROLES)
  @ApiOperation({ summary: 'Add a practitioner to a care plan (creator only)' })
  @ApiParam({ name: 'id', description: 'Care Plan ID' })
  addPractitioner(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddPractitionerDto,
  ) {
    return this.carePlansService.addPractitioner(userId, id, dto);
  }

  @Delete(':id/practitioners/:practitionerId')
  @Roles(...PRACTITIONER_ROLES)
  @ApiOperation({ summary: 'Remove a practitioner from a care plan (creator only)' })
  @ApiParam({ name: 'id', description: 'Care Plan ID' })
  @ApiParam({ name: 'practitionerId', description: 'Practitioner User ID' })
  removePractitioner(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('practitionerId', ParseUUIDPipe) practitionerId: string,
  ) {
    return this.carePlansService.removePractitioner(userId, id, practitionerId);
  }
}
