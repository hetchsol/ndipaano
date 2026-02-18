import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterPatientDto, RegisterPractitionerDto } from './dto/register.dto';
import {
  LoginDto,
  TwoFactorDto,
  RefreshTokenDto,
  ResetPasswordDto,
  ChangePasswordDto,
} from './dto/login.dto';
import { Public, CurrentUser } from '../../common';

/**
 * Authentication controller for the Ndipaano Medical Home Care Platform.
 * Handles user registration, login, 2FA, token refresh, and password management.
 */
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ─── Registration ─────────────────────────────────────────────────────────

  @Public()
  @Post('register/patient')
  @ApiOperation({
    summary: 'Register a new patient',
    description:
      'Creates a new patient account with profile and consent records. Returns JWT token pair.',
  })
  @ApiBody({ type: RegisterPatientDto })
  @ApiResponse({
    status: 201,
    description: 'Patient registered successfully',
  })
  @ApiResponse({
    status: 409,
    description: 'Email or phone number already exists',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed',
  })
  async registerPatient(@Body() dto: RegisterPatientDto) {
    return this.authService.registerPatient(dto);
  }

  @Public()
  @Post('register/practitioner')
  @ApiOperation({
    summary: 'Register a new practitioner',
    description:
      'Creates a new practitioner account with profile and consent records. ' +
      'HPCZ verification will be pending admin approval. Returns JWT token pair.',
  })
  @ApiBody({ type: RegisterPractitionerDto })
  @ApiResponse({
    status: 201,
    description: 'Practitioner registered successfully',
  })
  @ApiResponse({
    status: 409,
    description: 'Email, phone number, or HPCZ registration number already exists',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed',
  })
  async registerPractitioner(@Body() dto: RegisterPractitionerDto) {
    return this.authService.registerPractitioner(dto);
  }

  // ─── Login ────────────────────────────────────────────────────────────────

  @Public()
  @UseGuards(AuthGuard('local'))
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login with email and password',
    description:
      'Authenticates user credentials and returns JWT token pair. ' +
      'If 2FA is enabled, returns requiresTwoFactor: true with an empty token pair.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
  })
  async login(@CurrentUser() user: { id: string; email: string | null; role: string; twoFactorEnabled: boolean }) {
    return this.authService.login(user);
  }

  // ─── Token Refresh ────────────────────────────────────────────────────────

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Exchanges a valid refresh token for a new access + refresh token pair.',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Tokens refreshed successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token',
  })
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  // ─── Two-Factor Authentication ────────────────────────────────────────────

  @Post('2fa/setup')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Set up two-factor authentication',
    description:
      'Generates a TOTP secret and returns it along with a QR code URI for authenticator apps.',
  })
  @ApiResponse({
    status: 200,
    description: 'TOTP secret and QR code URI returned',
  })
  @ApiResponse({
    status: 400,
    description: '2FA is already enabled',
  })
  @ApiResponse({
    status: 401,
    description: 'Not authenticated',
  })
  async setup2FA(@CurrentUser('id') userId: string) {
    return this.authService.setup2FA(userId);
  }

  @Post('2fa/verify')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Verify and enable two-factor authentication',
    description:
      'Verifies the TOTP token from the authenticator app and enables 2FA on the account.',
  })
  @ApiBody({ type: TwoFactorDto })
  @ApiResponse({
    status: 200,
    description: '2FA enabled successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid verification code or 2FA not set up',
  })
  @ApiResponse({
    status: 401,
    description: 'Not authenticated',
  })
  async verify2FA(@Body() dto: TwoFactorDto) {
    return this.authService.verify2FA(dto.userId, dto.token);
  }

  @Public()
  @Post('2fa/validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validate 2FA token during login',
    description:
      'Validates the TOTP token for users with 2FA enabled. Returns JWT token pair on success.',
  })
  @ApiBody({ type: TwoFactorDto })
  @ApiResponse({
    status: 200,
    description: 'Token validated, JWT tokens returned',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid 2FA code',
  })
  async validate2FAToken(@Body() dto: TwoFactorDto) {
    return this.authService.validate2FAToken(dto.userId, dto.token);
  }

  // ─── Password Management ──────────────────────────────────────────────────

  @Public()
  @Post('password/reset-request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request a password reset',
    description:
      'Sends a password reset link to the provided email address. ' +
      'Always returns success to prevent email enumeration.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        identifier: { type: 'string', example: 'user@example.com or +260971234567' },
      },
      required: ['identifier'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset link sent (if account exists)',
  })
  async requestPasswordReset(@Body('identifier') identifier: string) {
    return this.authService.requestPasswordReset(identifier);
  }

  @Public()
  @Post('password/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset password with token',
    description:
      'Resets the user password using the token received via email.',
  })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired reset token',
  })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @Post('password/change')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Change password',
    description:
      'Changes the password for the authenticated user. Requires the current password for verification.',
  })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Current password is incorrect or new password same as old',
  })
  @ApiResponse({
    status: 401,
    description: 'Not authenticated',
  })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      userId,
      dto.oldPassword,
      dto.newPassword,
    );
  }

  // ─── Profile ──────────────────────────────────────────────────────────────

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user profile',
    description:
      'Returns the full profile of the authenticated user, including role-specific data ' +
      '(patient or practitioner profile).',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile returned',
  })
  @ApiResponse({
    status: 401,
    description: 'Not authenticated',
  })
  async getMe(@CurrentUser('id') userId: string) {
    return this.authService.getProfile(userId);
  }
}
