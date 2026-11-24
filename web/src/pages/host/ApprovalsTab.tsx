import { Avatar, Badge, Box, Button, Center, Flex, IconButton, SegmentGroup, Text } from '@chakra-ui/react';
import { Check, CheckCheck, PartyPopper, UserCheck, UserPlus, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApproveAll, useDecideCheckIn, useEventCheckIns } from '../../api/host';
import type { CheckIn, CheckInStatus, EventDetail } from '../../api/types';
import { CheckInMethodBadge, CheckInStatusBadge } from '../../components/badges';
import { EmptyState, ErrorBlock, LoadingBlock } from '../../components/states';
import { Points } from '../../components/ui/bits';
import { Burst } from '../../components/ui/Burst';
import { TextAreaField } from '../../components/ui/fields';
import { Modal } from '../../components/ui/Modal';
import { Notice } from '../../components/ui/Notice';
import { useErrorMessage, useFormat } from '../../i18n/hooks';
import { openConfirm } from '../../lib/confirm';
import { springs } from '../../lib/motion';
import { notifyError, notifySuccess } from '../../lib/notify';
import { initials } from '../../lib/text';

type Filter = CheckInStatus | 'all';
const FILTERS: Filter[] = ['pending', 'approved', 'rejected', 'all'];
const REFRESH_MS = 3000;

type Decision = 'approved' | 'rejected';

interface RowProps {
  checkIn: CheckIn;
  /** The decision just made here, shown as a stamp until the server's answer moves the row. */
  decision: Decision | undefined;
  onApprove: () => void;
  onReject: () => void;
}

function CheckInRow({ checkIn, decision, onApprove, onReject }: RowProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const stamped = checkIn.status === 'pending' ? decision : undefined;
  const approved = stamped === 'approved';
  const rejected = stamped === 'rejected';

  return (
    <Flex
      align="center"
      gap="3"
      px={{ base: '3', md: '4' }}
      py="3"
      borderRadius="l3"
      borderWidth="2px"
      borderColor={approved ? 'green.solid' : rejected ? 'red.solid' : 'border'}
      bg={approved ? 'green.subtle' : rejected ? 'red.subtle' : 'bg.panel'}
      boxShadow="0 3px 0 0 {colors.border}"
      wrap={{ base: 'wrap', sm: 'nowrap' }}
      css={{ transition: 'background-color 160ms, border-color 160ms' }}
      _hover={stamped ? undefined : { borderColor: 'border.emphasized' }}
    >
      <Box position="relative" flexShrink={0}>
        <Avatar.Root size="md" colorPalette="brand" variant="subtle">
          <Avatar.Fallback fontWeight="black">{initials(checkIn.employeeName)}</Avatar.Fallback>
        </Avatar.Root>
        <AnimatePresence>
          {stamped && (
            <motion.div key="stamp" style={{ position: 'absolute', inset: -2 }} initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={springs.bouncy}>
              <Center boxSize="full" borderRadius="full" bg={approved ? 'green.solid' : 'red.solid'} color="white">
                {approved ? <Check size={20} strokeWidth={3.5} aria-hidden /> : <X size={20} strokeWidth={3.5} aria-hidden />}
              </Center>
            </motion.div>
          )}
        </AnimatePresence>
      </Box>

      <Box flex="1" minW="0">
        <Flex align="center" columnGap="2.5" rowGap="1" wrap="wrap">
          <Text fontWeight="extrabold" lineHeight="1.3">
            {checkIn.employeeName}
          </Text>
          {(checkIn.status === 'pending' || checkIn.status === 'approved') && <Points value={checkIn.points} signed size="sm" />}
        </Flex>
        <Text color="fg.muted" fontSize="xs" fontWeight="medium" lineHeight="1.5" mt="0.5">
          {checkIn.employeeNo}
          {checkIn.department ? ` · ${checkIn.department}` : ''}
          {' · '}
          {format.dateTime(checkIn.checkedInAt)}
          {checkIn.decidedByName ? ` · ${t('host.approvals.decidedBy', { name: checkIn.decidedByName })}` : ''}
        </Text>
        <Flex align="center" gap="1.5" wrap="wrap" mt="1.5">
          {/* Roster or walk-in: the one fact an event admin decides on. Icon and words, not colour alone. */}
          <Badge colorPalette={checkIn.onRoster ? 'green' : 'orange'} variant="subtle" size="sm" px="2">
            {checkIn.onRoster ? <UserCheck size={12} strokeWidth={2.8} aria-hidden /> : <UserPlus size={12} strokeWidth={2.8} aria-hidden />}
            {checkIn.onRoster ? t('host.approvals.onRoster') : t('host.approvals.notOnRoster')}
          </Badge>
          <CheckInMethodBadge value={checkIn.method} size="sm" />
        </Flex>
        {checkIn.note && (
          <Text fontSize="xs" fontWeight="medium" mt="1.5">
            {checkIn.note}
          </Text>
        )}
      </Box>

      {checkIn.status === 'pending' ? (
        <Flex gap="2" flexShrink={0} ml="auto">
          <IconButton
            variant="subtle"
            colorPalette="red"
            disabled={Boolean(stamped)}
            onClick={onReject}
            aria-label={`${t('host.approvals.reject')}: ${checkIn.employeeName}`}
            title={t('host.approvals.reject')}
          >
            <X strokeWidth={2.8} aria-hidden />
          </IconButton>
          <Button colorPalette="green" disabled={Boolean(stamped)} onClick={onApprove} aria-label={`${t('host.approvals.approve')}: ${checkIn.employeeName}`}>
            <Check strokeWidth={3} aria-hidden />
            {t('host.approvals.approve')}
          </Button>
        </Flex>
      ) : (
        <CheckInStatusBadge value={checkIn.status} size="md" flexShrink={0} ml="auto" />
      )}
    </Flex>
  );
}

