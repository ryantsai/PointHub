import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import Portal from '@mui/material/Portal';
import Snackbar from '@mui/material/Snackbar';
import Typography from '@mui/material/Typography';
import BlockRounded from '@mui/icons-material/BlockRounded';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import CheckRounded from '@mui/icons-material/CheckRounded';
import EmojiEventsRounded from '@mui/icons-material/EmojiEventsRounded';
import HourglassTopRounded from '@mui/icons-material/HourglassTopRounded';
import HowToRegRounded from '@mui/icons-material/HowToRegRounded';
import LockRounded from '@mui/icons-material/LockRounded';
import PlaceRounded from '@mui/icons-material/PlaceRounded';
import QrCodeScannerRounded from '@mui/icons-material/QrCodeScannerRounded';
import ScheduleRounded from '@mui/icons-material/ScheduleRounded';
import { AnimatePresence, motion } from 'motion/react';
import { leaderboard, me, pick } from '@shared/data';
import type { EventItem, Gift, Locale } from '@shared/data';
import { seasonByKey } from '@shared/seasons';
import { formatDateTime, formatNumber, t } from '@shared/strings';
import type { StringKey } from '@shared/strings';
import type { LabState } from '@shared/urlState';
import { useBurst } from '../components/Burst';
import { CountUp } from '../components/CountUp';
import { Particles } from '../components/Particles';
import { Lobed, ShapeBadge } from '../components/Shapes';
import { signed, typeIcon, typeKey } from '../format';
import { ease, rise, spring, stagger } from '../motion';
import type { LabData } from '../state/useLabData';
import { easing, radius } from '../theme/theme';

type Fire = (from: Element | null) => void;

const sectionSx = { scrollMarginTop: 88 } as const;

function SectionTitle({ id, children, action }: { id: string; children: ReactNode; action?: ReactNode }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2, minHeight: 40 }}>
      <Typography id={id} variant="h2">
        {children}
      </Typography>
      {action}
    </Box>
  );
}

// ---------------------------------------------------------------------------------------------
// Hero

