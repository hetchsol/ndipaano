import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { LabResultsService } from './lab-results.service';
import { LabResultsController } from './lab-results.controller';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => NotificationsModule),
  ],
  controllers: [LabResultsController],
  providers: [LabResultsService],
  exports: [LabResultsService],
})
export class LabResultsModule {}
