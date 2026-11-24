import { Avatar, Badge, Box, Button, Center, Flex, Grid, Heading, Progress, Text } from '@chakra-ui/react';
import { ArrowDownLeft, ArrowUpRight, CalendarClock, Gift as GiftIcon, History, MapPin, Plug, SlidersHorizontal, Ticket, TimerOff, Trophy, Undo2, type LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useEvents } from '../api/events';
import { useGifts } from '../api/gifts';
import { useMyPoints } from '../api/me';
import type { EventSummary, Gift, Transaction, TransactionType } from '../api/types';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { CheckInStatusBadge } from '../components/badges';
import { GiftThumb } from '../components/GiftGallery';
import { Page, Stagger, StaggerItem } from '../components/Page';
import { EmptyState, ErrorBlock, LoadingBlock, Pager } from '../components/states';
import { Points, SectionTitle, SpriteTile } from '../components/ui/bits';
import { HeroPanel } from '../components/ui/HeroPanel';
import { LevelRing } from '../components/ui/LevelRing';
import { Panel } from '../components/ui/Panel';
import { ThemeSprite } from '../components/ui/ThemeSprite';
import { useFormat, useLocalized } from '../i18n/hooks';
import { itemVariants, springs } from '../lib/motion';
import { useSession } from '../lib/session';
import { initials } from '../lib/text';
import { eventCalendar, ticket } from '../themes/sprites/ui';

const PAGE_SIZE = 8;
/** Lifetime points per level. Purely presentational: the server knows nothing about levels. */
const POINTS_PER_LEVEL = 500;

const TX_ICONS: Record<TransactionType, LucideIcon> = {
  eventAward: Ticket,
  redemption: GiftIcon,
  adjustment: SlidersHorizontal,
  reversal: Undo2,
  expiry: TimerOff,
  externalCredit: Plug,
  externalDebit: Plug,
};

/** The next thing worth saving for: the cheapest gift in stock that the balance does not cover yet. */
function nextGoal(gifts: Gift[] | undefined, balance: number): Gift | null {
  const ahead = (gifts ?? []).filter((gift) => gift.stock > 0 && gift.pointCost > balance);
  return ahead.reduce<Gift | null>((best, gift) => (best === null || gift.pointCost < best.pointCost ? gift : best), null);
}

function LifetimeStat({ label, value }: { label: string; value: number | undefined }) {
  return (
    <Box bg="rgba(0, 0, 0, 0.22)" borderRadius="l2" px="4" py="3" minW="0">
      <Text fontSize="xs" fontWeight="bold" lineHeight="1.3">
        {label}
      </Text>
      <Text fontFamily="heading" fontSize="2xl" fontWeight="extrabold" lineHeight="1.2" letterSpacing="-0.02em">
        {value === undefined ? '–' : <AnimatedNumber value={value} />}
      </Text>
    </Box>
  );
}

