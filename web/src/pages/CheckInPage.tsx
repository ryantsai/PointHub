import { Box, Button, Center, Flex, Heading, Text } from '@chakra-ui/react';
import { useQueryClient } from '@tanstack/react-query';
import { CalendarClock, MapPin, QrCode, ScanQrCode } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams, useSearchParams } from 'react-router';
import { ApiError } from '../api/client';
import { useCheckInPreview, useSelfCheckIn } from '../api/events';
import { keys, pointKeys } from '../api/keys';
import type { CheckInStatus } from '../api/types';
import { ErrorBlock, LoadingBlock } from '../components/states';
import { StatusBurst } from '../components/StatusBurst';
import { Coin, Eyebrow, Points, SpriteTile } from '../components/ui/bits';
import { Notice } from '../components/ui/Notice';
import { Panel } from '../components/ui/Panel';
import { useErrorMessage, useFormat, useLocalized } from '../i18n/hooks';
import { springs } from '../lib/motion';
import { eventCalendar } from '../themes/sprites/ui';

type Outcome = { tone: 'success' | 'pending' | 'error'; title: string; body: string };

function ResultPanel({ outcome, children }: { outcome: Outcome; children?: ReactNode }) {
  return (
    <Flex direction="column" align="center" gap="2" py="4" role="status" aria-live="polite" textAlign="center">
      <StatusBurst tone={outcome.tone} />
      <Heading as="h2" fontSize="xl" fontWeight="extrabold" mt="4" lineHeight="1.3">
        {outcome.title}
      </Heading>
      <Text color="fg.muted" fontWeight="medium">
        {outcome.body}
      </Text>
      {children}
    </Flex>
  );
}

/** The reward moment: the points pop out of the badge and drop into place. */
function PointsAwarded({ points }: { points: number }) {
  const format = useFormat();
  return (
    <motion.div initial={{ opacity: 0, y: 26, scale: 0.5 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ ...springs.bouncy, delay: 0.25 }}>
      <Flex
        align="center"
        gap="2"
        mt="2"
        pl="2"
        pr="4"
        py="1.5"
        borderRadius="full"
        bg="accent.solid"
        color="accent.contrast"
        boxShadow="0 4px 0 0 {colors.accent.depth}"
        fontFamily="heading"
        fontWeight="black"
        fontSize="2xl"
        lineHeight="1"
      >
        <Coin size={30} bg="white" />
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{format.signed(points)}</span>
      </Flex>
    </motion.div>
  );
}

const CODE_EXPIRED = 'checkin_code_invalid';
const isCodeExpired = (error: unknown) => error instanceof ApiError && error.code === CODE_EXPIRED;

