import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ArchivesController } from './archives.controller';
import { ArchivesService } from './archives.service';

@Module({
  imports: [PrismaModule],
  controllers: [ArchivesController],
  providers: [ArchivesService],
  exports: [ArchivesService],
})
export class ArchivesModule {}
