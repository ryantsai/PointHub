import { Badge, Box, Button, Card, Center, Flex, Grid, Heading, ProgressCircle, Stat } from '@chakra-ui/react';
import {
  ClipboardCheck,
  Gift,
  KeyRound,
  LayoutDashboard,
  Package,
  ScrollText,
  SlidersHorizontal,
  Sparkles,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { kpis, type Locale } from '@shared/data';
import { formatNumber, formatPercent, t, type StringKey } from '@shared/strings';
import { AnimatedNumber } from '../../components/AnimatedNumber';
import { rise, springs, staggerParent } from '../../motion';
import type { Store } from '../../state/useStore';
import { Approvals } from './Approvals';
import { Ledger } from './Ledger';
import { Stock } from './Stock';
import { TrendChart } from './TrendChart';

const nav: { key: StringKey; icon: LucideIcon; current?: boolean; badge?: boolean }[] = [
  { key: 'dashboard', icon: LayoutDashboard, current: true },
  { key: 'approvals', icon: ClipboardCheck, badge: true },
  { key: 'ledger', icon: ScrollText },
  { key: 'giftsAdmin', icon: Package },
  { key: 'employees', icon: Users },
  { key: 'apiKeys', icon: KeyRound },
];

export function AdminView({ locale, store }: { locale: Locale; store: Store }) {
  return (
    <Flex asChild maxW="1440px" mx="auto" px={{ base: '4', md: '6' }} pt={{ base: '4', md: '6' }} pb="16" gap="6" direction={{ base: 'column', lg: 'row' }} align="flex-start">
      <motion.div variants={staggerParent} initial="hidden" animate="show">
        <Sidebar locale={locale} pendingCount={store.pendingCount} />

        <Flex direction="column" gap="5" flex="1" minW="0" w="full">
          <Flex asChild align="center" justify="space-between" gap="3" wrap="wrap">
            <motion.div variants={rise}>
              <Heading as="h1" fontSize={{ base: '2xl', md: '3xl' }} fontWeight="extrabold" letterSpacing="-0.02em" lineHeight="1.2">
                {t(locale, 'dashboard')}
              </Heading>
              <Button variant="outline" size="sm">
                <SlidersHorizontal aria-hidden />
                {t(locale, 'adjustPoints')}
              </Button>
            </motion.div>
          </Flex>

          <KpiRow locale={locale} store={store} />

          <Grid templateColumns={{ base: 'minmax(0, 1fr)', xl: 'minmax(0, 1.1fr) minmax(0, 1fr)' }} gap="5" alignItems="stretch" gridAutoRows={{ xl: '580px' }}>
            <TrendChart locale={locale} />
            <Approvals locale={locale} store={store} />
          </Grid>

          <Ledger locale={locale} store={store} />
          <Stock locale={locale} gifts={store.gifts} />
        </Flex>
      </motion.div>
    </Flex>
  );
}

// ---- Navigation ---------------------------------------------------------------------------------

function Sidebar({ locale, pendingCount }: { locale: Locale; pendingCount: number }) {
  return (
    <Box
      asChild
      flexShrink={0}
      w={{ base: 'full', lg: '236px' }}
      position={{ base: 'static', lg: 'sticky' }}
      top={{ lg: '84px' }}
    >
      <motion.nav variants={rise} aria-label={t(locale, 'viewAdmin')}>
        <Card.Root variant="outline">
          <Flex
            as="ul"
            listStyleType="none"
            direction={{ base: 'row', lg: 'column' }}
            gap="1.5"
            p="2.5"
            overflowX={{ base: 'auto', lg: 'visible' }}
            // positioned, so visually-hidden (absolute) labels inside are clipped with the scroller
            position="relative"
            css={{ scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}
          >
            {nav.map((item) => {
              const IconCmp = item.icon;
              return (
                <Box as="li" key={item.key} flexShrink={0}>
                  <Button
                    variant={item.current ? 'solid' : 'ghost'}
                    colorPalette={item.current ? 'brand' : 'gray'}
                    size="md"
                    w={{ base: 'auto', lg: 'full' }}
                    justifyContent="flex-start"
                    aria-current={item.current ? 'page' : undefined}
                    color={item.current ? undefined : 'fg.muted'}
                    _hover={item.current ? undefined : { color: 'fg', bg: 'bg.muted' }}
                  >
                    <IconCmp aria-hidden strokeWidth={2.4} />
                    <Box as="span" flex={{ lg: '1' }} textAlign="start">
                      {t(locale, item.key)}
                    </Box>
                    {item.badge && pendingCount > 0 && (
                      <Badge colorPalette="accent" variant="solid" size="sm" minW="6" justifyContent="center" fontWeight="black">
                        <AnimatedNumber value={pendingCount} locale={locale} from={pendingCount} />
                      </Badge>
                    )}
                  </Button>
                </Box>
              );
            })}
          </Flex>
        </Card.Root>
      </motion.nav>
    </Box>
  );
}

// ---- KPI row --------------------------------------------------------------------------------------

function KpiRow({ locale, store }: { locale: Locale; store: Store }) {
  const participation = kpis.activeParticipants / kpis.totalEmployees;
  const percent = (v: number) => new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }).format(v / 100);

  return (
    <Grid
      asChild
      templateColumns={{ base: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))', xl: 'repeat(5, minmax(0, 1fr))' }}
      gap={{ base: '3', md: '4' }}
    >
      <motion.div variants={staggerParent}>
        <Kpi icon={Sparkles} label={t(locale, 'issuedThisMonth')} value={store.issued} locale={locale}>
          <Delta locale={locale} value={kpis.pointsIssuedDelta} />
        </Kpi>
        <Kpi icon={Gift} label={t(locale, 'redeemedThisMonth')} value={kpis.pointsRedeemedThisMonth} locale={locale}>
          <Delta locale={locale} value={kpis.pointsRedeemedDelta} />
        </Kpi>
        <Kpi
          icon={Users}
          label={t(locale, 'participation')}
          value={participation * 100}
          format={percent}
          locale={locale}
          aside={
            <ProgressCircle.Root value={participation * 100} size="md" colorPalette="brand">
              <ProgressCircle.Circle css={{ '--thickness': '6px' }}>
                <ProgressCircle.Track />
                <ProgressCircle.Range strokeLinecap="round" />
              </ProgressCircle.Circle>
            </ProgressCircle.Root>
          }
        >
          <Stat.HelpText fontWeight="bold" fontVariantNumeric="tabular-nums">
            {t(locale, 'capacity', { count: formatNumber(locale, kpis.activeParticipants), max: formatNumber(locale, kpis.totalEmployees) })}
          </Stat.HelpText>
        </Kpi>
        <Kpi icon={Wallet} label={t(locale, 'outstanding')} value={store.outstanding} locale={locale}>
          <Stat.HelpText fontWeight="bold">{t(locale, 'points')}</Stat.HelpText>
        </Kpi>
        <Kpi icon={ClipboardCheck} label={t(locale, 'pendingApprovals')} value={store.pendingCount} locale={locale} highlight={store.pendingCount > 0} gridColumn={{ base: 'span 2', xl: 'auto' }}>
          {store.pendingCount === 0 && (
            <Badge asChild colorPalette="green" variant="subtle" size="sm">
              <motion.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={springs.bouncy}>
                {t(locale, 'allCaughtUp')}
              </motion.span>
            </Badge>
          )}
        </Kpi>
      </motion.div>
    </Grid>
  );
}