function Hero({ state, data }: { state: LabState; data: LabData }) {
  const { locale } = state;
  const season = seasonByKey(state.season);
  const name = pick(me.displayName, locale);
  const toGo = Math.max(0, me.nextRewardAt - data.balance);
  const progress = Math.min(100, (data.balance / me.nextRewardAt) * 100);
  const nextGift = data.gifts.find((g) => g.pointCost === me.nextRewardAt);
  const number = useCallback((v: number) => formatNumber(locale, v), [locale]);

  return (
    <Card
      id="home"
      component="section"
      aria-label={t(locale, 'balance')}
      sx={(theme) => ({
        ...sectionSx,
        position: 'relative',
        isolation: 'isolate',
        borderRadius: { xs: `${radius.xl}px`, sm: `${radius.xxl}px` },
        color: theme.vars.palette.tonal.onHero,
        background: `linear-gradient(135deg, ${theme.vars.palette.tonal.heroFrom} 0%, ${theme.vars.palette.tonal.heroVia} 52%, ${theme.vars.palette.tonal.heroTo} 100%)`,
        p: { xs: 3, sm: 4, md: 5 },
      })}
    >
      <Box aria-hidden sx={{ position: 'absolute', inset: 0, zIndex: -1, overflow: 'hidden', pointerEvents: 'none' }}>
        <Lobed
          lobes={12}
          depth={0.04}
          size="clamp(220px, 46vw, 420px)"
          sx={{
            position: 'absolute',
            right: { xs: -90, md: -70 },
            top: { xs: -110, md: -120 },
            color: '#ffffff1a',
            '@keyframes ph-hero-spin': { to: { transform: 'rotate(360deg)' } },
            '@media (prefers-reduced-motion: no-preference)': { animation: 'ph-hero-spin 90s linear infinite' },
          }}
        />
        <Box sx={{ position: 'absolute', left: '38%', bottom: -64, width: 260, height: 112, borderRadius: '999px', bgcolor: '#ffffff12', transform: 'rotate(-18deg)' }} />
        <Particles kind={season.particles} color={season.particles === 'snow' ? '#ffffff' : season.accent} />
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        <Box sx={{ flex: 1, minWidth: 0, display: 'grid', gap: { xs: 2.5, md: 3 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar aria-hidden sx={{ width: 44, height: 44, bgcolor: '#ffffff2e', color: 'inherit', display: { xs: 'none', sm: 'flex' } }}>
              {name.trim().charAt(0)}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h3" component="h1">
                {t(locale, 'greeting', { name })}
              </Typography>
              <Typography variant="label" component="p" sx={{ color: 'tonal.onHeroMuted', mt: 0.25 }}>
                {pick(me.department, locale)} · {me.employeeNo}
              </Typography>
            </Box>
          </Box>

          <Box>
            <Typography variant="label" component="p" sx={{ color: 'tonal.onHeroMuted', mb: 0.5 }}>
              {t(locale, 'balance')}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.25, flexWrap: 'wrap', position: 'relative' }}>
              <Typography variant="display" component="p">
                <CountUp value={data.balance} format={number} duration={1.4} />
              </Typography>
              <Typography variant="h3" component="span" sx={{ color: 'tonal.onHeroMuted' }}>
                {t(locale, 'pts')}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'grid', gap: 1, maxWidth: 520 }}>
            <LinearProgress
              variant="determinate"
              value={progress}
              aria-label={t(locale, 'nextReward', { count: formatNumber(locale, toGo) })}
              sx={{ height: 12, bgcolor: '#ffffff33', '& .MuiLinearProgress-bar': { bgcolor: 'tonal.accentVivid' } }}
            />
            <Typography variant="body2" sx={{ fontWeight: 600, display: 'flex', gap: 1, alignItems: 'center' }}>
              {nextGift && (
                <Box component="span" aria-hidden sx={{ display: { md: 'none' } }}>
                  {nextGift.emoji}
                </Box>
              )}
              {t(locale, 'nextReward', { count: formatNumber(locale, toGo) })}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'stretch' }}>
            {(
              [
                ['lifetimeEarned', data.earned],
                ['lifetimeSpent', data.spent],
              ] as const
            ).map(([key, value]) => (
              <Box key={key} sx={{ bgcolor: '#ffffff1f', borderRadius: `${radius.md}px`, px: 2, py: 1.25, minWidth: 124, position: 'relative' }}>
                <Typography variant="caption" component="p" sx={{ color: 'tonal.onHeroMuted' }}>
                  {t(locale, key)}
                </Typography>
                <Typography variant="h5" component="p" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  <CountUp value={value} format={number} />
                </Typography>
              </Box>
            ))}
            <Box sx={{ bgcolor: '#ffffff1f', borderRadius: `${radius.md}px`, px: 2, py: 1.25, display: 'flex', alignItems: 'center', gap: 1 }}>
              <EmojiEventsRounded fontSize="small" />
              <Typography variant="subtitle2" component="p">
                {t(locale, 'rank', { rank: me.rank })}
              </Typography>
            </Box>
          </Box>
        </Box>

        {nextGift && (
          <Box aria-hidden sx={{ display: { xs: 'none', md: 'block' }, mr: { md: 1, lg: 3 } }}>
            <motion.div initial={{ scale: 0.4, rotate: -40, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ ...spring.bouncy, delay: 0.35 }}>
              <ShapeBadge size={188} lobes={9} depth={0.06} bg="#ffffff26" fg="inherit" spin>
                <Box component="span" sx={{ fontSize: 84 }}>
                  {nextGift.emoji}
                </Box>
              </ShapeBadge>
            </motion.div>
          </Box>
        )}
      </Box>
    </Card>
  );
}

// ---------------------------------------------------------------------------------------------
// Check-in call to action (tablet / desktop; phones get the floating action button)

function CheckInCard({ locale, onCheckIn, wide }: { locale: Locale; onCheckIn: () => void; wide: boolean }) {
  return (
    <Card
      sx={{
        bgcolor: 'tonal.tertiaryContainer',
        color: 'tonal.onTertiaryContainer',
        p: { xs: 3, lg: 3.5 },
        display: 'flex',
        flexDirection: wide ? 'column' : 'row',
        alignItems: wide ? 'flex-start' : 'center',
        gap: wide ? 2.5 : 3,
      }}
    >
      <ShapeBadge size={wide ? 76 : 64} lobes={8} depth={0.07} bg="var(--ph-palette-secondary-main)" fg="var(--ph-palette-secondary-contrastText)">
        <QrCodeScannerRounded sx={{ fontSize: wide ? 36 : 30 }} />
      </ShapeBadge>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="h3" component="h2">
          {t(locale, 'checkIn')}
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          {t(locale, 'scanToCheckIn')}
        </Typography>
      </Box>
      <Button size="large" fullWidth={wide} onClick={onCheckIn} startIcon={<QrCodeScannerRounded />} sx={{ flexShrink: 0 }}>
        {t(locale, 'checkIn')}
      </Button>
    </Card>
  );
}

