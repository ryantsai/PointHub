import { type CSSProperties, useMemo, useState } from 'react';
import { Badge, Button, Table, TextInput, VisuallyHidden } from '@mantine/core';
import { IconArrowBackUp, IconPlugConnected, IconSearch } from '@tabler/icons-react';
import { AnimatePresence, motion } from 'motion/react';
import { type Locale, pick, type Transaction, type TransactionType } from '@shared/data';
import { formatDateTime, t } from '@shared/strings';
import { signed } from '../../lib/format';
import { rise, softSpring } from '../../lib/motion';
import type { AdminStore } from '../../state/stores';
import classes from './Admin.module.css';

const MotionTr = motion.create(Table.Tr);

// Badge colours go through Mantine's Badge CSS variables so each type keeps AA contrast in every season.
const typeStyle: Record<TransactionType, CSSProperties> = {
  eventAward: { '--badge-bg': 'var(--mx-tint)', '--badge-color': 'var(--mx-primary-text)' } as CSSProperties,
  redemption: { '--badge-bg': 'var(--mx-accent-tint)', '--badge-color': 'var(--mx-accent-text)' } as CSSProperties,
  adjustment: { '--badge-bg': 'var(--mx-surface-2)', '--badge-color': 'var(--mx-text)' } as CSSProperties,
  reversal: { '--badge-bg': 'var(--mx-neg-tint)', '--badge-color': 'var(--mx-neg)' } as CSSProperties,
  externalCredit: { '--badge-bg': 'transparent', '--badge-color': 'var(--mx-text)', '--badge-bd': '1px solid var(--mx-border)' } as CSSProperties,
  externalDebit: { '--badge-bg': 'transparent', '--badge-color': 'var(--mx-text)', '--badge-bd': '1px solid var(--mx-border)' } as CSSProperties,
};

const isFresh = (row: Transaction) => Date.now() - Date.parse(row.createdAt) < 1500;

export function Ledger({ locale, store }: { locale: Locale; store: AdminStore }) {
  const [query, setQuery] = useState('');
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return store.ledger;
    return store.ledger.filter((row) => row.employeeName.toLowerCase().includes(q) || row.employeeNo.toLowerCase().includes(q));
  }, [query, store.ledger]);

  return (
    <motion.section className={`${classes.card} ${classes.ledger}`} variants={rise} aria-labelledby="mx-ledger">
      <header className={classes.cardHead}>
        <h2 id="mx-ledger" className={classes.cardTitle}>
          {t(locale, 'ledger')}
          <span className={`${classes.countPill} mx-num`}>{rows.length}</span>
        </h2>
        <TextInput
          className={classes.search}
          size="sm"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          placeholder={t(locale, 'search')}
          aria-label={t(locale, 'search')}
          leftSection={<IconSearch size={16} stroke={1.9} />}
        />
      </header>

      <Table.ScrollContainer className={classes.tableScroll} minWidth={720} type="native">
        <Table className={classes.table} verticalSpacing="sm" horizontalSpacing="md" highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t(locale, 'colEmployee')}</Table.Th>
              <Table.Th>{t(locale, 'colType')}</Table.Th>
              <Table.Th>{t(locale, 'colDescription')}</Table.Th>
              <Table.Th ta="right">{t(locale, 'colAmount')}</Table.Th>
              <Table.Th>{t(locale, 'colDate')}</Table.Th>
              <Table.Th ta="right">
                <VisuallyHidden>{t(locale, 'revert')}</VisuallyHidden>
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            <AnimatePresence initial={false}>
              {rows.map((row) => (
                <MotionTr
                  key={row.id}
                  layout="position"
                  className={classes.row}
                  data-reverted={row.reverted || undefined}
                  data-fresh={isFresh(row) || undefined}
                  initial={{ opacity: 0, y: -26 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, transition: { duration: 0.14 } }}
                  transition={softSpring}
                >
                  <Table.Td>
                    <span className={classes.rowName}>{row.employeeName}</span>
                    <span className={`${classes.rowNo} mx-num`}>{row.employeeNo}</span>
                  </Table.Td>
                  <Table.Td>
                    <Badge size="sm" variant="light" miw="max-content" style={typeStyle[row.type]}>
                      {t(locale, `type_${row.type}`)}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <span className={classes.rowTitle}>{pick(row.title, locale)}</span>
                    {row.source && (
                      <span className={classes.rowSource}>
                        <IconPlugConnected size={13} stroke={1.8} aria-hidden="true" />
                        {row.source}
                      </span>
                    )}
                  </Table.Td>
                  <Table.Td ta="right">
                    <span className={`${classes.rowAmount} mx-num`} data-sign={row.amount >= 0 ? 'plus' : 'minus'}>
                      {signed(locale, row.amount)}
                    </span>
                  </Table.Td>
                  <Table.Td className={`${classes.rowDate} mx-num`}>{formatDateTime(locale, row.createdAt)}</Table.Td>
                  <Table.Td ta="right" className={classes.rowAction}>
                    <AnimatePresence mode="popLayout" initial={false}>
                      {row.reverted ? (
                        <motion.span key="done" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ display: 'inline-block' }}>
                          <Badge size="sm" variant="default" miw="max-content">
                            {t(locale, 'reverted')}
                          </Badge>
                        </motion.span>
                      ) : row.type !== 'reversal' ? (
                        <motion.span key="go" exit={{ scale: 0.6, opacity: 0 }} transition={{ duration: 0.14 }} style={{ display: 'inline-block' }}>
                          <Button
                            size="compact-sm"
                            variant="subtle"
                            leftSection={<IconArrowBackUp size={15} stroke={2} />}
                            onClick={() => store.revert(row.id)}
                            aria-label={`${t(locale, 'revert')}: ${row.employeeName}, ${pick(row.title, locale)}`}
                          >
                            {t(locale, 'revert')}
                          </Button>
                        </motion.span>
                      ) : null}
                    </AnimatePresence>
                  </Table.Td>
                </MotionTr>
              ))}
            </AnimatePresence>
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </motion.section>
  );
}