function BalanceHero({ balance, earned, spent, gifts }: { balance: number; earned: number | undefined; spent: number | undefined; gifts: Gift[] | undefined }) {
  const { t } = useTranslation();
  const me = useSession();
  const format = useFormat();
  const localized = useLocalized();
  const goal = nextGoal(gifts, balance);
  const percent = goal ? (balance / goal.pointCost) * 100 : gifts && gifts.length > 0 ? 100 : 0;
  const level = Math.floor((earned ?? 0) / POINTS_PER_LEVEL) + 1;

  return (
    <motion.section variants={itemVariants} aria-label={t('dashboard.balance')}>
      <HeroPanel>
        {/* One column on phones; ring beside the greeting from lg; the next-reward tray joins the row from xl.
            (The sidebar takes 240 px from md, so the content is narrower than the viewport suggests.) */}
        <Grid
          templateColumns={{ base: 'minmax(0, 1fr)', lg: 'auto minmax(0, 1fr)', xl: 'auto minmax(0, 1fr) minmax(260px, 320px)' }}
          templateAreas={{ base: '"greet" "ring" "stats" "next"', lg: '"ring greet" "next next"', xl: '"ring greet next"' }}
          gap={{ base: '6', lg: '8' }}
          alignItems="center"
        >
          {/* level ring */}
          <Center gridArea="ring" py="2">
            <LevelRing
              percent={percent}
              label={t('dashboard.goalProgress')}
              top={goal ? <Box animation="phFloat 3.2s ease-in-out infinite" data-ambient=""><GiftThumb images={goal.images} /></Box> : undefined}
              bottom={
                <Badge colorPalette="accent" variant="solid" size="lg" px="3" fontSize="sm" fontWeight="black" boxShadow="0 3px 0 0 {colors.accent.depth}" whiteSpace="nowrap">
                  <Trophy size={14} strokeWidth={2.8} aria-hidden />
                  {t('dashboard.level', { level: format.number(level) })}
                </Badge>
              }
            >
              <Text fontSize="xs" fontWeight="bold" letterSpacing="0.06em" textTransform="uppercase">
                {t('dashboard.balance')}
              </Text>
              <Text fontFamily="heading" fontSize="5xl" fontWeight="black" lineHeight="1.05" letterSpacing="-0.03em">
                <AnimatedNumber value={balance} />
              </Text>
              <Text fontSize="sm" fontWeight="bold">
                {t('app.points')}
              </Text>
            </LevelRing>
          </Center>

          {/* greeting + lifetime totals */}
          <Flex gridArea="greet" direction="column" gap={{ base: '4', lg: '5' }} minW="0">
            <Flex align="center" gap="3" minW="0">
              <Avatar.Root size="lg" colorPalette="accent" variant="solid" flexShrink={0} boxShadow="0 0 0 3px rgba(255, 255, 255, 0.35)">
                <Avatar.Fallback fontWeight="black">{initials(me.displayName)}</Avatar.Fallback>
              </Avatar.Root>
              <Box minW="0" flex="1">
                <Heading as="h1" fontSize={{ base: 'xl', md: '2xl' }} fontWeight="extrabold" lineHeight="1.25" letterSpacing="-0.01em">
                  {t('dashboard.greeting', { name: me.displayName })}
                </Heading>
                <Text fontSize="sm" fontWeight="semibold" lineHeight="1.4" mt="0.5">
                  {me.department ?? t('dashboard.subtitle')}
                </Text>
              </Box>
              {/* The theme's sprite sits in the layout flow, so it can never end up behind text. */}
              <ThemeSprite scale={3} bob />
            </Flex>
            <Grid templateColumns="1fr 1fr" gap="3" display={{ base: 'none', lg: 'grid' }}>
              <LifetimeStat label={t('dashboard.lifetimeEarned')} value={earned} />
              <LifetimeStat label={t('dashboard.lifetimeSpent')} value={spent} />
            </Grid>
          </Flex>

          {/* phones: the totals sit under the ring */}
          <Grid gridArea="stats" templateColumns="1fr 1fr" gap="3" display={{ base: 'grid', lg: 'none' }}>
            <LifetimeStat label={t('dashboard.lifetimeEarned')} value={earned} />
            <LifetimeStat label={t('dashboard.lifetimeSpent')} value={spent} />
          </Grid>

          {/* next reward */}
          <Flex gridArea="next" direction="column" gap="3" bg="rgba(0, 0, 0, 0.28)" borderRadius="l3" p={{ base: '4', lg: '5' }}>
            {goal ? (
              <>
                <Text fontSize="md" fontWeight="bold" lineHeight="1.4">
                  {t('dashboard.nextGoal', { points: format.number(goal.pointCost - balance), gift: localized(goal.name) })}
                </Text>
                <Progress.Root value={Math.min(100, percent)} size="md" colorPalette="accent" aria-label={t('dashboard.goalProgress')}>
                  <Progress.Track borderRadius="full" bg="rgba(255, 255, 255, 0.18)">
                    <Progress.Range borderRadius="full" css={{ transition: 'width 900ms cubic-bezier(0.3, 1.2, 0.5, 1)' }} />
                  </Progress.Track>
                </Progress.Root>
              </>
            ) : (
              <Text fontSize="md" fontWeight="bold" lineHeight="1.4">
                {gifts && gifts.length > 0 ? t('dashboard.allAffordable') : t('dashboard.subtitle')}
              </Text>
            )}
            <Button asChild colorPalette="accent" size="xl" w="full" fontWeight="black" borderRadius="l3">
              <Link to="/gifts">
                <GiftIcon strokeWidth={2.5} aria-hidden />
                {t('dashboard.browseGifts')}
              </Link>
            </Button>
          </Flex>
        </Grid>
      </HeroPanel>
    </motion.section>
  );
}

function EventCard({ event }: { event: EventSummary }) {
  const format = useFormat();
  const localized = useLocalized();
  return (
    <Panel asChild padding="4" gap="3" h="full">
      <motion.article whileHover={{ y: -4 }} transition={springs.soft}>
        <Flex gap="3.5" align="flex-start">
          <SpriteTile sprite={eventCalendar} scale={2} size={56} />
          <Box minW="0" flex="1">
            <Text as="h3" fontWeight="extrabold" fontSize="md" lineHeight="1.3">
              {localized(event.title)}
            </Text>
            <Flex mt="1.5" direction="column" gap="1" color="fg.muted" fontSize="sm" fontWeight="medium">
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
        </Flex>
        <Flex align="center" justify="space-between" gap="2" wrap="wrap" mt="auto">
          <Points value={event.points} signed />
          <CheckInStatusBadge value={event.myCheckInStatus} size="md" />
        </Flex>
      </motion.article>
    </Panel>
  );
}

