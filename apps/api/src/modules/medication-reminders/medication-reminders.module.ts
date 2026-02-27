import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MedicationRemindersService } from './medication-reminders.service';
import { MedicationRemindersController } from './medication-reminders.controller';
import { MedicationRemindersCron } from './medication-reminders.cron';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => NotificationsModule),
  ],
  controllers: [MedicationRemindersController],
  providers: [MedicationRemindersService, MedicationRemindersCron],
  exports: [MedicationRemindersService],
})
export class MedicationRemindersModule {}