// ---------------------------------------------------------------------------------------------
// Events

function Meta({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: 'text.secondary', typography: 'body2', '& svg': { fontSize: 16, flexShrink: 0 } }}>
      {icon}
      {children}
    </Box>
  );
}

function EventCard({ event, locale, onCheckIn, fire }: { event: EventItem; locale: Locale; onCheckIn: (id: number) => void; fire: Fire }) {
  const open = event.status === 'open';
  const ref = useRef<HTMLDivElement>(null);
  return (
    <Card
      sx={(theme) => ({
        height: '100%',
        p: 2.5,
        display: 'grid',
        gap: 2,
        alignContent: 'space-between',
        bgcolor: open ? 'tonal.primaryContainer' : 'tonal.surfaceContainer',
        color: open ? 'tonal.onPrimaryContainer' : 'text.primary',
        transition: `transform 300ms ${easing.emphasized}, box-shadow 300ms ${easing.emphasized}, border-radius 300ms ${easing.emphasized}`,
        '&:hover': { transform: 'translateY(-3px)', boxShadow: theme.vars.shadows[3] },
        '&:hover .ph-event-art': { borderRadius: '50%', transform: 'rotate(-8deg) scale(1.06)' },
      })}
    >
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
        <Box
          className="ph-event-art"
          aria-hidden
          sx={{
            width: 56,
            height: 56,
            flexShrink: 0,
            display: 'grid',
            placeItems: 'center',
            fontSize: 28,
            borderRadius: `${radius.md}px`,
            bgcolor: open ? 'tonal.surfaceContainerLowest' : 'tonal.surfaceContainerHighest',
            transition: `border-radius 400ms ${easing.emphasized}, transform 400ms ${easing.emphasized}`,
          }}
        >
          {event.emoji}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0, display: 'grid', gap: 0.75, justifyItems: 'start' }}>
          <Typography variant="h5" component="h3">
            {pick(event.title, locale)}
          </Typography>
          {open ? (
            <Chip
              size="small"
              label={t(locale, 'openNow')}
              icon={
                <Box
                  component="span"
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: 'currentColor',
                    '@keyframes ph-live': { '0%, 100%': { opacity: 1, transform: 'scale(1)' }, '50%': { opacity: 0.35, transform: 'scale(0.7)' } },
                    '@media (prefers-reduced-motion: no-preference)': { animation: 'ph-live 1.6s ease-in-out infinite' },
                  }}
                />
              }
              sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', '& .MuiChip-icon': { ml: 1, mr: -0.25 } }}
            />
          ) : (
            <Chip size="small" variant="outlined" label={t(locale, 'upcoming')} />
          )}
        </Box>
        <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
          <Typography variant="h4" component="p">
            {signed(locale, event.points)}
          </Typography>
          <Typography variant="caption" component="p" sx={{ color: 'text.secondary', fontWeight: 700 }}>
            {t(locale, 'pts')}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', columnGap: 2, rowGap: 0.5 }}>
        <Meta icon={<ScheduleRounded />}>{formatDateTime(locale, event.startsAt)}</Meta>
        <Meta icon={<PlaceRounded />}>{pick(event.location, locale)}</Meta>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minHeight: 40 }}>
        <Box sx={{ flex: 1, minWidth: 0, display: 'grid', gap: 0.75 }}>
          <Typography variant="label" component="p" sx={{ color: 'text.secondary' }}>
            {event.capacity
              ? t(locale, 'capacity', { count: formatNumber(locale, event.attendees), max: formatNumber(locale, event.capacity) })
              : t(locale, 'attendees', { count: formatNumber(locale, event.attendees) })}
          </Typography>
          {event.capacity && (
            <LinearProgress variant="determinate" value={(event.attendees / event.capacity) * 100} aria-hidden sx={{ height: 6, maxWidth: 220 }} />
          )}
        </Box>
        {open && (
          <Box ref={ref} sx={{ flexShrink: 0, maxWidth: '62%' }}>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={event.myCheckIn}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0, transition: { duration: 0.14 } }}
                transition={spring.bouncy}
              >
                {event.myCheckIn === 'none' && (
                  <Button
                    startIcon={<HowToRegRounded />}
                    onClick={() => {
                      fire(ref.current);
                      onCheckIn(event.id);
                    }}
                  >
                    {t(locale, 'checkIn')}
                  </Button>
                )}
                {event.myCheckIn === 'pending' && (
                  <Chip variant="tonal" color="secondary" icon={<HourglassTopRounded />} label={t(locale, 'waitingApproval')} sx={{ height: 40, borderRadius: '999px', px: 0.5 }} />
                )}
                {event.myCheckIn === 'approved' && (
                  <Chip variant="tonal" color="success" icon={<CheckCircleRounded />} label={t(locale, 'checkedIn')} sx={{ height: 40, borderRadius: '999px', px: 0.5 }} />
                )}
              </motion.div>
            </AnimatePresence>
          </Box>
        )}
      </Box>
    </Card>
  );
}

