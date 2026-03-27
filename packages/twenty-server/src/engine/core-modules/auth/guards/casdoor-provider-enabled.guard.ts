import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';

import {
  AuthException,
  AuthExceptionCode,
} from 'src/engine/core-modules/auth/auth.exception';
import { GuardRedirectService } from 'src/engine/core-modules/guard-redirect/services/guard-redirect.service';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';

@Injectable()
export class CasdoorProviderEnabledGuard implements CanActivate {
  constructor(
    private readonly twentyConfigService: TwentyConfigService,
    private readonly guardRedirectService: GuardRedirectService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    try {
      if (!this.twentyConfigService.get('AUTH_CASDOOR_ENABLED')) {
        throw new AuthException(
          'Casdoor auth is not enabled',
          AuthExceptionCode.OAUTH_ACCESS_DENIED,
        );
      }

      return true;
    } catch (err) {
      this.guardRedirectService.dispatchErrorFromGuard(
        context,
        err,
        this.guardRedirectService.getSubdomainAndCustomDomainFromContext(
          context,
        ),
      );

      return false;
    }
  }
}
