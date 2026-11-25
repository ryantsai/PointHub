import { Box, Center, Flex, Text } from '@chakra-ui/react';
import { ArrowDownLeft, ArrowUpRight, Gift as GiftIcon, History, Plug, SlidersHorizontal, Ticket, TimerOff, Undo2, type LucideIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import type { MyPoints, Transaction, TransactionType } from '../../api/types';
import { EmptyState, ErrorBlock, LoadingBlock, Pager } from '../../components/states';
import { SectionTitle } from '../../components/ui/bits';
import { Panel } from '../../components/ui/Panel';
import { useFormat, useLocalized } from '../../i18n/hooks';
import { itemVariants, springs } from '../../lib/motion';

const TX_ICONS: Record<TransactionType, LucideIcon> = {
  eventAward: Ticket,
  redemption: GiftIcon,
  adjustment: SlidersHorizontal,
  reversal: Undo2,
  expiry: TimerOff,
  externalCredit: Plug,
  externalDebit: Plug,
};

function TransactionRow({ tx }: { tx: Transaction }) {
  const { t } = useTranslation();
  const format = useFormat();
  const localized = useLocalized();
  const typeLabel = t(`txType.${tx.type}`);
  const title = tx.eventTitle ? localized(tx.eventTitle) : (tx.reason ?? typeLabel);
  const gain = tx.amount >= 0;
  const Icon = TX_ICONS[tx.type];
  return (
    <Flex align="center" gap="3" px="2" py="2.5">
      <Center flexShrink={0} boxSize="10" borderRadius="l2" bg={gain ? 'brand.subtle' : 'bg.muted'} color={gain ? 'brand.fg' : 'fg.muted'}>
        <Icon size={18} strokeWidth={2.4} aria-hidden />
      </Center>
      <Box flex="1" minW="0">
        <Text fontWeight="bold" fontSize="sm" lineHeight="1.35" truncate>
          {title}
        </Text>
        <Text color="fg.muted" fontSize="xs" fontWeight="medium" lineHeight="1.4">
          {title === typeLabel ? '' : `${typeLabel} · `}
          {format.dateTime(tx.createdAt)}
          {tx.apiClientName ? ` · ${tx.apiClientName}` : ''}
        </Text>
      </Box>
      <Flex align="center" gap="1" flexShrink={0} color={gain ? 'gain' : 'loss'} fontWeight="black" fontSize="md" fontVariantNumeric="tabular-nums">
        {gain ? <ArrowUpRight size={15} strokeWidth={3} aria-hidden /> : <ArrowDownLeft size={15} strokeWidth={3} aria-hidden />}
        {format.signed(tx.amount)}
      </Flex>
    </Flex>
  );
}

interface HomeActivityProps {
  points: MyPoints | undefined;
  isPending: boolean;
  /** The previous page is still shown while the next one loads. */
  stale: boolean;
  error: unknown;
  onRetry: () => void;
  page: number;
  pageSize: number;
  onPage: (page: number) => void;
}

/**
 * My latest point movements, newest first; new rows slide in at the top. The pager underneath reaches the
 * rest of the history. (This is the side panel where the design has a leaderboard: there is deliberately none.)
 */
export function HomeActivity({ points, isPending, stale, error, onRetry, page, pageSize, onPage }: HomeActivityProps) {
  const { t } = useTranslation();
  const total = points?.transactions.total ?? 0;
  return (
    <Flex asChild direction="column" gap="4" minW="0">
      <motion.section variants={itemVariants} aria-label={t('dashboard.recentActivity')}>
        <SectionTitle icon={History} title={t('dashboard.recentActivity')} />
        {isPending && <LoadingBlock />}
        {Boolean(error) && !points && <ErrorBlock error={error} onRetry={onRetry} />}
        {points && total === 0 && <EmptyState message={t('dashboard.noTransactions')} />}
        {points && total > 0 && (
          <Panel padding="2" gap="1">
            <Box as="ul" listStyleType="none" opacity={stale ? 0.55 : 1} transition="opacity 160ms">
              <AnimatePresence initial={false} mode="popLayout">
                {points.transactions.items.map((tx) => (
                  <motion.li key={tx.id} layout initial={{ opacity: 0, scale: 0.9, y: -18 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={springs.soft}>
                    <TransactionRow tx={tx} />
                  </motion.li>
                ))}
              </AnimatePresence>
            </Box>
            {total > pageSize && (
              <Box px="2" pb="2" pt="1">
                <Pager page={page} pageSize={pageSize} total={total} onChange={onPage} />
              </Box>
            )}
          </Panel>
        )}
      </motion.section>
    </Flex>
  );
}