function Events({ state, data, fire }: { state: LabState; data: LabData; fire: Fire }) {
  const { locale } = state;
  const groups = [
    ['openNow', data.events.filter((e) => e.status === 'open')],
    ['upcoming', data.events.filter((e) => e.status === 'upcoming')],
  ] as const;
  return (
    <Box component="section" id="events" aria-labelledby="events-title" sx={sectionSx}>
      <SectionTitle id="events-title">{t(locale, 'events')}</SectionTitle>
      <Box sx={{ display: 'grid', gap: 2.5 }}>
        {groups.map(([key, list]) => (
          <Box key={key}>
            <Typography variant="label" component="h3" sx={{ color: 'text.secondary', mb: 1.25, display: 'flex', alignItems: 'center', gap: 1 }}>
              {t(locale, key)}
              <Box component="span" sx={{ bgcolor: 'tonal.surfaceContainerHighest', color: 'text.primary', borderRadius: '999px', px: 1, minWidth: 24, textAlign: 'center' }}>
                {list.length}
              </Box>
            </Typography>
            <Grid container spacing={2}>
              {list.map((event) => (
                <Grid key={event.id} size={{ xs: 12, md: 6 }}>
                  <EventCard event={event} locale={locale} onCheckIn={data.checkInToEvent} fire={fire} />
                </Grid>
              ))}
            </Grid>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------------------------
// Gifts

const tagKey: Record<NonNullable<Gift['tag']>, StringKey> = { new: 'tagNew', popular: 'tagPopular', limited: 'tagLimited' };
const tagTone = { new: 'primary', popular: 'secondary', limited: 'error' } as const;
const giftShapes = [
  { lobes: 8, depth: 0.07 },
  { lobes: 4, depth: 0.15 },
  { lobes: 12, depth: 0.04 },
  { lobes: 6, depth: 0.1 },
  { lobes: 5, depth: 0.12 },
  { lobes: 10, depth: 0.055 },
];

function GiftCard({ gift, locale, balance, celebrating, onRedeem }: { gift: Gift; locale: Locale; balance: number; celebrating: boolean; onRedeem: (gift: Gift, from: Element | null) => void }) {
  const out = gift.stock === 0;
  const missing = gift.pointCost - balance;
  const affordable = !out && missing <= 0;
  const button = useRef<HTMLButtonElement>(null);

  return (
    <Card
      component={motion.article}
      whileHover={{ y: -4 }}
      whileTap={affordable ? { scale: 0.985 } : undefined}
      animate={celebrating ? { scale: [1, 1.045, 1] } : { scale: 1 }}
      transition={spring.spatial}
      sx={(theme) => ({
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        p: 1.5,
        bgcolor: out ? 'tonal.surfaceContainer' : 'tonal.surfaceContainerLow',
        border: '1px solid',
        borderColor: 'tonal.outlineVariant',
        transition: `box-shadow 300ms ${easing.emphasized}`,
        '&:hover': { boxShadow: theme.vars.shadows[3] },
        '&:hover .ph-gift-art': { borderRadius: `${radius.xxl}px` },
        '&:hover .ph-gift-art > svg': out ? {} : { transform: 'rotate(45deg) scale(1.08)' },
        '&:hover .ph-gift-emoji': out ? {} : { transform: 'scale(1.14) rotate(-6deg)' },
      })}
    >
      <Box
        className="ph-gift-art"
        sx={{
          position: 'relative',
          aspectRatio: '4 / 3',
          borderRadius: `${radius.lg}px`,
          bgcolor: 'tonal.surfaceContainerLowest',
          display: 'grid',
          placeItems: 'center',
          overflow: 'hidden',
          transition: `border-radius 450ms ${easing.emphasized}`,
        }}
      >
        {/* Every gift sits on its own expressive shape; the shape's tone tells the state. */}
        <Lobed
          {...giftShapes[(gift.id - 1) % giftShapes.length]}
          sx={{
            position: 'absolute',
            height: '90%',
            width: 'auto',
            aspectRatio: '1',
            color: out ? 'tonal.surfaceContainerHighest' : affordable ? 'tonal.primaryContainer' : 'tonal.secondaryContainer',
            transition: `transform 700ms ${easing.emphasized}, color 300ms`,
          }}
        />
        <Box
          className="ph-gift-emoji"
          component="span"
          aria-hidden
          sx={{ position: 'relative', fontSize: 'clamp(2.5rem, 10vw, 3.5rem)', lineHeight: 1, filter: out ? 'grayscale(1) opacity(0.6)' : 'none', transition: `transform 450ms ${easing.emphasized}` }}
        >
          {gift.emoji}
        </Box>
        {gift.tag && <Chip size="small" variant="tonal" color={tagTone[gift.tag]} label={t(locale, tagKey[gift.tag])} sx={{ position: 'absolute', top: 8, left: 8, boxShadow: 1 }} />}
      </Box>

      <Box sx={{ px: 0.5, flex: 1, display: 'grid', gap: 0.5, alignContent: 'start' }}>
        <Typography variant="h6" component="h3">
          {pick(gift.name, locale)}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 400, fontSize: '0.8125rem' }}>
          {pick(gift.description, locale)}
        </Typography>
      </Box>

      <Box sx={{ px: 0.5, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="h5" component="p" sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {formatNumber(locale, gift.pointCost)}{' '}
          <Typography component="span" variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
            {t(locale, 'pts')}
          </Typography>
        </Typography>
        {!out && (
          <Typography variant="caption" sx={{ color: gift.stock <= 5 ? 'error.main' : 'text.secondary', fontWeight: gift.stock <= 5 ? 700 : 500 }}>
            {t(locale, 'inStock', { count: formatNumber(locale, gift.stock) })}
          </Typography>
        )}
      </Box>

      <Box sx={{ minHeight: 40, display: 'grid', alignItems: 'center' }}>
        {celebrating ? (
          <Button fullWidth color="success" startIcon={<CheckRounded />} sx={{ pointerEvents: 'none', paddingInline: 1 }} aria-live="polite">
            {t(locale, 'redeemed')}
          </Button>
        ) : out ? (
          <Typography variant="label" component="p" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75 }}>
            <BlockRounded sx={{ fontSize: 16 }} />
            {t(locale, 'outOfStock')}
          </Typography>
        ) : affordable ? (
          <Button ref={button} fullWidth onClick={() => onRedeem(gift, button.current)} sx={{ paddingInline: 1 }}>
            {t(locale, 'redeem')}
          </Button>
        ) : (
          <Box sx={{ px: 0.5, display: 'grid', gap: 0.75 }}>
            <LinearProgress variant="determinate" value={Math.max(0, Math.min(100, (balance / gift.pointCost) * 100))} aria-hidden sx={{ height: 6 }} />
            <Typography variant="label" component="p" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <LockRounded sx={{ fontSize: 14 }} />
              {t(locale, 'notEnough', { count: formatNumber(locale, missing) })}
            </Typography>
          </Box>
        )}
      </Box>
    </Card>
  );
}

function Gifts({ state, data, fire }: { state: LabState; data: LabData; fire: Fire }) {
  const { locale } = state;
  const [celebrating, setCelebrating] = useState<ReadonlySet<number>>(new Set());
  const [toast, setToast] = useState<{ key: number; text: string } | null>(null);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);

  // Redeemable first, then "need more", then out of stock; otherwise catalogue order.
  const sorted = useMemo(() => {
    const group = (g: Gift) => (g.stock === 0 ? 2 : g.pointCost > data.balance ? 1 : 0);
    return data.gifts.map((gift, index) => ({ gift, index })).sort((a, b) => group(a.gift) - group(b.gift) || a.index - b.index);
  }, [data.balance, data.gifts]);

  const onRedeem = (gift: Gift, from: Element | null) => {
    fire(from);
    data.redeem(gift);
    setCelebrating((prev) => new Set(prev).add(gift.id));
    setToast({ key: Date.now(), text: `${t(locale, 'redeemed')} ${pick(gift.name, locale)} · ${signed(locale, -gift.pointCost)} ${t(locale, 'pts')}` });
    timers.current.push(
      window.setTimeout(() => {
        setCelebrating((prev) => {
          const next = new Set(prev);
          next.delete(gift.id);
          return next;
        });
      }, 1700),
    );
  };

  return (
    <Box component="section" id="gifts" aria-labelledby="gifts-title" sx={sectionSx}>
      <SectionTitle id="gifts-title">{t(locale, 'gifts')}</SectionTitle>
      <Grid container spacing={{ xs: 1.5, sm: 2 }}>
        {sorted.map(({ gift }) => (
          <Grid key={gift.id} size={{ xs: 6, sm: 4, lg: 2 }}>
            <motion.div layout transition={spring.layout} style={{ height: '100%' }}>
              <GiftCard gift={gift} locale={locale} balance={data.balance} celebrating={celebrating.has(gift.id)} onRedeem={onRedeem} />
            </motion.div>
          </Grid>
        ))}
      </Grid>
      <Portal>
        <Snackbar
          key={toast?.key}
          open={Boolean(toast)}
          autoHideDuration={2600}
          onClose={(_, reason) => reason !== 'clickaway' && setToast(null)}
          message={toast?.text}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          sx={{ bottom: { xs: 176, sm: 32 } }}
        />
      </Portal>
    </Box>
  );
}

// ---------------------------------------------------------------------------------------------
// Activity and leaderboard

function Activity({ state, data }: { state: LabState; data: LabData }) {
  const { locale } = state;
  return (
    <Card component="section" id="activity" aria-labelledby="activity-title" sx={{ ...sectionSx, p: { xs: 2, sm: 2.5 }, bgcolor: 'tonal.surfaceContainerLow' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1, pl: 0.5 }}>
        <Typography id="activity-title" variant="h3" component="h2">
          {t(locale, 'recentActivity')}
        </Typography>
        <Button variant="text" size="small">
          {t(locale, 'seeAll')}
        </Button>
      </Box>
      <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid' }}>
        <AnimatePresence initial={false} mode="popLayout">
          {data.activity.slice(0, 6).map((tx) => {
            const positive = tx.amount > 0;
            return (
              <Box
                component={motion.li}
                key={tx.id}
                layout
                initial={{ opacity: 0, y: -24, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.18, ease: ease.accelerate } }}
                transition={spring.layout}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  py: 1.25,
                  px: 0.5,
                  borderRadius: `${radius.md}px`,
                  transition: 'background-color 200ms',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <Box
                  aria-hidden
                  sx={{
                    width: 40,
                    height: 40,
                    flexShrink: 0,
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 20,
                    borderRadius: positive ? '50%' : `${radius.sm}px`,
                    bgcolor: positive ? 'tonal.positiveContainer' : 'tonal.surfaceContainerHighest',
                    color: positive ? 'tonal.onPositiveContainer' : 'text.secondary',
                  }}
                >
                  {typeIcon[tx.type]}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle2" component="p">
                    {pick(tx.title, locale)}
                  </Typography>
                  <Typography variant="caption" component="p" sx={{ color: 'text.secondary' }}>
                    {t(locale, typeKey(tx.type))} · {formatDateTime(locale, tx.createdAt)}
                  </Typography>
                </Box>
                <Typography variant="subtitle1" component="p" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: positive ? 'success.main' : 'text.primary', flexShrink: 0 }}>
                  {signed(locale, tx.amount)}
                </Typography>
              </Box>
            );
          })}
        </AnimatePresence>
      </Box>
    </Card>
  );
}

