import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { InternalAuthGuard } from '../../common/auth/internal-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../common/auth/request-user.type';
import { CrawlRunsService } from './crawl-runs.service';

@Controller('runs')
@UseGuards(InternalAuthGuard)
export class CrawlRunsController {
  constructor(private readonly crawlRunsService: CrawlRunsService) {}

  @Get()
  listRuns(
    @CurrentUser() user: RequestUser,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.crawlRunsService.listByUser(user.id, {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }
}
