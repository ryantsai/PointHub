import { Badge, Box, Button, Card, Flex, Grid, Progress, Status, Text, VisuallyHidden } from '@chakra-ui/react';
import { CalendarClock, Check, Clock, Hourglass, MapPin, ScanQrCode, Ticket, Users } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { pick, type EventItem, type Locale } from '@shared/data';
import { formatDateTime, formatNumber, t } from '@shared/strings';
import { Burst } from '../../components/Burst';
import { Coin, EmojiTile, SectionTitle } from '../../components/bits';
import { pop, rise, settle, springs, staggerParent } from '../../motion';

type Props = { locale: Locale; events: EventItem[]; onCheckIn: (id: number) => void };

const endTime = (locale: Locale, iso: string) =>
  new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

export function Events({ locale, events, onCheckIn }: Props) {
  const groups = [
    { key: 'open' as const, label: t(locale, 'openNow'), items: events.filter((e) => e.status === 'open') },
    { key: 'upcoming' as const, label: t(locale, 'upcoming'), items: events.filter((e) => e.status === 'upcoming') },
  ];

  return (
    <Flex asChild direction="column" gap="4">
      <motion.section variants={rise} aria-label={t(locale, 'events')}>
        <SectionTitle icon={Ticket} title={t(locale, 'events')} />
        {groups.map((group) => (
          <Flex key={group.key} direction="column" gap="3">
            <Flex align="center" gap="2">
              {group.key === 'open' ? (
                <Status.Root colorPalette="green" size="md">
                  <Status.Indicator
                    position="relative"
                    _before={{ content: '""', position: 'absolute', inset: 0, borderRadius: 'full', bg: 'colorPalette.solid', animation: 'phPing 1.8s ease-out infinite' }}
                  />
                </Status.Root>
              ) : (
                <Box color="fg.muted" display="inline-flex">
                  <CalendarClock size={16} strokeWidth={2.5} aria-hidden />
                </Box>
              )}
              <Text as="h3" fontSize="sm" fontWeight="extrabold" letterSpacing="0.04em" textTransform="uppercase" color="fg.muted">
                {group.label}
              </Text>
            </Flex>
            <Grid asChild templateColumns={{ base: '1fr', md: 'repeat(2, minmax(0, 1fr))' }} gap="4">
              <motion.div variants={staggerParent} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-40px' }}>
                {group.items.map((event) => (
                  <EventCard key={event.id} event={event} locale={locale} onCheckIn={onCheckIn} />
                ))}
              </motion.div>
            </Grid>
          </Flex>
        ))}
      </motion.section>
    </Flex>
  );
}

