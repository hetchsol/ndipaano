import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as OTPAuth from 'otpauth';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterPatientDto, RegisterPractitionerDto } from './dto/register.dto';

/**
 * Token pair returned after successful authentication.
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * User payload embedded in JWT tokens.
 */
interface TokenPayload {
  sub: string;
  email: string | null;
  role: string;
}

const BCRYPT_ROUNDS = 12;
const RESET_TOKEN_EXPIRY_HOURS = 1;

/**
 * Maps a PractitionerType (from the DTO / shared enums) to the appropriate
 * Prisma UserRole. The Prisma schema uses specific role types for practitioners
 * (NURSE, DOCTOR, CLINICAL_OFFICER, etc.) rather than a generic PRACTITIONER role.
 */
function practitionerTypeToUserRole(practitionerType: string): string {
  const mapping: Record<string, string> = {
    DOCTOR: 'DOCTOR',
    GENERAL_PRACTITIONER: 'DOCTOR',
    SPECIALIST_DOCTOR: 'DOCTOR',
    NURSE: 'NURSE',
    REGISTERED_NURSE: 'NURSE',
    ENROLLED_NURSE: 'NURSE',
    CLINICAL_OFFICER: 'CLINICAL_OFFICER',
    PHYSIOTHERAPIST: 'PHYSIOTHERAPIST',
    PHARMACIST: 'PHARMACIST',
    MIDWIFE: 'NURSE',
  };
  return mapping[practitionerType] || 'NURSE';
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  /**
   * In-memory store for password reset tokens. In production, these should be
   * stored in Redis or a dedicated database table. Each entry maps a hashed
   * token to { userId, expiresAt }.
   */
  private readonly resetTokenStore = new Map<
    string,
    { userId: string; expiresAt: Date }
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Register a new patient user.
   * Creates the user account, patient profile, and initial consent records.
   * Returns an access + refresh token pair.
   */
  async registerPatient(
    dto: RegisterPatientDto,
  ): Promise<TokenPair & { user: Record<string, unknown> }> {
    // Check if email already exists (only when email is provided)
    if (dto.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (existingUser) {
        throw new ConflictException('A user with this email already exists');
      }
    }

    // Check if phone already exists
    const existingPhone = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });

    if (existingPhone) {
      throw new ConflictException(
        'A user with this phone number already exists',
      );
    }

    // Validate NRC format for Zambian nationals
    if (dto.nationality === 'Zambian' && dto.nrc) {
      const nrcRegex = /^\d{6}\/\d{2}\/\d{1}$/;
      if (!nrcRegex.test(dto.nrc)) {
        throw new BadRequestException(
          'NRC must be in format 123456/67/9 (6 digits/2 digits/1 digit)',
        );
      }
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    // Create user, patient profile, and consent records in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: dto.email || null,
          phone: dto.phone,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: 'PATIENT',
          isActive: true,
        },
      });

      // Generate unique member ID: NDP-{YEAR}-{sequence}
      const patientCount = await tx.patientProfile.count();
      const year = new Date().getFullYear();
      const sequence = String(patientCount + 1).padStart(5, '0');
      const memberId = `NDP-${year}-${sequence}`;

      // Create patient profile with date of birth, gender, nationality, nrc, and memberId
      await tx.patientProfile.create({
        data: {
          userId: newUser.id,
          memberId,
          nrc: dto.nrc || null,
          nationality: dto.nationality,
          dateOfBirth: new Date(dto.dateOfBirth),
          gender: dto.gender,
        },
      });

      // Create initial consent records
      const now = new Date();
      await tx.consentRecord.createMany({
        data: [
          {
            userId: newUser.id,
            consentType: 'DATA_PROCESSING',
            granted: true,
            grantedAt: now,
            version: '1.0',
            ipAddress: '0.0.0.0',
            userAgent: 'registration',
          },
          {
            userId: newUser.id,
            consentType: 'TERMS_OF_SERVICE',
            granted: true,
            grantedAt: now,
            version: '1.0',
            ipAddress: '0.0.0.0',
            userAgent: 'registration',
          },
        ],
      });

      return { user: newUser, memberId };
    });

    // Generate tokens
    const tokens = await this.generateTokens({
      id: result.user.id,
      email: result.user.email || '',
      role: result.user.role,
    });

    return {
      ...tokens,
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        role: result.user.role,
        memberId: result.memberId,
      },
    };
  }

  /**
   * Register a new practitioner user.
   * Creates the user account, practitioner profile, and initial consent records.
   * The practitioner starts with hpczVerified = false and must be verified by an admin.
   * Returns an access + refresh token pair.
   */
  async registerPractitioner(
    dto: RegisterPractitionerDto,
  ): Promise<TokenPair & { user: Record<string, unknown> }> {
    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('A user with this email already exists');
    }

    // Check if phone already exists
    const existingPhone = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });

    if (existingPhone) {
      throw new ConflictException(
        'A user with this phone number already exists',
      );
    }

    // Check if HPCZ registration number is already in use
    const existingHpcz = await this.prisma.practitionerProfile.findFirst({
      where: { hpczRegistrationNumber: dto.hpczRegistrationNumber },
    });

    if (existingHpcz) {
      throw new ConflictException(
        'A practitioner with this HPCZ registration number already exists',
      );
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    // Determine the UserRole from the practitioner type
    const userRole = practitionerTypeToUserRole(dto.practitionerType);

    // Create user, practitioner profile, and consent records in a transaction
    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: dto.email,
          phone: dto.phone,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: userRole as any,
          isActive: true,
        },
      });

      // Create practitioner profile
      await tx.practitionerProfile.create({
        data: {
          userId: newUser.id,
          practitionerType: dto.practitionerType as any,
          hpczRegistrationNumber: dto.hpczRegistrationNumber,
          hpczVerified: false,
          serviceRadiusKm: dto.serviceRadiusKm,
          baseConsultationFee: dto.baseConsultationFee,
          isAvailable: false,
          ratingAvg: 0,
          ratingCount: 0,
        },
      });

      // Create initial consent records
      const now = new Date();
      await tx.consentRecord.createMany({
        data: [
          {
            userId: newUser.id,
            consentType: 'DATA_PROCESSING',
            granted: true,
            grantedAt: now,
            version: '1.0',
            ipAddress: '0.0.0.0',
            userAgent: 'registration',
          },
          {
            userId: newUser.id,
            consentType: 'TERMS_OF_SERVICE',
            granted: true,
            grantedAt: now,
            version: '1.0',
            ipAddress: '0.0.0.0',
            userAgent: 'registration',
          },
        ],
      });

      return newUser;
    });

    // Generate tokens
    const tokens = await this.generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        practitionerType: dto.practitionerType,
        hpczVerified: false,
      },
    };
  }

  /**
   * Authenticate a user and return tokens.
   * The user object is pre-validated by the LocalStrategy.
   */
  async login(user: {
    id: string;
    email: string | null;
    role: string;
    twoFactorEnabled?: boolean;
  }): Promise<
    TokenPair & { user: Record<string, unknown>; requiresTwoFactor: boolean }
  > {
    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      return {
        accessToken: '',
        refreshToken: '',
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
        requiresTwoFactor: true,
      };
    }

    // Fetch full user details for the response
    const fullUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isEmailVerified: true,
        twoFactorEnabled: true,
        createdAt: true,
        practitionerProfile: {
          select: {
            practitionerType: true,
            hpczRegistrationNumber: true,
            hpczVerified: true,
            ratingAvg: true,
            ratingCount: true,
            baseConsultationFee: true,
          },
        },
      },
    });

    const tokens = await this.generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      ...tokens,
      user: fullUser || {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      requiresTwoFactor: false,
    };
  }

  /**
   * Validate user credentials (email + password).
   * Returns the user object without the password hash if valid, null otherwise.
   */
  async validateUser(
    email: string,
    password: string,
  ): Promise<{
    id: string;
    email: string | null;
    role: string;
    twoFactorEnabled: boolean;
  } | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return null;
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account has been deactivated');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      twoFactorEnabled: user.twoFactorEnabled,
    };
  }

  /**
   * Refresh an expired access token using a valid refresh token.
   * Returns a new access + refresh token pair.
   */
  async refreshToken(refreshToken: string): Promise<TokenPair> {
    try {
      const payload = this.jwtService.verify<TokenPayload>(refreshToken, {
        secret: this.configService.get<string>(
          'JWT_REFRESH_SECRET',
          this.configService.get<string>(
            'JWT_SECRET',
            'ndipaano-jwt-secret-change-in-production',
          ) + '-refresh',
        ),
      });

      // Verify user still exists and is active
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, role: true, isActive: true },
      });

      if (!user) {
        throw new UnauthorizedException('User no longer exists');
      }

      if (!user.isActive) {
        throw new UnauthorizedException('Account has been deactivated');
      }

      return this.generateTokens({
        id: user.id,
        email: user.email,
        role: user.role,
      });
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Generate an access token and refresh token pair.
   */
  async generateTokens(user: {
    id: string;
    email: string | null;
    role: string;
  }): Promise<TokenPair> {
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const jwtSecret = this.configService.get<string>(
      'JWT_SECRET',
      'ndipaano-jwt-secret-change-in-production',
    );
    const jwtRefreshSecret = this.configService.get<string>(
      'JWT_REFRESH_SECRET',
      jwtSecret + '-refresh',
    );

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: jwtSecret,
        expiresIn: this.configService.get<string>('JWT_EXPIRATION', '15m'),
      }),
      this.jwtService.signAsync(payload, {
        secret: jwtRefreshSecret,
        expiresIn: this.configService.get<string>(
          'JWT_REFRESH_EXPIRATION',
          '7d',
        ),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  /**
   * Set up two-factor authentication for a user.
   * Generates a TOTP secret and returns it along with a QR code URI
   * that can be scanned by authenticator apps.
   */
  async setup2FA(userId: string): Promise<{ secret: string; uri: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        twoFactorEnabled: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.twoFactorEnabled) {
      throw new BadRequestException(
        'Two-factor authentication is already enabled. Disable it first to set up a new secret.',
      );
    }

    // Generate TOTP secret
    const totp = new OTPAuth.TOTP({
      issuer: 'Ndipaano',
      label: user.email || user.id,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
    });

    // Store the secret (not yet enabled)
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: totp.secret.base32,
      },
    });

    return {
      secret: totp.secret.base32,
      uri: totp.toString(),
    };
  }

  /**
   * Verify the 2FA setup by checking the TOTP token.
   * If valid, enables 2FA on the user account.
   */
  async verify2FA(
    userId: string,
    token: string,
  ): Promise<{ enabled: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        twoFactorSecret: true,
        twoFactorEnabled: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.twoFactorEnabled) {
      throw new BadRequestException(
        'Two-factor authentication is already enabled',
      );
    }

    if (!user.twoFactorSecret) {
      throw new BadRequestException(
        'Two-factor authentication has not been set up. Call /auth/2fa/setup first.',
      );
    }

    const isValid = this.validateTOTPToken(user.twoFactorSecret, token);

    if (!isValid) {
      throw new BadRequestException(
        'Invalid verification code. Please try again.',
      );
    }

    // Enable 2FA
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
      },
    });

    return { enabled: true };
  }

  /**
   * Validate a 2FA TOTP token for a user during login.
   * Returns JWT token pair on successful validation.
   */
  async validate2FAToken(
    userId: string,
    token: string,
  ): Promise<TokenPair & { user: Record<string, unknown> }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        twoFactorSecret: true,
        twoFactorEnabled: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new BadRequestException(
        'Two-factor authentication is not enabled for this user',
      );
    }

    const isValid = this.validateTOTPToken(user.twoFactorSecret, token);

    if (!isValid) {
      throw new UnauthorizedException(
        'Invalid two-factor authentication code',
      );
    }

    const tokens = await this.generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  /**
   * Request a password reset. Generates a reset token and stores it in memory.
   * In production, this would send an email with the reset link and store
   * the token in Redis or a dedicated database table.
   * Currently logs the token for development purposes.
   *
   * Always returns a success message to prevent email enumeration attacks.
   */
  async requestPasswordReset(identifier: string): Promise<{ message: string }> {
    // Detect if input is phone number or email
    const isPhone = /^\+\d/.test(identifier.trim());

    const user = isPhone
      ? await this.prisma.user.findUnique({
          where: { phone: identifier.trim() },
          select: { id: true, email: true, firstName: true },
        })
      : await this.prisma.user.findUnique({
          where: { email: identifier.toLowerCase().trim() },
          select: { id: true, email: true, firstName: true },
        });

    // Always return success to prevent enumeration attacks
    if (!user) {
      this.logger.warn(
        `Password reset requested for non-existent identifier: ${identifier}`,
      );
      return {
        message:
          'If an account with that email or phone number exists, a password reset link has been sent.',
      };
    }

    // Generate a cryptographically secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + RESET_TOKEN_EXPIRY_HOURS);

    // Store the hashed token in memory (use Redis/DB in production)
    this.resetTokenStore.set(resetTokenHash, {
      userId: user.id,
      expiresAt,
    });

    // Log an audit trail for the reset request
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'PASSWORD_RESET_REQUESTED',
        resourceType: 'User',
        resourceId: user.id,
        details: {
          email: user.email,
          expiresAt: expiresAt.toISOString(),
        },
      },
    });

    // In production: send email with reset link
    // For now, log the token for development
    this.logger.log(
      `Password reset token generated for ${user.email}: ${resetToken}`,
    );
    this.logger.log(
      `Reset link: ${this.configService.get('FRONTEND_URL', 'http://localhost:3000')}/auth/reset-password?token=${resetToken}`,
    );

    return {
      message:
        'If an account with that email or phone number exists, a password reset link has been sent.',
    };
  }

  /**
   * Reset a user's password using a valid reset token.
   */
  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    // Hash the incoming token to compare with stored hash
    const tokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const storedToken = this.resetTokenStore.get(tokenHash);

    if (!storedToken) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (new Date() > storedToken.expiresAt) {
      this.resetTokenStore.delete(tokenHash);
      throw new BadRequestException('Reset token has expired');
    }

    // Verify user still exists
    const user = await this.prisma.user.findUnique({
      where: { id: storedToken.userId },
      select: { id: true, email: true },
    });

    if (!user) {
      this.resetTokenStore.delete(tokenHash);
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    // Update password
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Remove the used token
    this.resetTokenStore.delete(tokenHash);

    // Log an audit trail
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'PASSWORD_RESET_COMPLETED',
        resourceType: 'User',
        resourceId: user.id,
        details: {
          email: user.email,
        },
      },
    });

    this.logger.log(`Password successfully reset for user: ${user.email}`);

    return { message: 'Password has been reset successfully' };
  }

  /**
   * Change the password for an authenticated user.
   * Requires the current password for verification.
   */
  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, passwordHash: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify old password
    const isOldPasswordValid = await bcrypt.compare(
      oldPassword,
      user.passwordHash,
    );

    if (!isOldPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Prevent setting the same password
    const isSamePassword = await bcrypt.compare(
      newPassword,
      user.passwordHash,
    );

    if (isSamePassword) {
      throw new BadRequestException(
        'New password must be different from the current password',
      );
    }

    // Hash and update
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Log an audit trail
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'PASSWORD_CHANGED',
        resourceType: 'User',
        resourceId: user.id,
      },
    });

    this.logger.log(`Password changed successfully for user: ${user.email}`);

    return { message: 'Password has been changed successfully' };
  }

  /**
   * Get the full user profile including role-specific data.
   */
  async getProfile(userId: string): Promise<Record<string, unknown>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        languagePreference: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        isActive: true,
        twoFactorEnabled: true,
        createdAt: true,
        updatedAt: true,
        patientProfile: true,
        practitionerProfile: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Internal helper to validate a TOTP token against a stored secret.
   */
  private validateTOTPToken(secret: string, token: string): boolean {
    const totp = new OTPAuth.TOTP({
      issuer: 'Ndipaano',
      label: 'user',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    });

    // Allow a window of 1 period before/after for clock skew
    const delta = totp.validate({ token, window: 1 });
    return delta !== null;
  }
}
