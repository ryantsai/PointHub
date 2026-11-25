import { Badge, Box, Button, Flex, Grid, Text } from '@chakra-ui/react';
import { ChevronRight, Gift as GiftIcon } from 'lucide-react';
import { AnimatePresence, motion, useAnimate } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';
import { useEvents } from '../../api/events';
import { useGifts } from '../../api/gifts';
import { useMyPoints } from '../../api/me';
import { AnimatedNumber } from '../../components/AnimatedNumber';
import { CheckInScanner } from '../../components/CheckInScanner';
import { GiftCatalog } from '../../components/GiftCatalog';
import { Page } from '../../components/Page';
import { Coin, SectionTitle } from '../../components/ui/bits';
import { useFormat } from '../../i18n/hooks';
import { useDisclosure } from '../../lib/hooks';
import { TAB_BAR_HEIGHT } from '../../lib/layout';
import { itemVariants, springs } from '../../lib/motion';
import { useSession } from '../../lib/session';
import { useUrlSearch } from '../../lib/urlFilters';
import { HomeActivity } from './HomeActivity';
import { HomeEvents } from './HomeEvents';
import { HomeHero } from './HomeHero';

/** Rows in the activity panel. */
const ACTIVITY_PAGE_SIZE = 7;
/** Gifts shown on the home page; the rest are one tap away on `/gifts`. */
const HOME_GIFTS = 6;
const GIFT_SEARCH_PARAM = 'gifts';

/** The balance, kept on screen once the hero has scrolled away. It takes a hit when the balance changes. */
function BalancePill({ balance }: { balance: number }) {
  const { t } = useTranslation();
  const [scope, animateScope] = useAnimate<HTMLDivElement>();
  const shown = useRef(balance);
  useEffect(() => {
    if (shown.current === balance) return;
    shown.current = balance;
    void animateScope(scope.current, { scale: [1, 1.16, 1] }, { duration: 0.4, ease: [0.3, 1.4, 0.5, 1] });
  }, [balance, animateScope, scope]);

  return (
    <div ref={scope}>
      <Flex
        role="status"
        aria-label={t('dashboard.balance')}
        align="center"
        gap="2"
        pl="2"
        pr="4"
        py="2"
        borderRadius="full"
        bg="brand.solid"
        color="brand.contrast"
        boxShadow="0 4px 0 0 {colors.brand.depth}, 0 10px 24px -6px rgba(0, 0, 0, 0.35)"
        pointerEvents="auto"
      >
        <Coin size={28} />
        <Text as="span" fontFamily="heading" fontWeight="black" fontSize="lg" lineHeight="1">
          <AnimatedNumber value={balance} from={balance} />
        </Text>
        <Text as="span" fontWeight="bold" fontSize="sm" lineHeight="1">
          {t('app.pointsUnit')}
        </Text>
      </Flex>
    </div>
  );
}

/**
 * The employee home, one page: hero (balance, level, check-in), events, gifts, and recent activity beside
 * them. Composed like the "Arcade" design's employee view.
 */
export function HomePage() {
  const { t } = useTranslation();
  const me = useSession();
  const format = useFormat();
  // Three searches on one page, each under its own key in the URL: /?events=…&gifts=…&history=…
  const eventSearch = useUrlSearch('events');
  // The gift search box lives in <GiftCatalog>; here its term is only read, for the "See all" link.
  const [params] = useSearchParams();
  const giftQuery = (params.get(GIFT_SEARCH_PARAM) ?? '').trim();
  const historySearch = useUrlSearch('history');
  const [page, setPage] = useState(1);
  // A new history search starts on its first page.
  const [searchedFor, setSearchedFor] = useState(historySearch.q);
  if (searchedFor !== historySearch.q) {
    setSearchedFor(historySearch.q);
    setPage(1);
  }
  // The totals in this answer are never filtered, so the hero can use the same call as the history.
  const points = useMyPoints(historySearch.q, page, ACTIVITY_PAGE_SIZE);
  const events = useEvents(eventSearch.q);
  // The whole catalogue, for the hero's "next gift"; the cards below run their own (searched) query.
  const gifts = useGifts();
  const [scanning, scanner] = useDisclosure(false);
  const balance = points.data?.balance ?? me.balance;

  // Once the hero scrolls away, the pill keeps the balance in view, so redeeming a gift further down the
  // page still shows the counter ticking.
  const heroRef = useRef<HTMLDivElement>(null);
  const [heroVisible, setHeroVisible] = useState(true);
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    const observer = new IntersectionObserver(([entry]) => setHeroVisible(entry?.isIntersecting ?? true), { rootMargin: '-80px 0px 0px 0px' });
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  return (
    <Page>
      <div ref={heroRef}>
        <HomeHero balance={balance} earned={points.data?.lifetimeEarned} spent={points.data?.lifetimeSpent} gifts={gifts.data} onCheckIn={scanner.open} />
      </div>

      <Grid templateColumns={{ base: 'minmax(0, 1fr)', lg: 'minmax(0, 1fr) 360px' }} gap="8" alignItems="start">
        <Flex direction="column" gap={{ base: '8', md: '10' }} minW="0">
          <HomeEvents events={events.data} isPending={events.isPending} stale={events.isPlaceholderData} error={events.error} onRetry={() => void events.refetch()} search={eventSearch} onCheckIn={scanner.open} />

          <Flex asChild direction="column" gap="4" minW="0">
            <motion.section variants={itemVariants} aria-label={t('nav.gifts')}>
              <SectionTitle icon={GiftIcon} title={t('nav.gifts')}>
                <Badge variant="subtle" size="lg" px="3" gap="1.5" fontWeight="black">
                  <Coin size={16} />
                  {format.number(balance)} {t('app.pointsUnit')}
                </Badge>
                <Button asChild variant="ghost" size="xs">
                  {/* "See all" keeps the search: the full catalogue opens on the same term. */}
                  <Link to={giftQuery === '' ? '/gifts' : `/gifts?q=${encodeURIComponent(giftQuery)}`}>
                    {t('dashboard.seeAll')}
                    <ChevronRight aria-hidden />
                  </Link>
                </Button>
              </SectionTitle>
              <GiftCatalog limit={HOME_GIFTS} searchParam={GIFT_SEARCH_PARAM} columns={{ base: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))' }} />
            </motion.section>
          </Flex>
        </Flex>

        <HomeActivity
          points={points.data}
          isPending={points.isPending}
          stale={points.isPlaceholderData}
          error={points.error}
          onRetry={() => void points.refetch()}
          page={page}
          pageSize={ACTIVITY_PAGE_SIZE}
          onPage={setPage}
          search={historySearch}
        />
      </Grid>

      <AnimatePresence>
        {!heroVisible && (
          <Box
            asChild
            position="fixed"
            insetX="0"
            // phones: clear of the tab bar
            bottom={{ base: `calc(${TAB_BAR_HEIGHT} + env(safe-area-inset-bottom) + 12px)`, md: '18px' }}
            display="flex"
            justifyContent="center"
            pointerEvents="none"
            zIndex="20"
          >
            <motion.div key="balance-pill" initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} transition={springs.bouncy}>
              <BalancePill balance={balance} />
            </motion.div>
          </Box>
        )}
      </AnimatePresence>

      <CheckInScanner opened={scanning} onClose={scanner.close} />
    </Page>
  );
}
