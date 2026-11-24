import { Box, Button, Center, Clipboard, CloseButton, Code, Dialog, Flex, Heading, Portal, Spinner, Text } from '@chakra-ui/react';
import { Check, Copy, Maximize, RefreshCw } from 'lucide-react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSiteConfig } from '../../api/auth';
import { useCheckInCode, useRegenerateToken } from '../../api/host';
import type { EventDetail, RotatingCode } from '../../api/types';
import { AnimatedNumber } from '../../components/AnimatedNumber';
import { ErrorBlock } from '../../components/states';
import { Coin } from '../../components/ui/bits';
import { HeroPanel } from '../../components/ui/HeroPanel';
import { Notice } from '../../components/ui/Notice';
import { Panel } from '../../components/ui/Panel';
import { ThemeSprite } from '../../components/ui/ThemeSprite';
import { useErrorMessage, useFormat, useLocalized } from '../../i18n/hooks';
import { openConfirm } from '../../lib/confirm';
import { springs } from '../../lib/motion';
import { notifyError, notifySuccess } from '../../lib/notify';

const PANEL_QR = '220px';
/** Side of the projected code: as large as the screen allows next to (lg) or above (phones) the text. */
const PROJECTOR_QR = { base: 'min(46dvh, 76vw)', lg: 'min(68dvh, 42vw)' };

/**
 * The link employees open: the configured public address when there is one, else wherever the event admin is
 * browsing from. Rotating events add the current code as `?k=`.
 */
function useCheckInUrl(token: string, code: string | null): string {
  const { data: config } = useSiteConfig();
  const base = (config?.publicBaseUrl ?? window.location.origin).replace(/\/+$/, '');
  const url = `${base}/c/${token}`;
  return code === null ? url : `${url}?k=${encodeURIComponent(code)}`;
}

/**
 * Bar that drains until the next code, with the seconds spelled out for screen readers and reduced-motion users.
 * It runs on the browser clock while `expiresAt` is server time, so on a PC with a wrong clock the bar can be off;
 * the code itself is still refreshed on time (see useCheckInCode).
 */
function CodeCountdown({ code, onHero }: { code: RotatingCode; onHero?: boolean }) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const fraction = useMotionValue(1);
  const label = useTransform(fraction, (value) => t('host.qr.nextCodeIn', { seconds: Math.max(0, Math.ceil(value * code.periodSeconds)) }));

  useEffect(() => {
    const remaining = Math.max(0, (new Date(code.expiresAt).getTime() - Date.now()) / 1000);
    fraction.set(Math.min(1, remaining / code.periodSeconds));
    const controls = animate(fraction, 0, { duration: remaining, ease: 'linear' });
    return () => controls.stop();
  }, [fraction, code.expiresAt, code.periodSeconds]);

  return (
    <Flex direction="column" gap="1.5" w="full" role="timer">
      {!reducedMotion && (
        <Box h={onHero ? '2.5' : '2'} borderRadius="full" overflow="hidden" bg={onHero ? 'rgba(0, 0, 0, 0.35)' : 'bg.muted'}>
          <Box asChild h="full" borderRadius="full" bg={onHero ? 'accent.solid' : 'brand.solid'}>
            <motion.div style={{ scaleX: fraction, transformOrigin: 'left' }} />
          </Box>
        </Box>
      )}
      <Text fontSize={onHero ? 'md' : 'sm'} fontWeight="bold" color={onHero ? 'white' : 'fg.muted'} textAlign="center" fontVariantNumeric="tabular-nums">
        <motion.span>{label}</motion.span>
      </Text>
    </Flex>
  );
}

interface QrTileProps {
  /** `null` while the first rotating code is on its way. */
  url: string | null;
  alt: string;
  /** CSS width of the code itself. */
  size: string | Record<string, string>;
  /** Thicker frame and slab for the projector. */
  large?: boolean;
}

