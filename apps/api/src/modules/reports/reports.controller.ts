import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InternalAuthGuard } from '../../common/auth/internal-auth.guard';
import type { RequestUser } from '../../common/auth/request-user.type';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { serializeForJson } from '../../common/utils/json-serializer';
import { GenerateReportDto } from './dto/generate-report.dto';
import { ListReportsQueryDto } from './dto/list-reports-query.dto';
import { ReportGenerationTaskService } from './report-generation-task.service';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(InternalAuthGuard)
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly reportGenerationTaskService: ReportGenerationTaskService,
  ) {}

  @Post('generate')
  generateReport(
    @CurrentUser() user: RequestUser,
    @Body() dto: GenerateReportDto,
  ) {
    return this.reportGenerationTaskService
      .generateReport(user.id, dto)
      .then((payload) => serializeForJson(payload));
  }

  @Get()
  listReports(@CurrentUser() user: RequestUser, @Query() query: ListReportsQueryDto) {
    return this.reportsService
      .listReportsByUser(user.id, query)
      .then((payload) => serializeForJson(payload));
  }

  @Get(':id')
  getReportDetail(
    @CurrentUser() user: RequestUser,
    @Param('id') reportId: string,
  ) {
    return this.reportsService
      .getReportDetailForUser(user.id, reportId)
      .then((payload) => serializeForJson(payload));
  }
}
