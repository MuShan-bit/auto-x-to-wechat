import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ArchivesService } from './archives.service';

@Module({
  imports: [PrismaModule],
  providers: [ArchivesService],
  exports: [ArchivesService],
})
export class ArchivesModule {}
