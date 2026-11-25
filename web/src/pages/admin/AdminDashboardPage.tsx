import { Badge, Grid } from '@chakra-ui/react';
import { Eye } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useAdminStats } from '../../api/admin';
import { usePendingCheckIns } from '../../api/host';
import { Page } from '../../components/Page';
import { ErrorBlock, LoadingBlock } from '../../components/states';
import { itemVariants } from '../../lib/motion';
import { can } from '../../lib/roles';
import { useSession } from '../../lib/session';
import { KpiRow } from './dashboard/KpiRow';
import { PendingQueue } from './dashboard/PendingQueue';
import { StockList } from './dashboard/StockList';
import { TrendChart } from './dashboard/TrendChart';

/** The pending endpoint returns at most this many rows; beyond it the stats carry the true count. */
const QUEUE_CAP = 100;

/**
 * Landing page of the management side for system admins and auditors: KPI row, issued-vs-redeemed chart,
 * the approvals queue and gift stock. Composed like the "Arcade" design's admin view.
 *
 * What a person may not do is not drawn: the approvals queue needs the right to decide check-ins (an auditor
 * has none, and the API would refuse the list), and stock items only open the editor for people who manage gifts.
 * Lazy-loaded (see `dashboardLoader.ts`): this chunk carries the chart library.
 */
export function AdminDashboardPage() {
  const { t } = useTranslation();
  const me = useSession();
  const canDecide = can.host(me);
  const canManageGifts = can.manageGifts(me);
  const stats = useAdminStats();
  const pending = usePendingCheckIns(canDecide);

  // The tile counts the rows of the live queue, so it drops the moment a row leaves.
  const queueLength = pending.data?.length;
  const pendingCount = queueLength === undefined || queueLength >= QUEUE_CAP ? Math.max(stats.data?.pendingCheckIns ?? 0, queueLength ?? 0) : queueLength;
  const twoUp = Boolean(stats.data) && canDecide;

  return (
    <Page
      title={t('admin.dashboard.title')}
      subtitle={t('admin.dashboard.subtitle')}
      actions={
        !can.admin(me) && (
          <Badge variant="subtle" colorPalette="gray" size="lg" px="3">
            <Eye size={14} strokeWidth={2.5} aria-hidden />
            {t('admin.dashboard.readOnly')}
          </Badge>
        )
      }
    >
      {stats.isPending && <LoadingBlock />}
      {stats.error && !stats.data && (
        <motion.div variants={itemVariants}>
          <ErrorBlock error={stats.error} onRetry={() => void stats.refetch()} />
        </motion.div>
      )}
      {stats.data && <KpiRow stats={stats.data} pendingCount={pendingCount} claimsLink={canManageGifts} />}

      {(stats.data || canDecide) && (
        <Grid asChild templateColumns={{ base: 'minmax(0, 1fr)', xl: twoUp ? 'minmax(0, 1.1fr) minmax(0, 1fr)' : 'minmax(0, 1fr)' }} gap="5" alignItems="stretch" gridAutoRows={{ xl: twoUp ? '560px' : canDecide ? 'auto' : '460px' }}>
          <motion.div variants={itemVariants}>
            {stats.data && <TrendChart weeks={stats.data.weeks} />}
            {canDecide && <PendingQueue rows={pending.data} isPending={pending.isPending} error={pending.error} onRetry={() => void pending.refetch()} />}
          </motion.div>
        </Grid>
      )}

      <motion.div variants={itemVariants}>
        <StockList editable={canManageGifts} />
      </motion.div>
    </Page>
  );
}
