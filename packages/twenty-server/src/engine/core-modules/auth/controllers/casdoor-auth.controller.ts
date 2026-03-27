import {
  Controller,
  Get,
  Req,
  Res,
  UseFilters,
  UseGuards,
} from '@nestjs/common';

import { Response } from 'express';

import { AuthOAuthExceptionFilter } from 'src/engine/core-modules/auth/filters/auth-oauth-exception.filter';
import { AuthRestApiExceptionFilter } from 'src/engine/core-modules/auth/filters/auth-rest-api-exception.filter';
import { CasdoorAuthGuard } from 'src/engine/core-modules/auth/guards/casdoor-auth.guard';
import { CasdoorProviderEnabledGuard } from 'src/engine/core-modules/auth/guards/casdoor-provider-enabled.guard';
import { AuthService } from 'src/engine/core-modules/auth/services/auth.service';
import { CasdoorRequest } from 'src/engine/core-modules/auth/strategies/casdoor.auth.strategy';
import { AuthProviderEnum } from 'src/engine/core-modules/workspace/types/workspace.type';
import { PublicEndpointGuard } from 'src/engine/guards/public-endpoint.guard';

@Controller('auth/casdoor')
@UseFilters(AuthRestApiExceptionFilter)
export class CasdoorAuthController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  @UseGuards(
    CasdoorProviderEnabledGuard,
    CasdoorAuthGuard,
    PublicEndpointGuard,
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
  )
  @UseFilters(AuthOAuthExceptionFilter)
  async casdoorAuthRedirect(
    @Req() req: CasdoorRequest,
    @Res() res: Response,
  ) {
    return res.redirect(
      await this.authService.signInUpWithSocialSSO(
        req.user,
        AuthProviderEnum.Casdoor,
      ),
    );
  }
}