/** The code on a white sticker. White in both colour schemes: phone cameras need the contrast. */
function QrTile({ url, alt, size, large }: QrTileProps) {
  return (
    <Box
      bg="white"
      p={large ? { base: '4', lg: '6' } : '4'}
      borderRadius="l3"
      borderWidth={large ? '0' : '2px'}
      borderColor="border.emphasized"
      boxShadow={large ? '0 8px 0 0 rgba(0, 0, 0, 0.35)' : '0 4px 0 0 {colors.border.emphasized}'}
      flexShrink={0}
    >
      <Box w={size} aspectRatio="1">
        {url === null ? (
          <Center boxSize="full">
            <Spinner size="lg" color="brand.solid" />
          </Center>
        ) : (
          // A new rotating code blinks in, so the room can see that it changed.
          <motion.div key={url} initial={{ opacity: 0.35, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={springs.snap}>
            <QRCodeSVG value={url} size={220} level="M" title={alt} style={{ display: 'block', width: '100%', height: 'auto' }} />
          </motion.div>
        )}
      </Box>
    </Box>
  );
}

function ProjectorStat({ label, value }: { label: string; value: number }) {
  return (
    <Box bg="rgba(0, 0, 0, 0.28)" borderRadius="l2" px="5" py="3" minW="32">
      <Text fontSize="sm" fontWeight="bold" lineHeight="1.3">
        {label}
      </Text>
      <Text fontFamily="heading" fontSize={{ base: '3xl', lg: '4xl' }} fontWeight="black" lineHeight="1.15" letterSpacing="-0.02em">
        <AnimatedNumber value={value} />
      </Text>
    </Box>
  );
}

export function CheckInTab({ event }: { event: EventDetail }) {
  const { t } = useTranslation();
  const format = useFormat();
  const localized = useLocalized();
  const errorMessage = useErrorMessage();
  const rotating = event.checkInMode === 'rotating';
  const code = useCheckInCode(event.id, rotating);
  const url = useCheckInUrl(event.checkInToken, rotating ? (code.data?.code ?? null) : null);
  const regenerate = useRegenerateToken(event.id);
  const [projecting, setProjecting] = useState(false);
  const title = localized(event.title);
  // A rotating QR without its code would only produce "code expired" pages, so wait for the first code.
  const qrUrl = !rotating || code.data !== undefined ? url : null;
  const alt = t('host.qr.alt', { title });

  const confirmRegenerate = () =>
    openConfirm({
      title: t('host.qr.regenerateTitle'),
      children: <Text fontSize="sm">{t('host.qr.regenerateBody')}</Text>,
      labels: { confirm: t('host.qr.regenerate'), cancel: t('app.cancel') },
      danger: true,
      onConfirm: () =>
        regenerate.mutate(undefined, {
          onSuccess: () => notifySuccess(t('host.qr.regenerated')),
          onError: (error) => notifyError(errorMessage(error)),
        }),
    });

  return (
    <Flex direction="column" gap="4">
      {event.status !== 'open' && <Notice tone="warning" title={t('host.qr.notOpen')} />}
      {rotating && code.error && !code.data && <ErrorBlock error={code.error} onRetry={() => void code.refetch()} />}
      <Panel padding={{ base: '5', md: '7' }}>
        <Flex direction={{ base: 'column', lg: 'row' }} align={{ base: 'center', lg: 'flex-start' }} gap={{ base: '6', lg: '8' }}>
          <Flex direction="column" align="center" gap="3" flexShrink={0}>
            <QrTile url={qrUrl} alt={alt} size={PANEL_QR} />
            {rotating && code.data && <CodeCountdown code={code.data} />}
          </Flex>
          <Flex direction="column" gap="3" flex="1" minW="0" w="full">
            <Heading as="h2" fontSize="xl" fontWeight="extrabold" lineHeight="1.25" letterSpacing="-0.01em">
              {rotating ? t('host.qr.rotatingTitle') : t('host.qr.title')}
            </Heading>
            <Text fontSize="sm" fontWeight="medium" color="fg.muted" maxW="2xl">
              {rotating ? t('host.qr.rotatingHint') : t('host.qr.hint')}
            </Text>
            {!rotating && (
              <Code display="block" whiteSpace="pre-wrap" wordBreak="break-all" px="3" py="2.5" borderRadius="l2" bg="bg.muted" color="fg" fontSize="sm">
                {url}
              </Code>
            )}
            <Flex gap="2" wrap="wrap" mt="1">
              <Button onClick={() => setProjecting(true)}>
                <Maximize strokeWidth={2.5} aria-hidden />
                {t('host.qr.projector')}
              </Button>
              {/* Copying a rotating link is pointless: it stops working within seconds. */}
              {!rotating && (
                <Clipboard.Root value={url}>
                  <Clipboard.Trigger asChild>
                    <Button variant="outline">
                      <Clipboard.Indicator copied={<Check strokeWidth={3} aria-hidden />}>
                        <Copy strokeWidth={2.5} aria-hidden />
                      </Clipboard.Indicator>
                      <Clipboard.Indicator copied={t('app.copied')}>{t('host.qr.copyLink')}</Clipboard.Indicator>
                    </Button>
                  </Clipboard.Trigger>
                </Clipboard.Root>
              )}
              <Button variant="ghost" colorPalette="red" loading={regenerate.isPending} onClick={confirmRegenerate}>
                <RefreshCw strokeWidth={2.5} aria-hidden />
                {t('host.qr.regenerate')}
              </Button>
            </Flex>
          </Flex>
        </Flex>
      </Panel>

      {/* Projector mode: fills the window so a room can scan from a distance; code and counters keep updating. */}
      <Dialog.Root
        open={projecting}
        onOpenChange={(details) => {
          if (!details.open) setProjecting(false);
        }}
        size="full"
        lazyMount
        unmountOnExit
      >
        <Portal>
          <Dialog.Positioner>
            <Dialog.Content bg="hero.via" color="white" minH="100dvh" borderRadius="0" boxShadow="none">
              <HeroPanel display="flex" alignItems="center" justifyContent="center" minH="100dvh" borderRadius="0" boxShadow="none" px={{ base: '5', lg: '12' }} py={{ base: '14', lg: '10' }}>
                <Flex direction={{ base: 'column', lg: 'row' }} align="center" justify="center" gap={{ base: '6', lg: '14' }}>
                  <Flex asChild direction="column" align="center" gap="4" flexShrink={0}>
                    <motion.div initial={{ opacity: 0, scale: 0.86 }} animate={{ opacity: 1, scale: 1 }} transition={{ ...springs.bouncy, delay: 0.12 }}>
                      <QrTile url={qrUrl} alt={alt} size={PROJECTOR_QR} large />
                      {rotating && code.data && <CodeCountdown code={code.data} onHero />}
                    </motion.div>
                  </Flex>
                  <Flex asChild direction="column" align={{ base: 'center', lg: 'flex-start' }} textAlign={{ base: 'center', lg: 'start' }} gap={{ base: '3', lg: '5' }} minW="0" maxW={{ lg: '38vw' }}>
                    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ ...springs.soft, delay: 0.22 }}>
                      <ThemeSprite scale={4} bob display={{ base: 'none', lg: 'inline-block' }} />
                      <Dialog.Title asChild>
                        <Heading as="h1" fontSize={{ base: '3xl', md: '4xl', lg: '6xl' }} fontWeight="black" lineHeight="1.15" letterSpacing="-0.02em">
                          {title}
                        </Heading>
                      </Dialog.Title>
                      <Flex
                        align="center"
                        gap="2.5"
                        pl="2"
                        pr="5"
                        py="2"
                        borderRadius="full"
                        bg="accent.solid"
                        color="accent.contrast"
                        boxShadow="0 4px 0 0 {colors.accent.depth}"
                        fontFamily="heading"
                        fontWeight="black"
                        fontSize={{ base: '2xl', lg: '4xl' }}
                        lineHeight="1"
                      >
                        <Coin size={36} bg="white" />
                        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{t('app.pointsValue', { value: format.signed(event.points) })}</span>
                      </Flex>
                      <Text fontSize={{ base: 'lg', lg: '2xl' }} fontWeight="bold" lineHeight="1.4">
                        {t('host.qr.scanPrompt')}
                      </Text>
                      <Flex gap="3" wrap="wrap" justify={{ base: 'center', lg: 'flex-start' }} textAlign="start">
                        <ProjectorStat label={t('host.counts.approved')} value={event.counts.approved} />
                        <ProjectorStat label={t('host.counts.pending')} value={event.counts.pending} />
                      </Flex>
                    </motion.div>
                  </Flex>
                </Flex>
              </HeroPanel>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="lg" color="white" bg="rgba(0, 0, 0, 0.28)" borderRadius="full" _hover={{ bg: 'rgba(0, 0, 0, 0.45)' }} aria-label={t('app.close')} />
              </Dialog.CloseTrigger>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </Flex>
  );
}
