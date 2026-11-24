import { Badge, Button, Flex, Text } from '@chakra-ui/react';
import { ArrowLeft, Boxes, ClipboardCheck, Package, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';
import { useAdminGifts } from '../../api/gifts';
import type { Gift } from '../../api/types';
import { GiftThumb } from '../../components/GiftGallery';
import { Page } from '../../components/Page';
import { ErrorBlock, LoadingBlock } from '../../components/states';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { Modal } from '../../components/ui/Modal';
import { Notice } from '../../components/ui/Notice';
import { useFormat, useLocalized } from '../../i18n/hooks';
import { GiftEditor } from './GiftEditor';
import { GiftStockForm } from './GiftStockForm';
import { LinkButton, TwoLine } from './parts';

/** Stock at or below this is called out in the list. */
const LOW_STOCK = 5;

function GiftsTable({ gifts, onEdit }: { gifts: Gift[] | undefined; onEdit: (gift: Gift) => void }) {
  const { t } = useTranslation();
  const format = useFormat();
  const localized = useLocalized();
  const [stocking, setStocking] = useState<Gift | null>(null);

  const columns: Column<Gift>[] = [
    {
      key: 'name',
      header: t('admin.gifts.fields.name'),
      cell: (gift) => (
        <Flex align="center" gap="3" minW="0">
          <GiftThumb images={gift.images} size={40} shape="square" />
          <TwoLine
            primary={<LinkButton onClick={() => onEdit(gift)}>{localized(gift.name)}</LinkButton>}
            secondary={gift.images.length === 0 ? t('admin.gifts.images.none') : t('admin.gifts.images.countShort', { count: gift.images.length })}
          />
        </Flex>
      ),
    },
    {
      key: 'cost',
      header: t('admin.gifts.fields.pointCost'),
      align: 'end',
      numeric: true,
      cell: (gift) => (
        <Text as="span" fontWeight="bold">
          {format.number(gift.pointCost)}
        </Text>
      ),
    },
    {
      key: 'stock',
      header: t('admin.gifts.columns.stock'),
      align: 'end',
      numeric: true,
      cell: (gift) => (
        <Text as="span" fontWeight="black" color={gift.stock === 0 ? 'loss' : gift.stock <= LOW_STOCK ? 'orange.fg' : undefined}>
          {format.number(gift.stock)}
        </Text>
      ),
    },
    {
      key: 'limit',
      header: t('admin.gifts.fields.perEmployeeLimit'),
      align: 'end',
      numeric: true,
      cell: (gift) => (gift.perEmployeeLimit === null ? <Text color="fg.muted">{t('admin.gifts.limit.none')}</Text> : format.number(gift.perEmployeeLimit)),
    },
    {
      key: 'status',
      header: t('admin.gifts.columns.status'),
      cell: (gift) => (
        <Badge colorPalette={gift.isActive ? 'green' : 'gray'} variant="subtle" px="2">
          {gift.isActive ? t('admin.gifts.active') : t('admin.gifts.hidden')}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      shrink: true,
      align: 'end',
      cell: (gift) => (
        <Flex gap="1" justify="flex-end" wrap="nowrap">
          <Button size="xs" variant="subtle" onClick={() => setStocking(gift)} aria-label={`${t('admin.gifts.stockTitle')}: ${localized(gift.name)}`}>
            <Boxes aria-hidden />
            {t('admin.gifts.stockAction')}
          </Button>
          <Button size="xs" variant="ghost" onClick={() => onEdit(gift)} aria-label={`${t('app.edit')}: ${localized(gift.name)}`}>
            <Pencil aria-hidden />
            {t('app.edit')}
          </Button>
        </Flex>
      ),
    },
  ];

  return (
    <>
      <DataTable columns={columns} rows={gifts} rowKey={(gift) => gift.id} minWidth={720} emptyMessage={t('admin.gifts.empty')} emptyIcon={<Package size={26} strokeWidth={2.2} aria-hidden />} />
      <Modal opened={stocking !== null} onClose={() => setStocking(null)} title={t('admin.gifts.stockTitle')}>
        {stocking && <GiftStockForm key={stocking.id} gift={stocking} onDone={() => setStocking(null)} />}
      </Modal>
    </>
  );
}

/**
 * Gift catalog: the list, and the editor for one gift. Which of the two is on screen lives in the URL:
 * `/admin/gifts?edit=<giftId>` opens that gift's editor, `?edit=new` an empty one.
 */
export function GiftsAdminPage() {
  const { t } = useTranslation();
  const localized = useLocalized();
  const gifts = useAdminGifts();
  const [params, setParams] = useSearchParams();
  const edit = params.get('edit');

  const open = (target: string | null, replace = false) => {
    const next = new URLSearchParams(params);
    if (target === null) next.delete('edit');
    else next.set('edit', target);
    setParams(next, { replace });
  };

  if (edit !== null) {
    const gift = edit === 'new' ? null : gifts.data?.find((item) => String(item.id) === edit);
    const back = (
      <Button variant="outline" onClick={() => open(null)}>
        <ArrowLeft aria-hidden />
        {t('admin.gifts.backToList')}
      </Button>
    );
    if (edit !== 'new' && gift === undefined) {
      return (
        <Page title={t('admin.gifts.editGift')} actions={back}>
          {gifts.isPending ? <LoadingBlock /> : gifts.error ? <ErrorBlock error={gifts.error} onRetry={() => void gifts.refetch()} /> : <Notice tone="warning" title={t('errors.not_found')} />}
        </Page>
      );
    }
    return (
      <Page title={gift ? localized(gift.name) : t('admin.gifts.newGift')} subtitle={gift ? t('admin.gifts.editGift') : t('admin.gifts.newGiftHint')} actions={back}>
        <GiftEditor key={gift?.id ?? 'new'} gift={gift ?? null} onCreated={(created) => open(String(created.id), true)} onClose={() => open(null)} />
      </Page>
    );
  }

  return (
    <Page
      title={t('admin.gifts.title')}
      subtitle={t('admin.gifts.subtitle')}
      actions={
        <>
          <Button asChild variant="outline">
            <Link to="/admin/claims">
              <ClipboardCheck aria-hidden />
              {t('nav.claims')}
            </Link>
          </Button>
          <Button onClick={() => open('new')}>
            <Plus aria-hidden />
            {t('admin.gifts.newGift')}
          </Button>
        </>
      }
    >
      {gifts.isPending ? <LoadingBlock /> : gifts.error && !gifts.data ? <ErrorBlock error={gifts.error} onRetry={() => void gifts.refetch()} /> : <GiftsTable gifts={gifts.data} onEdit={(gift) => open(String(gift.id))} />}
    </Page>
  );
}
