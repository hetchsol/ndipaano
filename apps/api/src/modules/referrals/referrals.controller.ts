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
import { Throttle } from '@nestjs/throttler';
import { ReferralsService } from './referrals.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles, UserRole, PRACTITIONER_ROLES } from '../../common/decorators/roles.decorator';
import {
  CreateReferralDto,
  ReferralQueryDto,
  DeclineReferralDto,
  CompleteReferralDto,
} from './dto/referral.dto';

@ApiTags('Referrals')
@ApiBearerAuth('access-token')
@Controller('referrals')
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  @Post()
  @Roles(...PRACTITIONER_ROLES)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Create a referral' })
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateReferralDto,
  ) {
    return this.referralsService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List referrals (role-filtered)' })
  findAll(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Query() query: ReferralQueryDto,
  ) {
    return this.referralsService.findAll(userId, role, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get referral detail' })
  @ApiParam({ name: 'id', description: 'Referral ID' })
  findById(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.referralsService.findById(userId, role, id);
  }

  @Patch(':id/accept')
  @Roles(...PRACTITIONER_ROLES)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Accept a referral (referred practitioner only)' })
  @ApiParam({ name: 'id', description: 'Referral ID' })
  accept(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.referralsService.accept(userId, id);
  }

  @Patch(':id/decline')
  @Roles(...PRACTITIONER_ROLES)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Decline a referral (referred practitioner only)' })
  @ApiParam({ name: 'id', description: 'Referral ID' })
  decline(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DeclineReferralDto,
  ) {
    return this.referralsService.decline(userId, id, dto);
  }

  @Patch(':id/complete')
  @Roles(...PRACTITIONER_ROLES)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Complete a referral (either practitioner)' })
  @ApiParam({ name: 'id', description: 'Referral ID' })
  complete(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompleteReferralDto,
  ) {
    return this.referralsService.complete(userId, id, dto);
  }

  @Patch(':id/cancel')
  @Roles(...PRACTITIONER_ROLES)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Cancel a referral (referring practitioner only)' })
  @ApiParam({ name: 'id', description: 'Referral ID' })
  cancel(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.referralsService.cancel(userId, id);
  }
}
