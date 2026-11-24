import { Avatar, Badge, Box, Button, Card, Center, EmptyState, Flex, IconButton, Text } from '@chakra-ui/react';
import { Check, CheckCheck, ClipboardCheck, IdCard, PartyPopper, QrCode, UserCheck, UserPlus, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { pick, type Locale } from '@shared/data';
import { formatNumber, t } from '@shared/strings';
import { AnimatedNumber } from '../../components/AnimatedNumber';
import { Burst } from '../../components/Burst';
import { Coin, SectionTitle, initials } from '../../components/bits';
import { rise, springs } from '../../motion';
import type { PendingRow, Store } from '../../state/useStore';

// The queue is today's check-ins, so the row shows the time only.
const timeOnly = (locale: Locale, iso: string) => new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

export function Approvals({ locale, store }: { locale: Locale; store: Store }) {
  const { pending, pendingCount } = store;
  const empty = pending.length === 0;

  return (
    <Card.Root asChild variant="outline" minW="0">
      <motion.section variants={rise} aria-label={t(locale, 'pendingApprovals')}>
        <Card.Body p={{ base: '4', md: '5' }} gap="4">
          <SectionTitle compact icon={ClipboardCheck} title={t(locale, 'pendingApprovals')}>
            <Badge colorPalette={pendingCount ? 'accent' : 'green'} variant="solid" size="md" minW="7" justifyContent="center" fontWeight="black">
              <AnimatedNumber value={pendingCount} locale={locale} from={pendingCount} />
            </Badge>
            <Button size="sm" onClick={store.approveAll} disabled={pendingCount === 0}>
              <CheckCheck aria-hidden strokeWidth={2.6} />
              {t(locale, 'approveAll')}
            </Button>
          </SectionTitle>

          {/* fixed-height row on desktop: the queue scrolls inside the card instead of resizing the chart next to it */}
          <Box position="relative" flex="1" minH="200px" overflowY={{ xl: 'auto' }} overflowX="hidden" p="1" m="-1">
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6, position: 'relative' }}>
              <AnimatePresence initial={false} mode="popLayout">
                {pending.map((row) => (
                  <ApprovalRow key={row.id} row={row} locale={locale} onApprove={store.approve} onReject={store.reject} />
                ))}
              </AnimatePresence>
            </ul>

            <AnimatePresence>
              {empty && (
                <motion.div
                  key="empty"
                  style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ ...springs.bouncy, delay: 0.25 }}
                >
                  <EmptyState.Root size="md" p="4">
                    <EmptyState.Content>
                      <Box position="relative">
                        <EmptyState.Indicator boxSize="16" borderRadius="full" bg="accent.subtle" color="accent.fg" display="flex" alignItems="center" justifyContent="center">
                          <PartyPopper size={30} strokeWidth={2.2} aria-hidden />
                        </EmptyState.Indicator>
                        <Burst trigger={1} count={20} radius={110} />
                      </Box>
                      <EmptyState.Title fontWeight="extrabold" fontSize="lg">
                        {t(locale, 'allCaughtUp')}
                      </EmptyState.Title>
                    </EmptyState.Content>
                  </EmptyState.Root>
                </motion.div>
              )}
            </AnimatePresence>
          </Box>
        </Card.Body>
      </motion.section>
    </Card.Root>
  );
}

