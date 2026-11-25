import { Badge, Box, Button, Flex, Grid, Progress, Text } from '@chakra-ui/react';
import { ChevronRight, Package, PackageX, TriangleAlert } from 'lucide-react';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useAdminGifts, useGifts } from '../../../api/gifts';
import type { Gift } from '../../../api/types';
import { AnimatedNumber } from '../../../components/AnimatedNumber';
import { GiftThumb } from '../../../components/GiftGallery';
import { EmptyState, ErrorBlock, LoadingBlock } from '../../../components/states';
import { Coin, SectionTitle } from '../../../components/ui/bits';
import { Panel } from '../../../components/ui/Panel';
import { useFormat, useLocalized } from '../../../i18n/hooks';
import { LOW_STOCK } from '../../../lib/gifts';
import { itemVariants, listVariants } from '../../../lib/motion';

/** The bar is full at this level, so the long tail of well-stocked gifts does not flatten the rest. */
const FULL_BAR = 50;

/** What needs attention first: out of stock, then low, then the rest; hidden gifts last. */
function byUrgency(a: Gift, b: Gift) {
  if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
  return a.stock - b.stock;
}

function StockItem({ gift, editable }: { gift: Gift; editable: boolean }) {
  const { t } = useTranslation();
  const format = useFormat();
  const localized = useLocalized();
  const out = gift.stock <= 0;
  const low = !out && gift.stock <= LOW_STOCK;
  const name = localized(gift.name);

  const body = (
    <Flex
      align="center"
      gap="3"
      p="3"
      h="full"
      borderRadius="l2"
      borderWidth="2px"
      borderColor={out ? 'red.muted' : low ? 'orange.muted' : 'border'}
      bg={out ? 'red.subtle' : low ? 'orange.subtle' : 'bg.subtle'}
      colorPalette={out ? 'red' : low ? 'orange' : 'brand'}
      opacity={gift.isActive ? 1 : 0.7}
      transition="border-color 160ms, transform 160ms"
      _groupHover={{ borderColor: 'border.emphasized', transform: 'translateY(-2px)' }}
    >
      <GiftThumb images={gift.images} size={44} shape="square" />
      <Box flex="1" minW="0">
        <Flex align="baseline" justify="space-between" gap="2">
          <Text fontWeight="extrabold" fontSize="sm" lineHeight="1.3" truncate>
            {name}
          </Text>
          <Flex align="center" gap="1" flexShrink={0} fontSize="xs" fontWeight="black" color="fg.muted" title={t('admin.gifts.fields.pointCost')}>
            <Coin size={13} />
            <span>{format.number(gift.pointCost)}</span>
          </Flex>
        </Flex>
        <Flex align="center" gap="2" mt="1.5">
          <Progress.Root value={Math.max(0, Math.min(100, (gift.stock / FULL_BAR) * 100))} size="sm" flex="1" aria-label={t('admin.dashboard.stockLabel', { count: gift.stock })}>
            <Progress.Track borderRadius="full" bg="bg.emphasized">
              <Progress.Range borderRadius="full" css={{ transition: 'width 600ms cubic-bezier(0.3, 1.2, 0.5, 1)' }} />
            </Progress.Track>
          </Progress.Root>
          {!gift.isActive && (
            <Badge colorPalette="gray" variant="subtle" size="sm" px="2">
              {t('admin.gifts.disabledChip')}
            </Badge>
          )}
          {out ? (
            <Badge colorPalette="red" variant="solid" size="sm" px="2">
              <PackageX size={12} strokeWidth={2.6} aria-hidden />
              {t('gifts.outOfStock')}
            </Badge>
          ) : (
            <Badge colorPalette={low ? 'orange' : 'gray'} variant={low ? 'solid' : 'subtle'} size="sm" px="2" fontWeight="black" title={low ? t('admin.dashboard.lowStock') : t('admin.gifts.columns.stock')}>
              {low && <TriangleAlert size={12} strokeWidth={2.8} aria-label={t('admin.dashboard.lowStock')} />}
              <AnimatedNumber value={gift.stock} from={gift.stock} />
            </Badge>
          )}
        </Flex>
      </Box>
    </Flex>
  );

  return (
    <motion.li variants={itemVariants} style={{ minWidth: 0 }}>
      {editable ? (
        <Box asChild display="block" h="full" borderRadius="l2" focusVisibleRing="outside" className="group">
          <Link to={`/admin/gifts?edit=${gift.id}`} aria-label={`${t('app.edit')}: ${name}`}>
            {body}
          </Link>
        </Box>
      ) : (
        body
      )}
    </motion.li>
  );
}

interface StockPanelProps {
  gifts: Gift[] | undefined;
  isPending: boolean;
  error: unknown;
  onRetry: () => void;
  /** Items open the gift editor, and the header links to gift management. */
  editable: boolean;
}

function StockPanel({ gifts, isPending, error, onRetry, editable }: StockPanelProps) {
  const { t } = useTranslation();
  let content: ReactNode = null;
  if (isPending) content = <LoadingBlock />;
  else if (error && !gifts) content = <ErrorBlock error={error} onRetry={onRetry} />;
  else if (gifts && gifts.length === 0) content = <EmptyState message={t('admin.gifts.empty')} icon={<Package size={26} strokeWidth={2.2} aria-hidden />} />;
  else if (gifts) {
    content = (
      <Grid asChild templateColumns={{ base: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(3, minmax(0, 1fr))' }} gap="3">
        <motion.ul variants={listVariants} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-30px' }} style={{ listStyle: 'none' }}>
          {[...gifts].sort(byUrgency).map((gift) => (
            <StockItem key={gift.id} gift={gift} editable={editable} />
          ))}
        </motion.ul>
      </Grid>
    );
  }
  return (
    <Box as="section" minW="0" aria-label={t('admin.dashboard.stockTitle')}>
      <Panel>
        <SectionTitle compact icon={Package} title={t('admin.dashboard.stockTitle')}>
          {editable && (
            <Button asChild variant="ghost" size="xs">
              <Link to="/admin/gifts">
                {t('admin.dashboard.manageGifts')}
                <ChevronRight aria-hidden />
              </Link>
            </Button>
          )}
        </SectionTitle>
        {content}
      </Panel>
    </Box>
  );
}

function AdminStock() {
  const gifts = useAdminGifts();
  return <StockPanel gifts={gifts.data} isPending={gifts.isPending} error={gifts.error} onRetry={() => void gifts.refetch()} editable />;
}

function CatalogStock() {
  const gifts = useGifts();
  return <StockPanel gifts={gifts.data} isPending={gifts.isPending} error={gifts.error} onRetry={() => void gifts.refetch()} editable={false} />;
}

/**
 * Stock of every gift, the ones running out first, low and empty ones called out with colour, an icon and
 * words. People who manage gifts get the full list (hidden gifts included) and each item opens its editor.
 * Everyone else on the dashboard (auditors) may not call the admin list, so they see the public catalogue,
 * read-only.
 */
export function StockList({ editable }: { editable: boolean }) {
  return editable ? <AdminStock /> : <CatalogStock />;
}
