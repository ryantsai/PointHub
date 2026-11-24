import { AbsoluteCenter, Avatar, Badge, Box, Button, Center, Flex, Grid, Heading, ProgressCircle, Text } from '@chakra-ui/react';
import { Check, ScanQrCode, Trophy } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { forwardRef, useEffect, useRef, useState } from 'react';
import { me, pick, type Gift, type Locale } from '@shared/data';
import type { Season } from '@shared/seasons';
import { formatNumber, t } from '@shared/strings';
import { AnimatedNumber } from '../../components/AnimatedNumber';
import { Burst } from '../../components/Burst';
import { Particles } from '../../components/Particles';
import { initials } from '../../components/bits';
import { rise, springs } from '../../motion';

type Props = {
  locale: Locale;
  season: Season;
  balance: number;
  earned: number;
  spent: number;
  gifts: Gift[];
};

// Game level from lifetime points (every 500 earned). Shown as a number on a star badge only:
// the shared strings have no "Level" label, so it stays a wordless, decorative flourish.
const levelOf = (earned: number) => Math.floor(earned / 500) + 1;

export const Hero = forwardRef<HTMLDivElement, Props>(function Hero({ locale, season, balance, earned, spent, gifts }, ref) {
  const goal = me.nextRewardAt;
  const remaining = Math.max(0, goal - balance);
  const percent = Math.min(100, (balance / goal) * 100);
  const goalGift = gifts.find((g) => g.pointCost === goal);

  // Start the ring empty so it sweeps up to the balance on first load, like the counter does.
  const [ringValue, setRingValue] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setRingValue(percent));
    return () => cancelAnimationFrame(id);
  }, [percent]);

  // Hero check-in: no data change here, just the celebration.
  const [checked, setChecked] = useState(false);
  const [bursts, setBursts] = useState(0);
  const timer = useRef<number>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const celebrate = () => {
    setChecked(true);
    setBursts((v) => v + 1);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setChecked(false), 2400);
  };

  return (
    <Box
      ref={ref}
      asChild
      position="relative"
      borderRadius={{ base: '3xl', md: '4xl' }}
      color="white"
      p={{ base: '5', md: '7' }}
      bgImage="linear-gradient(140deg, {colors.hero.from} 0%, {colors.hero.via} 68%)"
      boxShadow="0 6px 0 0 {colors.brand.depth}"
    >
      <motion.section variants={rise} aria-label={t(locale, 'balance')}>
        {/* the third gradient stop is a glow only: it never sits behind text */}
        <Box aria-hidden position="absolute" inset="0" borderRadius="inherit" overflow="hidden" pointerEvents="none">
          <Box
            position="absolute"
            right="-90px"
            bottom="-120px"
            boxSize="300px"
            borderRadius="full"
            opacity="0.45"
            bgImage="radial-gradient(circle, {colors.hero.to} 0%, transparent 68%)"
          />
          <Box position="absolute" inset="0" opacity="0.12" bgImage="radial-gradient(white 1.2px, transparent 1.2px)" bgSize="18px 18px" />
        </Box>
        <Particles kind={season.particles} />

        <Grid
          position="relative"
          templateColumns={{ base: '1fr', lg: 'auto minmax(0, 1fr) minmax(280px, 340px)' }}
          gap={{ base: '5', lg: '8' }}
          alignItems="center"
        >
          {/* level ring */}
          <Center order={{ base: 1, lg: 0 }}>
            <Box position="relative" borderRadius="full" bg="rgba(0, 0, 0, 0.4)" p="2">
              <ProgressCircle.Root value={ringValue} colorPalette="accent" display="block">
                <ProgressCircle.Circle css={{ '--size': '208px', '--thickness': '16px' }} display="block">
                  <ProgressCircle.Track stroke="rgba(255, 255, 255, 0.16)" />
                  <ProgressCircle.Range
                    strokeLinecap="round"
                    css={{ transitionDuration: '1.1s', transitionTimingFunction: 'cubic-bezier(0.25, 1.25, 0.45, 1)' }}
                  />
                </ProgressCircle.Circle>
                <AbsoluteCenter flexDirection="column" textAlign="center">
                  <Text fontSize="xs" fontWeight="bold" letterSpacing="0.06em" textTransform="uppercase" color="white">
                    {t(locale, 'balance')}
                  </Text>
                  <Text fontFamily="heading" fontSize="5xl" fontWeight="black" lineHeight="1.05" letterSpacing="-0.03em">
                    <AnimatedNumber value={balance} locale={locale} />
                  </Text>
                  <Text fontSize="sm" fontWeight="bold" color="accent.solid">
                    {t(locale, 'points')}
                  </Text>
                </AbsoluteCenter>
              </ProgressCircle.Root>

              {/* the goal waiting at the top of the ring */}
              <Center
                aria-hidden
                position="absolute"
                top="-10px"
                left="50%"
                ml="-22px"
                boxSize="44px"
                borderRadius="full"
                bg="white"
                fontSize="22px"
                boxShadow="0 3px 0 0 rgba(0, 0, 0, 0.3)"
                animation="phFloat 3.2s ease-in-out infinite"
              >
                {goalGift?.emoji ?? '🎁'}
              </Center>
              {/* level badge */}
              <Badge
                aria-hidden
                position="absolute"
                bottom="-8px"
                left="50%"
                transform="translateX(-50%)"
                colorPalette="accent"
                variant="solid"
                size="lg"
                px="3"
                fontSize="sm"
                fontWeight="black"
                boxShadow="0 3px 0 0 {colors.accent.depth}"
              >
                <Trophy size={14} strokeWidth={2.8} />
                {formatNumber(locale, levelOf(earned))}
              </Badge>
            </Box>
          </Center>

          {/* greeting + lifetime stats */}
          <Flex direction="column" gap={{ base: '4', lg: '5' }} minW="0" order={{ base: 0, lg: 1 }}>
            <Flex align="center" gap="3" minW="0">
              <Avatar.Root size="lg" colorPalette="accent" variant="solid" flexShrink={0} boxShadow="0 0 0 3px rgba(255, 255, 255, 0.35)">
                <Avatar.Fallback fontWeight="black">{initials(pick(me.displayName, locale))}</Avatar.Fallback>
              </Avatar.Root>
              <Box minW="0">
                <Heading as="h1" fontSize={{ base: 'xl', md: '2xl' }} fontWeight="extrabold" lineHeight="1.25" letterSpacing="-0.01em">
                  {t(locale, 'greeting', { name: pick(me.displayName, locale) })}
                </Heading>
                <Flex mt="1.5" gap="2" wrap="wrap" align="center">
                  <Badge bg="rgba(0, 0, 0, 0.28)" color="white" size="md" px="2.5">
                    {pick(me.department, locale)}
                  </Badge>
                  <Badge colorPalette="accent" variant="solid" size="md" px="2.5">
                    <Trophy size={12} strokeWidth={2.8} aria-hidden />
                    {t(locale, 'rank', { rank: me.rank })}
                  </Badge>
                </Flex>
              </Box>
            </Flex>

            <Text fontSize={{ base: 'md', lg: 'lg' }} fontWeight="bold" lineHeight="1.4" display={{ base: 'none', lg: 'block' }}>
              {t(locale, 'nextReward', { count: formatNumber(locale, remaining) })}
            </Text>

            <Grid templateColumns="1fr 1fr" gap="3" display={{ base: 'none', lg: 'grid' }}>
              <LifetimeStat label={t(locale, 'lifetimeEarned')} value={earned} locale={locale} />
              <LifetimeStat label={t(locale, 'lifetimeSpent')} value={spent} locale={locale} />
            </Grid>
          </Flex>

          {/* mobile: reward line + stats sit under the ring */}
          <Flex direction="column" gap="4" order={2} display={{ base: 'flex', lg: 'none' }}>
            <Text fontSize="md" fontWeight="bold" lineHeight="1.4" textAlign="center">
              {t(locale, 'nextReward', { count: formatNumber(locale, remaining) })}
            </Text>
            <Grid templateColumns="1fr 1fr" gap="3">
              <LifetimeStat label={t(locale, 'lifetimeEarned')} value={earned} locale={locale} />
              <LifetimeStat label={t(locale, 'lifetimeSpent')} value={spent} locale={locale} />
            </Grid>
          </Flex>

          {/* check-in call to action */}
          <Flex direction="column" gap="3" order={3} bg="rgba(0, 0, 0, 0.28)" borderRadius="l3" p={{ base: '4', lg: '5' }}>
            <Box position="relative">
              <Button
                colorPalette="accent"
                size="2xl"
                w="full"
                fontSize="xl"
                fontWeight="black"
                borderRadius="l3"
                onClick={celebrate}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={checked ? 'done' : 'idle'}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}
                    initial={{ y: 14, opacity: 0, scale: 0.8 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: -14, opacity: 0, scale: 0.8 }}
                    transition={springs.bouncy}
                  >
                    {checked ? <Check strokeWidth={3.5} aria-hidden /> : <ScanQrCode strokeWidth={2.5} aria-hidden />}
                    {t(locale, checked ? 'checkedIn' : 'checkIn')}
                  </motion.span>
                </AnimatePresence>
              </Button>
              <Burst trigger={bursts} count={22} radius={130} />
              {/* radar ping while idle: "ready to scan" */}
              {!checked && (
                <Box
                  aria-hidden
                  position="absolute"
                  top="-5px"
                  right="-5px"
                  boxSize="14px"
                  borderRadius="full"
                  bg="white"
                  _before={{ content: '""', position: 'absolute', inset: 0, borderRadius: 'full', bg: 'white', animation: 'phPing 1.8s ease-out infinite' }}
                />
              )}
            </Box>
            <Text fontSize="sm" fontWeight="medium" lineHeight="1.45" textAlign="center">
              {t(locale, 'scanToCheckIn')}
            </Text>
          </Flex>
        </Grid>
      </motion.section>
    </Box>
  );
});

function LifetimeStat({ label, value, locale }: { label: string; value: number; locale: Locale }) {
  return (
    <Box bg="rgba(0, 0, 0, 0.22)" borderRadius="l2" px="4" py="3" minW="0">
      <Text fontSize="xs" fontWeight="bold" lineHeight="1.3">
        {label}
      </Text>
      <Text fontFamily="heading" fontSize="2xl" fontWeight="extrabold" lineHeight="1.2" letterSpacing="-0.02em">
        <AnimatedNumber value={value} locale={locale} />
      </Text>
    </Box>
  );
}
