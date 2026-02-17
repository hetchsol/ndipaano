import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

/**
 * Passport local strategy for email + password authentication.
 * Used by the LocalAuthGuard on the login endpoint.
 *
 * Configured to use 'email' as the username field instead of the
 * default 'username' expected by passport-local.
 */
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      usernameField: 'email',
      passwordField: 'password',
    });
  }

  /**
   * Validates the user credentials. Called automatically by Passport
   * when the LocalAuthGuard is used.
   *
   * @param email - The user's email address
   * @param password - The user's plain text password
   * @returns The validated user object (without the password hash)
   */
  async validate(email: string, password: string): Promise<unknown> {
    const user = await this.authService.validateUser(email, password);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return user;
  }
}
