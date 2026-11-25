import { Avatar, Box, Card, Center, Flex, IconButton, Menu, Portal, SegmentGroup, Text } from '@chakra-ui/react';
import { CalendarCheck, CalendarDays, ClipboardCheck, Gift, History, House, KeyRound, LayoutDashboard, LogOut, Mail, Package, Palette, ReceiptText, Star, Users, type LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { Suspense, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, matchPath, Outlet, useLocation, useNavigate } from 'react-router';
import { SIGNED_OUT_PATH, useLogout, useSiteConfig } from '../api/auth';
import { useRedemptionCount } from '../api/gifts';
import type { Me } from '../api/types';
import { HEADER_HEIGHT, TAB_BAR_HEIGHT } from '../lib/layout';
import { springs } from '../lib/motion';
import { can, hasManagement, isManagementPath, managementHome } from '../lib/roles';
import { useSession } from '../lib/session';
import { initials } from '../lib/text';
import { loadAdminDashboard } from '../pages/admin/dashboardLoader';
import { AnimatedNumber } from './AnimatedNumber';
import { RoleBadges } from './badges';
import { ColorSchemeToggle, LanguageSwitcher, ThemePreviewBadge } from './HeaderControls';
import { LoadingBlock } from './states';
import { Coin } from './ui/bits';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Match the path exactly ("/", "/admin") instead of as a prefix. */
  end?: boolean;
  /** A counter after the label (open claims). Hidden while zero. */
  badge?: { count: number; label: string };
}

/** The employee side: two pages, linked from the top bar (desktop) and the tab bar (phones). */
function useEmployeeNav(): NavItem[] {
  const { t } = useTranslation();
  return [
    { to: '/', label: t('nav.dashboard'), icon: House, end: true },
    { to: '/gifts', label: t('nav.gifts'), icon: Gift },
  ];
}

/** The management side: one flat list, filtered by what the person may see. The API enforces it again. */
function useManagementNav(me: Me): NavItem[] {
  const { t } = useTranslation();
  // Claims waiting to be handed over; only asked for by people who can see the claims page.
  const openClaims = useRedemptionCount({ status: 'requested' }, can.viewClaims(me)).data ?? 0;
  return [
    ...(can.viewAdmin(me) ? [{ to: '/admin', label: t('nav.adminDashboard'), icon: LayoutDashboard, end: true }] : []),
    ...(can.host(me) ? [{ to: '/host/events', label: t('nav.hostEvents'), icon: CalendarDays }] : []),
    ...(can.viewAdmin(me)
      ? [
          { to: '/admin/ledger', label: t('nav.ledger'), icon: ReceiptText },
          { to: '/admin/attendance', label: t('nav.attendance'), icon: CalendarCheck },
          { to: '/admin/employees', label: t('nav.employees'), icon: Users },
        ]
      : []),
    ...(can.manageGifts(me) ? [{ to: '/admin/gifts', label: t('nav.giftAdmin'), icon: Package }] : []),
    // Auditors read the claims list too; only people who manage gifts act on it.
    ...(can.viewClaims(me)
      ? [{ to: '/admin/claims', label: t('nav.claims'), icon: ClipboardCheck, badge: { count: openClaims, label: t('nav.openClaims', { count: openClaims }) } }]
      : []),
    ...(can.admin(me)
      ? [
          { to: '/admin/themes', label: t('nav.themes'), icon: Palette },
          { to: '/admin/email', label: t('nav.email'), icon: Mail },
          { to: '/admin/api-clients', label: t('nav.apiClients'), icon: KeyRound },
        ]
      : []),
    ...(can.viewAdmin(me) ? [{ to: '/admin/audit', label: t('nav.audit'), icon: History }] : []),
  ];
}

const isActive = (item: NavItem, pathname: string) => matchPath({ path: item.to, end: item.end ?? false }, pathname) !== null;

function BrandMark({ name }: { name: string }) {
  const { t } = useTranslation();
  return (
    <Flex asChild align="center" gap="2.5" minW="0" borderRadius="l2" focusVisibleRing="outside">
      <Link to="/" aria-label={t('nav.dashboard')}>
        <Center aria-hidden boxSize="9" flexShrink={0} borderRadius="l2" bg="brand.500" color="white" boxShadow="0 3px 0 0 {colors.brand.700}" transform="rotate(-6deg)">
          <Star size={18} fill="currentColor" strokeWidth={0} />
        </Center>
        {/* Hidden on phones: the row also has to fit the balance and three controls. */}
        <Text as="span" fontFamily="heading" fontWeight="extrabold" fontSize="lg" letterSpacing="-0.02em" display={{ base: 'none', sm: 'inline' }} truncate>
          {name}
        </Text>
      </Link>
    </Flex>
  );
}

