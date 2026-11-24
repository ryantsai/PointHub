import { Box, Center, chakra, Flex } from '@chakra-ui/react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GiftImage } from '../api/types';
import { PixelSprite } from '../themes/sprites/PixelSprite';
import { giftBox } from '../themes/sprites/ui';

const frame = {
  position: 'relative',
  aspectRatio: '1',
  w: 'full',
  borderRadius: 'l2',
  borderWidth: '2px',
  overflow: 'hidden',
} as const;

interface GiftGalleryProps {
  images: GiftImage[];
  /** Accessible name of the pictures (the gift's name). */
  alt: string;
  /** Greyed out: the gift is out of stock. */
  dimmed?: boolean;
}

/**
 * Gift artwork in a fixed square frame. Pictures are shown whole (`object-fit: contain`; the server already
 * normalises them to one square size). Several pictures get thumbnails and can be swiped; no picture gets
 * the pixel-art gift box.
 */
export function GiftGallery({ images, alt, dimmed }: GiftGalleryProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState(0);
  const [direction, setDirection] = useState(1);
  const index = Math.min(selected, Math.max(0, images.length - 1));
  const current = images[index];

  const go = (next: number) => {
    const wrapped = (next + images.length) % images.length;
    setDirection(next > index ? 1 : -1);
    setSelected(wrapped);
  };

  if (!current) {
    return (
      <Center
        {...frame}
        aria-hidden
        bgImage={dimmed ? 'none' : 'linear-gradient(160deg, {colors.brand.subtle}, {colors.accent.subtle})'}
        bg={dimmed ? 'bg.muted' : undefined}
        borderColor={dimmed ? 'border' : 'brand.muted'}
        filter={dimmed ? 'grayscale(1)' : undefined}
        opacity={dimmed ? 0.6 : 1}
      >
        <PixelSprite sprite={giftBox} scale={4} />
      </Center>
    );
  }

  return (
    <Flex direction="column" gap="2">
      <Box {...frame} bg="bg.subtle" borderColor="border" filter={dimmed ? 'grayscale(1)' : undefined} opacity={dimmed ? 0.6 : 1}>
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.img
            key={current.id}
            src={current.url}
            alt={images.length > 1 ? `${alt} – ${t('gifts.imageOf', { index: index + 1, count: images.length })}` : alt}
            width={current.width}
            height={current.height}
            loading="lazy"
            decoding="async"
            draggable={false}
            custom={direction}
            variants={{
              enter: (dir: number) => ({ x: dir * 40, opacity: 0, scale: 0.96 }),
              center: { x: 0, opacity: 1, scale: 1 },
              exit: (dir: number) => ({ x: dir * -40, opacity: 0, scale: 0.96 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            drag={images.length > 1 ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.35}
            onDragEnd={(_, info) => {
              if (info.offset.x < -40) go(index + 1);
              else if (info.offset.x > 40) go(index - 1);
            }}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', touchAction: 'pan-y' }}
          />
        </AnimatePresence>
      </Box>
      {images.length > 1 && (
        <Flex gap="1.5" overflowX="auto" py="0.5" px="0.5" css={{ scrollbarWidth: 'none' }}>
          {images.map((image, i) => (
            <chakra.button
              key={image.id}
              type="button"
              flexShrink={0}
              boxSize="8"
              p="0"
              borderRadius="l1"
              borderWidth="2px"
              borderColor={i === index ? 'brand.solid' : 'border'}
              bg="bg.subtle"
              overflow="hidden"
              cursor="pointer"
              opacity={i === index ? 1 : 0.7}
              transition="opacity 160ms, border-color 160ms, transform 160ms"
              _hover={{ opacity: 1, transform: 'translateY(-1px)' }}
              focusVisibleRing="outside"
              aria-label={t('gifts.imageOf', { index: i + 1, count: images.length })}
              aria-current={i === index ? 'true' : undefined}
              onClick={() => go(i)}
            >
              <img src={image.url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </chakra.button>
          ))}
        </Flex>
      )}
    </Flex>
  );
}

/**
 * One small picture of a gift (the first image, or the pixel-art gift box). `shape="round"` is the coin-like
 * token for the hero; `shape="square"` is a neutral framed tile for tables and lists.
 */
export function GiftThumb({ images, size = 44, shape = 'round' }: { images: GiftImage[]; size?: number; shape?: 'round' | 'square' }) {
  const first = images[0];
  const look =
    shape === 'round'
      ? ({ borderRadius: 'full', bg: 'white', boxShadow: '0 3px 0 0 rgba(0, 0, 0, 0.3)' } as const)
      : ({ borderRadius: 'l1', bg: 'bg.subtle', borderWidth: '2px', borderColor: 'border' } as const);
  return (
    <Center aria-hidden flexShrink={0} w={`${size}px`} h={`${size}px`} overflow="hidden" {...look}>
      {first ? (
        <img src={first.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      ) : (
        <PixelSprite sprite={giftBox} scale={Math.max(1, Math.floor((size * 0.75) / giftBox.w))} />
      )}
    </Center>
  );
}