function ApprovalRow({ row, locale, onApprove, onReject }: { row: PendingRow; locale: Locale; onApprove: (row: PendingRow) => void; onReject: (row: PendingRow) => void }) {
  const name = pick(row.employeeName, locale);
  const approved = row.resolution === 'approved';
  const rejected = row.resolution === 'rejected';
  const resolved = approved || rejected;
  const MethodIcon = row.method === 'card' ? IdCard : QrCode;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0, scale: resolved ? 0.985 : 1 }}
      // approved rows fly out to the right (into the ledger), rejected ones drop away to the left
      exit={{ opacity: 0, x: rejected ? -72 : 72, scale: 0.94, transition: { duration: 0.24, ease: [0.4, 0, 1, 1] } }}
      transition={springs.soft}
    >
      <Flex
        align="center"
        gap="3"
        px="2.5"
        py="2"
        borderRadius="l2"
        borderWidth="2px"
        borderColor={approved ? 'green.solid' : rejected ? 'red.solid' : 'border'}
        bg={approved ? 'green.subtle' : rejected ? 'red.subtle' : 'bg.subtle'}
        css={{ transition: 'background-color 160ms, border-color 160ms' }}
        _hover={resolved ? undefined : { borderColor: 'border.emphasized' }}
      >
        <Box position="relative" flexShrink={0}>
          <Avatar.Root size="sm" colorPalette="brand" variant="subtle">
            <Avatar.Fallback fontWeight="black">{initials(name)}</Avatar.Fallback>
          </Avatar.Root>
          <AnimatePresence>
            {resolved && (
              <motion.div
                key="stamp"
                style={{ position: 'absolute', inset: -2 }}
                initial={{ scale: 0, rotate: -40 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={springs.bouncy}
              >
                <Center boxSize="full" borderRadius="full" bg={approved ? 'green.solid' : 'red.solid'} color="white">
                  {approved ? <Check size={18} strokeWidth={3.5} aria-hidden /> : <X size={18} strokeWidth={3.5} aria-hidden />}
                </Center>
              </motion.div>
            )}
          </AnimatePresence>
        </Box>

        <Box flex="1" minW="0">
          <Flex align="center" gap="2" minW="0">
            <Text fontWeight="extrabold" fontSize="sm" lineHeight="1.3" truncate>
              {name}
            </Text>
            <Flex align="center" gap="1" flexShrink={0} fontWeight="black" fontSize="sm" fontVariantNumeric="tabular-nums">
              <Coin size={15} />+{formatNumber(locale, row.points)}
            </Flex>
          </Flex>
          <Text color="fg.muted" fontSize="xs" fontWeight="medium" lineHeight="1.45" truncate>
            {pick(row.department, locale)} · {pick(row.eventTitle, locale)}
          </Text>
          <Flex align="center" columnGap="2" rowGap="1" mt="1" color="fg.muted" fontSize="xs" fontWeight="medium" lineHeight="1.3" wrap="wrap">
            <Badge colorPalette={row.onRoster ? 'green' : 'orange'} variant="subtle" size="xs" px="1.5">
              {row.onRoster ? <UserCheck size={11} strokeWidth={2.8} aria-hidden /> : <UserPlus size={11} strokeWidth={2.8} aria-hidden />}
              {t(locale, row.onRoster ? 'onRoster' : 'walkIn')}
            </Badge>
            <Flex as="span" align="center" gap="1" whiteSpace="nowrap">
              <MethodIcon size={12} strokeWidth={2.5} aria-hidden />
              {t(locale, row.method === 'card' ? 'byCard' : 'byLink')}
            </Flex>
            <Box as="span" whiteSpace="nowrap" fontVariantNumeric="tabular-nums">
              {timeOnly(locale, row.checkedInAt)}
            </Box>
          </Flex>
        </Box>

        <Flex gap="1.5" flexShrink={0}>
          <IconButton size="sm" variant="outline" aria-label={`${t(locale, 'reject')} – ${name}`} title={t(locale, 'reject')} disabled={resolved} onClick={() => onReject(row)}>
            <X aria-hidden strokeWidth={2.8} />
          </IconButton>
          <IconButton size="sm" colorPalette="brand" aria-label={`${t(locale, 'approve')} – ${name}`} title={t(locale, 'approve')} disabled={resolved} onClick={() => onApprove(row)}>
            <Check aria-hidden strokeWidth={3} />
          </IconButton>
        </Flex>
      </Flex>
    </motion.li>
  );
}
