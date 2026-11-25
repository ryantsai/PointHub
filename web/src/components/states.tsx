import { Button, ButtonGroup, Center, Flex, IconButton, Pagination, Text, VisuallyHidden } from '@chakra-ui/react';
import { ChevronLeft, ChevronRight, Inbox, SearchX } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useErrorMessage } from '../i18n/hooks';
import { PixelSprite } from '../themes/sprites/PixelSprite';
import type { Sprite } from '../themes/sprites/types';
import { Notice } from './ui/Notice';
import { ThemeSprite } from './ui/ThemeSprite';

/** Loading placeholder: the active theme's sprite, bobbing. `fullHeight` centres it in the window (route guards). */
export function LoadingBlock({ fullHeight }: { fullHeight?: boolean }) {
  const { t } = useTranslation();
  return (
    <Center py="10" minH={fullHeight ? '100dvh' : undefined} role="status">
      <ThemeSprite scale={3} bob />
      <VisuallyHidden>{t('app.loading')}</VisuallyHidden>
    </Center>
  );
}

/** Translated API error with an optional retry button. */
export function ErrorBlock({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useTranslation();
  const errorMessage = useErrorMessage();
  return (
    <Notice tone="error" title={errorMessage(error)}>
      {onRetry && (
        <Button size="xs" variant="outline" mt="1" onClick={onRetry}>
          {t('app.retry')}
        </Button>
      )}
    </Notice>
  );
}

interface EmptyStateProps {
  message: string;
  /** An icon element (24–28 px). Default: an inbox. */
  icon?: ReactNode;
  /** A pixel sprite instead of the icon. */
  sprite?: Sprite;
  /** A call to action under the message. */
  children?: ReactNode;
}

export function EmptyState({ message, icon, sprite, children }: EmptyStateProps) {
  return (
    <Flex direction="column" align="center" gap="3" py="10" textAlign="center">
      {sprite ? (
        <PixelSprite sprite={sprite} scale={3} />
      ) : (
        <Center boxSize="14" borderRadius="full" bg="bg.muted" color="fg.muted" borderWidth="2px" borderColor="border.emphasized">
          {icon ?? <Inbox size={26} strokeWidth={2.2} aria-hidden />}
        </Center>
      )}
      <Text color="fg.muted" fontSize="sm" fontWeight="semibold" maxW="sm" textShadow="0 0 2px {colors.bg}, 0 0 6px {colors.bg}">
        {message}
      </Text>
      {children}
    </Flex>
  );
}

/** A search that found nothing: says what was searched for and offers the way back to the whole list. */
export function NoMatch({ q, onClear }: { q: string; onClear: () => void }) {
  const { t } = useTranslation();
  return (
    <EmptyState message={t('filters.noMatch', { q })} icon={<SearchX size={26} strokeWidth={2.2} aria-hidden />}>
      <Button size="sm" variant="outline" onClick={onClear}>
        {t('filters.clearSearch')}
      </Button>
    </EmptyState>
  );
}

interface PagerProps {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}

/** Total count on the left, page buttons on the right. The buttons are hidden when everything fits on one page. */
export function Pager({ page, pageSize, total, onChange }: PagerProps) {
  const { t } = useTranslation();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <Flex justify="space-between" align="center" wrap="wrap" gap="2">
      <Text fontSize="sm" color="fg.muted" fontWeight="medium">
        {t('app.total', { count: total })}
      </Text>
      {pages > 1 && (
        <Pagination.Root count={total} pageSize={pageSize} page={page} siblingCount={1} onPageChange={(details) => onChange(details.page)}>
          <ButtonGroup variant="ghost" size="xs" gap="1">
            <Pagination.PrevTrigger asChild>
              <IconButton aria-label={t('app.previousPage')}>
                <ChevronLeft />
              </IconButton>
            </Pagination.PrevTrigger>
            <Pagination.Items
              render={(item) => (
                <IconButton variant={{ base: 'ghost', _selected: 'solid' }} fontVariantNumeric="tabular-nums">
                  {item.value}
                </IconButton>
              )}
            />
            <Pagination.NextTrigger asChild>
              <IconButton aria-label={t('app.nextPage')}>
                <ChevronRight />
              </IconButton>
            </Pagination.NextTrigger>
          </ButtonGroup>
        </Pagination.Root>
      )}
    </Flex>
  );
}
