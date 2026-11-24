import { Avatar, Box, Center, CloseButton, Drawer, Flex, IconButton, Menu, Portal, Text } from '@chakra-ui/react';
import { CalendarDays, ClipboardCheck, Gift, History, House, KeyRound, LogOut, Mail, Menu as MenuIcon, Package, Palette, ReceiptText, Star, Users, type LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, matchPath, Outlet, useLocation, useNavigate } from 'react-router';
import { useLogout, useSiteConfig } from '../api/auth';
import { useRedemptionCount } from '../api/gifts';
import type { Me } from '../api/types';
import { useDisclosure } from '../lib/hooks';
import { springs } from '../lib/motion';
import { can } from '../lib/roles';
import { useSession } from '../lib/session';
import { initials } from '../lib/text';
import { AnimatedNumber } from './AnimatedNumber';
import { RoleBadges } from './badges';
import { ColorSchemeToggle, LanguageSwitcher, ThemePreviewBadge } from './HeaderControls';
import { LoadingBlock } from './states';
import { Coin, Eyebrow } from './ui/bits';

const HEADER_HEIGHT = '60px';
const TAB_BAR_HEIGHT = '58px';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Match the path exactly (the dashboard at "/") instead of as a prefix. */
  end?: boolean;
  /** A counter after the label (open claims). Hidden while zero. */
  badge?: { count: number; label: string };
}