/** Employee side / management side. Only people with a role have two sides. */
function SideSwitch({ managing, home }: { managing: boolean; home: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const sides = [
    { value: 'employee', label: t('nav.sideEmployee') },
    { value: 'manage', label: t('nav.sideManage') },
  ];
  return (
    <SegmentGroup.Root
      size="sm"
      // Phones: a second row of its own, as wide as the bar.
      order={{ base: 3, md: 0 }}
      w={{ base: 'full', md: 'auto' }}
      value={managing ? 'manage' : 'employee'}
      onValueChange={(details) => {
        if (details.value === 'manage' && !managing) void navigate(home);
        if (details.value === 'employee' && managing) void navigate('/');
      }}
      aria-label={t('nav.sideSwitch')}
    >
      <SegmentGroup.Indicator />
      {sides.map((side) => (
        <SegmentGroup.Item key={side.value} value={side.value} flex={{ base: '1', md: 'initial' }} justifyContent="center">
          <SegmentGroup.ItemText>{side.label}</SegmentGroup.ItemText>
          <SegmentGroup.ItemHiddenInput />
        </SegmentGroup.Item>
      ))}
    </SegmentGroup.Root>
  );
}

/** Home / Gifts in the top bar, from tablet width up. Phones get the tab bar instead. */
function EmployeeLinks({ items }: { items: NavItem[] }) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  return (
    <Flex as="nav" aria-label={t('nav.sideEmployee')} display={{ base: 'none', md: 'flex' }} align="center" gap="1">
      {items.map((item) => {
        const active = isActive(item, pathname);
        return (
          <Flex
            key={item.to}
            asChild
            align="center"
            gap="2"
            h="9"
            px="3"
            borderRadius="l2"
            fontWeight="bold"
            fontSize="sm"
            color={active ? 'brand.fg' : 'fg.muted'}
            bg={active ? 'brand.subtle' : undefined}
            transition="color 160ms, background-color 160ms"
            _hover={active ? undefined : { bg: 'bg.muted', color: 'fg' }}
            focusVisibleRing="outside"
          >
            <Link to={item.to} aria-current={active ? 'page' : undefined}>
              <item.icon size={17} strokeWidth={2.4} aria-hidden />
              {item.label}
            </Link>
          </Flex>
        );
      })}
    </Flex>
  );
}

function BalanceChip({ balance }: { balance: number }) {
  const { t } = useTranslation();
  return (
    <Flex
      align="center"
      gap="1.5"
      pl="1"
      pr="3"
      h="8"
      flexShrink={0}
      borderRadius="full"
      bg="brand.subtle"
      color="brand.fg"
      borderWidth="2px"
      borderColor="brand.muted"
      fontWeight="black"
      fontSize="sm"
      title={t('dashboard.balance')}
    >
      <Coin size={20} />
      <span>
        <AnimatedNumber value={balance} from={balance} />
      </span>
    </Flex>
  );
}

