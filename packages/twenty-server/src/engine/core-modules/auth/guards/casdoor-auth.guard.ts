import { type ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';

import { type Request } from 'express';
import { Issuer } from 'openid-client';
import { Repository } from 'typeorm';

import {
  AuthException,
  AuthExceptionCode,
} from 'src/engine/core-modules/auth/auth.exception';
import { CasdoorStrategy } from 'src/engine/core-modules/auth/strategies/casdoor.auth.strategy';
import { WorkspaceDomainsService } from 'src/engine/core-modules/domain/workspace-domains/services/workspace-domains.service';
import { GuardRedirectService } from 'src/engine/core-modules/guard-redirect/services/guard-redirect.service';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';

@Injectable()
export class CasdoorAuthGuard extends AuthGuard('casdoor') {
  constructor(
    private readonly guardRedirectService: GuardRedirectService,
    private readonly twentyConfigService: TwentyConfigService,
    @InjectRepository(WorkspaceEntity)
    private readonly workspaceRepository: Repository<WorkspaceEntity>,
    private readonly workspaceDomainsService: WorkspaceDomainsService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    let workspace: WorkspaceEntity | null = null;

    try {
      if (
        request.query.workspaceId &&
        typeof request.query.workspaceId === 'string'
      ) {
        request.params.workspaceId = request.query.workspaceId;
        workspace = await this.workspaceRepository.findOneBy({
          id: request.query.workspaceId,
        });
      }

      if (request.query.error === 'access_denied') {
        throw new AuthException(
          'Casdoor OAuth access denied',
          AuthExceptionCode.OAUTH_ACCESS_DENIED,
        );
      }

      const casdoorEndpoint =
        this.twentyConfigService.get('CASDOOR_ENDPOINT');
      const clientId = this.twentyConfigService.get('CASDOOR_CLIENT_ID');
      const clientSecret =
        this.twentyConfigService.get('CASDOOR_CLIENT_SECRET');
      const callbackUrl =
        this.twentyConfigService.get('AUTH_CASDOOR_CALLBACK_URL');

      const issuer = await Issuer.discover(casdoorEndpoint);

      const client = new issuer.Client({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uris: [callbackUrl],
        response_types: ['code'],
      });

      new CasdoorStrategy(client);

      return (await super.canActivate(context)) as boolean;
    } catch (err) {
      this.guardRedirectService.dispatchErrorFromGuard(
        context,
        err,
        this.workspaceDomainsService.getSubdomainAndCustomDomainFromWorkspaceFallbackOnDefaultSubdomain(
          workspace,
        ),
      );

      return false;
    }
  }
}
