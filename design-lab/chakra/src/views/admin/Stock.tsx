import { Badge, Box, Card, Flex, Grid, Progress, Text } from '@chakra-ui/react';
import { Package, PackageX, TriangleAlert } from 'lucide-react';
import { motion } from 'motion/react';
import { pick, type Gift, type Locale } from '@shared/data';
import { formatNumber, t } from '@shared/strings';
import { AnimatedNumber } from '../../components/AnimatedNumber';
import { Coin, EmojiTile, SectionTitle } from '../../components/bits';
import { rise, settle, staggerParent } from '../../motion';

/** At or below this many units a gift is flagged as running low. */
const LOW_STOCK = 12;
/** Bar is full at this level, so the long tail of well-stocked gifts does not flatten the rest. */
const FULL_BAR = 50;

export function Stock({ locale, gifts }: { locale: Locale; gifts: Gift[] }) {
  return (
    <Card.Root asChild variant="outline" minW="0">
      <motion.section variants={rise} layout="position" aria-label={t(locale, 'giftsAdmin')}>
        <Card.Body p={{ base: '4', md: '5' }} gap="4">
          <SectionTitle compact icon={Package} title={t(locale, 'giftsAdmin')} />
          <Grid asChild templateColumns={{ base: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(3, minmax(0, 1fr))' }} gap="3">
            <motion.ul variants={staggerParent} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-30px' }} style={{ listStyle: 'none' }}>
              {gifts.map((gift) => {
                const out = gift.stock <= 0;
                const low = !out && gift.stock <= LOW_STOCK;
                const palette = out ? 'red' : low ? 'orange' : 'brand';
                return (
                  <Flex
                    key={gift.id}
                    asChild
                    align="center"
                    gap="3"
                    p="3"
                    borderRadius="l2"
                    borderWidth="2px"
                    borderColor={out ? 'red.muted' : low ? 'orange.muted' : 'border'}
                    bg={out ? 'red.subtle' : low ? 'orange.subtle' : 'bg.subtle'}
                    colorPalette={palette}
                  >
                    <motion.li variants={settle}>
                      <EmojiTile emoji={gift.emoji} size={44} bg="bg.panel" borderColor="border" filter={out ? 'grayscale(1)' : undefined} />
                      <Box flex="1" minW="0">
                        <Flex align="baseline" justify="space-between" gap="2">
                          <Text fontWeight="extrabold" fontSize="sm" lineHeight="1.3" truncate>
                            {pick(gift.name, locale)}
                          </Text>
                          <Flex align="center" gap="1" flexShrink={0} fontSize="xs" fontWeight="black" color="fg.muted" title={t(locale, 'colCost')}>
                            <Coin size={13} />
                            <span>{formatNumber(locale, gift.pointCost)}</span>
                          </Flex>
                        </Flex>
                        <Flex align="center" gap="2" mt="1.5">
                          <Progress.Root value={Math.min(100, (gift.stock / FULL_BAR) * 100)} size="sm" flex="1" aria-label={`${t(locale, 'colStock')}: ${formatNumber(locale, gift.stock)}`}>
                            <Progress.Track borderRadius="full" bg="bg.emphasized">
                              <Progress.Range borderRadius="full" css={{ transition: 'width 600ms cubic-bezier(0.3, 1.2, 0.5, 1)' }} />
                            </Progress.Track>
                          </Progress.Root>
                          {out ? (
                            <Badge colorPalette="red" variant="solid" size="sm" px="2">
                              <PackageX size={12} strokeWidth={2.6} aria-hidden />
                              {t(locale, 'outOfStock')}
                            </Badge>
                          ) : (
                            <Badge colorPalette={low ? 'orange' : 'gray'} variant={low ? 'solid' : 'subtle'} size="sm" px="2" fontWeight="black" title={t(locale, 'colStock')}>
                              {low && <TriangleAlert size={12} strokeWidth={2.8} aria-hidden />}
                              <AnimatedNumber value={gift.stock} locale={locale} from={gift.stock} />
                            </Badge>
                          )}
                        </Flex>
                      </Box>
                    </motion.li>
                  </Flex>
                );
              })}
            </motion.ul>
          </Grid>
        </Card.Body>
      </motion.section>
    </Card.Root>
  );
}
