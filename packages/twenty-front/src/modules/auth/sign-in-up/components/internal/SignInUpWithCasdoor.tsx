import { useSignInWithCasdoor } from '@/auth/sign-in-up/hooks/useSignInWithCasdoor';
import {
  SignInUpStep,
  signInUpStepState,
} from '@/auth/states/signInUpStepState';
import { type SocialSSOSignInUpActionType } from '@/auth/types/socialSSOSignInUp.type';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useLingui } from '@lingui/react/macro';
import { memo, useContext } from 'react';
import { HorizontalSeparator, IconLock } from 'twenty-ui/display';
import { MainButton } from 'twenty-ui/input';
import { ThemeContext } from 'twenty-ui/theme-constants';

const CasdoorIcon = memo(() => {
  const { theme } = useContext(ThemeContext);
  return <IconLock size={theme.icon.size.md} />;
});

export const SignInUpWithCasdoor = ({
  action,
}: {
  action: SocialSSOSignInUpActionType;
}) => {
  const { t } = useLingui();
  const signInUpStep = useAtomStateValue(signInUpStepState);
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
