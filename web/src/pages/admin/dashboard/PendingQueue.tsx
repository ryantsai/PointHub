import { Avatar, Badge, Box, Button, Center, Flex, IconButton, Text } from '@chakra-ui/react';
import { Check, CheckCheck, ClipboardCheck, PartyPopper, UserCheck, UserPlus, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDecidePendingCheckIn } from '../../../api/host';
import type { CheckIn } from '../../../api/types';
import { AnimatedNumber } from '../../../components/AnimatedNumber';
import { CheckInMethodBadge } from '../../../components/badges';
import { ErrorBlock, LoadingBlock } from '../../../components/states';
import { Points, SectionTitle } from '../../../components/ui/bits';
import { Burst } from '../../../components/ui/Burst';
import { TextAreaField } from '../../../components/ui/fields';
import { Modal } from '../../../components/ui/Modal';
import { Panel } from '../../../components/ui/Panel';
import { useErrorMessage, useFormat, useLocalized } from '../../../i18n/hooks';
import { openConfirm } from '../../../lib/confirm';
import { springs } from '../../../lib/motion';
import { notifyError, notifySuccess } from '../../../lib/notify';
import { initials } from '../../../lib/text';

type Decision = 'approved' | 'rejected';
/** The endpoint returns at most this many rows. */
const QUEUE_CAP = 100;

interface RowProps {
  checkIn: CheckIn;
  /** The decision just made here, stamped on the row until the server's answer removes it. */
  decision: Decision | undefined;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}

function QueueRow({ checkIn, decision, busy, onApprove, onReject }: RowProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const localized = useLocalized();
  const approved = decision === 'approved';
  const rejected = decision === 'rejected';
  const resolved = approved || rejected;
  const name = checkIn.employeeName;

  return (
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
            <motion.div key="stamp" style={{ position: 'absolute', inset: -2 }} initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={springs.bouncy}>
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
          <Points value={checkIn.points} signed size="sm" flexShrink={0} />
        </Flex>
        <Text color="fg.muted" fontSize="xs" fontWeight="medium" lineHeight="1.45" truncate>
          {checkIn.department ? `${checkIn.department} · ` : ''}
          {localized(checkIn.eventTitle)}
        </Text>
        <Flex align="center" columnGap="2" rowGap="1" mt="1" color="fg.muted" fontSize="xs" fontWeight="medium" lineHeight="1.3" wrap="wrap">
          {/* Roster or walk-in: the one fact the decision rests on. Icon and words, not colour alone. */}
          <Badge colorPalette={checkIn.onRoster ? 'green' : 'orange'} variant="subtle" size="xs" px="1.5">
            {checkIn.onRoster ? <UserCheck size={11} strokeWidth={2.8} aria-hidden /> : <UserPlus size={11} strokeWidth={2.8} aria-hidden />}
            {checkIn.onRoster ? t('host.approvals.onRoster') : t('host.approvals.notOnRoster')}
          </Badge>
          <CheckInMethodBadge value={checkIn.method} size="xs" />
          <Box as="span" whiteSpace="nowrap" fontVariantNumeric="tabular-nums">
            {format.dateTime(checkIn.checkedInAt)}
          </Box>
        </Flex>
      </Box>

      <Flex gap="1.5" flexShrink={0}>
        <IconButton size="sm" variant="outline" aria-label={`${t('host.approvals.reject')}: ${name}`} title={t('host.approvals.reject')} disabled={resolved || busy} onClick={onReject}>
          <X aria-hidden strokeWidth={2.8} />
        </IconButton>
        <IconButton size="sm" aria-label={`${t('host.approvals.approve')}: ${name}`} title={t('host.approvals.approve')} disabled={resolved || busy} onClick={onApprove}>
          <Check aria-hidden strokeWidth={3} />
        </IconButton>
      </Flex>
    </Flex>
  );
}

interface PendingQueueProps {
  rows: CheckIn[] | undefined;
  isPending: boolean;
  error: unknown;
  onRetry: () => void;
}

/**
 * Check-ins waiting for approval across every event this person runs, oldest first. Approve or reject per
 * row (the row is stamped, then flies out when the server agrees), or approve everything listed after a
 * confirmation. The list refreshes by itself; the page owns the query so the KPI tile counts the same rows.
 */