type KpiProps = {
  icon: LucideIcon;
  label: string;
  value: number;
  locale: Locale;
  format?: (value: number) => string;
  aside?: ReactNode;
  highlight?: boolean;
  gridColumn?: { base: string; xl: string };
  children?: ReactNode;
};

function Kpi({ icon: IconCmp, label, value, locale, format, aside, highlight, gridColumn, children }: KpiProps) {
  return (
    <Card.Root asChild variant="outline" gridColumn={gridColumn} borderColor={highlight ? 'accent.emphasized' : undefined} css={{ transition: 'border-color 300ms' }}>
      <motion.div variants={rise} whileHover={{ y: -3 }} transition={springs.soft}>
        <Card.Body p="4">
          <Stat.Root gap="1.5">
            <Stat.Label fontWeight="bold" fontSize="sm" lineHeight="1.35" color="fg.muted" minH={{ xl: '2.7em' }} alignItems="flex-start">
              {label}
            </Stat.Label>
            <Flex align="center" justify="space-between" gap="2">
              <Stat.ValueText fontFamily="heading" fontSize={{ base: '2xl', md: '3xl' }} fontWeight="extrabold" letterSpacing="-0.02em" lineHeight="1.15">
                <AnimatedNumber value={value} locale={locale} format={format} />
              </Stat.ValueText>
              {aside ?? (
                <Center flexShrink={0} boxSize="9" borderRadius="l2" bg={highlight ? 'accent.subtle' : 'brand.subtle'} color={highlight ? 'accent.fg' : 'brand.fg'}>
                  <IconCmp size={18} strokeWidth={2.5} aria-hidden />
                </Center>
              )}
            </Flex>
            <Flex align="center" columnGap="2" rowGap="1" wrap="wrap" minH="6">
              {children}
            </Flex>
          </Stat.Root>
        </Card.Body>
      </motion.div>
    </Card.Root>
  );
}

function Delta({ locale, value }: { locale: Locale; value: number }) {
  const up = value >= 0;
  return (
    <>
      <Badge colorPalette={up ? 'green' : 'red'} variant="subtle" size="sm" gap="0.5" px="1.5">
        {up ? <Stat.UpIndicator /> : <Stat.DownIndicator />}
        {formatPercent(locale, value)}
      </Badge>
      <Stat.HelpText fontWeight="medium">{t(locale, 'vsLastMonth')}</Stat.HelpText>
    </>
  );
}