/** Which sections a person sees. Permissions come from lib/roles; the API enforces them again. */
function useNavSections(me: Me) {
  const { t } = useTranslation();
  const employee: NavItem[] = [
    { to: '/', label: t('nav.dashboard'), icon: House, end: true },
    { to: '/gifts', label: t('nav.gifts'), icon: Gift },
  ];
  const host: NavItem[] = can.host(me) ? [{ to: '/host/events', label: t('nav.hostEvents'), icon: CalendarDays }] : [];
  // Claims waiting to be handed over; only asked for by people who can see the claims page.
  const openClaims = useRedemptionCount({ status: 'requested' }, can.manageGifts(me)).data ?? 0;
  const admin: NavItem[] = [
    ...(can.viewAdmin(me)
      ? [
          { to: '/admin/ledger', label: t('nav.ledger'), icon: ReceiptText },
          { to: '/admin/employees', label: t('nav.employees'), icon: Users },
        ]
      : []),
    ...(can.manageGifts(me)
      ? [
          { to: '/admin/gifts', label: t('nav.giftAdmin'), icon: Package },
          { to: '/admin/claims', label: t('nav.claims'), icon: ClipboardCheck, badge: { count: openClaims, label: t('nav.openClaims', { count: openClaims }) } },
        ]
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
  return { employee, host, admin };
}

const isActive = (item: NavItem, pathname: string) => matchPath({ path: item.to, end: item.end ?? false }, pathname) !== null;

/** `scope` keeps the sliding highlight of the sidebar and of the drawer apart. */
function NavItems({ items, onNavigate, scope }: { items: NavItem[]; onNavigate?: () => void; scope: string }) {
  const { pathname } = useLocation();
  return items.map((item) => {
    const active = isActive(item, pathname);
    return (
      <Flex
        key={item.to}
        asChild
        position="relative"
        isolation="isolate"
        align="center"
        gap="3"
        px="3"
        minH="10"
        py="2"
        borderRadius="l2"
        fontWeight="bold"
        fontSize="sm"
        lineHeight="1.3"
        color={active ? 'brand.contrast' : 'fg.muted'}
        transition="color 160ms, background-color 160ms"
        _hover={active ? undefined : { bg: 'bg.muted', color: 'fg' }}
        focusVisibleRing="outside"
      >
        <Link to={item.to} aria-current={active ? 'page' : undefined} onClick={onNavigate}>
          {active && (
            <motion.span
              layoutId={`nav-active-${scope}`}
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
          <Box as="span" flex="1" minW="0">
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
    );
  });
}

function NavSections({ me, onNavigate, scope }: { me: Me; onNavigate?: () => void; scope: string }) {
  const { t } = useTranslation();
  const sections = useNavSections(me);
  return (
    <Flex as="nav" direction="column" gap="1" aria-label={t('nav.toggleMenu')}>
      <NavItems items={sections.employee} onNavigate={onNavigate} scope={scope} />
      {sections.host.length > 0 && (
        <>
          <Eyebrow mt="5" mb="1" px="3">
            {t('nav.sectionHost')}
          </Eyebrow>
          <NavItems items={sections.host} onNavigate={onNavigate} scope={scope} />
        </>
      )}
      {sections.admin.length > 0 && (
        <>
          <Eyebrow mt="5" mb="1" px="3">
            {t('nav.sectionAdmin')}
          </Eyebrow>
          <NavItems items={sections.admin} onNavigate={onNavigate} scope={scope} />
        </>
      )}
    </Flex>
  );
}

function BrandMark({ name }: { name: string }) {
  const { t } = useTranslation();
  return (
    <Flex asChild align="center" gap="2.5" minW="0" borderRadius="l2" focusVisibleRing="outside">
      <Link to="/" aria-label={t('nav.dashboard')}>
        <Center aria-hidden boxSize="9" flexShrink={0} borderRadius="l2" bg="brand.500" color="white" boxShadow="0 3px 0 0 {colors.brand.700}" transform="rotate(-6deg)">
          <Star size={18} fill="currentColor" strokeWidth={0} />
        </Center>
        {/* Hidden on phones: the header also has to fit the balance and three controls. */}
        <Text as="span" fontFamily="heading" fontWeight="extrabold" fontSize="lg" letterSpacing="-0.02em" display={{ base: 'none', sm: 'inline' }} truncate>
          {name}
        </Text>
      </Link>
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
              onSelect={() => logout.mutate(undefined, { onSuccess: () => void navigate('/login', { replace: true }) })}
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

/** Tab bar for phones: the employee pages, one thumb away. */
function BottomTabs({ items }: { items: NavItem[] }) {
  const { pathname } = useLocation();
  return (
    <Flex
      as="nav"
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

/** Signed-in frame: sticky header, sidebar (a drawer on phones) and a bottom tab bar on phones for the employee pages. */
export function AppLayout() {
  const me = useSession();
  const { t } = useTranslation();
  const { data: config } = useSiteConfig();
  const [navOpened, nav] = useDisclosure(false);
  const sections = useNavSections(me);
  const appName = config?.appName ?? t('app.name');

  return (
    <Box minH="100dvh">
      <Flex
        as="header"
        position="sticky"
        top="0"
        zIndex="sticky"
        h={HEADER_HEIGHT}
        px={{ base: '3', md: '5' }}
        align="center"
        justify="space-between"
        gap="2"
        bg="bg.panel"
        borderBottomWidth="2px"
        borderColor="border"
      >
        <Flex align="center" gap="2" minW="0">
          <IconButton display={{ base: 'inline-flex', md: 'none' }} variant="ghost" colorPalette="gray" size="sm" aria-label={t('nav.toggleMenu')} aria-expanded={navOpened} onClick={nav.open}>
            <MenuIcon aria-hidden />
          </IconButton>
          <BrandMark name={appName} />
        </Flex>
        <Flex align="center" gap={{ base: '1', sm: '2' }} flexShrink={0}>
          <ThemePreviewBadge />
          <BalanceChip balance={me.balance} />
          <LanguageSwitcher />
          <ColorSchemeToggle />
          <UserMenu me={me} />
        </Flex>
      </Flex>

      <Flex align="flex-start">
        <Box
          display={{ base: 'none', md: 'block' }}
          position="sticky"
          top={HEADER_HEIGHT}
          w="240px"
          flexShrink={0}
          h={`calc(100dvh - ${HEADER_HEIGHT})`}
          overflowY="auto"
          p="3"
          bg="bg.panel"
          borderRightWidth="2px"
          borderColor="border"
        >
          <NavSections me={me} scope="side" />
        </Box>

        <Box
          as="main"
          flex="1"
          minW="0"
          px={{ base: '4', md: '6' }}
          pt={{ base: '4', md: '6' }}
          pb={{ base: `calc(${TAB_BAR_HEIGHT} + env(safe-area-inset-bottom) + 32px)`, md: '16' }}
        >
          <Box maxW="1240px" mx="auto">
            <Suspense fallback={<LoadingBlock />}>
              <Outlet />
            </Suspense>
          </Box>
        </Box>
      </Flex>

      <BottomTabs items={sections.employee} />

      <Drawer.Root open={navOpened} onOpenChange={(details) => (details.open ? nav.open() : nav.close())} placement="start" size="xs">
        <Portal>
          <Drawer.Backdrop />
          <Drawer.Positioner>
            <Drawer.Content bg="bg.panel" borderRightWidth="2px" borderColor="border">
              <Drawer.Header>
                <Drawer.Title fontFamily="heading" fontWeight="extrabold">
                  {appName}
                </Drawer.Title>
              </Drawer.Header>
              <Drawer.Body px="3">
                <NavSections me={me} onNavigate={nav.close} scope="drawer" />
              </Drawer.Body>
              <Drawer.CloseTrigger asChild>
                <CloseButton size="sm" aria-label={t('app.close')} />
              </Drawer.CloseTrigger>
            </Drawer.Content>
          </Drawer.Positioner>
        </Portal>
      </Drawer.Root>
    </Box>
  );
}
