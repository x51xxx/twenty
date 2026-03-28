import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';

import { type Request } from 'express';
import { Strategy, type StrategyOptions, type TokenSet } from 'openid-client';
import { type APP_LOCALES } from 'twenty-shared/translations';

import {
  AuthException,
  AuthExceptionCode,
} from 'src/engine/core-modules/auth/auth.exception';
import { type SocialSSOSignInUpActionType } from 'src/engine/core-modules/auth/types/signInUp.type';

export type CasdoorRequest = Omit<
  Request,
  'user' | 'workspace' | 'workspaceMetadataVersion'
> & {
  user: {
    firstName?: string | null;
    lastName?: string | null;
    email: string;
    picture: string | null;
    locale?: keyof typeof APP_LOCALES | null;
    workspaceInviteHash?: string;
    workspacePersonalInviteToken?: string;
    action: SocialSSOSignInUpActionType;
    workspaceId?: string;
    billingCheckoutSessionState?: string;
    casdoorRoles: string[];
  };
};

@Injectable()
export class CasdoorStrategy extends PassportStrategy(Strategy, 'casdoor') {
  constructor(private client: StrategyOptions['client']) {
    super({
      params: {
        scope: 'openid email profile',
      },
      client,
      passReqToCallback: true,
    });
  }

  // oxlint-disable-next-line @typescripttypescript/no-explicit-any
  async authenticate(req: Request, options: any) {
    return super.authenticate(req, {
      ...options,
      state: JSON.stringify({
        workspaceInviteHash: req.query.workspaceInviteHash,
        workspaceId: req.params.workspaceId,
        billingCheckoutSessionState: req.query.billingCheckoutSessionState,
        workspacePersonalInviteToken: req.query.workspacePersonalInviteToken,
        action: req.query.action,
      }),
    });
  }

  private extractState(req: Request): {
    workspaceInviteHash?: string;
    workspaceId?: string;
    billingCheckoutSessionState?: string;
    workspacePersonalInviteToken?: string;
    action?: SocialSSOSignInUpActionType;
    locale?: keyof typeof APP_LOCALES;
  } {
    try {
      const state = JSON.parse(
        req.query.state && typeof req.query.state === 'string'
          ? req.query.state
          : '{}',
      );

      return state;
    } catch {
      return {};
    }
  }

  private extractRoles(
    // oxlint-disable-next-line @typescripttypescript/no-explicit-any
    userinfo: Record<string, any>,
  ): string[] {
    // Casdoor may return roles as array of strings or objects
    const rawRoles = userinfo.roles ?? userinfo.groups ?? [];

    if (!Array.isArray(rawRoles)) {
      return [];
    }

    return rawRoles.map((role: string | { name: string }) =>
      typeof role === 'string' ? role : role.name,
    );
  }

  async validate(
    req: Request,
    tokenset: TokenSet,
    // oxlint-disable-next-line @typescripttypescript/no-explicit-any
    done: (err: any, user?: CasdoorRequest['user']) => void,
  ) {
    try {
      const state = this.extractState(req);

      const userinfo = await this.client.userinfo(tokenset);

      const email = userinfo.email;

      if (!email || typeof email !== 'string') {
        return done(
          new AuthException(
            'Email not found in Casdoor profile',
            AuthExceptionCode.INVALID_DATA,
          ),
        );
      }

      done(null, {
        email,
        firstName: (userinfo.given_name as string) ?? null,
        lastName: (userinfo.family_name as string) ?? null,
        picture: (userinfo.picture as string) ?? null,
        workspaceInviteHash: state.workspaceInviteHash,
        workspacePersonalInviteToken: state.workspacePersonalInviteToken,
        workspaceId: state.workspaceId,
        billingCheckoutSessionState: state.billingCheckoutSessionState,
        action: state.action ?? 'list-available-workspaces',
        locale: state.locale,
        casdoorRoles: this.extractRoles(
          userinfo as Record<string, unknown>,
        ),
      });
    } catch (err) {
      done(err);
    }
  }
}
