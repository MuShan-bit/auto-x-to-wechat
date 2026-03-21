import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { InternalAuthGuard } from '../../common/auth/internal-auth.guard';
import type { RequestUser } from '../../common/auth/request-user.type';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { serializeForJson } from '../../common/utils/json-serializer';
import { TestAiProviderDto } from './dto/test-ai-provider.dto';
import { AiGatewayService } from './ai-gateway.service';

@Controller('ai')
@UseGuards(InternalAuthGuard)
export class AiGatewayController {
  constructor(private readonly aiGatewayService: AiGatewayService) {}

  @Post('providers/:id/test')
  testProvider(
    @CurrentUser() user: RequestUser,
    @Param('id') providerConfigId: string,
    @Body() dto: TestAiProviderDto,
  ) {
    return this.aiGatewayService
      .testProviderConnection(user.id, providerConfigId, dto)
      .then((payload) => serializeForJson(payload));
  }
}