function EventCard({ event, locale, onCheckIn }: { event: EventItem; locale: Locale; onCheckIn: (id: number) => void }) {
  const [bursts, setBursts] = useState(0);
  const open = event.status === 'open';
  const fill = event.capacity ? Math.min(100, (event.attendees / event.capacity) * 100) : null;

  return (
    <Card.Root asChild variant="outline">
      <motion.article variants={settle} whileHover={{ y: -4 }} transition={springs.soft}>
        <Card.Body p="4" gap="3.5">
          <Flex gap="3.5" align="flex-start">
            <Box position="relative" flexShrink={0} pb="2.5">
              <EmojiTile emoji={event.emoji} size={60} />
              <Badge
                position="absolute"
                bottom="0"
                left="50%"
                transform="translateX(-50%)"
                bg="bg.panel"
                color="fg"
                borderWidth="2px"
                borderColor="border.emphasized"
                size="sm"
                gap="1"
                pl="0.5"
                pr="2"
                fontWeight="black"
              >
                <Coin size={16} />
                <span>
                  +{formatNumber(locale, event.points)}
                  <VisuallyHidden> {t(locale, 'pts')}</VisuallyHidden>
                </span>
              </Badge>
            </Box>
            <Box minW="0" flex="1">
              <Text as="h4" fontWeight="extrabold" fontSize="md" lineHeight="1.3">
                {pick(event.title, locale)}
              </Text>
              <Flex mt="1.5" direction="column" gap="1" color="fg.muted" fontSize="sm" fontWeight="medium">
                <Flex align="center" gap="1.5">
                  <Clock size={14} strokeWidth={2.5} aria-hidden style={{ flexShrink: 0 }} />
                  <span>
                    {formatDateTime(locale, event.startsAt)} – {endTime(locale, event.endsAt)}
                  </span>
                </Flex>
                <Flex align="center" gap="1.5">
                  <MapPin size={14} strokeWidth={2.5} aria-hidden style={{ flexShrink: 0 }} />
                  <span>{pick(event.location, locale)}</span>
                </Flex>
              </Flex>
            </Box>
          </Flex>

          <Flex align="center" gap="3" justify="space-between" wrap="wrap" mt="auto">
            <Flex align="center" gap="2" minW="0" flex="1 1 120px" color="fg.muted" fontSize="sm" fontWeight="bold">
              <Users size={14} strokeWidth={2.5} aria-hidden style={{ flexShrink: 0 }} />
              {fill === null ? (
                <span>{t(locale, 'attendees', { count: formatNumber(locale, event.attendees) })}</span>
              ) : (
                <>
                  <Progress.Root value={fill} size="sm" flex="1" minW="48px" maxW="120px" aria-label={t(locale, 'capacity', { count: event.attendees, max: event.capacity ?? 0 })}>
                    <Progress.Track borderRadius="full" bg="bg.muted">
                      <Progress.Range borderRadius="full" css={{ transition: 'width 600ms cubic-bezier(0.3, 1.3, 0.5, 1)' }} />
                    </Progress.Track>
                  </Progress.Root>
                  <Box as="span" whiteSpace="nowrap" fontVariantNumeric="tabular-nums">
                    {t(locale, 'capacity', { count: formatNumber(locale, event.attendees), max: formatNumber(locale, event.capacity ?? 0) })}
                  </Box>
                </>
              )}
            </Flex>

            <Box position="relative" minH="9" display="flex" alignItems="center" ml="auto">
              <AnimatePresence mode="popLayout" initial={false}>
                {open && event.myCheckIn === 'none' && (
                  <motion.div key="cta" variants={pop} initial="hidden" animate="show" exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.12 } }}>
                    <Button
                      size="sm"
                      onClick={() => {
                        setBursts((v) => v + 1);
                        onCheckIn(event.id);
                      }}
                    >
                      <ScanQrCode strokeWidth={2.5} aria-hidden />
                      {t(locale, 'checkIn')}
                    </Button>
                  </motion.div>
                )}
                {event.myCheckIn === 'pending' && (
                  <motion.div key="pending" variants={pop} initial="hidden" animate="show">
                    <Badge colorPalette="accent" variant="subtle" size="lg" px="3" py="1" whiteSpace="normal" textAlign="center" role="status">
                      <motion.span
                        style={{ display: 'inline-flex' }}
                        animate={{ rotate: [0, 0, 180, 180] }}
                        transition={{ duration: 2.4, times: [0, 0.6, 0.8, 1], repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <Hourglass size={14} strokeWidth={2.5} aria-hidden />
                      </motion.span>
                      {t(locale, 'waitingApproval')}
                    </Badge>
                  </motion.div>
                )}
                {event.myCheckIn === 'approved' && (
                  <motion.div key="approved" variants={pop} initial="hidden" animate="show">
                    <Badge colorPalette="green" variant="subtle" size="lg" px="3" py="1">
                      <Check size={14} strokeWidth={3} aria-hidden />
                      {t(locale, 'checkedIn')}
                    </Badge>
                  </motion.div>
                )}
              </AnimatePresence>
              <Burst trigger={bursts} count={14} radius={70} />
            </Box>
          </Flex>
        </Card.Body>
      </motion.article>
    </Card.Root>
  );
}