export function ApprovalsTab({ event }: { event: EventDetail }) {
  const { t } = useTranslation();
  const errorMessage = useErrorMessage();
  const [filter, setFilter] = useState<Filter>('pending');
  const checkIns = useEventCheckIns(event.id, filter === 'all' ? null : filter, REFRESH_MS);
  const { mutateAsync: decide, isPending: deciding } = useDecideCheckIn(event.id);
  const approveAll = useApproveAll(event.id);
  const [rejecting, setRejecting] = useState<CheckIn | null>(null);
  const [reason, setReason] = useState('');
  const [decisions, setDecisions] = useState<Record<number, Decision>>({});
  // The confetti is for clearing a queue, not for opening an empty one.
  const [hadRows, setHadRows] = useState(false);
  const rows = checkIns.data;
  if (!hadRows && filter === 'pending' && rows && rows.length > 0) setHadRows(true);

  const onError = (error: unknown) => notifyError(errorMessage(error));

  /** Stamps the row at once; each request reports its own failure, so several can be in flight. */
  const settle = (checkIn: CheckIn, decision: Decision, rejectReason: string | null = null) => {
    setDecisions((previous) => ({ ...previous, [checkIn.id]: decision }));
    return decide(decision === 'approved' ? { id: checkIn.id, approve: true } : { id: checkIn.id, approve: false, reason: rejectReason }).catch((error: unknown) => {
      setDecisions((previous) => {
        const next = { ...previous };
        delete next[checkIn.id];
        return next;
      });
      onError(error);
    });
  };

  const confirmApproveAll = (onlyRoster: boolean) =>
    openConfirm({
      title: onlyRoster ? t('host.approvals.approveRoster') : t('host.approvals.approveAll'),
      children: <Text fontSize="sm">{onlyRoster ? t('host.approvals.approveRosterConfirm') : t('host.approvals.approveAllConfirm')}</Text>,
      labels: { confirm: t('host.approvals.approve'), cancel: t('app.cancel') },
      onConfirm: () =>
        approveAll.mutate(onlyRoster, {
          onSuccess: (result) => notifySuccess(t('host.approvals.approvedCount', { count: result.approved })),
          onError,
        }),
    });

  const submitReject = () => {
    if (!rejecting) return;
    void settle(rejecting, 'rejected', reason.trim() === '' ? null : reason.trim()).finally(() => setRejecting(null));
  };

  return (
    <Flex direction="column" gap="4">
      <Flex justify="space-between" align="center" wrap="wrap" gap="3">
        <Box overflowX="auto" maxW="full">
          <SegmentGroup.Root
            size="sm"
            value={filter}
            onValueChange={(details) => {
              if (!details.value) return;
              setFilter(details.value as Filter);
              setHadRows(false);
            }}
          >
            <SegmentGroup.Indicator />
            {FILTERS.map((value) => (
              <SegmentGroup.Item key={value} value={value}>
                <SegmentGroup.ItemText>{value === 'all' ? t('app.all') : t(`checkInStatus.${value}`)}</SegmentGroup.ItemText>
                <SegmentGroup.ItemHiddenInput />
              </SegmentGroup.Item>
            ))}
          </SegmentGroup.Root>
        </Box>
        <Flex gap="2" wrap="wrap">
          <Button variant="outline" disabled={event.counts.pending === 0} loading={approveAll.isPending} onClick={() => confirmApproveAll(true)}>
            <UserCheck strokeWidth={2.5} aria-hidden />
            {t('host.approvals.approveRoster')}
          </Button>
          <Button disabled={event.counts.pending === 0} loading={approveAll.isPending} onClick={() => confirmApproveAll(false)}>
            <CheckCheck strokeWidth={2.6} aria-hidden />
            {t('host.approvals.approveAll')}
          </Button>
        </Flex>
      </Flex>

      {event.approvalMode !== 'manual' && <Notice tone="info">{t(`approvalModeHelp.${event.approvalMode}`)}</Notice>}
      {checkIns.isPending && <LoadingBlock />}
      {checkIns.error && !rows && <ErrorBlock error={checkIns.error} onRetry={() => void checkIns.refetch()} />}

      {/* Approved rows fly out to the right (towards the ledger), rejected ones drop away to the left. */}
      <Flex as="ul" direction="column" gap="2.5" listStyleType="none" aria-live="polite" position="relative">
        <AnimatePresence initial={false} mode="popLayout">
          {rows?.map((checkIn) => (
            <motion.li
              key={checkIn.id}
              layout
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: decisions[checkIn.id] === 'rejected' ? -72 : 72, scale: 0.94, transition: { duration: 0.24, ease: [0.4, 0, 1, 1] } }}
              transition={springs.soft}
            >
              <CheckInRow
                checkIn={checkIn}
                decision={decisions[checkIn.id]}
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

      {rows?.length === 0 &&
        (filter === 'pending' ? (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ ...springs.bouncy, delay: hadRows ? 0.25 : 0 }}>
            <EmptyState
              message={t('host.approvals.emptyPending')}
              icon={
                <Box position="relative" lineHeight="0">
                  <PartyPopper size={26} strokeWidth={2.2} aria-hidden />
                  <Burst trigger={hadRows ? 1 : 0} count={20} radius={110} />
                </Box>
              }
            />
          </motion.div>
        ) : (
          <EmptyState message={t('host.approvals.empty')} />
        ))}

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
            <Button colorPalette="red" loading={deciding} onClick={submitReject}>
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
    </Flex>
  );
}
