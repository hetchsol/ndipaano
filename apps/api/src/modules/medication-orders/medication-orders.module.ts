import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MedicationRemindersModule } from '../medication-reminders/medication-reminders.module';
import { MedicationOrdersService } from './medication-orders.service';
import { MedicationOrdersController } from './medication-orders.controller';
import { PharmaciesController } from './pharmacies.controller';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => NotificationsModule),
    forwardRef(() => MedicationRemindersModule),
  ],
  controllers: [MedicationOrdersController, PharmaciesController],
  providers: [MedicationOrdersService],
  exports: [MedicationOrdersService],
})
export class MedicationOrdersModule {}
