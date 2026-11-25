import { useTranslation } from 'react-i18next';
import { GiftCatalog } from '../components/GiftCatalog';
import { Page } from '../components/Page';

/** `/gifts`: every gift that can be claimed, most popular first, with search, sort and filters. Claims made live on `/claims`. */
export function GiftsPage() {
  const { t } = useTranslation();
  return (
    <Page title={t('gifts.title')} subtitle={t('gifts.subtitle')}>
      <GiftCatalog controls />
    </Page>
  );
}