function Leaderboard({ locale }: { locale: Locale }) {
  const top = leaderboard[0].points;
  return (
    <Card component="section" aria-labelledby="leaderboard-title" sx={{ p: { xs: 2, sm: 2.5 }, bgcolor: 'tonal.surfaceContainer' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1.5, pl: 0.5 }}>
        <Typography id="leaderboard-title" variant="h3" component="h2">
          {t(locale, 'leaderboard')}
        </Typography>
        <Button variant="text" size="small">
          {t(locale, 'seeAll')}
        </Button>
      </Box>
      <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gap: 0.75 }}>
        {leaderboard.map((row, index) => (
          <Box component="li" key={row.rank} sx={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 1.5, px: 1, py: 0.75, borderRadius: '999px', overflow: 'hidden', isolation: 'isolate' }}>
            <Box
              component={motion.span}
              aria-hidden
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: row.points / top }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, delay: 0.1 + index * 0.07, ease: ease.emphasized }}
              sx={{ position: 'absolute', inset: 0, zIndex: -1, transformOrigin: 'left center', borderRadius: '999px', bgcolor: index === 0 ? 'tonal.tertiaryContainer' : 'tonal.surfaceContainerHighest' }}
            />
            {index === 0 ? (
              <ShapeBadge size={32} lobes={8} depth={0.08} bg="var(--ph-palette-secondary-main)" fg="var(--ph-palette-secondary-contrastText)">
                <Typography variant="label" component="span" sx={{ fontWeight: 800 }}>
                  {row.rank}
                </Typography>
              </ShapeBadge>
            ) : (
              <Typography variant="label" component="span" sx={{ width: 32, textAlign: 'center', fontWeight: 800, color: 'text.secondary' }}>
                {row.rank}
              </Typography>
            )}
            <Typography variant="subtitle2" component="span" sx={{ flex: 1, minWidth: 0 }} noWrap>
              {row.name}
            </Typography>
            <Typography variant="subtitle2" component="span" sx={{ fontVariantNumeric: 'tabular-nums', pr: 1 }}>
              {formatNumber(locale, row.points)}{' '}
              <Typography component="span" variant="caption" sx={{ color: 'text.secondary' }}>
                {t(locale, 'pts')}
              </Typography>
            </Typography>
          </Box>
        ))}
      </Box>
      <Chip variant="tonal" color="primary" icon={<EmojiEventsRounded />} label={t(locale, 'rank', { rank: me.rank })} sx={{ mt: 2, height: 36, borderRadius: '999px', px: 0.5 }} />
    </Card>
  );
}

