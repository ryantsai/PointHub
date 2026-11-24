import { Box, Button, Center, Flex, Grid, Input, Text } from '@chakra-ui/react';
import { Check, History, Keyboard, Nfc, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useCardCheckIn, useManualCheckIn } from '../../api/host';
import type { CheckIn, EventDetail } from '../../api/types';
import { AnimatedNumber } from '../../components/AnimatedNumber';
import { EmptyState } from '../../components/states';
import { StatusBurst } from '../../components/StatusBurst';
import { Coin, SectionTitle } from '../../components/ui/bits';
import { FormField } from '../../components/ui/fields';
import { HeroPanel } from '../../components/ui/HeroPanel';
import { Notice } from '../../components/ui/Notice';
import { Panel } from '../../components/ui/Panel';
import { ThemeSprite } from '../../components/ui/ThemeSprite';
import { CardReaderStatus } from '../../features/cardReader/CardReaderStatus';
import { SCAN_FIELD_ATTRIBUTE } from '../../features/cardReader/keyboardWedge';
import type { CardRead } from '../../features/cardReader/types';
import { useCardReader } from '../../features/cardReader/useCardReader';
import { useErrorMessage, useFormat } from '../../i18n/hooks';
import { springs } from '../../lib/motion';

const FEEDBACK_MS = 4000;
const MAX_RECENT = 12;

/** Result of one tap or manual entry, shown big on the kiosk panel and kept in the recent list. */
interface Tap {
  id: number;
  ok: boolean;
  /** Employee name on success, the translated error on failure. */
  headline: string;
  /** Employee number (and department) on success, the UID or number that was entered on failure. */
  detail: string;
  /** Points credited by a successful tap. */
  points?: number;
  at: string;
}

/**
 * The colour of the whole kiosk for the few seconds after a tap: green or red, readable from across the room.
 * It lives in the hero's clipped background layer. The solid status colour is darkened a step so the white
 * text on it keeps AA contrast.
 */
