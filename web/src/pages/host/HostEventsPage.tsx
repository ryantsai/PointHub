import { Box, Button, Flex, Text } from '@chakra-ui/react';
import { CalendarClock, ChevronRight, MapPin, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useHostEvents } from '../../api/host';
import type { EventSummary } from '../../api/types';
import { EventStatusBadge } from '../../components/badges';
import { Page, Stagger, StaggerItem } from '../../components/Page';
import { EmptyState, ErrorBlock, LoadingBlock } from '../../components/states';
import { Points, SpriteTile } from '../../components/ui/bits';
import { Modal } from '../../components/ui/Modal';
import { Panel } from '../../components/ui/Panel';
import { useFormat, useLocalized } from '../../i18n/hooks';
import { springs } from '../../lib/motion';
import { eventCalendar, ticket } from '../../themes/sprites/ui';
import { EventForm } from './EventForm';

function EventRow({ event }: { event: EventSummary }) {
  const format = useFormat();
  const localized = useLocalized();
  // Finished and cancelled events step back so the ones that still need work stand out.
  const past = event.status === 'closed' || event.status === 'cancelled';
  return (
    <motion.div whileHover={{ y: -3 }} whileTap={{ y: 1 }} transition={springs.soft}>
      <Box asChild display="block" borderRadius="l3" focusVisibleRing="outside" focusRingWidth="3px" focusRingOffset="2px">
        <Link to={`/host/events/${event.id}`}>
          <Panel padding={{ base: '3.5', md: '4' }} transition="border-color 160ms, box-shadow 160ms" _hover={{ borderColor: 'border.emphasized', boxShadow: '0 4px 0 0 {colors.border.emphasized}' }}>
            <Flex align="center" gap={{ base: '3', md: '4' }}>
              <SpriteTile sprite={eventCalendar} scale={2} size={52} opacity={past ? 0.6 : 1} display={{ base: 'none', sm: 'flex' }} />
              <Box flex="1" minW="0">
                <Flex align="center" columnGap="2.5" rowGap="1" wrap="wrap">
                  <Text as="h2" fontWeight="extrabold" fontSize="md" lineHeight="1.3" minW="0">
                    {localized(event.title)}
                  </Text>
                  <EventStatusBadge value={event.status} size="sm" />
                </Flex>
                <Flex mt="1.5" columnGap="4" rowGap="1" wrap="wrap" color="fg.muted" fontSize="sm" fontWeight="medium">
                  <Flex align="flex-start" gap="1.5">
                    <CalendarClock size={14} strokeWidth={2.5} aria-hidden style={{ flexShrink: 0, marginTop: 3 }} />
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
              <Points value={event.points} flexShrink={0} />
              <Box color="fg.muted" flexShrink={0} display={{ base: 'none', sm: 'block' }}>
                <ChevronRight size={18} strokeWidth={2.5} aria-hidden />
              </Box>
            </Flex>
          </Panel>
        </Link>
      </Box>
    </motion.div>
  );
}

/** Every event this event admin runs, in all statuses. `?new=1` opens the create form (deep links, screenshots). */
export function HostEventsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const events = useHostEvents();
  const [params, setParams] = useSearchParams();
  const creating = params.get('new') === '1';

  const setCreating = (open: boolean) =>
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (open) next.set('new', '1');
        else next.delete('new');
        return next;
      },
      { replace: true },
    );

  const newEventButton = (
    <Button onClick={() => setCreating(true)}>
      <Plus strokeWidth={2.8} aria-hidden />
      {t('host.newEvent')}
    </Button>
  );

  return (
    <Page title={t('host.eventsTitle')} subtitle={t('host.eventsSubtitle')} actions={newEventButton}>
      {events.isPending && <LoadingBlock />}
      {events.error && <ErrorBlock error={events.error} onRetry={() => void events.refetch()} />}
      {events.data?.length === 0 && (
        <EmptyState message={t('host.noEvents')} sprite={ticket}>
          {newEventButton}
        </EmptyState>
      )}
      {events.data && events.data.length > 0 && (
        <Stagger>
          <Flex direction="column" gap="3.5">
            {events.data.map((event) => (
              <StaggerItem key={event.id}>
                <EventRow event={event} />
              </StaggerItem>
            ))}
          </Flex>
        </Stagger>
      )}

      <Modal opened={creating} onClose={() => setCreating(false)} title={t('host.newEvent')} size="lg">
        <EventForm event={null} onCancel={() => setCreating(false)} onSaved={(event) => void navigate(`/host/events/${event.id}`)} />
      </Modal>
    </Page>
  );
}
