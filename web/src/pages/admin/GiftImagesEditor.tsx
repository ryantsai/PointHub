import { Badge, Box, Button, Flex, Grid, IconButton, Progress, Text } from '@chakra-ui/react';
import { ChevronLeft, ChevronRight, CircleAlert, ImagePlus, Images, Star, Trash2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GIFT_IMAGE_LIMITS, useDeleteGiftImage, useReorderGiftImages, useUploadGiftImage } from '../../api/gifts';
import type { Gift, GiftImage } from '../../api/types';
import { FileDropZone } from '../../components/ui/FileDropZone';
import { useErrorMessage, useFormat } from '../../i18n/hooks';
import { appUrl } from '../../lib/basePath';
import { openConfirm } from '../../lib/confirm';
import { springs } from '../../lib/motion';
import { notifyError, notifySuccess } from '../../lib/notify';

const { maxImages, maxBytes, mimeTypes, extensions } = GIFT_IMAGE_LIMITS;
const ACCEPT = [...mimeTypes, ...extensions];
/** While tiles are still sliding to their new places, a drag must not swap them straight back. */
const SWAP_PAUSE_MS = 220;

interface QueueItem {
  id: number;
  name: string;
  status: 'queued' | 'uploading' | 'error';
  /** 0–1 while uploading. */
  progress: number;
  error?: string;
}

function isSupportedPicture(file: File): boolean {
  if (file.type !== '') return (mimeTypes as readonly string[]).includes(file.type);
  const name = file.name.toLowerCase();
  return extensions.some((extension) => name.endsWith(extension));
}

function move<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/**
 * Pictures of one gift: upload several at once (checked here first, then one request per file so every file
 * gets its own progress and its own answer), reorder by dragging or with the arrow buttons, delete.
 * Every change is saved at once; the first picture is the cover.
 */