function KioskBackdrop({ tap }: { tap: Tap | undefined }) {
  const reducedMotion = useReducedMotion();
  return (
    <AnimatePresence>
      {tap && (
        <motion.div key={tap.id} style={{ position: 'absolute', inset: 0 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.35 } }} transition={{ duration: 0.14 }}>
          <Box position="absolute" inset="0" bg={tap.ok ? 'green.solid' : 'red.solid'} />
          {/* Failure goes darker, so it also reads as a change on themes whose hero is already red. */}
          <Box position="absolute" inset="0" bg={tap.ok ? 'rgba(0, 0, 0, 0.22)' : 'rgba(0, 0, 0, 0.42)'} />
          <Box position="absolute" inset="0" opacity="0.14" bgImage="radial-gradient(white 1.2px, transparent 1.2px)" bgSize="18px 18px" />
          {!reducedMotion && (
            <>
              {/* shockwave from where the badge lands */}
              <Center position="absolute" inset="0">
                <motion.span
                  style={{ width: 180, height: 180, borderRadius: '50%', border: '6px solid rgba(255, 255, 255, 0.55)' }}
                  initial={{ scale: 0.3, opacity: 0.9 }}
                  animate={{ scale: 7, opacity: 0 }}
                  transition={{ duration: 0.9, ease: [0.16, 0.84, 0.3, 1] }}
                />
              </Center>
              {/* drains until the kiosk is ready for the next card */}
              <motion.div
                style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 6, background: 'rgba(255, 255, 255, 0.75)', transformOrigin: 'left' }}
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: FEEDBACK_MS / 1000, ease: 'linear' }}
              />
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** The result badge on a white plate, so it stands out from the green or red kiosk behind it. */
function ResultBadge({ ok }: { ok: boolean }) {
  return (
    <motion.div initial={{ scale: 0.5, rotate: ok ? -14 : 0 }} animate={{ scale: 1, rotate: 0 }} transition={springs.bouncy}>
      <Center boxSize={{ base: '136px', md: '156px' }} borderRadius="full" bg="white" boxShadow="0 7px 0 0 rgba(0, 0, 0, 0.3)">
        <StatusBurst tone={ok ? 'success' : 'error'} size={104} />
      </Center>
    </motion.div>
  );
}

function TapResult({ tap }: { tap: Tap }) {
  const { t } = useTranslation();
  const format = useFormat();
  return (
    <Flex direction="column" align="center" gap={{ base: '3', md: '4' }}>
      <ResultBadge ok={tap.ok} />
      <Text fontFamily="heading" fontSize={tap.ok ? { base: '3xl', md: '5xl' } : { base: '2xl', md: '4xl' }} fontWeight="black" lineHeight="1.15" letterSpacing="-0.02em" mt="3" maxW="20ch" wordBreak="break-word">
        {tap.ok ? t('host.station.welcome', { name: tap.headline }) : tap.headline}
      </Text>
      {tap.ok && tap.points !== undefined && (
        // The reward moment: the points pop out a beat after the name.
        <motion.div initial={{ opacity: 0, y: 26, scale: 0.5 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ ...springs.bouncy, delay: 0.22 }}>
          <Flex
            align="center"
            gap="2.5"
            pl="2"
            pr="5"
            py="2"
            borderRadius="full"
            bg="accent.solid"
            color="accent.contrast"
            boxShadow="0 5px 0 0 {colors.accent.depth}"
            fontFamily="heading"
            fontWeight="black"
            fontSize={{ base: '3xl', md: '4xl' }}
            lineHeight="1"
          >
            <Coin size={40} bg="white" />
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{t('app.pointsValue', { value: format.signed(tap.points) })}</span>
          </Flex>
        </motion.div>
      )}
      {tap.detail && (
        <Text fontSize={{ base: 'lg', md: 'xl' }} fontWeight="bold" lineHeight="1.3" bg="rgba(0, 0, 0, 0.28)" borderRadius="full" px="4" py="1.5" wordBreak="break-all">
          {tap.detail}
        </Text>
      )}
    </Flex>
  );
}

function ReadyScreen({ active }: { active: boolean }) {
  const { t } = useTranslation();
  const ring = { content: '""', position: 'absolute', inset: 0, borderRadius: 'full', borderWidth: '3px', borderColor: 'white', animation: 'phPing 2.4s ease-out infinite' } as const;
  return (
    <Flex direction="column" align="center" gap="3" opacity={active ? 1 : 0.7}>
      <Box
        aria-hidden
        data-ambient=""
        position="relative"
        boxSize={{ base: '28', md: '36' }}
        mb="3"
        _before={active ? ring : undefined}
        _after={active ? { ...ring, animationDelay: '1.2s' } : undefined}
      >
        <Center position="relative" zIndex="1" boxSize="full" borderRadius="full" bg="rgba(0, 0, 0, 0.3)" borderWidth="3px" borderColor="rgba(255, 255, 255, 0.4)">
          <motion.div animate={active ? { scale: [1, 1.1, 1] } : undefined} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }} style={{ display: 'flex' }}>
            <Nfc size={72} strokeWidth={1.8} />
          </motion.div>
        </Center>
      </Box>
      <Text fontFamily="heading" fontSize={{ base: '3xl', md: '5xl' }} fontWeight="black" lineHeight="1.15" letterSpacing="-0.02em">
        {t('host.station.ready')}
      </Text>
      <Text fontSize={{ base: 'md', md: 'xl' }} fontWeight="bold" lineHeight="1.4">
        {t('host.station.readyHint')}
      </Text>
    </Flex>
  );
}

function RecentTap({ tap }: { tap: Tap }) {
  const format = useFormat();
  return (
    <Flex align="center" gap="3" px="1" py="1.5">
      <Center flexShrink={0} boxSize="7" borderRadius="full" bg={tap.ok ? 'green.subtle' : 'red.subtle'} color={tap.ok ? 'green.fg' : 'red.fg'}>
        {tap.ok ? <Check size={15} strokeWidth={3.2} aria-hidden /> : <X size={15} strokeWidth={3.2} aria-hidden />}
      </Center>
      <Box flex="1" minW="0">
        <Text fontSize="sm" fontWeight="bold" lineHeight="1.35" truncate>
          {tap.headline}
        </Text>
        {tap.detail && (
          <Text fontSize="xs" fontWeight="medium" color="fg.muted" lineHeight="1.4" truncate>
            {tap.detail}
          </Text>
        )}
      </Box>
      {tap.ok && tap.points !== undefined && (
        <Text flexShrink={0} fontSize="sm" fontWeight="black" color="gain" fontVariantNumeric="tabular-nums">
          {format.signed(tap.points)}
        </Text>
      )}
      <Text flexShrink={0} fontSize="xs" fontWeight="medium" color="fg.muted" fontVariantNumeric="tabular-nums">
        {format.time(tap.at)}
      </Text>
    </Flex>
  );
}

