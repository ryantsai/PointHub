import { Box, Flex, Grid, Text } from '@chakra-ui/react';
import { AnimatePresence, motion, useAnimate } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import type { Locale } from '@shared/data';
import type { Season } from '@shared/seasons';
import { t } from '@shared/strings';
import { AnimatedNumber } from '../../components/AnimatedNumber';
import { Coin } from '../../components/bits';
import { springs, staggerParent } from '../../motion';
import type { Store } from '../../state/useStore';
import { Events } from './Events';
import { Gifts } from './Gifts';
import { Hero } from './Hero';
import { Activity, Leaderboard } from './Side';

export function EmployeeView({ locale, season, store }: { locale: Locale; season: Season; store: Store }) {
  const heroRef = useRef<HTMLDivElement>(null);
  const [heroVisible, setHeroVisible] = useState(true);

  // Once the hero scrolls away, a HUD pill keeps the balance on screen – so redeeming a gift further
  // down the page still shows the counter ticking.
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setHeroVisible(entry?.isIntersecting ?? true), { rootMargin: '-80px 0px 0px 0px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Box asChild maxW="1240px" mx="auto" px={{ base: '4', md: '6' }} pt={{ base: '4', md: '6' }} pb="24">
      <motion.div variants={staggerParent} initial="hidden" animate="show">
        <Hero ref={heroRef} locale={locale} season={season} balance={store.balance} earned={store.earned} spent={store.spent} gifts={store.gifts} />

        <Grid mt={{ base: '8', md: '10' }} templateColumns={{ base: 'minmax(0, 1fr)', lg: 'minmax(0, 1fr) 360px' }} gap={{ base: '8', lg: '8' }} alignItems="start">
          <Flex direction="column" gap={{ base: '8', md: '10' }} minW="0">
            <Events locale={locale} events={store.events} onCheckIn={store.checkIn} />
            <Gifts locale={locale} gifts={store.gifts} balance={store.balance} onRedeem={store.redeem} />
          </Flex>
          <Flex direction="column" gap={{ base: '8', md: '10' }} minW="0">
            <Leaderboard locale={locale} />
            <Activity locale={locale} activity={store.activity} />
          </Flex>
        </Grid>

        <AnimatePresence>
          {!heroVisible && (
            <motion.div
              key="hud"
              style={{ position: 'fixed', left: 0, right: 0, bottom: 18, display: 'flex', justifyContent: 'center', pointerEvents: 'none', zIndex: 20 }}
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={springs.bouncy}
            >
              <HudPill locale={locale} balance={store.balance} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </Box>
  );
}

function HudPill({ locale, balance }: { locale: Locale; balance: number }) {
  const [scope, animateScope] = useAnimate<HTMLDivElement>();
  const shown = useRef(balance);
  // Bump when the balance changes, like a coin counter taking a hit.
  useEffect(() => {
    if (shown.current === balance) return;
    shown.current = balance;
    animateScope(scope.current, { scale: [1, 1.16, 1] }, { duration: 0.4, ease: [0.3, 1.4, 0.5, 1] });
  }, [balance, animateScope, scope]);

  return (
    <div ref={scope}>
      <Flex
        role="status"
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
          <AnimatedNumber value={balance} locale={locale} from={balance} />
        </Text>
        <Text as="span" fontWeight="bold" fontSize="sm" lineHeight="1">
          {t(locale, 'pts')}
        </Text>
      </Flex>
    </div>
  );
}
