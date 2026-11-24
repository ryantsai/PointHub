import { Badge, Box, Button, Center, Link as ChakraLink, Flex, Grid, Text } from '@chakra-ui/react';
import { ArrowLeft, CalendarClock, Check, ClipboardCheck, Hourglass, MapPin, Nfc, Pencil, QrCode, ShieldCheck, UserCog, Users, UserX, X, type LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams, useSearchParams } from 'react-router';
import { ApiError } from '../../api/client';
import { useHostEvent, useSetEventStatus } from '../../api/host';
import type { EventDetail, EventStatus } from '../../api/types';
import { AnimatedNumber } from '../../components/AnimatedNumber';
import { EventStatusBadge } from '../../components/badges';
import { Page, PageHeader } from '../../components/Page';
import { ErrorBlock, LoadingBlock } from '../../components/states';
import { Points } from '../../components/ui/bits';
import { Modal } from '../../components/ui/Modal';
import { Panel } from '../../components/ui/Panel';
import { SimpleTabs } from '../../components/ui/SimpleTabs';
import { useErrorMessage, useFormat, useLocalized } from '../../i18n/hooks';
import { openConfirm } from '../../lib/confirm';
import { itemVariants, springs } from '../../lib/motion';
import { notifyError } from '../../lib/notify';
import { NotFoundPage } from '../NotFoundPage';
import { ApprovalsTab } from './ApprovalsTab';
import { CardStationTab } from './CardStationTab';
import { CheckInTab } from './CheckInTab';
import { EventForm } from './EventForm';
import { RosterTab } from './RosterTab';

const TABS = ['checkin', 'approvals', 'station', 'roster'] as const;
type TabKey = (typeof TABS)[number];

/** Which status changes an event admin can make from each status. */
const NEXT_STATUS: Record<EventStatus, { status: EventStatus; label: 'open' | 'close' | 'reopen' | 'cancel' | 'toDraft' }[]> = {
  draft: [
    { status: 'open', label: 'open' },
    { status: 'cancelled', label: 'cancel' },
  ],
  open: [{ status: 'closed', label: 'close' }],
  closed: [{ status: 'open', label: 'reopen' }],
  cancelled: [{ status: 'draft', label: 'toDraft' }],
};

function StatusControls({ event }: { event: EventDetail }) {
  const { t } = useTranslation();
  const errorMessage = useErrorMessage();
  const setStatus = useSetEventStatus(event.id);

  const change = (status: EventStatus) => {
    const run = () => setStatus.mutate(status, { onError: (error) => notifyError(errorMessage(error)) });
    if (status !== 'cancelled') return run();
    openConfirm({
      title: t('host.status.cancelConfirmTitle'),
      children: <Text fontSize="sm">{t('host.status.cancelConfirmBody')}</Text>,
      labels: { confirm: t('host.status.cancel'), cancel: t('app.cancel') },
      danger: true,
      onConfirm: run,
    });
  };

  return NEXT_STATUS[event.status].map((next) => (
    <Button
      key={next.status}
      variant={next.status === 'open' ? 'solid' : next.status === 'cancelled' ? 'subtle' : 'outline'}
      colorPalette={next.status === 'cancelled' ? 'red' : undefined}
      loading={setStatus.isPending}
      onClick={() => change(next.status)}
    >
      {t(`host.status.${next.label}`)}
    </Button>
  ));
}

type CounterTone = 'plain' | 'accent' | 'green' | 'red';
const COUNTER_TONES: Record<CounterTone, { tile: string; icon: string; border?: string }> = {
  plain: { tile: 'bg.muted', icon: 'fg.muted' },
  accent: { tile: 'accent.subtle', icon: 'accent.fg', border: 'accent.emphasized' },
  green: { tile: 'green.subtle', icon: 'green.fg' },
  red: { tile: 'red.subtle', icon: 'red.fg', border: 'red.emphasized' },
};

interface CounterProps {
  label: string;
  value: number;
  icon: LucideIcon;
  tone?: CounterTone;
  gridColumn?: Record<string, string>;
}