/** Kiosk for the door: every card tap (or typed employee number) answers with one big green or red moment. */
export function CardStationTab({ event }: { event: EventDetail }) {
  const { t } = useTranslation();
  const errorMessage = useErrorMessage();
  const cardCheckIn = useCardCheckIn(event.id);
  const manualCheckIn = useManualCheckIn(event.id);
  const [taps, setTaps] = useState<Tap[]>([]);
  const [showLatest, setShowLatest] = useState(false);
  const [uid, setUid] = useState('');
  const [employeeNo, setEmployeeNo] = useState('');
  const nextId = useRef(1);
  const isOpen = event.status === 'open';
  const latest = showLatest ? taps[0] : undefined;

  const record = useCallback((tap: Omit<Tap, 'id' | 'at'>) => {
    const entry: Tap = { ...tap, id: nextId.current++, at: new Date().toISOString() };
    setTaps((previous) => [entry, ...previous].slice(0, MAX_RECENT));
    setShowLatest(true);
  }, []);

  const recordSuccess = useCallback(
    (checkIn: CheckIn) =>
      record({
        ok: true,
        headline: checkIn.employeeName,
        detail: checkIn.department ? `${checkIn.employeeNo} · ${checkIn.department}` : checkIn.employeeNo,
        points: checkIn.points,
      }),
    [record],
  );

  // Back to the "ready" screen a few seconds after each tap.
  const latestId = taps[0]?.id;
  useEffect(() => {
    if (latestId === undefined) return;
    const timer = window.setTimeout(() => setShowLatest(false), FEEDBACK_MS);
    return () => window.clearTimeout(timer);
  }, [latestId]);

  const { mutate: sendCard } = cardCheckIn;
  const onRead = useCallback(
    (read: CardRead) => {
      setUid('');
      sendCard(read.uid, {
        onSuccess: recordSuccess,
        onError: (error) => record({ ok: false, headline: errorMessage(error), detail: read.uid }),
      });
    },
    [sendCard, record, recordSuccess, errorMessage],
  );
  const onUnreadable = useCallback(() => record({ ok: false, headline: t('host.station.unreadable'), detail: '' }), [record, t]);
  const reader = useCardReader({ onRead, onUnreadable, enabled: isOpen });

  const submitUid = (e: FormEvent) => {
    e.preventDefault();
    if (uid.trim() !== '') reader.submit(uid);
  };

  const submitManual = (e: FormEvent) => {
    e.preventDefault();
    const value = employeeNo.trim();
    if (value === '') return;
    manualCheckIn.mutate(value, {
      onSuccess: (checkIn) => {
        setEmployeeNo('');
        recordSuccess(checkIn);
      },
      onError: (error) => record({ ok: false, headline: errorMessage(error), detail: value }),
    });
  };

  const slab = latest ? (latest.ok ? 'green.depth' : 'red.depth') : 'brand.depth';

  return (
    <Flex direction="column" gap="4">
      {!isOpen && <Notice tone="warning" title={t('host.station.notOpen')} />}

      <HeroPanel
        role="status"
        aria-live="assertive"
        display="flex"
        alignItems="center"
        justifyContent="center"
        textAlign="center"
        minH={{ base: '400px', md: '460px' }}
        px={{ base: '4', md: '8' }}
        py={{ base: '14', md: '12' }}
        boxShadow={`0 6px 0 0 {colors.${slab}}`}
        css={{ transition: 'box-shadow 200ms' }}
        decoration={
          <>
            <KioskBackdrop tap={latest} />
            {/* live head count: ticks up with every successful tap */}
            <Flex position="absolute" top="3.5" left="3.5" align="center" gap="2" bg="rgba(0, 0, 0, 0.3)" borderRadius="full" pl="3" pr="3.5" py="1.5" fontSize="sm" fontWeight="bold" lineHeight="1.2">
              <Check size={15} strokeWidth={3.2} />
              {t('host.counts.approved')}
              <Text as="span" fontFamily="heading" fontSize="lg" fontWeight="black">
                <AnimatedNumber value={event.counts.approved} />
              </Text>
            </Flex>
            <ThemeSprite scale={3} bob position="absolute" right="4" bottom="4" opacity={latest ? 0 : 1} transition="opacity 200ms" />
          </>
        }
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={latest?.id ?? 'ready'}
            initial={{ opacity: 0, scale: 0.86, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.12 } }}
            transition={springs.bouncy}
          >
            {latest ? <TapResult tap={latest} /> : <ReadyScreen active={isOpen} />}
          </motion.div>
        </AnimatePresence>
      </HeroPanel>

      <Flex align="center" justify="space-between" columnGap="4" rowGap="2" wrap="wrap" minH="6" textShadow="0 0 2px {colors.bg}, 0 0 6px {colors.bg}">
        <CardReaderStatus bridge={reader.bridge} />
        {reader.nfc !== 'unsupported' && (
          <Flex align="center" gap="3" wrap="wrap">
            {reader.nfc === 'scanning' && (
              <Text fontSize="sm" fontWeight="medium" color="fg.muted">
                {t('host.station.nfcScanning')}
              </Text>
            )}
            {reader.nfc === 'denied' && (
              <Text fontSize="sm" fontWeight="semibold" color="red.fg">
                {t('host.station.nfcDenied')}
              </Text>
            )}
            {reader.nfc === 'scanning' ? (
              <Button variant="outline" size="sm" onClick={reader.stopNfc}>
                <Nfc strokeWidth={2.5} aria-hidden />
                {t('host.station.nfcStop')}
              </Button>
            ) : (
              <Button size="sm" disabled={!isOpen} onClick={reader.startNfc}>
                <Nfc strokeWidth={2.5} aria-hidden />
                {t('host.station.nfcStart')}
              </Button>
            )}
          </Flex>
        )}
      </Flex>

      <Grid templateColumns={{ base: 'minmax(0, 1fr)', lg: 'repeat(2, minmax(0, 1fr))' }} gap="4" alignItems="start">
        <Panel>
          <SectionTitle compact icon={Keyboard} title={t('host.station.manualTitle')} />
          <form onSubmit={submitManual}>
            <FormField label={t('host.station.employeeNo')} disabled={!isOpen}>
              <Flex gap="2" w="full">
                <Input flex="1" minW="0" value={employeeNo} onChange={(e) => setEmployeeNo(e.currentTarget.value)} autoComplete="off" />
                <Button type="submit" disabled={!isOpen} loading={manualCheckIn.isPending}>
                  {t('host.station.checkIn')}
                </Button>
              </Flex>
            </FormField>
          </form>
          <form onSubmit={submitUid}>
            <FormField label={t('host.station.cardUid')} help={t('host.station.cardUidHint')} disabled={!isOpen}>
              <Flex gap="2" w="full">
                <Input flex="1" minW="0" fontFamily="mono" value={uid} onChange={(e) => setUid(e.currentTarget.value)} autoComplete="off" {...{ [SCAN_FIELD_ATTRIBUTE]: '' }} />
                <Button type="submit" variant="outline" disabled={!isOpen} loading={cardCheckIn.isPending}>
                  {t('host.station.checkIn')}
                </Button>
              </Flex>
            </FormField>
          </form>
        </Panel>

        <Panel gap="3">
          <SectionTitle compact icon={History} title={t('host.station.recent')} />
          {taps.length === 0 ? (
            <EmptyState message={t('host.station.noTaps')} icon={<Nfc size={26} strokeWidth={2.2} aria-hidden />} />
          ) : (
            <Flex as="ul" direction="column" listStyleType="none">
              <AnimatePresence initial={false}>
                {taps.map((tap) => (
                  <motion.li key={tap.id} layout initial={{ opacity: 0, x: -18, scale: 0.96 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0 }} transition={springs.soft}>
                    <RecentTap tap={tap} />
                  </motion.li>
                ))}
              </AnimatePresence>
            </Flex>
          )}
        </Panel>
      </Grid>
    </Flex>
  );
}
