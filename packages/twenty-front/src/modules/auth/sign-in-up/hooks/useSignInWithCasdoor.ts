import { useParams, useSearchParams } from 'react-router-dom';

import { useAuth } from '@/auth/hooks/useAuth';
import { type BillingCheckoutSession } from '@/auth/types/billingCheckoutSession.type';
import { type SocialSSOSignInUpActionType } from '@/auth/types/socialSSOSignInUp.type';

export const useSignInWithCasdoor = () => {
  const workspaceInviteHash = useParams().workspaceInviteHash;
  const [searchParams] = useSearchParams();
  const workspacePersonalInviteToken =
    searchParams.get('inviteToken') ?? undefined;
  const billingCheckoutSession = {
    plan: 'PRO',
    interval: 'Month',
    requirePaymentMethod: true,
  } as BillingCheckoutSession;

  const { signInWithCasdoor } = useAuth();

  return {
    signInWithCasdoor: ({
      action,
    }: {
      action: SocialSSOSignInUpActionType;
    }) =>
      signInWithCasdoor({
        workspaceInviteHash,
        workspacePersonalInviteToken,
        billingCheckoutSession,
        action,
      }),
  };
};
