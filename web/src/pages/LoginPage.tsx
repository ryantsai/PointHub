import { Avatar, Box, Button, chakra, Flex, Grid, Heading, Text } from '@chakra-ui/react';
import { CalendarCheck, Gift, LogIn, ScanQrCode } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useSearchParams } from 'react-router';
import { useDevLogin, useDevUsers, useMe, useSiteConfig } from '../api/auth';
import { RoleBadges } from '../components/badges';
import { ColorSchemeToggle, LanguageSwitcher } from '../components/HeaderControls';
import { Stagger, StaggerItem } from '../components/Page';
import { ErrorBlock, LoadingBlock } from '../components/states';
import { HeroPanel } from '../components/ui/HeroPanel';
import { Notice } from '../components/ui/Notice';
import { Panel } from '../components/ui/Panel';
import { ThemeSprite } from '../components/ui/ThemeSprite';
import { useErrorMessage } from '../i18n/hooks';
import { itemVariants, listVariants } from '../lib/motion';
import { safeReturnUrl } from '../lib/returnUrl';
import { initials } from '../lib/text';
import { claimWindowsSignInAttempt, windowsSignInAlreadyTried } from '../lib/windowsSignIn';
import { useActiveTheme } from '../themes/activeTheme';

function DevSignIn() {
  const { t } = useTranslation();
  const users = useDevUsers(true);
  const login = useDevLogin();
  const errorMessage = useErrorMessage();

  if (users.isPending) return <LoadingBlock />;
  if (users.error) return <ErrorBlock error={users.error} onRetry={() => void users.refetch()} />;

  return (
    <Flex direction="column" gap="3">
      <Box>
        <Heading as="h3" fontSize="md" fontWeight="extrabold">
          {t('login.devTitle')}
        </Heading>
        <Text fontSize="sm" color="fg.muted">
          {t('login.devHint')}
        </Text>
      </Box>
      {login.error && <Notice tone="error" title={errorMessage(login.error)} />}
      {users.data.length === 0 && <Text color="fg.muted">{t('login.noDevUsers')}</Text>}
      <Stagger>
        <Flex direction="column" gap="2.5">
          {users.data.map((user) => (
            <StaggerItem key={user.employeeNo}>
              <chakra.button
                type="button"
                disabled={login.isPending}
                display="flex"
                w="full"
                alignItems="center"
                gap="3"
                p="2.5"
                textAlign="start"
                borderRadius="l2"
                borderWidth="2px"
                borderColor="border.emphasized"
                bg="bg.panel"
                boxShadow="0 3px 0 0 {colors.border.emphasized}"
                cursor="pointer"
                transition="transform 160ms cubic-bezier(0.3, 1.6, 0.5, 1), box-shadow 160ms, border-color 160ms, background-color 160ms"
                _hover={{ transform: 'translateY(-1px)', borderColor: 'brand.solid', bg: 'brand.subtle', boxShadow: '0 4px 0 0 {colors.brand.solid}' }}
                _active={{ transform: 'translateY(2px)', boxShadow: '0 1px 0 0 {colors.brand.solid}' }}
                _disabled={{ opacity: 0.6, cursor: 'progress' }}
                focusVisibleRing="outside"
                onClick={() => login.mutate(user.employeeNo)}
                aria-label={t('login.signInAs', { name: user.displayName })}
              >
                <Avatar.Root size="sm" colorPalette="brand" variant="solid" flexShrink={0}>
                  <Avatar.Fallback fontWeight="black">{initials(user.displayName)}</Avatar.Fallback>
                </Avatar.Root>
                <Box flex="1" minW="0">
                  <Text fontWeight="bold" truncate>
                    {user.displayName}
                  </Text>
                  <Text fontSize="xs" color="fg.muted" fontVariantNumeric="tabular-nums">
                    {user.employeeNo}
                  </Text>
                </Box>
                <RoleBadges roles={user.roles} />
              </chakra.button>
            </StaggerItem>
          ))}
        </Flex>
      </Stagger>
    </Flex>
  );
}

/**
 * Single sign-on (`oidc` = Microsoft Entra ID, `windows` = integrated Windows authentication through IIS).
 * Both start with a full page navigation to the API, which redirects back when the handshake is done.
 */
function SsoSignIn({ mode, href, error }: { mode: 'oidc' | 'windows'; href: string; error: string | null }) {
  const { t } = useTranslation();
  return (
    <Flex direction="column" gap="3">
      {error !== null && <Notice tone="error" title={error === 'no_account' ? t('login.noAccount') : t('login.errorGeneric')} />}
      <Button asChild size="xl">
        <a href={href}>
          <LogIn aria-hidden />
          {mode === 'windows' ? t('login.windowsButton') : t('login.oidcButton')}
        </a>
      </Button>
      {mode === 'windows' && (
        <Text fontSize="sm" color="fg.muted" fontWeight="medium">
          {t('login.windowsHint')}
        </Text>
      )}
    </Flex>
  );
}

