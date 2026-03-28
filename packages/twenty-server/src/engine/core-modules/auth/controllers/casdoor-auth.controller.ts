import {
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import crypto from 'node:crypto';

import { Response } from 'express';
import { Repository } from 'typeorm';

import { AppTokenEntity } from 'src/engine/core-modules/app-token/app-token.entity';
import { AuthOAuthExceptionFilter } from 'src/engine/core-modules/auth/filters/auth-oauth-exception.filter';
import { AuthRestApiExceptionFilter } from 'src/engine/core-modules/auth/filters/auth-rest-api-exception.filter';
import { CasdoorAuthGuard } from 'src/engine/core-modules/auth/guards/casdoor-auth.guard';
import { CasdoorProviderEnabledGuard } from 'src/engine/core-modules/auth/guards/casdoor-provider-enabled.guard';
import { CasdoorRoleMappingService } from 'src/engine/core-modules/auth/services/casdoor-role-mapping.service';
import { AuthService } from 'src/engine/core-modules/auth/services/auth.service';
import { CasdoorRequest } from 'src/engine/core-modules/auth/strategies/casdoor.auth.strategy';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { AuthProviderEnum } from 'src/engine/core-modules/workspace/types/workspace.type';
import { NoPermissionGuard } from 'src/engine/guards/no-permission.guard';
import { PublicEndpointGuard } from 'src/engine/guards/public-endpoint.guard';

@Controller('auth/casdoor')
@UseFilters(AuthRestApiExceptionFilter)
export class CasdoorAuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly casdoorRoleMappingService: CasdoorRoleMappingService,
    private readonly twentyConfigService: TwentyConfigService,
    @InjectRepository(UserWorkspaceEntity)
    private readonly userWorkspaceRepository: Repository<UserWorkspaceEntity>,
    @InjectRepository(AppTokenEntity)
    private readonly appTokenRepository: Repository<AppTokenEntity>,
  ) {}

  @Get()
  @UseGuards(
    CasdoorProviderEnabledGuard,
    CasdoorAuthGuard,
    PublicEndpointGuard,
    NoPermissionGuard,
  )
  async casdoorAuth() {
    // As this method is protected by Casdoor Auth guard, it will trigger Casdoor OIDC flow
    return;
  }

  @Get('redirect')
  @UseGuards(
    CasdoorProviderEnabledGuard,
    CasdoorAuthGuard,
    PublicEndpointGuard,
    NoPermissionGuard,
  )
  @UseFilters(AuthOAuthExceptionFilter)
  async casdoorAuthRedirect(
    @Req() req: CasdoorRequest,
    @Res() res: Response,
  ) {
    const redirectUrl = await this.authService.signInUpWithSocialSSO(
      req.user,
      AuthProviderEnum.Casdoor,
    );

    // Sync Casdoor roles to Twenty workspace roles after sign-in-up
    if (req.user.casdoorRoles.length > 0) {
      await this.syncCasdoorRoles(req.user.email, req.user.casdoorRoles);
    }

    return res.redirect(redirectUrl);
  }

  @Post('webhook')
  @UseGuards(PublicEndpointGuard, NoPermissionGuard)
  async casdoorWebhook(
    @Req() req: Request & { body: CasdoorWebhookPayload; headers: Record<string, string> },
    @Res() res: Response,
  ) {
    const webhookSecret = this.twentyConfigService.get(
      'CASDOOR_WEBHOOK_SECRET',
    );

    if (!webhookSecret) {
      return res.status(404).json({ error: 'Webhook not configured' });
    }

    const signature = req.headers['x-casdoor-signature'] as string;

    if (signature) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (signature !== expectedSignature) {
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    const { action, email } = req.body;

    if (
      (action === 'logout' ||
        action === 'delete-user' ||
        action === 'update-password') &&
      email
    ) {
      await this.revokeAllUserTokensByEmail(email);
    }

    return res.status(200).json({ ok: true });
  }

  private async syncCasdoorRoles(
    email: string,
    casdoorRoles: string[],
  ): Promise<void> {
    const userWorkspaces = await this.userWorkspaceRepository.find({
      where: { user: { email: email.toLowerCase() } },
      relations: ['user'],
    });

    for (const userWorkspace of userWorkspaces) {
      await this.casdoorRoleMappingService.syncRoleForUser(
        casdoorRoles,
        userWorkspace.id,
        userWorkspace.workspaceId,
      );
    }
  }

  private async revokeAllUserTokensByEmail(email: string): Promise<void> {
    const userWorkspaces = await this.userWorkspaceRepository.find({
      where: { user: { email: email.toLowerCase() } },
      relations: ['user'],
    });

    for (const userWorkspace of userWorkspaces) {
      await this.appTokenRepository.update(
        {
          userId: userWorkspace.userId,
          type: 'REFRESH_TOKEN' as never,
          revokedAt: undefined as never,
        },
        { revokedAt: new Date() },
      );
    }
  }
}

type CasdoorWebhookPayload = {
  action: string;
  email?: string;
  userId?: string;
};
