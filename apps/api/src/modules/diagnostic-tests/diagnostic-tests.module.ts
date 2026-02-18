import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { DiagnosticTestsService } from './diagnostic-tests.service';
import { DiagnosticTestsController } from './diagnostic-tests.controller';

@Module({
  imports: [PrismaModule],
  controllers: [DiagnosticTestsController],
  providers: [DiagnosticTestsService],
  exports: [DiagnosticTestsService],
})
export class DiagnosticTestsModule {}