function UserMenu({ me }: { me: Me }) {
  const { t } = useTranslation();
  const logout = useLogout();
  const navigate = useNavigate();
  return (
    <Menu.Root positioning={{ placement: 'bottom-end' }}>
      <Menu.Trigger asChild>
        <IconButton variant="plain" size="sm" borderRadius="full" aria-label={t('nav.account')} title={t('nav.account')} p="0">
          <Avatar.Root size="sm" colorPalette="brand" variant="solid" boxShadow="0 2px 0 0 {colors.brand.depth}">
            <Avatar.Fallback fontWeight="black">{initials(me.displayName)}</Avatar.Fallback>
          </Avatar.Root>
        </IconButton>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content borderRadius="l2" borderWidth="2px" borderColor="border" minW="15rem">
            <Flex direction="column" gap="1" px="3" py="2">
              <Text fontWeight="extrabold" fontSize="sm">
                {me.displayName}
              </Text>
              <Text fontSize="xs" color="fg.muted" fontWeight="medium">
                {me.employeeNo}
                {me.department ? ` · ${me.department}` : ''}
              </Text>
              <Box mt="1">
                <RoleBadges roles={me.roles} />
              </Box>
            </Flex>
            <Menu.Separator />
            <Menu.Item
              value="sign-out"
              fontWeight="semibold"
              borderRadius="l1"
              onSelect={() => logout.mutate(undefined, { onSuccess: () => void navigate(SIGNED_OUT_PATH, { replace: true }) })}
            >
              <LogOut size={16} aria-hidden />
              {t('nav.signOut')}
            </Menu.Item>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}

/**
 * Sub-navigation of the management side: a card beside the content on desktop, a strip that scrolls sideways
 * above it on narrower screens. The highlight slides between entries.
 */
function ManagementNav({ items }: { items: NavItem[] }) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const listRef = useRef<HTMLUListElement>(null);

  // On the strip, keep the current entry in view (it may be the tenth of ten).
  useEffect(() => {
    const list = listRef.current;
    const current = list?.querySelector<HTMLElement>('[aria-current="page"]')?.closest('li');
    if (!list || !current || list.scrollWidth <= list.clientWidth) return;
    list.scrollTo({ left: current.offsetLeft - (list.clientWidth - current.offsetWidth) / 2 });
  }, [pathname]);

  return (
    <Box as="nav" aria-label={t('nav.sideManage')} flexShrink={0} w={{ base: 'full', lg: '236px' }} position={{ base: 'static', lg: 'sticky' }} top={{ lg: `calc(${HEADER_HEIGHT} + 24px)` }}>
      <Card.Root variant="outline">
        <Flex
          asChild
          listStyleType="none"
          direction={{ base: 'row', lg: 'column' }}
          gap="1.5"
          p="2.5"
          overflowX={{ base: 'auto', lg: 'visible' }}
          overflowY={{ lg: 'auto' }}
          maxH={{ lg: `calc(100dvh - ${HEADER_HEIGHT} - 48px)` }}
          // positioned: the scroll maths above reads offsetLeft against it
          position="relative"
          css={{ scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}
        >
          <ul ref={listRef}>
            {items.map((item) => {
              const active = isActive(item, pathname);
              return (
                <Box as="li" key={item.to} flexShrink={0}>
                  <Flex
                    asChild
                    position="relative"
                    isolation="isolate"
                    align="center"
                    gap="2.5"
                    px="3"
                    minH="10"
                    py="2"
                    borderRadius="l2"
                    fontWeight="bold"
                    fontSize="sm"
                    lineHeight="1.3"
                    whiteSpace={{ base: 'nowrap', lg: 'normal' }}
                    color={active ? 'brand.contrast' : 'fg.muted'}
                    transition="color 160ms, background-color 160ms"
                    _hover={active ? undefined : { bg: 'bg.muted', color: 'fg' }}
                    focusVisibleRing="outside"
                  >
                    <Link to={item.to} aria-current={active ? 'page' : undefined}>
                      {active && (
                        <motion.span
                          layoutId="nav-active-manage"
                          transition={springs.snap}
                          style={{
                            position: 'absolute',
                            inset: 0,
                            zIndex: -1,
                            borderRadius: 'var(--chakra-radii-l2)',
                            background: 'var(--chakra-colors-brand-solid)',
                            boxShadow: '0 3px 0 0 var(--chakra-colors-brand-depth)',
                          }}
                        />
                      )}
                      <item.icon size={18} strokeWidth={2.4} aria-hidden style={{ flexShrink: 0 }} />
                      <Box as="span" flex={{ lg: '1' }} minW="0">
                        {item.label}
                      </Box>
                      {item.badge && item.badge.count > 0 && (
                        <Center
                          as="span"
                          flexShrink={0}
                          minW="5"
                          h="5"
                          px="1.5"
                          borderRadius="full"
                          bg="accent.solid"
                          color="accent.contrast"
                          fontSize="xs"
                          fontWeight="black"
                          lineHeight="1"
                          fontVariantNumeric="tabular-nums"
                          title={item.badge.label}
                          aria-label={item.badge.label}
                        >
                          {item.badge.count}
                        </Center>
                      )}
                    </Link>
                  </Flex>
                </Box>
              );
            })}
          </ul>
        </Flex>
      </Card.Root>
    </Box>
  );
}

/** Tab bar for phones: the employee pages, one thumb away. */
function BottomTabs({ items }: { items: NavItem[] }) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  return (
    <Flex
      as="nav"
      aria-label={t('nav.sideEmployee')}
      display={{ base: 'flex', md: 'none' }}
      position="fixed"
      insetX="0"
      bottom="0"
      zIndex="sticky"
      h={`calc(${TAB_BAR_HEIGHT} + env(safe-area-inset-bottom))`}
      pb="env(safe-area-inset-bottom)"
      bg="bg.panel"
      borderTopWidth="2px"
      borderColor="border"
    >
      {items.map((item) => {
        const active = isActive(item, pathname);
        return (
          <Flex
            key={item.to}
            asChild
            flex="1"
            direction="column"
            align="center"
            justify="center"
            gap="0.5"
            color={active ? 'brand.fg' : 'fg.muted'}
            fontSize="xs"
            fontWeight={active ? 'extrabold' : 'semibold'}
            focusVisibleRing="inside"
          >
            <Link to={item.to} aria-current={active ? 'page' : undefined}>
              <motion.span style={{ display: 'inline-flex' }} animate={{ y: active ? -2 : 0, scale: active ? 1.12 : 1 }} transition={springs.bouncy}>
                <item.icon size={22} strokeWidth={active ? 2.6 : 2.2} aria-hidden />
              </motion.span>
              {item.label}
            </Link>
          </Flex>
        );
      })}
    </Flex>
  );
}

