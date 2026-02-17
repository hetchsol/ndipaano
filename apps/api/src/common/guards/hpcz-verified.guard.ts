import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Practitioner role types from the Prisma UserRole enum.
 * The Prisma schema uses specific roles rather than a generic PRACTITIONER role.
 */
const PRACTITIONER_ROLES = new Set([
  'NURSE',
  'CLINICAL_OFFICER',
  'DOCTOR',
  'PHYSIOTHERAPIST',
  'PHARMACIST',
]);

/**
 * Guard that ensures the authenticated user is a practitioner whose HPCZ
 * (Health Professions Council of Zambia) verification status is confirmed.
 *
 * This guard should be applied to endpoints that require a verified practitioner,
 * such as creating medical records, issuing prescriptions, or accessing patient data.
 *
 * Prerequisites: The user must already be authenticated (JwtAuthGuard must run first).
 */
@Injectable()
export class HpczVerifiedGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    if (!PRACTITIONER_ROLES.has(user.role)) {
      throw new ForbiddenException(
        'This endpoint is restricted to practitioners only',
      );
    }

    const practitioner = await this.prisma.practitionerProfile.findUnique({
      where: { userId: user.id },
      select: { hpczVerified: true },
    });

    if (!practitioner) {
      throw new ForbiddenException('Practitioner profile not found');
    }

    if (!practitioner.hpczVerified) {
      throw new ForbiddenException(
        'Your HPCZ registration has not been verified yet. ' +
          'Please wait for admin verification or contact support.',
      );
    }

    return true;
  }
}