/** A rotating QR code that was too old (a forwarded photo, or a slow sign-in): not an error, just scan again. */
function ExpiredCodePanel() {
  const { t } = useTranslation();
  return (
    <Flex direction="column" align="center" gap="2" py="4" role="status" aria-live="polite" textAlign="center">
      <motion.div initial={{ scale: 0.5, opacity: 0, rotate: -12 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={springs.bouncy}>
        <Center boxSize="24" borderRadius="full" bg="accent.subtle" color="accent.fg" borderWidth="3px" borderColor="accent.muted">
          <QrCode size={48} strokeWidth={2} aria-hidden />
        </Center>
      </motion.div>
      <Heading as="h2" fontSize="xl" fontWeight="extrabold" mt="4">
        {t('checkin.codeExpiredTitle')}
      </Heading>
      <Text color="fg.muted" fontWeight="medium">
        {t('checkin.codeExpiredBody')}
      </Text>
    </Flex>
  );
}

function Frame({ children }: { children: ReactNode }) {
  return (
    <Center minH="50dvh">
      <Box asChild w="full" maxW="480px">
        <motion.div initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={springs.soft}>
          <Panel padding={{ base: '5', md: '7' }}>{children}</Panel>
        </motion.div>
      </Box>
    </Center>
  );
}

/**
 * Landing page of the event link / QR code: one tap to check in, then live status until a host approves.
 * Rotating events put a short-lived code in `?k=`; it is forwarded to the API on both calls.
 */
export function CheckInPage() {
  const { token = '' } = useParams();
  const { t } = useTranslation();
  const format = useFormat();
  const localized = useLocalized();
  const errorMessage = useErrorMessage();
  const [searchParams] = useSearchParams();
  const code = searchParams.get('k');
  const preview = useCheckInPreview(token, code);
  const checkIn = useSelfCheckIn(token, code);
  const qc = useQueryClient();
  const status: CheckInStatus | null = preview.data?.event.myCheckInStatus ?? null;

  // A host approved (or declined) while this page was polling: the balance in the header and the dashboard
  // lists are now stale. The check-in hook only refreshes them for the employee's own tap.
  useEffect(() => {
    if (status !== 'approved' && status !== 'rejected') return;
    void qc.invalidateQueries({ queryKey: keys.events });
    for (const key of pointKeys) void qc.invalidateQueries({ queryKey: key });
  }, [status, qc]);

  if (preview.isPending) return <LoadingBlock />;
  // While a pending check-in is being polled, a failed poll must not replace the status already on screen.
  if (preview.error && !preview.data) {
    if (isCodeExpired(preview.error)) {
      return (
        <Frame>
          <ExpiredCodePanel />
        </Frame>
      );
    }
    const invalidLink = preview.error instanceof ApiError && preview.error.status === 404;
    if (!invalidLink) return <ErrorBlock error={preview.error} onRetry={() => void preview.refetch()} />;
    return (
      <Frame>
        <ResultPanel outcome={{ tone: 'error', title: t('checkin.invalidTitle'), body: t('checkin.invalidBody') }}>
          <Button asChild variant="outline" mt="3">
            <Link to="/">{t('notFound.home')}</Link>
          </Button>
        </ResultPanel>
      </Frame>
    );
  }

  const { event, canCheckIn, blockedCode } = preview.data;
  const points = format.number(event.points);

  const outcomes: Record<CheckInStatus, Outcome> = {
    pending: { tone: 'pending', title: t('checkin.pendingTitle'), body: t('checkin.pendingBody') },
    approved: { tone: 'success', title: t('checkin.approvedTitle'), body: t('checkin.approvedBody', { points }) },
    rejected: { tone: 'error', title: t('checkin.rejectedTitle'), body: t('checkin.rejectedBody') },
    reverted: { tone: 'error', title: t('checkin.revertedTitle'), body: t('checkin.revertedBody') },
  };

  return (
    <Frame>
      <Flex gap="4" align="flex-start">
        <SpriteTile sprite={eventCalendar} scale={2} size={60} />
        <Box minW="0" flex="1">
          <Eyebrow>{t('checkin.title')}</Eyebrow>
          <Heading as="h1" fontSize="2xl" fontWeight="extrabold" lineHeight="1.25" letterSpacing="-0.01em">
            {localized(event.title)}
          </Heading>
        </Box>
      </Flex>
      {event.description && (
        <Text color="fg.muted" fontSize="sm" fontWeight="medium">
          {localized(event.description)}
        </Text>
      )}
      <Flex direction="column" gap="1.5" color="fg.muted" fontSize="sm" fontWeight="medium">
        <Flex gap="2" align="flex-start">
          <CalendarClock size={16} strokeWidth={2.5} aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />
          <span>{format.dateRange(event.startsAt, event.endsAt)}</span>
        </Flex>
        {event.location && (
          <Flex gap="2" align="flex-start">
            <MapPin size={16} strokeWidth={2.5} aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />
            <span>{event.location}</span>
          </Flex>
        )}
      </Flex>
      {status !== 'approved' && (
        <Flex>
          <Points value={event.points} signed size="lg" bg="brand.subtle" color="brand.fg" borderWidth="2px" borderColor="brand.muted" borderRadius="full" pl="1.5" pr="3.5" py="1.5" />
        </Flex>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={status ?? 'ready'}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -14, transition: { duration: 0.16 } }}
          transition={springs.soft}
        >
          {status !== null ? (
            <ResultPanel outcome={outcomes[status]}>
              {status === 'approved' && <PointsAwarded points={event.points} />}
              <Button asChild variant="outline" mt="4">
                <Link to="/">{t('checkin.goToDashboard')}</Link>
              </Button>
            </ResultPanel>
          ) : blockedCode === CODE_EXPIRED || isCodeExpired(checkIn.error) ? (
            <ExpiredCodePanel />
          ) : (
            <Flex direction="column" gap="3" pt="1">
              {!canCheckIn && <Notice tone="warning" title={t('checkin.blockedTitle')}>{errorMessage(blockedCode ?? 'unknown')}</Notice>}
              {checkIn.error && <Notice tone="error" title={errorMessage(checkIn.error)} />}
              <Box position="relative">
                <Button colorPalette="accent" size="2xl" w="full" fontSize="xl" fontWeight="black" borderRadius="l3" disabled={!canCheckIn} loading={checkIn.isPending} onClick={() => checkIn.mutate()}>
                  <ScanQrCode strokeWidth={2.5} aria-hidden />
                  {t('checkin.button')}
                </Button>
                {/* radar ping while idle: "ready to go" */}
                {canCheckIn && !checkIn.isPending && (
                  <Box
                    aria-hidden
                    data-ambient=""
                    position="absolute"
                    top="-5px"
                    right="-5px"
                    boxSize="14px"
                    borderRadius="full"
                    bg="brand.solid"
                    _before={{ content: '""', position: 'absolute', inset: 0, borderRadius: 'full', bg: 'brand.solid', animation: 'phPing 1.8s ease-out infinite' }}
                  />
                )}
              </Box>
            </Flex>
          )}
        </motion.div>
      </AnimatePresence>
    </Frame>
  );
}
