import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TelehealthService } from './telehealth.service';
import { TelehealthController } from './telehealth.controller';
import { TelehealthGateway } from './telehealth.gateway';

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'ndipaano-jwt-secret-change-in-production'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRATION', '1h'),
        },
      }),
      inject: [ConfigService],
    }),
    forwardRef(() => NotificationsModule),
  ],
  controllers: [TelehealthController],
  providers: [TelehealthService, TelehealthGateway],
  exports: [TelehealthService],
})
export class TelehealthModule {}
