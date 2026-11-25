import { Avatar, Badge, Box, Button, Center, Flex, Grid, Heading, Text } from '@chakra-ui/react';
import { ScanQrCode, Trophy } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import type { Gift } from '../../api/types';
import { AnimatedNumber } from '../../components/AnimatedNumber';
import { GiftThumb } from '../../components/GiftGallery';
import { HeroPanel } from '../../components/ui/HeroPanel';
import { LevelRing } from '../../components/ui/LevelRing';
import { ThemeSprite } from '../../components/ui/ThemeSprite';
import { useFormat, useLocalized } from '../../i18n/hooks';
import { nextGoal } from '../../lib/gifts';
import { itemVariants } from '../../lib/motion';
import { useSession } from '../../lib/session';
import { initials } from '../../lib/text';

/** Lifetime points per level. Purely presentational: the server knows nothing about levels. */
const POINTS_PER_LEVEL = 500;

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

interface HomeHeroProps {
  balance: number;
  earned: number | undefined;
  spent: number | undefined;
  gifts: Gift[] | undefined;
  /** Opens the QR scanner. */
  onCheckIn: () => void;
}

/**
 * The top of the employee home: greeting, the level ring with the balance, lifetime totals, the distance to
 * the next gift, and the check-in panel. Three columns from lg (ring · greeting · check-in), one on phones
 * (greeting, ring, totals, check-in).
 */
export function HomeHero({ balance, earned, spent, gifts, onCheckIn }: HomeHeroProps) {
  const { t } = useTranslation();
  const me = useSession();
  const format = useFormat();
  const localized = useLocalized();
  const goal = nextGoal(gifts, balance);
  const percent = goal ? (balance / goal.pointCost) * 100 : gifts && gifts.length > 0 ? 100 : 0;
  const level = Math.floor((earned ?? 0) / POINTS_PER_LEVEL) + 1;
  const nextReward = goal
    ? t('dashboard.nextGoal', { points: format.number(goal.pointCost - balance), gift: localized(goal.name) })
    : gifts && gifts.length > 0
      ? t('dashboard.allAffordable')
      : t('dashboard.subtitle');

  return (
    <motion.section variants={itemVariants} aria-label={t('dashboard.balance')}>
      <HeroPanel>
        <Grid templateColumns={{ base: 'minmax(0, 1fr)', lg: 'auto minmax(0, 1fr) minmax(280px, 340px)' }} gap={{ base: '5', lg: '8' }} alignItems="center">
          {/* level ring */}
          <Center order={{ base: 1, lg: 0 }} py="2">
            <LevelRing
              percent={percent}
              label={t('dashboard.goalProgress')}
              top={
                goal ? (
                  <Box animation="phFloat 3.2s ease-in-out infinite" data-ambient="">
                    <GiftThumb images={goal.images} />
                  </Box>
                ) : undefined
              }
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

          {/* greeting; from lg also the next reward and the lifetime totals */}
          <Flex direction="column" gap={{ base: '4', lg: '5' }} minW="0" order={{ base: 0, lg: 1 }}>
            <Flex align="center" gap="3" minW="0">
              <Avatar.Root size="lg" colorPalette="accent" variant="solid" flexShrink={0} boxShadow="0 0 0 3px rgba(255, 255, 255, 0.35)">
                <Avatar.Fallback fontWeight="black">{initials(me.displayName)}</Avatar.Fallback>
              </Avatar.Root>
              <Box minW="0" flex="1">
                <Heading as="h1" fontSize={{ base: 'xl', md: '2xl' }} fontWeight="extrabold" lineHeight="1.25" letterSpacing="-0.01em">
                  {t('dashboard.greeting', { name: me.displayName })}
                </Heading>
                {me.department && (
                  <Flex mt="1.5" gap="2" wrap="wrap" align="center">
                    <Badge bg="rgba(0, 0, 0, 0.28)" color="white" size="md" px="2.5">
                      {me.department}
                    </Badge>
                  </Flex>
                )}
              </Box>
              {/* The theme's sprite sits in the layout flow, so it can never end up behind text. */}
              <ThemeSprite scale={3} bob />
            </Flex>

            <Text fontSize="lg" fontWeight="bold" lineHeight="1.4" display={{ base: 'none', lg: 'block' }}>
              {nextReward}
            </Text>
            <Grid templateColumns="1fr 1fr" gap="3" display={{ base: 'none', lg: 'grid' }}>
              <LifetimeStat label={t('dashboard.lifetimeEarned')} value={earned} />
              <LifetimeStat label={t('dashboard.lifetimeSpent')} value={spent} />
            </Grid>
          </Flex>

          {/* phones: the next reward and the totals sit under the ring */}
          <Flex direction="column" gap="4" order={2} display={{ base: 'flex', lg: 'none' }}>
            <Text fontSize="md" fontWeight="bold" lineHeight="1.4" textAlign="center">
              {nextReward}
            </Text>
            <Grid templateColumns="1fr 1fr" gap="3">
              <LifetimeStat label={t('dashboard.lifetimeEarned')} value={earned} />
              <LifetimeStat label={t('dashboard.lifetimeSpent')} value={spent} />
            </Grid>
          </Flex>

          {/* check-in */}
          <Flex direction="column" gap="3" order={3} bg="rgba(0, 0, 0, 0.28)" borderRadius="l3" p={{ base: '4', lg: '5' }}>
            <Box position="relative">
              <Button colorPalette="accent" size="2xl" w="full" fontSize="xl" fontWeight="black" borderRadius="l3" onClick={onCheckIn}>
                <ScanQrCode strokeWidth={2.5} aria-hidden />
                {t('checkin.button')}
              </Button>
              {/* radar ping: "ready to scan" */}
              <Box
                aria-hidden
                data-ambient=""
                position="absolute"
                top="-5px"
                right="-5px"
                boxSize="14px"
                borderRadius="full"
                bg="white"
                pointerEvents="none"
                _before={{ content: '""', position: 'absolute', inset: 0, borderRadius: 'full', bg: 'white', animation: 'phPing 1.8s ease-out infinite' }}
              />
            </Box>
            <Text fontSize="sm" fontWeight="medium" lineHeight="1.45" textAlign="center">
              {t('dashboard.scanHint')}
            </Text>
          </Flex>
        </Grid>
      </HeroPanel>
    </motion.section>
  );
}
