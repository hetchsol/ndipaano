import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdoptionsService } from './adoptions.service';
import { AdoptionsController } from './adoptions.controller';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => NotificationsModule),
  ],
  controllers: [AdoptionsController],
  providers: [AdoptionsService],
  exports: [AdoptionsService],
})
export class AdoptionsModule {}