// ---------------------------------------------------------------------------------------------

export function EmployeeView({ state, data, desktop, wide, onCheckIn }: { state: LabState; data: LabData; desktop: boolean; wide: boolean; onCheckIn: () => void }) {
  const [burstLayer, fire] = useBurst();
  const block = (node: ReactNode) => <motion.div variants={rise}>{node}</motion.div>;

  return (
    <Box
      component={motion.div}
      variants={stagger}
      initial="hidden"
      animate="show"
      exit="exit"
      sx={{ maxWidth: 1320, mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, pt: { xs: 0.5, sm: 1 } }}
    >
      {/* Phones read top to bottom: hero, events, gifts, activity. From 1200 px the activity column
          sits beside hero + events and the gift shelf spans the full width below. */}
      <Grid container spacing={{ xs: 4, lg: 3 }} rowSpacing={{ xs: 4, md: 5 }}>
        <Grid key="main" size={{ xs: 12, lg: 8 }} sx={{ display: 'grid', gap: { xs: 4, md: 5 }, alignContent: 'start', minWidth: 0 }}>
          <Box sx={{ display: 'grid', gap: 2 }}>
            {block(<Hero state={state} data={data} />)}
            {desktop && !wide && block(<CheckInCard locale={state.locale} onCheckIn={onCheckIn} wide={false} />)}
          </Box>
          {block(<Events state={state} data={data} fire={fire} />)}
        </Grid>
        {!wide && (
          <Grid key="gifts" size={12}>
            {block(<Gifts state={state} data={data} fire={fire} />)}
          </Grid>
        )}
        <Grid key="side" size={{ xs: 12, lg: 4 }} sx={{ minWidth: 0 }}>
          <Grid container spacing={3}>
            {wide && <Grid size={12}>{block(<CheckInCard locale={state.locale} onCheckIn={onCheckIn} wide />)}</Grid>}
            <Grid size={{ xs: 12, md: 6, lg: 12 }}>{block(<Activity state={state} data={data} />)}</Grid>
            <Grid size={{ xs: 12, md: 6, lg: 12 }}>{block(<Leaderboard locale={state.locale} />)}</Grid>
          </Grid>
        </Grid>
        {wide && (
          <Grid key="gifts" size={12}>
            {block(<Gifts state={state} data={data} fire={fire} />)}
          </Grid>
        )}
      </Grid>
      {burstLayer}
    </Box>
  );
}