/**
 * Signed-in frame. One top bar for everyone: brand, the employee / management switch (people with a role only),
 * balance, language, colour scheme, account. The employee side has no sidebar; the management side keeps a
 * sub-navigation beside its content.
 */
export function AppLayout() {
  const me = useSession();
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { data: config } = useSiteConfig();
  const employeeNav = useEmployeeNav();
  const managementNav = useManagementNav(me);
  const appName = config?.appName ?? t('app.name');
  const home = managementHome(me);
  const twoSided = hasManagement(me) && home !== null;
  const managing = twoSided && isManagementPath(pathname);
  const seesDashboard = can.viewAdmin(me);

  // The dashboard chunk carries the chart library. Warm it up for the people who will open it, so the
  // switch to the management side is instant; employees never download it.
  useEffect(() => {
    if (!seesDashboard) return;
    const id = window.setTimeout(() => void loadAdminDashboard(), 1500);
    return () => window.clearTimeout(id);
  }, [seesDashboard]);

  return (
    <Box minH="100dvh">
      {/* Two rows on a phone for people with a role (the switch wraps), so it does not stick there. */}
      <Box as="header" position={{ base: twoSided ? 'static' : 'sticky', md: 'sticky' }} top="0" zIndex="sticky" bg="bg.panel" borderBottomWidth="2px" borderColor="border">
        <Flex maxW="1440px" mx="auto" minH={HEADER_HEIGHT} px={{ base: '3', md: '6' }} py="2" align="center" columnGap={{ base: '2', md: '4' }} rowGap="2" wrap="wrap">
          <BrandMark name={appName} />
          {twoSided && home && <SideSwitch managing={managing} home={home} />}
          {!managing && <EmployeeLinks items={employeeNav} />}
          <Flex align="center" gap={{ base: '1', sm: '2' }} flexShrink={0} ml="auto">
            <ThemePreviewBadge />
            <BalanceChip balance={me.balance} />
            <LanguageSwitcher />
            <ColorSchemeToggle />
            <UserMenu me={me} />
          </Flex>
        </Flex>
      </Box>

      {managing ? (
        <Flex maxW="1440px" mx="auto" px={{ base: '4', md: '6' }} pt={{ base: '4', md: '6' }} pb="16" gap={{ base: '5', lg: '6' }} direction={{ base: 'column', lg: 'row' }} align={{ base: 'stretch', lg: 'flex-start' }}>
          <ManagementNav items={managementNav} />
          <Box as="main" flex="1" minW="0">
            <Suspense fallback={<LoadingBlock />}>
              <Outlet />
            </Suspense>
          </Box>
        </Flex>
      ) : (
        <>
          <Box
            as="main"
            maxW="1240px"
            mx="auto"
            px={{ base: '4', md: '6' }}
            pt={{ base: '4', md: '6' }}
            // room for the tab bar (phones) and for the home page's floating balance pill
            pb={{ base: `calc(${TAB_BAR_HEIGHT} + env(safe-area-inset-bottom) + 76px)`, md: '24' }}
          >
            <Suspense fallback={<LoadingBlock />}>
              <Outlet />
            </Suspense>
          </Box>
          <BottomTabs items={employeeNav} />
        </>
      )}
    </Box>
  );
}