function TransactionRow({ tx }: { tx: Transaction }) {
  const { t } = useTranslation();
  const format = useFormat();
  const localized = useLocalized();
  const typeLabel = t(`txType.${tx.type}`);
  const title = tx.eventTitle ? localized(tx.eventTitle) : (tx.reason ?? typeLabel);
  const gain = tx.amount >= 0;
  const Icon = TX_ICONS[tx.type];
  return (
    <Flex as="li" align="center" gap="3" px="2" py="2.5">
      <Center flexShrink={0} boxSize="10" borderRadius="l2" bg={gain ? 'brand.subtle' : 'bg.muted'} color={gain ? 'brand.fg' : 'fg.muted'}>
        <Icon size={18} strokeWidth={2.4} aria-hidden />
      </Center>
      <Box flex="1" minW="0">
        <Text fontWeight="bold" fontSize="sm" lineHeight="1.35" truncate>
          {title}
        </Text>
        <Text color="fg.muted" fontSize="xs" fontWeight="medium" lineHeight="1.4">
          {title === typeLabel ? '' : `${typeLabel} · `}
          {format.dateTime(tx.createdAt)}
          {tx.apiClientName ? ` · ${tx.apiClientName}` : ''}
        </Text>
      </Box>
      <Flex align="center" gap="1" flexShrink={0} color={gain ? 'gain' : 'loss'} fontWeight="black" fontSize="md" fontVariantNumeric="tabular-nums">
        {gain ? <ArrowUpRight size={15} strokeWidth={3} aria-hidden /> : <ArrowDownLeft size={15} strokeWidth={3} aria-hidden />}
        {format.signed(tx.amount)}
      </Flex>
    </Flex>
  );
}

export function DashboardPage() {
  const { t } = useTranslation();
  const me = useSession();
  const [page, setPage] = useState(1);
  const points = useMyPoints(page, PAGE_SIZE);
  const events = useEvents();
  const gifts = useGifts();

  return (
    <Page>
      <BalanceHero balance={points.data?.balance ?? me.balance} earned={points.data?.lifetimeEarned} spent={points.data?.lifetimeSpent} gifts={gifts.data} />

      <Grid templateColumns={{ base: 'minmax(0, 1fr)', lg: 'minmax(0, 1fr) minmax(0, 1fr)' }} gap={{ base: '8', lg: '8' }} alignItems="start">
        <Flex asChild direction="column" gap="4" minW="0">
          <motion.section variants={itemVariants}>
            <SectionTitle icon={Ticket} title={t('dashboard.openEvents')} />
            {events.isPending && <LoadingBlock />}
            {events.error && <ErrorBlock error={events.error} onRetry={() => void events.refetch()} />}
            {events.data?.length === 0 && <EmptyState message={t('dashboard.noEvents')} sprite={ticket} />}
            {events.data && events.data.length > 0 && (
              <Stagger>
                <Flex direction="column" gap="4">
                  {events.data.map((event) => (
                    <StaggerItem key={event.id}>
                      <EventCard event={event} />
                    </StaggerItem>
                  ))}
                </Flex>
              </Stagger>
            )}
          </motion.section>
        </Flex>

        <Flex asChild direction="column" gap="4" minW="0">
          <motion.section variants={itemVariants}>
            <SectionTitle icon={History} title={t('dashboard.history')} />
            {points.isPending && <LoadingBlock />}
            {points.error && !points.data && <ErrorBlock error={points.error} onRetry={() => void points.refetch()} />}
            {points.data && points.data.transactions.total === 0 && <EmptyState message={t('dashboard.noTransactions')} />}
            {points.data && points.data.transactions.total > 0 && (
              <Panel padding="2" gap="1">
                <Box as="ul" listStyleType="none" opacity={points.isPlaceholderData ? 0.55 : 1} transition="opacity 160ms">
                  {points.data.transactions.items.map((tx) => (
                    <TransactionRow key={tx.id} tx={tx} />
                  ))}
                </Box>
                <Box px="2" pb="2" pt="1">
                  <Pager page={page} pageSize={PAGE_SIZE} total={points.data.transactions.total} onChange={setPage} />
                </Box>
              </Panel>
            )}
          </motion.section>
        </Flex>
      </Grid>
    </Page>
  );
}