export function GiftImagesEditor({ gift }: { gift: Gift }) {
  const { t } = useTranslation();
  const format = useFormat();
  const errorMessage = useErrorMessage();
  const upload = useUploadGiftImage(gift.id);
  const remove = useDeleteGiftImage(gift.id);
  const reorder = useReorderGiftImages(gift.id);

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const waiting = useRef<{ id: number; file: File }[]>([]);
  const running = useRef(false);
  const nextId = useRef(1);
  const picker = useRef<HTMLInputElement>(null);

  // Local order while a drag is in progress or its save is on the way; otherwise the server's order.
  const [draft, setDraft] = useState<string[] | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const lastSwap = useRef(0);

  const byId = new Map(gift.images.map((image) => [image.id, image]));
  const images: GiftImage[] = draft
    ? [...draft.flatMap((id) => byId.get(id) ?? []), ...gift.images.filter((image) => !draft.includes(image.id))]
    : gift.images;
  const order = images.map((image) => image.id);
  const inFlight = queue.filter((item) => item.status !== 'error').length;
  const free = Math.max(0, maxImages - gift.images.length - inFlight);
  const failed = queue.filter((item) => item.status === 'error');

  const patch = (id: number, change: Partial<QueueItem>) => setQueue((current) => current.map((item) => (item.id === id ? { ...item, ...change } : item)));

  const run = async () => {
    if (running.current) return;
    running.current = true;
    for (let next = waiting.current.shift(); next; next = waiting.current.shift()) {
      const { id, file } = next;
      patch(id, { status: 'uploading' });
      try {
        await upload(file, (fraction) => patch(id, { progress: fraction }));
        setQueue((current) => current.filter((item) => item.id !== id)); // its thumbnail is in the grid now
      } catch (error) {
        patch(id, { status: 'error', error: errorMessage(error) });
      }
    }
    running.current = false;
  };

  /** `refused`: files the drop zone already turned away because of their type. */
  const addFiles = (files: File[], refused: File[] = []) => {
    let slots = free;
    const added: QueueItem[] = [];
    const reject = (file: File, error: string) => added.push({ id: nextId.current++, name: file.name, status: 'error', progress: 0, error });
    for (const file of refused) reject(file, t('admin.gifts.images.wrongType'));
    for (const file of files) {
      if (!isSupportedPicture(file)) reject(file, t('admin.gifts.images.wrongType'));
      else if (file.size > maxBytes) reject(file, t('admin.gifts.images.tooLarge', { size: format.number(Math.ceil(file.size / 1024 / 1024)) }));
      else if (slots <= 0) reject(file, t('admin.gifts.images.tooMany', { count: maxImages }));
      else {
        slots -= 1;
        const id = nextId.current++;
        added.push({ id, name: file.name, status: 'queued', progress: 0 });
        waiting.current.push({ id, file });
      }
    }
    if (added.length === 0) return;
    setQueue((current) => [...current.filter((item) => item.status !== 'error'), ...added]);
    void run();
  };

  const saveOrder = (next: string[]) => {
    setDraft(next);
    reorder.mutate(next, {
      onError: (error) => notifyError(errorMessage(error)),
      onSettled: () => setDraft(null),
    });
  };

  const confirmDelete = (image: GiftImage, index: number) =>
    openConfirm({
      title: t('admin.gifts.images.deleteTitle'),
      children: (
        <Flex align="center" gap="3">
          <Box boxSize="16" flexShrink={0} borderRadius="l2" borderWidth="2px" borderColor="border" bg="bg.subtle" overflow="hidden">
            <img src={appUrl(image.url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </Box>
          <Text fontSize="sm">{index === 0 && images.length > 1 ? t('admin.gifts.images.deleteCoverBody') : t('admin.gifts.images.deleteBody')}</Text>
        </Flex>
      ),
      labels: { confirm: t('admin.gifts.images.delete'), cancel: t('app.cancel') },
      danger: true,
      onConfirm: () =>
        remove.mutate(image.id, {
          onSuccess: () => notifySuccess(t('admin.gifts.images.deleted')),
          onError: (error) => notifyError(errorMessage(error)),
        }),
    });

  return (
    <Flex direction="column" gap="4">
      <Flex align="baseline" justify="space-between" gap="3" wrap="wrap">
        <Text fontSize="sm" color="fg.muted" fontWeight="medium" flex="1" minW="200px">
          {t('admin.gifts.images.fitHint')}
        </Text>
        <Badge colorPalette={free === 0 ? 'orange' : 'gray'} variant="subtle" px="2" fontVariantNumeric="tabular-nums">
          {t('admin.gifts.images.count', { count: gift.images.length, max: maxImages })}
        </Badge>
      </Flex>

      {images.length > 0 && (
        <Grid as="ul" listStyleType="none" templateColumns="repeat(auto-fill, minmax(128px, 1fr))" gap="3" aria-label={t('admin.gifts.images.title')}>
          <AnimatePresence initial={false}>
            {images.map((image, index) => {
              const position = index + 1;
              return (
                <motion.li
                  key={image.id}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: dragging === image.id ? 0.45 : 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={springs.snap}
                  style={{ minWidth: 0 }}
                >
                  {/* Native drag-and-drop lives on a plain element: motion components reserve onDragStart / onDragEnd for their own gestures. */}
                  <Box
                    borderWidth="2px"
                    borderColor={index === 0 ? 'brand.solid' : 'border'}
                    borderRadius="l2"
                    bg="bg.panel"
                    overflow="hidden"
                    transition="border-color 160ms"
                    cursor={images.length > 1 ? 'grab' : undefined}
                    draggable={images.length > 1}
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData('text/plain', image.id);
                      setDragging(image.id);
                      setDraft(order);
                    }}
                    onDragOver={(event) => {
                      if (!dragging) return;
                      event.preventDefault();
                      if (dragging === image.id || performance.now() - lastSwap.current < SWAP_PAUSE_MS) return;
                      lastSwap.current = performance.now();
                      setDraft(move(order, order.indexOf(dragging), index));
                    }}
                    onDrop={(event) => event.preventDefault()}
                    onDragEnd={() => {
                      setDragging(null);
                      const changed = order.some((id, i) => id !== gift.images[i]?.id);
                      if (changed) saveOrder(order);
                      else setDraft(null);
                    }}
                  >
                    {/* Neutral frame: the server already fitted the picture into a square, so `contain` shows all of it. */}
                    <Box position="relative" aspectRatio="1" bg="bg.subtle">
                      <img src={appUrl(image.url)} alt={t('gifts.imageOf', { index: position, count: images.length })} draggable={false} loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
                      {index === 0 && (
                        <Badge position="absolute" top="1.5" left="1.5" colorPalette="brand" variant="solid" size="sm" gap="1" boxShadow="0 2px 0 0 {colors.brand.depth}">
                          <Star size={11} fill="currentColor" strokeWidth={0} aria-hidden />
                          {t('admin.gifts.images.cover')}
                        </Badge>
                      )}
                    </Box>
                    <Flex align="center" justify="space-between" px="1" py="1" borderTopWidth="2px" borderColor="border">
                      <Flex>
                        <IconButton
                          size="2xs"
                          variant="ghost"
                          colorPalette="gray"
                          disabled={index === 0 || reorder.isPending}
                          aria-label={t('admin.gifts.images.moveEarlier', { index: position })}
                          title={t('admin.gifts.images.moveEarlier', { index: position })}
                          onClick={() => saveOrder(move(order, index, index - 1))}
                        >
                          <ChevronLeft aria-hidden />
                        </IconButton>
                        <IconButton
                          size="2xs"
                          variant="ghost"
                          colorPalette="gray"
                          disabled={index === images.length - 1 || reorder.isPending}
                          aria-label={t('admin.gifts.images.moveLater', { index: position })}
                          title={t('admin.gifts.images.moveLater', { index: position })}
                          onClick={() => saveOrder(move(order, index, index + 1))}
                        >
                          <ChevronRight aria-hidden />
                        </IconButton>
                        {index > 0 && (
                          <IconButton
                            size="2xs"
                            variant="ghost"
                            colorPalette="gray"
                            disabled={reorder.isPending}
                            aria-label={t('admin.gifts.images.makeCover', { index: position })}
                            title={t('admin.gifts.images.makeCover', { index: position })}
                            onClick={() => saveOrder(move(order, index, 0))}
                          >
                            <Star aria-hidden />
                          </IconButton>
                        )}
                      </Flex>
                      <IconButton
                        size="2xs"
                        variant="ghost"
                        colorPalette="red"
                        disabled={remove.isPending}
                        aria-label={t('admin.gifts.images.deleteOne', { index: position })}
                        title={t('admin.gifts.images.delete')}
                        onClick={() => confirmDelete(image, index)}
                      >
                        <Trash2 aria-hidden />
                      </IconButton>
                    </Flex>
                  </Box>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </Grid>
      )}

      {queue.length > 0 && (
        <Flex as="ul" listStyleType="none" direction="column" gap="2" aria-live="polite">
          {queue.map((item) => (
            <Flex as="li" key={item.id} align="center" gap="3" px="3" py="2" borderRadius="l2" borderWidth="2px" borderColor={item.status === 'error' ? 'red.muted' : 'border'} bg={item.status === 'error' ? 'red.subtle' : 'bg.panel'}>
              <Box flexShrink={0} color={item.status === 'error' ? 'red.fg' : 'brand.fg'} lineHeight="0">
                {item.status === 'error' ? <CircleAlert size={18} strokeWidth={2.5} aria-hidden /> : <ImagePlus size={18} strokeWidth={2.5} aria-hidden />}
              </Box>
              <Box flex="1" minW="0">
                <Text fontSize="sm" fontWeight="bold" truncate>
                  {item.name}
                </Text>
                {item.status === 'error' ? (
                  <Text fontSize="xs" fontWeight="semibold" color="red.fg">
                    {item.error}
                  </Text>
                ) : (
                  <Progress.Root size="xs" mt="1" value={item.status === 'uploading' ? Math.round(item.progress * 100) : 0} aria-label={t('admin.gifts.images.uploading', { name: item.name })}>
                    <Progress.Track borderRadius="full" bg="bg.muted">
                      <Progress.Range borderRadius="full" />
                    </Progress.Track>
                  </Progress.Root>
                )}
              </Box>
              {item.status === 'error' ? (
                <IconButton size="2xs" variant="ghost" colorPalette="red" aria-label={t('admin.gifts.images.dismiss', { name: item.name })} onClick={() => setQueue((current) => current.filter((other) => other.id !== item.id))}>
                  <X aria-hidden />
                </IconButton>
              ) : (
                <Text fontSize="xs" fontWeight="bold" color="fg.muted" fontVariantNumeric="tabular-nums" whiteSpace="nowrap">
                  {item.status === 'uploading' ? `${Math.round(item.progress * 100)}%` : t('admin.gifts.images.waiting')}
                </Text>
              )}
            </Flex>
          ))}
          {failed.length > 1 && (
            <Button size="xs" variant="ghost" colorPalette="gray" alignSelf="flex-end" onClick={() => setQueue((current) => current.filter((item) => item.status !== 'error'))}>
              {t('admin.gifts.images.clearErrors')}
            </Button>
          )}
        </Flex>
      )}

      <FileDropZone
        accept={ACCEPT}
        maxFiles={64}
        disabled={free === 0}
        icon={<Images size={30} strokeWidth={2.2} aria-hidden />}
        title={free === 0 ? t('admin.gifts.images.full', { count: maxImages }) : t('admin.gifts.images.dropTitle')}
        hint={t('admin.gifts.images.dropHint', { count: maxImages })}
        onDrop={(files) => addFiles(files)}
        onReject={(files) => addFiles([], files)}
      />
      <Flex align="center" gap="3" wrap="wrap">
        <Button variant="outline" disabled={free === 0} onClick={() => picker.current?.click()}>
          <ImagePlus aria-hidden />
          {t('admin.gifts.images.choose')}
        </Button>
        <Text fontSize="xs" color="fg.muted" fontWeight="medium" flex="1" minW="180px">
          {t('admin.gifts.images.savedHint')}
        </Text>
        <input
          ref={picker}
          type="file"
          hidden
          multiple
          accept={ACCEPT.join(',')}
          onChange={(event) => {
            addFiles(Array.from(event.currentTarget.files ?? []));
            event.currentTarget.value = ''; // the same file can be chosen again after an error
          }}
        />
      </Flex>
    </Flex>
  );
}