/** One live number of the counts header. It tweens whenever the 5-second refresh brings a new value. */
function Counter({ label, value, icon: Icon, tone = 'plain', gridColumn }: CounterProps) {
  const colors = COUNTER_TONES[tone];
  return (
    <Panel padding="3.5" gap="1" gridColumn={gridColumn} borderColor={colors.border} css={{ transition: 'border-color 300ms' }}>
      <Text fontSize="xs" fontWeight="bold" color="fg.muted" lineHeight="1.35">
        {label}
      </Text>
      <Flex align="center" justify="space-between" gap="2">
        <Text fontFamily="heading" fontSize={{ base: '2xl', md: '3xl' }} fontWeight="extrabold" lineHeight="1.15" letterSpacing="-0.02em">
          <AnimatedNumber value={value} />
        </Text>
        <Center flexShrink={0} boxSize="8" borderRadius="l2" bg={colors.tile} color={colors.icon} css={{ transition: 'background-color 300ms, color 300ms' }}>
          <Icon size={16} strokeWidth={2.6} aria-hidden />
        </Center>
      </Flex>
    </Panel>
  );
}

function Fact({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <Flex as="span" display="inline-flex" align="flex-start" gap="1.5">
      <Icon size={14} strokeWidth={2.5} aria-hidden style={{ flexShrink: 0, marginTop: 3 }} />
      <span>{children}</span>
    </Flex>
  );
}

/** Each tab rises in when it is opened (SimpleTabs mounts only the open one). */
function TabFrame({ children }: { children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={springs.soft}>
      {children}
    </motion.div>
  );
}

/**
 * One event for its event admin: counts, open/close, and the four work tabs.
 * `?tab=checkin|approvals|station|roster` selects the tab; `?edit=1` opens the edit form.
 */
