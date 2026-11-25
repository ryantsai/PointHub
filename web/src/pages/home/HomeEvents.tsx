import { Badge, Box, Button, Flex, Grid, Status, Text, VisuallyHidden } from '@chakra-ui/react';
import { CalendarClock, Check, Clock, Hourglass, MapPin, ScanQrCode, Ticket } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import type { EventSummary } from '../../api/types';
import { CheckInStatusBadge } from '../../components/badges';
import { Stagger, StaggerItem } from '../../components/Page';
import { EmptyState, ErrorBlock, LoadingBlock, NoMatch } from '../../components/states';
import { Coin, SectionTitle, SpriteTile } from '../../components/ui/bits';
import { Panel } from '../../components/ui/Panel';
import { SearchField } from '../../components/ui/SearchField';
import { useFormat, useLocale, useLocalized } from '../../i18n/hooks';
import { useNow } from '../../lib/hooks';
import { itemVariants, springs } from '../../lib/motion';
import { eventCalendar, ticket } from '../../themes/sprites/ui';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "in 3 hours", "tomorrow": how far off an upcoming event is, in the reader's language. */
function useStartsIn() {
  const locale = useLocale();
  return (startsAt: string, now: number): string => {
    const relative = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    const ahead = new Date(startsAt).getTime() - now;
    if (ahead < HOUR) return relative.format(Math.max(1, Math.round(ahead / MINUTE)), 'minute');
    if (ahead < DAY) return relative.format(Math.round(ahead / HOUR), 'hour');
    return relative.format(Math.round(ahead / DAY), 'day');
  };
}

function EventCard({ event, upcoming, now, onCheckIn }: { event: EventSummary; upcoming: boolean; now: number; onCheckIn: () => void }) {
  const { t } = useTranslation();
  const format = useFormat();
  const localized = useLocalized();
  const startsIn = useStartsIn();
  const title = localized(event.title);
  const status = event.myCheckInStatus;

  return (
    <motion.article whileHover={{ y: -4 }} transition={springs.soft} style={{ height: '100%' }}>
      <Panel padding="4" gap="3.5" h="full">
        <Flex gap="3.5" align="flex-start">
          {/* artwork with the reward pinned to it */}
          <Box position="relative" flexShrink={0} pb="2.5">
            <SpriteTile sprite={eventCalendar} scale={2} size={60} />
            <Badge position="absolute" bottom="0" left="50%" transform="translateX(-50%)" bg="bg.panel" color="fg" borderWidth="2px" borderColor="border.emphasized" size="sm" gap="1" pl="0.5" pr="2" fontWeight="black" whiteSpace="nowrap">
              <Coin size={16} />
              <span>
                {format.signed(event.points)}
                <VisuallyHidden> {t('app.pointsUnit')}</VisuallyHidden>
              </span>
            </Badge>
          </Box>
          <Box minW="0" flex="1">
            <Text as="h4" fontWeight="extrabold" fontSize="md" lineHeight="1.3">
              {title}
            </Text>
            <Flex mt="1.5" direction="column" gap="1" color="fg.muted" fontSize="sm" fontWeight="medium">
              <Flex align="flex-start" gap="1.5">
                <Clock size={14} strokeWidth={2.5} aria-hidden style={{ flexShrink: 0, marginTop: 3 }} />
                <span>{format.dateRange(event.startsAt, event.endsAt)}</span>
              </Flex>
              {event.location && (
                <Flex align="flex-start" gap="1.5">
                  <MapPin size={14} strokeWidth={2.5} aria-hidden style={{ flexShrink: 0, marginTop: 3 }} />
                  <span>{event.location}</span>
                </Flex>
              )}
            </Flex>
          </Box>
        </Flex>

        {/* my check-in: one slot */}
        <Flex align="center" justify="flex-end" gap="2" wrap="wrap" mt="auto" minH="9">
          {status === 'pending' ? (
            <Badge colorPalette="accent" variant="subtle" size="lg" px="3" py="1" whiteSpace="normal" textAlign="center" role="status">
              <motion.span style={{ display: 'inline-flex' }} animate={{ rotate: [0, 0, 180, 180] }} transition={{ duration: 2.4, times: [0, 0.6, 0.8, 1], repeat: Infinity, ease: 'easeInOut' }}>
                <Hourglass size={14} strokeWidth={2.5} aria-hidden />
              </motion.span>
              {t('dashboard.waitingApproval')}
            </Badge>
          ) : status === 'approved' ? (
            <Badge colorPalette="green" variant="subtle" size="lg" px="3" py="1">
              <Check size={14} strokeWidth={3} aria-hidden />
              {t('dashboard.checkedIn')}
            </Badge>
          ) : status !== null ? (
            <CheckInStatusBadge value={status} size="md" />
          ) : upcoming ? (
            <Badge colorPalette="gray" variant="subtle" size="lg" px="3" py="1">
              <CalendarClock size={14} strokeWidth={2.5} aria-hidden />
              {startsIn(event.startsAt, now)}
            </Badge>
          ) : (
            <Button size="sm" onClick={onCheckIn} aria-label={`${t('checkin.button')}: ${title}`}>
              <ScanQrCode strokeWidth={2.5} aria-hidden />
              {t('checkin.button')}
            </Button>
          )}
        </Flex>
      </Panel>
    </motion.article>
  );
}