export function LoginPage() {
  const { t } = useTranslation();
  const theme = useActiveTheme();
  const me = useMe();
  const config = useSiteConfig();
  const [params] = useSearchParams();
  const returnUrl = safeReturnUrl(params.get('returnUrl'));
  const signedOut = params.get('signedOut') === '1';
  const error = params.get('error');
  const authMode = config.data?.authMode;
  const ssoHref = `/api/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`;

  // Windows mode: people on a domain PC should never see this page, so try once by ourselves. Not after an
  // explicit sign-out, not after an error, and never twice in one tab, so a failure cannot loop.
  const [alreadyTried] = useState(windowsSignInAlreadyTried);
  const autoSignIn = authMode === 'windows' && me.data === null && !signedOut && error === null && !alreadyTried;
  useEffect(() => {
    if (autoSignIn && claimWindowsSignInAttempt()) window.location.assign(ssoHref);
  }, [autoSignIn, ssoHref]);

  // Already signed in (or the dev sign-in just succeeded): continue to where the visitor was heading.
  if (me.data) return <Navigate to={returnUrl} replace />;

  const features = [
    { icon: ScanQrCode, text: t('login.featureCheckIn') },
    { icon: CalendarCheck, text: t('login.featureEarn') },
    { icon: Gift, text: t('login.featureRedeem') },
  ];

  return (
    <Flex minH="100dvh" p={{ base: '4', md: '6' }} direction="column">
      <Flex justify="flex-end" gap="1">
        <LanguageSwitcher />
        <ColorSchemeToggle />
      </Flex>
      <Grid asChild templateColumns={{ base: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))' }} gap={{ base: '6', md: '8' }} maxW="1040px" w="full" m="auto" py="6" alignItems="center">
        <motion.div variants={listVariants} initial="hidden" animate="visible">
          <motion.div variants={itemVariants}>
            <HeroPanel p={{ base: '6', md: '10' }}>
              <Flex align="flex-end" gap="3" minH="24">
                <ThemeSprite scale={6} bob title={t(`themes.${theme.id}`)} />
                {theme.companion && <ThemeSprite which="companion" scale={3} bob css={{ animationDelay: '-0.55s' }} />}
              </Flex>
              <Heading as="h1" mt="5" fontSize={{ base: '4xl', md: '5xl' }} fontWeight="black" letterSpacing="-0.03em" lineHeight="1.1">
                {config.data?.appName ?? t('app.name')}
              </Heading>
              <Text fontSize="lg" fontWeight="semibold" mt="2">
                {t('login.tagline')}
              </Text>
              <Flex direction="column" gap="2.5" mt="7">
                {features.map((feature, index) => (
                  <motion.div key={feature.text} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + index * 0.12, duration: 0.4 }}>
                    <Flex align="center" gap="3" bg="rgba(0, 0, 0, 0.22)" borderRadius="l2" px="3.5" py="2.5">
                      <feature.icon size={20} strokeWidth={2.4} aria-hidden style={{ flexShrink: 0 }} />
                      <Text fontWeight="semibold" fontSize="sm" lineHeight="1.4">
                        {feature.text}
                      </Text>
                    </Flex>
                  </motion.div>
                ))}
              </Flex>
            </HeroPanel>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Panel padding={{ base: '5', md: '7' }}>
              <Heading as="h2" fontSize="2xl" fontWeight="extrabold">
                {t('login.title')}
              </Heading>
              {returnUrl.startsWith('/c/') && (
                <Notice icon={<ScanQrCode />}>{t('login.checkInNotice')}</Notice>
              )}
              {signedOut && <Notice tone="success" title={t('login.signedOut')} />}
              {(config.isPending || me.isPending || autoSignIn) && <LoadingBlock />}
              {autoSignIn && (
                <Text fontSize="sm" color="fg.muted" fontWeight="medium" textAlign="center">
                  {t('login.signingIn')}
                </Text>
              )}
              {config.error && <ErrorBlock error={config.error} onRetry={() => void config.refetch()} />}
              {authMode === 'dev' && !me.isPending && <DevSignIn />}
              {(authMode === 'oidc' || authMode === 'windows') && !me.isPending && !autoSignIn && <SsoSignIn mode={authMode} href={ssoHref} error={error} />}
            </Panel>
          </motion.div>
        </motion.div>
      </Grid>
    </Flex>
  );
}