export function PendingQueue({ rows, isPending, error, onRetry }: PendingQueueProps) {
  const { t } = useTranslation();
  const errorMessage = useErrorMessage();
  const { mutateAsync: decide } = useDecidePendingCheckIn();
  const [decisions, setDecisions] = useState<Record<number, Decision>>({});
  const [rejecting, setRejecting] = useState<CheckIn | null>(null);
  const [reason, setReason] = useState('');
  const [approvingAll, setApprovingAll] = useState(false);
  // The confetti is for clearing a queue, not for opening an empty one.
  const [hadRows, setHadRows] = useState(false);
  if (!hadRows && rows && rows.length > 0) setHadRows(true);
  const count = rows?.length ?? 0;

  /** Stamps the row at once. Each request reports its own failure, so several can be in flight. `true` = decided. */
  const settle = async (checkIn: CheckIn, decision: Decision, rejectReason: string | null = null): Promise<boolean> => {
    setDecisions((previous) => ({ ...previous, [checkIn.id]: decision }));
    try {
      await decide(decision === 'approved' ? { checkIn, approve: true } : { checkIn, approve: false, reason: rejectReason });
      return true;
    } catch (failure) {
      setDecisions((previous) => {
        const next = { ...previous };
        delete next[checkIn.id];
        return next;
      });
      notifyError(errorMessage(failure));
      return false;
    }
  };

  /** One by one, in the order shown: there is no cross-event "approve all" endpoint, and each row may fail alone. */
  const approveListed = async (listed: CheckIn[]) => {
    setApprovingAll(true);
    let approved = 0;
    for (const checkIn of listed) {
      if (await settle(checkIn, 'approved')) approved += 1;
    }
    setApprovingAll(false);
    if (approved > 0) notifySuccess(t('host.approvals.approvedCount', { count: approved }));
  };

  const confirmApproveAll = () => {
    const listed = (rows ?? []).filter((checkIn) => decisions[checkIn.id] === undefined);
    if (listed.length === 0) return;
    openConfirm({
      title: t('host.approvals.approveAll'),
      children: <Text fontSize="sm">{t('admin.dashboard.approveAllConfirm', { count: listed.length })}</Text>,
      labels: { confirm: t('host.approvals.approve'), cancel: t('app.cancel') },
      onConfirm: () => void approveListed(listed),
    });
  };

  const submitReject = () => {
    if (!rejecting) return;
    const target = rejecting;
    setRejecting(null);
    void settle(target, 'rejected', reason.trim() === '' ? null : reason.trim());
  };

  return (
    <Box as="section" h="full" minW="0" aria-label={t('admin.dashboard.pendingApprovals')}>
      <Panel h="full">
        <SectionTitle compact icon={ClipboardCheck} title={t('admin.dashboard.pendingApprovals')}>
          {rows && (
            <Badge colorPalette={count ? 'accent' : 'green'} variant="solid" size="md" minW="7" justifyContent="center" fontWeight="black">
              <AnimatedNumber value={count} from={count} />
            </Badge>
          )}
          <Button size="sm" onClick={confirmApproveAll} disabled={count === 0} loading={approvingAll}>
            <CheckCheck aria-hidden strokeWidth={2.6} />
            {t('host.approvals.approveAll')}
          </Button>
        </SectionTitle>

        {isPending && <LoadingBlock />}
        {Boolean(error) && !rows && <ErrorBlock error={error} onRetry={onRetry} />}

        {rows && (
          // Fixed-height row on desktop: the queue scrolls inside the card instead of resizing the chart beside it.
          <Box position="relative" flex="1" minH="200px" overflowY={{ xl: 'auto' }} overflowX="hidden" p="1" m="-1">
            <Flex as="ul" direction="column" gap="1.5" listStyleType="none" position="relative" aria-live="polite">
              <AnimatePresence initial={false} mode="popLayout">
                {rows.map((checkIn) => (
                  <motion.li
                    key={checkIn.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0, scale: decisions[checkIn.id] ? 0.985 : 1 }}
                    // approved rows fly out to the right (into the ledger), rejected ones drop away to the left
                    exit={{ opacity: 0, x: decisions[checkIn.id] === 'rejected' ? -72 : 72, scale: 0.94, transition: { duration: 0.24, ease: [0.4, 0, 1, 1] } }}
                    transition={springs.soft}
                  >
                    <QueueRow
                      checkIn={checkIn}
                      decision={decisions[checkIn.id]}
                      busy={approvingAll}
                      onApprove={() => void settle(checkIn, 'approved')}
                      onReject={() => {
                        setReason('');
                        setRejecting(checkIn);
                      }}
                    />
                  </motion.li>
                ))}
              </AnimatePresence>
            </Flex>
            {count >= QUEUE_CAP && (
              <Text mt="2" fontSize="xs" fontWeight="medium" color="fg.muted" textAlign="center">
                {t('admin.dashboard.queueCapped')}
              </Text>
            )}

            <AnimatePresence>
              {count === 0 && (
                <motion.div
                  key="empty"
                  style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ ...springs.bouncy, delay: hadRows ? 0.25 : 0 }}
                >
                  <Box position="relative">
                    <Center boxSize="16" borderRadius="full" bg="accent.subtle" color="accent.fg">
                      <PartyPopper size={30} strokeWidth={2.2} aria-hidden />
                    </Center>
                    <Burst trigger={hadRows ? 1 : 0} count={20} radius={110} />
                  </Box>
                  <Text fontWeight="extrabold" fontSize="lg">
                    {t('admin.dashboard.allCaughtUp')}
                  </Text>
                </motion.div>
              )}
            </AnimatePresence>
          </Box>
        )}

        <Modal
          opened={rejecting !== null}
          onClose={() => setRejecting(null)}
          title={t('host.approvals.rejectTitle')}
          size="sm"
          footer={
            <>
              <Button variant="outline" onClick={() => setRejecting(null)}>
                {t('app.cancel')}
              </Button>
              <Button colorPalette="red" onClick={submitReject}>
                {t('host.approvals.reject')}
              </Button>
            </>
          }
        >
          <Flex direction="column" gap="4">
            <Text fontWeight="bold">{rejecting?.employeeName}</Text>
            <TextAreaField label={t('host.approvals.rejectReason')} value={reason} onChange={setReason} rows={2} />
          </Flex>
        </Modal>
      </Panel>
    </Box>
  );
}
