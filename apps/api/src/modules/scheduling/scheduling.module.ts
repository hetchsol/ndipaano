import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SchedulingService } from './scheduling.service';
import { SchedulingController } from './scheduling.controller';
import { SchedulingProcessor } from './scheduling.processor';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({ name: 'scheduling' }),
    forwardRef(() => NotificationsModule),
  ],
  controllers: [SchedulingController],
  providers: [SchedulingService, SchedulingProcessor],
  exports: [SchedulingService],
})
export class SchedulingModule {}
