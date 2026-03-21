import { Module } from '@nestjs/common';
import { AiGatewayModule } from '../ai-gateway/ai-gateway.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ReportAggregationService } from './report-aggregation.service';
import { ReportGenerationService } from './report-generation.service';
import { ReportGenerationTaskService } from './report-generation-task.service';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [PrismaModule, AiGatewayModule],
  controllers: [ReportsController],
  providers: [
    ReportsService,
    ReportAggregationService,
    ReportGenerationService,
    ReportGenerationTaskService,
  ],
  exports: [
    ReportsService,
    ReportAggregationService,
    ReportGenerationService,
    ReportGenerationTaskService,
  ],
})
export class ReportsModule {}
