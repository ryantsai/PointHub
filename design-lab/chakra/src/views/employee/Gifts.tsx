import { Badge, Box, Button, Card, Center, Flex, Grid, Progress, Text } from '@chakra-ui/react';
import { Check, Gift as GiftIcon, Lock, PackageX } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { pick, type Gift, type Locale } from '@shared/data';
import { formatNumber, t, type StringKey } from '@shared/strings';
import { Burst } from '../../components/Burst';
import { Coin, SectionTitle, signed } from '../../components/bits';
import { rise, settle, springs, staggerParent } from '../../motion';

type Props = { locale: Locale; gifts: Gift[]; balance: number; onRedeem: (gift: Gift) => void };

const tagKey: Record<NonNullable<Gift['tag']>, StringKey> = { new: 'tagNew', popular: 'tagPopular', limited: 'tagLimited' };

export function Gifts({ locale, gifts, balance, onRedeem }: Props) {
  return (
    <Flex asChild direction="column" gap="4">
      <motion.section variants={rise} aria-label={t(locale, 'gifts')}>
        <SectionTitle icon={GiftIcon} title={t(locale, 'gifts')}>
          <Badge variant="subtle" size="lg" px="3" gap="1.5" fontWeight="black">
            <Coin size={16} />
            {formatNumber(locale, balance)} {t(locale, 'pts')}
          </Badge>
        </SectionTitle>
        <Grid asChild templateColumns={{ base: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))' }} gap={{ base: '3', md: '4' }}>
          <motion.div variants={staggerParent} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-40px' }}>
            {gifts.map((gift) => (
              <GiftCard key={gift.id} gift={gift} locale={locale} balance={balance} onRedeem={onRedeem} />
            ))}
          </motion.div>
        </Grid>
      </motion.section>
    </Flex>
  );
}