interface HomeEventsProps {
  events: EventSummary[] | undefined;
  isPending: boolean;
  /** The previous result is still shown while the next search loads. */
  stale: boolean;
  error: unknown;
  onRetry: () => void;
  /** The search box (`useUrlSearch`): `q` is what the list on screen was asked for. */
  search: { text: string; onChange: (value: string) => void; q: string };
  /** Opens the QR scanner. */
  onCheckIn: () => void;
}

/**
 * Events in two groups. The API only lists events whose check-in is open; one whose start is still ahead is
 * shown as "Upcoming", the rest as "Open now". Each card carries my check-in state. The search box asks the
 * server (`/api/events?q=`): title, description and location, every word, any language.
 */
export function HomeEvents({ events, isPending, stale, error, onRetry, search, onCheckIn }: HomeEventsProps) {
  const { t } = useTranslation();
  const now = useNow();
  const isUpcoming = (event: EventSummary) => new Date(event.startsAt).getTime() > now;
  const groups = [
    { key: 'open' as const, label: t('dashboard.openNow'), items: (events ?? []).filter((event) => !isUpcoming(event)) },
    { key: 'upcoming' as const, label: t('dashboard.upcoming'), items: (events ?? []).filter(isUpcoming) },
  ].filter((group) => group.items.length > 0);

  return (
    <Flex asChild direction="column" gap="4" minW="0">
      <motion.section variants={itemVariants} aria-label={t('dashboard.events')}>
        <SectionTitle icon={Ticket} title={t('dashboard.events')} />
        <SearchField maxW={{ md: '420px' }} label={t('dashboard.searchEvents')} value={search.text} onChange={search.onChange} />
        {isPending && <LoadingBlock />}
        {Boolean(error) && !events && <ErrorBlock error={error} onRetry={onRetry} />}
        {events?.length === 0 && (search.q !== '' ? <NoMatch q={search.q} onClear={() => search.onChange('')} /> : <EmptyState message={t('dashboard.noEvents')} sprite={ticket} />)}
        {groups.map((group) => (
          <Flex key={group.key} direction="column" gap="3" opacity={stale ? 0.55 : 1} transition="opacity 160ms">
            <Flex align="center" gap="2">
              {group.key === 'open' ? (
                <Status.Root colorPalette="green" size="md">
                  <Status.Indicator
                    data-ambient=""
                    position="relative"
                    _before={{ content: '""', position: 'absolute', inset: 0, borderRadius: 'full', bg: 'colorPalette.solid', animation: 'phPing 1.8s ease-out infinite' }}
                  />
                </Status.Root>
              ) : (
                <Box color="fg.muted" display="inline-flex">
                  <CalendarClock size={16} strokeWidth={2.5} aria-hidden />
                </Box>
              )}
              <Text as="h3" fontSize="sm" fontWeight="extrabold" letterSpacing="0.04em" textTransform="uppercase" color="fg.muted" textShadow="0 0 2px {colors.bg}, 0 0 6px {colors.bg}">
                {group.label}
              </Text>
            </Flex>
            <Stagger>
              <Grid templateColumns={{ base: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))' }} gap="4">
                {group.items.map((event) => (
                  <StaggerItem key={event.id}>
                    <EventCard event={event} upcoming={group.key === 'upcoming'} now={now} onCheckIn={onCheckIn} />
                  </StaggerItem>
                ))}
              </Grid>
            </Stagger>
          </Flex>
        ))}
      </motion.section>
    </Flex>
  );
}
