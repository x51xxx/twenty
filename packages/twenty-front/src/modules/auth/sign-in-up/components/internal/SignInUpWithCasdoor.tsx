import { useSignInWithCasdoor } from '@/auth/sign-in-up/hooks/useSignInWithCasdoor';
import {
  SignInUpStep,
  signInUpStepState,
} from '@/auth/states/signInUpStepState';
import { type SocialSSOSignInUpActionType } from '@/auth/types/socialSSOSignInUp.type';
import { useTheme } from '@emotion/react';
import { useLingui } from '@lingui/react/macro';
import { memo } from 'react';
import { useRecoilValue } from 'recoil';
import { HorizontalSeparator, IconLock } from 'twenty-ui/display';
import { MainButton } from 'twenty-ui/input';

const CasdoorIcon = memo(() => {
  const theme = useTheme();
  return <IconLock size={theme.icon.size.md} />;
});

export const SignInUpWithCasdoor = ({
  action,
}: {
  action: SocialSSOSignInUpActionType;
}) => {
  const { t } = useLingui();
  const signInUpStep = useRecoilValue(signInUpStepState);
  const { signInWithCasdoor } = useSignInWithCasdoor();
  return (
    <>
      <MainButton
        Icon={CasdoorIcon}
        title={t`Continue with Casdoor`}
        onClick={() => signInWithCasdoor({ action })}
        variant={signInUpStep === SignInUpStep.Init ? undefined : 'secondary'}
        fullWidth
      />
      <HorizontalSeparator visible={false} />
    </>
  );
};
