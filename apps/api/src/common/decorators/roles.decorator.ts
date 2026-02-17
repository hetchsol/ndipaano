import { SetMetadata } from '@nestjs/common';

/**
 * Enum mirroring the Prisma UserRole enum. The Prisma schema uses specific
 * practitioner role types rather than a generic PRACTITIONER role.
 * Kept in sync with the Prisma schema.
 */
export enum UserRole {
  PATIENT = 'PATIENT',
  NURSE = 'NURSE',
  CLINICAL_OFFICER = 'CLINICAL_OFFICER',
  DOCTOR = 'DOCTOR',
  PHYSIOTHERAPIST = 'PHYSIOTHERAPIST',
  PHARMACIST = 'PHARMACIST',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

/**
 * Convenience grouping of all practitioner roles for use in @Roles() decorator.
 */
export const PRACTITIONER_ROLES = [
  UserRole.NURSE,
  UserRole.CLINICAL_OFFICER,
  UserRole.DOCTOR,
  UserRole.PHYSIOTHERAPIST,
  UserRole.PHARMACIST,
] as const;

export const ROLES_KEY = 'roles';

/**
 * Decorator to restrict endpoint access to specific user roles.
 * Must be used together with the RolesGuard.
 *
 * Usage:
 *   @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
 *   @Get('admin/dashboard')
 *   getDashboard() { ... }
 *
 *   // Allow all practitioner types:
 *   @Roles(...PRACTITIONER_ROLES)
 *   @Post('medical-records')
 *   createRecord() { ... }
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
