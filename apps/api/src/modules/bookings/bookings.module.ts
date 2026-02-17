import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';

@Module({
  imports: [
    PrismaModule,
    // NotificationsModule is imported via forwardRef to handle circular
    // dependencies (notifications may reference bookings and vice versa).
    // Uncomment when NotificationsModule is created:
    // forwardRef(() => NotificationsModule),
  ],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
