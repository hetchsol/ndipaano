import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PractitionersService } from './practitioners.service';
import { PractitionersController } from './practitioners.controller';

@Module({
  imports: [PrismaModule],
  controllers: [PractitionersController],
  providers: [PractitionersService],
  exports: [PractitionersService],
})
export class PractitionersModule {}
