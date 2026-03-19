import {
  BindingBrowserSessionStatus,
  type BindingBrowserSession,
} from '@prisma/client';
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CredentialCryptoService } from '../crypto/credential-crypto.service';
import { PrismaService } from '../prisma/prisma.service';
import { XBrowserAutomationService } from '../crawler/x-browser-automation.service';
import type { InteractiveLoginRuntime } from '../crawler/x-browser.types';

const X_LOGIN_URL = 'https://x.com/i/flow/login';

@Injectable()
export class BindingBrowserSessionsService implements OnModuleDestroy {
  private readonly runtimes = new Map<string, InteractiveLoginRuntime>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly credentialCryptoService: CredentialCryptoService,
    private readonly xBrowserAutomationService: XBrowserAutomationService,
  ) {}

  async onModuleDestroy() {
    const runtimes = Array.from(this.runtimes.values());

    await Promise.all(
      runtimes.map((runtime) =>
        this.xBrowserAutomationService.closeInteractiveLoginRuntime(runtime),
      ),
    );

    this.runtimes.clear();
  }

  async createSessionForUser(userId: string) {
    await this.cancelActiveSessionsForUser(userId);

    const session = await this.prisma.bindingBrowserSession.create({
      data: {
        userId,
        status: BindingBrowserSessionStatus.PENDING,
        loginUrl: X_LOGIN_URL,
        expiresAt: this.buildExpiresAt(),
      },
    });

    try {
      const runtime =
        await this.xBrowserAutomationService.launchInteractiveLogin(
          session.loginUrl,
        );
      this.runtimes.set(session.id, runtime);

      return this.prisma.bindingBrowserSession.update({
        where: {
          id: session.id,
        },
        data: {
          status: BindingBrowserSessionStatus.WAITING_LOGIN,
        },
      });
    } catch (error) {
      await this.prisma.bindingBrowserSession.update({
        where: {
          id: session.id,
        },
        data: {
          status: BindingBrowserSessionStatus.FAILED,
          completedAt: new Date(),
          errorMessage:
            error instanceof Error
              ? error.message
              : 'Failed to launch X browser binding session',
        },
      });

      throw new InternalServerErrorException(
        error instanceof Error
          ? error.message
          : 'Failed to launch X browser binding session',
      );
    }
  }

  async getSessionByIdForUser(userId: string, sessionId: string) {
    const session = await this.prisma.bindingBrowserSession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
      include: {
        binding: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Binding browser session not found');
    }

    return this.syncSession(session);
  }

  async cancelSessionForUser(userId: string, sessionId: string) {
    const session = await this.prisma.bindingBrowserSession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
    });

    if (!session) {
      throw new NotFoundException('Binding browser session not found');
    }

    await this.closeRuntime(session.id);

    return this.prisma.bindingBrowserSession.update({
      where: {
        id: session.id,
      },
      data: {
        status: BindingBrowserSessionStatus.CANCELLED,
        completedAt: new Date(),
      },
    });
  }

  private async syncSession(session: BindingBrowserSession) {
    if (this.isFinalStatus(session.status)) {
      return this.prisma.bindingBrowserSession.findUniqueOrThrow({
        where: {
          id: session.id,
        },
        include: {
          binding: true,
        },
      });
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      await this.closeRuntime(session.id);

      return this.prisma.bindingBrowserSession.update({
        where: {
          id: session.id,
        },
        data: {
          status: BindingBrowserSessionStatus.EXPIRED,
          completedAt: new Date(),
          errorMessage: 'X browser binding session expired',
        },
        include: {
          binding: true,
        },
      });
    }

    const runtime = this.runtimes.get(session.id);

    if (!runtime) {
      return this.prisma.bindingBrowserSession.update({
        where: {
          id: session.id,
        },
        data: {
          status: BindingBrowserSessionStatus.FAILED,
          completedAt: new Date(),
          errorMessage: 'Browser runtime is no longer available',
        },
        include: {
          binding: true,
        },
      });
    }

    const state = await this.xBrowserAutomationService.inspectInteractiveLogin(
      runtime,
      session.loginUrl,
    );

    switch (state.status) {
      case 'WAITING_LOGIN':
        return this.prisma.bindingBrowserSession.findUniqueOrThrow({
          where: {
            id: session.id,
          },
          include: {
            binding: true,
          },
        });
      case 'CLOSED':
        await this.closeRuntime(session.id);

        return this.prisma.bindingBrowserSession.update({
          where: {
            id: session.id,
          },
          data: {
            status: BindingBrowserSessionStatus.CANCELLED,
            completedAt: new Date(),
            errorMessage: 'X browser login window was closed before completion',
          },
          include: {
            binding: true,
          },
        });
      case 'FAILED':
        await this.closeRuntime(session.id);

        return this.prisma.bindingBrowserSession.update({
          where: {
            id: session.id,
          },
          data: {
            status: BindingBrowserSessionStatus.FAILED,
            completedAt: new Date(),
            errorMessage: state.errorMessage,
          },
          include: {
            binding: true,
          },
        });
      case 'AUTHENTICATED':
        await this.closeRuntime(session.id);

        return this.prisma.bindingBrowserSession.update({
          where: {
            id: session.id,
          },
          data: {
            status: BindingBrowserSessionStatus.SUCCESS,
            completedAt: new Date(),
            capturedPayloadEncrypted: this.credentialCryptoService.encrypt(
              JSON.stringify(state.payload),
            ),
            xUserId: state.profile.xUserId ?? state.payload.xUserId ?? null,
            username: state.profile.username ?? state.payload.username ?? null,
            displayName:
              state.profile.displayName ?? state.payload.displayName ?? null,
            avatarUrl:
              state.profile.avatarUrl ?? state.payload.avatarUrl ?? null,
            errorMessage: null,
          },
          include: {
            binding: true,
          },
        });
    }
  }

  private async cancelActiveSessionsForUser(userId: string) {
    const sessions = await this.prisma.bindingBrowserSession.findMany({
      where: {
        userId,
        status: {
          in: [
            BindingBrowserSessionStatus.PENDING,
            BindingBrowserSessionStatus.WAITING_LOGIN,
          ],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    await Promise.all(sessions.map((session) => this.closeRuntime(session.id)));

    if (sessions.length === 0) {
      return;
    }

    await this.prisma.bindingBrowserSession.updateMany({
      where: {
        id: {
          in: sessions.map((session) => session.id),
        },
      },
      data: {
        status: BindingBrowserSessionStatus.CANCELLED,
        completedAt: new Date(),
        errorMessage: 'Superseded by a newer X browser binding session',
      },
    });
  }

  private async closeRuntime(sessionId: string) {
    const runtime = this.runtimes.get(sessionId);

    if (!runtime) {
      return;
    }

    this.runtimes.delete(sessionId);
    await this.xBrowserAutomationService.closeInteractiveLoginRuntime(runtime);
  }

  private buildExpiresAt() {
    const timeoutSeconds = this.configService.get<number>(
      'X_BINDING_SESSION_TIMEOUT_SECONDS',
      600,
    );

    return new Date(Date.now() + timeoutSeconds * 1000);
  }

  private isFinalStatus(status: BindingBrowserSessionStatus) {
    return (
      status === BindingBrowserSessionStatus.SUCCESS ||
      status === BindingBrowserSessionStatus.FAILED ||
      status === BindingBrowserSessionStatus.EXPIRED ||
      status === BindingBrowserSessionStatus.CANCELLED
    );
  }
}
