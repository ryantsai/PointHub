import { Avatar, Badge, Box, Button, Card, Flex, Input, InputGroup, Table, Text, VisuallyHidden } from '@chakra-ui/react';
import { Plug, ScrollText, Search, SearchX, Undo2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { pick, type Locale, type Transaction, type TransactionType } from '@shared/data';
import { formatDateTime, t } from '@shared/strings';
import { SectionTitle, initials, signed } from '../../components/bits';
import { rise, springs } from '../../motion';
import type { Store } from '../../state/useStore';

const typePalette: Record<TransactionType, string> = {
  eventAward: 'brand',
  redemption: 'accent',
  adjustment: 'purple',
  reversal: 'red',
  externalCredit: 'gray',
  externalDebit: 'gray',
};

export function Ledger({ locale, store }: { locale: Locale; store: Store }) {
  const [query, setQuery] = useState('');
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return store.ledger;
    return store.ledger.filter((tx) => tx.employeeName.toLowerCase().includes(q) || tx.employeeNo.toLowerCase().includes(q));
  }, [query, store.ledger]);

  return (
    <Card.Root asChild variant="outline" minW="0">
      <motion.section variants={rise} layout="position" aria-label={t(locale, 'ledger')}>
        <Card.Body p={{ base: '4', md: '5' }} gap="4">
          <SectionTitle compact icon={ScrollText} title={t(locale, 'ledger')}>
            <InputGroup w={{ base: 'full', sm: '260px' }} startElement={<Search size={16} strokeWidth={2.5} aria-hidden />}>
              <Input size="sm" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t(locale, 'search')} aria-label={t(locale, 'search')} fontWeight="medium" />
            </InputGroup>
          </SectionTitle>

          <Table.ScrollArea borderWidth="2px" borderColor="border" borderRadius="l2" maxW="full" position="relative">
            <Table.Root size="sm" variant="line" minW="760px" css={{ '& td, & th': { borderColor: 'border' } }}>
              <Table.Header>
                <Table.Row bg="bg.subtle">
                  {(['colEmployee', 'colType', 'colDescription'] as const).map((key) => (
                    <Table.ColumnHeader key={key} fontWeight="extrabold" fontSize="xs" letterSpacing="0.04em" textTransform="uppercase" color="fg.muted" py="2.5">
                      {t(locale, key)}
                    </Table.ColumnHeader>
                  ))}
                  <Table.ColumnHeader fontWeight="extrabold" fontSize="xs" letterSpacing="0.04em" textTransform="uppercase" color="fg.muted" textAlign="end">
                    {t(locale, 'colAmount')}
                  </Table.ColumnHeader>
                  <Table.ColumnHeader fontWeight="extrabold" fontSize="xs" letterSpacing="0.04em" textTransform="uppercase" color="fg.muted">
                    {t(locale, 'colDate')}
                  </Table.ColumnHeader>
                  <Table.ColumnHeader w="1%">
                    <VisuallyHidden>{t(locale, 'revert')}</VisuallyHidden>
                  </Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                <AnimatePresence initial={false}>
                  {rows.map((tx) => (
                    <LedgerRow key={tx.id} tx={tx} locale={locale} fresh={store.freshLedgerIds.includes(tx.id)} onRevert={store.revert} />
                  ))}
                </AnimatePresence>
              </Table.Body>
            </Table.Root>
            {rows.length === 0 && (
              <Flex justify="center" py="8" color="fg.muted" role="status" aria-label={t(locale, 'search')}>
                <SearchX size={28} strokeWidth={2.2} aria-hidden />
              </Flex>
            )}
          </Table.ScrollArea>
        </Card.Body>
      </motion.section>
    </Card.Root>
  );
}