export function EventDetailPage() {
  const { id: rawId } = useParams();
  const id = Number(rawId);
  const { t } = useTranslation();
  const format = useFormat();
  const localized = useLocalized();
  const event = useHostEvent(id);
  const [params, setParams] = useSearchParams();
  const requestedTab = params.get('tab');
  const tab: TabKey = TABS.includes(requestedTab as TabKey) ? (requestedTab as TabKey) : 'checkin';
  const editing = params.get('edit') === '1';

  /** Changes one query parameter and keeps the others, so `?tab=` and `?edit=` do not wipe each other. */
  const setParam = (name: string, value: string | null) =>
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (value === null) next.delete(name);
        else next.set(name, value);
        return next;
      },
      { replace: true },
    );

  if (event.isPending) return <LoadingBlock />;
  if (event.error) {
    if (event.error instanceof ApiError && event.error.status === 404) return <NotFoundPage />;
    return <ErrorBlock error={event.error} onRetry={() => void event.refetch()} />;
  }
  const detail = event.data;
  const { counts } = detail;

  return (
    <Page>
      <Flex direction="column" gap="3">
        <ChakraLink asChild alignSelf="flex-start" fontSize="sm" fontWeight="bold" color="brand.fg" gap="1.5" textShadow="0 0 2px {colors.bg}, 0 0 6px {colors.bg}">
          <Link to="/host/events">
            <ArrowLeft size={15} strokeWidth={2.8} aria-hidden />
            {t('host.backToEvents')}
          </Link>
        </ChakraLink>
        <PageHeader
          title={
            <Flex as="span" display="inline-flex" align="center" columnGap="3" rowGap="1" wrap="wrap">
              {localized(detail.title)}
              <EventStatusBadge value={detail.status} size="lg" textShadow="none" />
            </Flex>
          }
          subtitle={
            <Flex as="span" display="inline-flex" columnGap="4" rowGap="1" wrap="wrap">
              <Fact icon={CalendarClock}>{format.dateRange(detail.startsAt, detail.endsAt)}</Fact>
              {detail.location && <Fact icon={MapPin}>{detail.location}</Fact>}
              <Fact icon={ShieldCheck}>{t(`approvalMode.${detail.approvalMode}`)}</Fact>
              <Fact icon={QrCode}>{t(`checkInMode.${detail.checkInMode}`)}</Fact>
              {detail.hosts.length > 0 && <Fact icon={UserCog}>{t('host.hostedBy', { names: detail.hosts.map((h) => h.displayName).join(', ') })}</Fact>}
            </Flex>
          }
          actions={
            <>
              <Points value={detail.points} signed alignSelf="center" bg="brand.subtle" color="brand.fg" borderWidth="2px" borderColor="brand.muted" borderRadius="full" pl="1.5" pr="3.5" py="1.5" />
              <Button variant="outline" onClick={() => setParam('edit', '1')}>
                <Pencil strokeWidth={2.5} aria-hidden />
                {t('app.edit')}
              </Button>
              <StatusControls event={detail} />
            </>
          }
        />
      </Flex>

      <Box asChild>
        <motion.div variants={itemVariants}>
          <Grid templateColumns={{ base: 'repeat(2, minmax(0, 1fr))', md: 'repeat(6, minmax(0, 1fr))', lg: 'repeat(5, minmax(0, 1fr))' }} gap={{ base: '3', md: '4' }}>
            <Counter label={t('host.counts.pending')} value={counts.pending} icon={Hourglass} tone={counts.pending > 0 ? 'accent' : 'plain'} gridColumn={{ md: 'span 2', lg: 'auto' }} />
            <Counter label={t('host.counts.approved')} value={counts.approved} icon={Check} tone="green" gridColumn={{ md: 'span 2', lg: 'auto' }} />
            <Counter label={t('host.counts.rejected')} value={counts.rejected} icon={X} gridColumn={{ md: 'span 2', lg: 'auto' }} />
            <Counter label={t('host.counts.roster')} value={counts.roster} icon={Users} gridColumn={{ md: 'span 3', lg: 'auto' }} />
            <Counter
              label={t('host.counts.rosterUnmatched')}
              value={counts.rosterUnmatched}
              icon={UserX}
              tone={counts.rosterUnmatched > 0 ? 'red' : 'plain'}
              gridColumn={{ base: 'span 2', md: 'span 3', lg: 'auto' }}
            />
          </Grid>
        </motion.div>
      </Box>

      <Box asChild minW="0">
        <motion.div variants={itemVariants}>
          <SimpleTabs<TabKey>
            value={tab}
            onChange={(next) => setParam('tab', next)}
            tabs={[
              {
                value: 'checkin',
                label: t('host.tabs.checkin'),
                icon: <QrCode size={16} strokeWidth={2.5} aria-hidden />,
                content: (
                  <TabFrame>
                    <CheckInTab event={detail} />
                  </TabFrame>
                ),
              },
              {
                value: 'approvals',
                label: t('host.tabs.approvals'),
                icon: <ClipboardCheck size={16} strokeWidth={2.5} aria-hidden />,
                badge:
                  counts.pending > 0 ? (
                    <Badge colorPalette="accent" variant="solid" size="sm" minW="5" justifyContent="center" fontWeight="black" fontVariantNumeric="tabular-nums">
                      {format.number(counts.pending)}
                    </Badge>
                  ) : null,
                content: (
                  <TabFrame>
                    <ApprovalsTab event={detail} />
                  </TabFrame>
                ),
              },
              {
                value: 'station',
                label: t('host.tabs.station'),
                icon: <Nfc size={16} strokeWidth={2.5} aria-hidden />,
                content: (
                  <TabFrame>
                    <CardStationTab event={detail} />
                  </TabFrame>
                ),
              },
              {
                value: 'roster',
                label: t('host.tabs.roster'),
                icon: <Users size={16} strokeWidth={2.5} aria-hidden />,
                content: (
                  <TabFrame>
                    <RosterTab event={detail} />
                  </TabFrame>
                ),
              },
            ]}
          />
        </motion.div>
      </Box>

      <Modal opened={editing} onClose={() => setParam('edit', null)} title={t('host.editEvent')} size="lg">
        <EventForm event={detail} onCancel={() => setParam('edit', null)} onSaved={() => setParam('edit', null)} />
      </Modal>
    </Page>
  );
}