function GiftCard({ gift, locale, balance, onRedeem }: { gift: Gift; locale: Locale; balance: number; onRedeem: (gift: Gift) => void }) {
  const soldOut = gift.stock <= 0;
  const missing = Math.max(0, gift.pointCost - balance);
  const affordable = !soldOut && missing === 0;

  const [bursts, setBursts] = useState(0);
  const [celebrating, setCelebrating] = useState(false);
  const timer = useRef<number>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const redeem = () => {
    onRedeem(gift);
    setBursts((v) => v + 1);
    setCelebrating(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCelebrating(false), 1700);
  };

  return (
    <Card.Root asChild variant="outline" overflow="visible">
      <motion.article variants={settle} whileHover={{ y: -5 }} transition={springs.soft}>
        <Card.Body p={{ base: '3', md: '4' }} gap="3">
          {/* artwork */}
          <Box position="relative">
            <Center
              aria-hidden
              h={{ base: '92px', md: '116px' }}
              borderRadius="l2"
              bgImage={soldOut ? 'none' : 'linear-gradient(160deg, {colors.brand.subtle}, {colors.accent.subtle})'}
              bg={soldOut ? 'bg.muted' : undefined}
              borderWidth="2px"
              borderColor={soldOut ? 'border' : 'brand.muted'}
              fontSize={{ base: '44px', md: '54px' }}
              lineHeight="1"
              filter={soldOut ? 'grayscale(1)' : undefined}
              opacity={soldOut ? 0.6 : 1}
            >
              <motion.span
                key={bursts}
                style={{ display: 'block' }}
                initial={false}
                animate={bursts ? { y: [0, -26, 0], rotate: [0, -14, 10, 0], scale: [1, 1.3, 1] } : undefined}
                transition={{ duration: 0.7, ease: [0.3, 1.4, 0.5, 1] }}
              >
                {gift.emoji}
              </motion.span>
            </Center>
            {gift.tag && (
              <Badge
                position="absolute"
                top="-8px"
                left="-8px"
                colorPalette={gift.tag === 'limited' ? 'red' : gift.tag === 'new' ? 'brand' : 'accent'}
                variant="solid"
                size="sm"
                px="2.5"
                transform="rotate(-5deg)"
                boxShadow="0 2px 0 0 {colors.colorPalette.depth}"
              >
                {t(locale, tagKey[gift.tag])}
              </Badge>
            )}
            {/* points flying off on redeem */}
            <AnimatePresence>
              {celebrating && (
                <motion.div
                  key={bursts}
                  aria-hidden
                  style={{ position: 'absolute', left: 0, right: 0, top: '30%', display: 'flex', justifyContent: 'center', pointerEvents: 'none', zIndex: 3 }}
                  initial={{ y: 10, opacity: 0, scale: 0.6 }}
                  animate={{ y: -46, opacity: [0, 1, 1, 0], scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.1, ease: [0.2, 0.8, 0.3, 1], times: [0, 0.15, 0.7, 1] }}
                >
                  <Badge colorPalette="accent" variant="solid" size="lg" px="3" gap="1.5" fontWeight="black" boxShadow="0 3px 0 0 {colors.accent.depth}">
                    <Coin size={16} />
                    {signed(locale, -gift.pointCost)}
                  </Badge>
                </motion.div>
              )}
            </AnimatePresence>
            <Burst trigger={bursts} count={18} radius={96} />
          </Box>

          {/* copy */}
          <Box minW="0">
            <Text as="h3" fontWeight="extrabold" fontSize={{ base: 'sm', md: 'md' }} lineHeight="1.3">
              {pick(gift.name, locale)}
            </Text>
            <Text mt="1" color="fg.muted" fontSize={{ base: 'xs', md: 'sm' }} lineHeight="1.4" lineClamp={2}>
              {pick(gift.description, locale)}
            </Text>
          </Box>

          <Flex align="center" justify="space-between" gap="2" wrap="wrap" mt="auto">
            <Flex align="center" gap="1.5" fontWeight="black" fontSize={{ base: 'md', md: 'lg' }} lineHeight="1">
              <Coin size={20} />
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatNumber(locale, gift.pointCost)}</span>
              <Text as="span" fontSize="xs" fontWeight="bold" color="fg.muted">
                {t(locale, 'pts')}
              </Text>
            </Flex>
            {!soldOut && (
              <Text
                fontSize="xs"
                fontWeight="bold"
                color={gift.stock <= 5 ? 'loss' : 'fg.muted'}
                whiteSpace="nowrap"
                fontVariantNumeric="tabular-nums"
              >
                {t(locale, 'inStock', { count: formatNumber(locale, gift.stock) })}
              </Text>
            )}
          </Flex>

          {/* action: one slot, three states */}
          {soldOut ? (
            <Flex align="center" justify="center" gap="2" minH="10" px="2" borderRadius="l2" bg="bg.muted" color="fg.muted" fontSize="sm" fontWeight="bold" textAlign="center" lineHeight="1.25">
              <PackageX size={16} strokeWidth={2.5} aria-hidden style={{ flexShrink: 0 }} />
              {t(locale, 'outOfStock')}
            </Flex>
          ) : affordable || celebrating ? (
            <Button size="md" w="full" colorPalette={celebrating ? 'green' : 'brand'} onClick={celebrating ? undefined : redeem} aria-disabled={celebrating || undefined}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={celebrating ? 'done' : 'idle'}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  initial={{ y: 10, opacity: 0, scale: 0.8 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: -10, opacity: 0, scale: 0.8 }}
                  transition={springs.bouncy}
                >
                  {celebrating && <Check size={18} strokeWidth={3.5} aria-hidden />}
                  {t(locale, celebrating ? 'redeemed' : 'redeem')}
                </motion.span>
              </AnimatePresence>
            </Button>
          ) : (
            <Box>
              <Flex align="center" justify="center" gap="1.5" minH="6" color="fg.muted" fontSize={{ base: 'xs', md: 'sm' }} fontWeight="bold" textAlign="center" lineHeight="1.25">
                <Lock size={13} strokeWidth={2.8} aria-hidden style={{ flexShrink: 0 }} />
                {t(locale, 'notEnough', { count: formatNumber(locale, missing) })}
              </Flex>
              <Progress.Root value={Math.min(100, (balance / gift.pointCost) * 100)} size="sm" mt="1.5" aria-label={t(locale, 'notEnough', { count: formatNumber(locale, missing) })}>
                <Progress.Track borderRadius="full" bg="bg.muted">
                  <Progress.Range borderRadius="full" css={{ transition: 'width 700ms cubic-bezier(0.3, 1.2, 0.5, 1)' }} />
                </Progress.Track>
              </Progress.Root>
            </Box>
          )}
        </Card.Body>
      </motion.article>
    </Card.Root>
  );
}