function LedgerRow({ tx, locale, fresh, onRevert }: { tx: Transaction; locale: Locale; fresh: boolean; onRevert: (tx: Transaction) => void }) {
  const gain = tx.amount > 0;
  const canRevert = !tx.reverted && tx.type !== 'reversal';

  return (
    <Table.Row
      asChild
      bg="bg.panel"
      _hover={{ bg: 'bg.subtle' }}
      // a freshly inserted reversal lights up, then settles
      css={fresh ? { '--flash': 'colors.accent.muted', animation: 'phFlash 2.2s ease-out 1' } : undefined}
    >
      <motion.tr
        layout="position"
        initial={{ opacity: 0, y: -22 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, transition: { duration: 0.14 } }}
        transition={springs.soft}
      >
        <Table.Cell>
          <Flex align="center" gap="2.5" minW="0">
            <Avatar.Root size="xs" colorPalette="brand" variant="subtle" flexShrink={0}>
              <Avatar.Fallback fontWeight="black">{initials(tx.employeeName)}</Avatar.Fallback>
            </Avatar.Root>
            <Box minW="0">
              <Text fontWeight="bold" fontSize="sm" lineHeight="1.3" whiteSpace="nowrap">
                {tx.employeeName}
              </Text>
              <Text color="fg.muted" fontSize="xs" lineHeight="1.3" fontVariantNumeric="tabular-nums">
                {tx.employeeNo}
              </Text>
            </Box>
          </Flex>
        </Table.Cell>
        <Table.Cell>
          <Badge colorPalette={typePalette[tx.type]} variant="subtle" size="sm" px="2">
            {t(locale, `type_${tx.type}`)}
          </Badge>
        </Table.Cell>
        <Table.Cell>
          <Text fontSize="sm" fontWeight="medium" lineHeight="1.35" textDecoration={tx.reverted ? 'line-through' : undefined} color={tx.reverted ? 'fg.muted' : undefined}>
            {pick(tx.title, locale)}
          </Text>
          {tx.source && (
            <Flex align="center" gap="1" mt="0.5" color="fg.muted" fontSize="xs" fontWeight="bold" lineHeight="1.3">
              <Plug size={11} strokeWidth={2.8} aria-hidden />
              {tx.source}
            </Flex>
          )}
        </Table.Cell>
        <Table.Cell textAlign="end">
          <Text
            as="span"
            fontWeight="black"
            fontSize="sm"
            whiteSpace="nowrap"
            color={tx.reverted ? 'fg.muted' : gain ? 'gain' : 'loss'}
            textDecoration={tx.reverted ? 'line-through' : undefined}
          >
            {signed(locale, tx.amount)}
          </Text>
        </Table.Cell>
        <Table.Cell>
          <Text as="span" fontSize="sm" color="fg.muted" fontWeight="medium" whiteSpace="nowrap">
            {formatDateTime(locale, tx.createdAt)}
          </Text>
        </Table.Cell>
        <Table.Cell textAlign="end">
          <AnimatePresence mode="wait" initial={false}>
            {tx.reverted ? (
              <motion.span key="reverted" style={{ display: 'inline-flex' }} initial={{ scale: 0.5, opacity: 0, rotate: -8 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={springs.bouncy}>
                <Badge colorPalette="gray" variant="outline" size="sm" px="2">
                  <Undo2 size={11} strokeWidth={2.8} aria-hidden />
                  {t(locale, 'reverted')}
                </Badge>
              </motion.span>
            ) : canRevert ? (
              <motion.span key="revert" style={{ display: 'inline-flex' }} exit={{ scale: 0.6, opacity: 0, transition: { duration: 0.1 } }}>
                <Button size="xs" variant="outline" onClick={() => onRevert(tx)} aria-label={`${t(locale, 'revert')} – ${tx.employeeName}, ${pick(tx.title, locale)}`}>
                  <Undo2 aria-hidden strokeWidth={2.6} />
                  {t(locale, 'revert')}
                </Button>
              </motion.span>
            ) : null}
          </AnimatePresence>
        </Table.Cell>
      </motion.tr>
    </Table.Row>
  );
}
