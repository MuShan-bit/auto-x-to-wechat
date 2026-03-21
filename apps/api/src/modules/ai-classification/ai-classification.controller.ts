import {
  Body,
  Controller,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { RequestUser } from '../../common/auth/request-user.type';
import { InternalAuthGuard } from '../../common/auth/internal-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { serializeForJson } from '../../common/utils/json-serializer';
import { RerunArchiveAiClassificationBatchDto } from './dto/rerun-archive-ai-classification-batch.dto';
import { PostClassificationTaskService } from './post-classification-task.service';

@Controller('archives')
@UseGuards(InternalAuthGuard)
export class AiClassificationController {
  constructor(
    private readonly postClassificationTaskService: PostClassificationTaskService,
  ) {}

  @Post(':id/ai-classify')
  rerunArchiveAiClassification(
    @CurrentUser() user: RequestUser,
    @Param('id') archivedPostId: string,
  ) {
    return this.postClassificationTaskService
      .rerunArchivedPostClassification(user.id, archivedPostId)
      .then((payload) => serializeForJson(payload));
  }

  @Post('ai-classify/batch')
  rerunArchiveAiClassificationBatch(
    @CurrentUser() user: RequestUser,
    @Body() dto: RerunArchiveAiClassificationBatchDto,
  ) {
    return this.postClassificationTaskService
      .rerunArchivedPostClassificationBatch(user.id, dto.archiveIds)
      .then((payload) => serializeForJson(payload));
  }
}
