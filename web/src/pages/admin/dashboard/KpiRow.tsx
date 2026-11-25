import { Badge, Box, Center, Flex, Grid, ProgressCircle, Stat } from '@chakra-ui/react';
import { ChevronRight, ClipboardCheck, Gift, PackageCheck, Sparkles, Users, Wallet, type LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { AdminStats } from '../../../api/types';
import { AnimatedNumber } from '../../../components/AnimatedNumber';
import { Panel } from '../../../components/ui/Panel';
import { useFormat, useLocale } from '../../../i18n/hooks';
import { itemVariants, listVariants, springs } from '../../../lib/motion';

interface KpiProps {
  icon: LucideIcon;
  label: string;
  value: number;
  format?: (value: number) => string;
  /** Replaces the icon tile (the participation ring). */
  aside?: ReactNode;
  /** Accent outline: something is waiting. */
  highlight?: boolean;
  /** Makes the whole tile a link. */
  to?: string;
  title?: string;
  children?: ReactNode;
}

function Kpi({ icon: IconCmp, label, value, format, aside, highlight, to, title, children }: KpiProps) {
  const tile = (
    <Panel padding="4" h="full" borderColor={highlight ? 'accent.emphasized' : undefined} css={{ transition: 'border-color 300ms' }} title={title}>
      {/* The label takes the spare height, so the numbers of a row line up however many lines each label needs. */}
      <Stat.Root gap="1.5" flex="1">
        <Stat.Label fontWeight="bold" fontSize="sm" lineHeight="1.35" color="fg.muted" flex="1" alignItems="flex-start">
          {label}
        </Stat.Label>
        <Flex align="center" justify="space-between" gap="2">
          <Stat.ValueText fontFamily="heading" fontSize={{ base: '2xl', md: '3xl' }} fontWeight="extrabold" letterSpacing="-0.02em" lineHeight="1.15">
            <AnimatedNumber value={value} format={format} />
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
    </Panel>
  );
  return (
    <motion.div variants={itemVariants} whileHover={{ y: -3 }} transition={springs.soft} style={{ minWidth: 0 }}>
      {to ? (
        <Box asChild display="block" h="full" borderRadius="l3" focusVisibleRing="outside">
          <Link to={to}>{tile}</Link>
        </Box>
      ) : (
        tile
      )}
    </motion.div>
  );
}

/** This month against last month. With nothing to compare to (last month = 0) it says so instead of dividing. */
function Delta({ current, previous }: { current: number; previous: number }) {
  const { t } = useTranslation();
  const locale = useLocale();
  if (previous === 0) {
    return <Stat.HelpText fontWeight="medium">{t('admin.dashboard.nothingLastMonth')}</Stat.HelpText>;
  }
  const change = (current - previous) / Math.abs(previous);
  const up = change >= 0;
  const percent = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: Math.abs(change) < 0.1 ? 1 : 0, signDisplay: 'exceptZero' });
  return (
    <>
      <Badge colorPalette={up ? 'green' : 'red'} variant="subtle" size="sm" gap="0.5" px="1.5">
        {up ? <Stat.UpIndicator /> : <Stat.DownIndicator />}
        {percent.format(change)}
      </Badge>
      <Stat.HelpText fontWeight="medium">{t('admin.dashboard.vsLastMonth')}</Stat.HelpText>
    </>
  );
}

interface KpiRowProps {
  stats: AdminStats;
  /** The live length of the approvals queue when this person can see it; otherwise the number from the stats. */
  pendingCount: number;
  /** Link the open-claims tile to the claims page (people who may open it). */
  claimsLink: boolean;
}

/** Six tiles: issued, redeemed, participation, outstanding, pending approvals, open claims. Every number tweens. */
export function KpiRow({ stats, pendingCount, claimsLink }: KpiRowProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const locale = useLocale();
  const participation = stats.totalEmployees > 0 ? (stats.activeParticipants / stats.totalEmployees) * 100 : 0;
  const percent = (value: number) => new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }).format(value / 100);

  return (
    <Grid asChild templateColumns={{ base: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))', xl: 'repeat(6, minmax(0, 1fr))' }} gap={{ base: '3', md: '4' }}>
      <motion.div variants={listVariants}>
        <Kpi icon={Sparkles} label={t('admin.dashboard.issuedThisMonth')} value={stats.pointsIssuedThisMonth}>
          <Delta current={stats.pointsIssuedThisMonth} previous={stats.pointsIssuedLastMonth} />
        </Kpi>
        <Kpi icon={Gift} label={t('admin.dashboard.redeemedThisMonth')} value={stats.pointsRedeemedThisMonth}>
          <Delta current={stats.pointsRedeemedThisMonth} previous={stats.pointsRedeemedLastMonth} />
        </Kpi>
        <Kpi
          icon={Users}
          label={t('admin.dashboard.participation')}
          value={participation}
          format={percent}
          title={t('admin.dashboard.participationHelp')}
          aside={
            <ProgressCircle.Root value={Math.min(100, participation)} size="md" colorPalette="brand" aria-hidden>
              <ProgressCircle.Circle css={{ '--thickness': '6px' }}>
                <ProgressCircle.Track />
                <ProgressCircle.Range strokeLinecap="round" />
              </ProgressCircle.Circle>
            </ProgressCircle.Root>
          }
        >
          <Stat.HelpText fontWeight="bold" fontVariantNumeric="tabular-nums">
            {t('admin.dashboard.participationDetail', { active: format.number(stats.activeParticipants), total: format.number(stats.totalEmployees) })}
          </Stat.HelpText>
        </Kpi>
        <Kpi icon={Wallet} label={t('admin.dashboard.outstanding')} value={stats.outstandingPoints}>
          <Stat.HelpText fontWeight="bold">{t('app.points')}</Stat.HelpText>
        </Kpi>
        <Kpi icon={ClipboardCheck} label={t('admin.dashboard.pendingApprovals')} value={pendingCount} highlight={pendingCount > 0}>
          {pendingCount === 0 && (
            <Badge asChild colorPalette="green" variant="subtle" size="sm">
              <motion.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={springs.bouncy}>
                {t('admin.dashboard.allCaughtUp')}
              </motion.span>
            </Badge>
          )}
        </Kpi>
        <Kpi icon={PackageCheck} label={t('admin.dashboard.openClaims')} value={stats.openClaims} to={claimsLink ? '/admin/claims' : undefined}>
          {claimsLink ? (
            <Flex as="span" align="center" gap="0.5" fontSize="sm" fontWeight="bold" color="brand.fg">
              {t('admin.dashboard.toClaims')}
              <ChevronRight size={15} strokeWidth={2.6} aria-hidden />
            </Flex>
          ) : (
            <Stat.HelpText fontWeight="medium">{t('admin.dashboard.openClaimsHelp')}</Stat.HelpText>
          )}
        </Kpi>
      </motion.div>
    </Grid>
  );
}
