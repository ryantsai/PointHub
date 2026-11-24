import { Avatar, Badge, Box, Button, Card, Center, Flex, Grid, Text } from '@chakra-ui/react';
import { ArrowDownLeft, ArrowUpRight, ChevronRight, Gift, History, Plug, Ticket, Trophy, Undo2, Wrench, type LucideIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { leaderboard, me, pick, type Locale, type Transaction, type TransactionType } from '@shared/data';
import { formatDateTime, formatNumber, t } from '@shared/strings';
import { Coin, SectionTitle, initials, signed } from '../../components/bits';
import { rise, springs } from '../../motion';

export const typeIcon: Record<TransactionType, LucideIcon> = {
  eventAward: Ticket,
  redemption: Gift,
  adjustment: Wrench,
  reversal: Undo2,
  externalCredit: Plug,
  externalDebit: Plug,
};

// ---- Recent activity --------------------------------------------------------------------------

export function Activity({ locale, activity }: { locale: Locale; activity: Transaction[] }) {
  return (
    <Flex asChild direction="column" gap="4">
      <motion.section variants={rise} aria-label={t(locale, 'recentActivity')}>
        <SectionTitle icon={History} title={t(locale, 'recentActivity')} />
        <Card.Root variant="outline">
          <Card.Body p="2" asChild>
            <ul style={{ listStyle: 'none' }}>
              <AnimatePresence initial={false}>
                {activity.slice(0, 7).map((tx) => {
                  const IconCmp = typeIcon[tx.type];
                  const gain = tx.amount > 0;
                  return (
                    <motion.li
                      key={tx.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9, y: -18 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={springs.soft}
                    >
                      <Flex align="center" gap="3" px="2" py="2.5">
                        <Center flexShrink={0} boxSize="10" borderRadius="l2" bg={gain ? 'brand.subtle' : 'bg.muted'} color={gain ? 'brand.fg' : 'fg.muted'}>
                          <IconCmp size={18} strokeWidth={2.4} aria-hidden />
                        </Center>
                        <Box flex="1" minW="0">
                          <Text fontWeight="bold" fontSize="sm" lineHeight="1.35">
                            {pick(tx.title, locale)}
                          </Text>
                          <Text color="fg.muted" fontSize="xs" fontWeight="medium" lineHeight="1.4">
                            {t(locale, `type_${tx.type}`)} · {formatDateTime(locale, tx.createdAt)}
                          </Text>
                        </Box>
                        <Flex align="center" gap="1" flexShrink={0} color={gain ? 'gain' : 'loss'} fontWeight="black" fontSize="md" fontVariantNumeric="tabular-nums">
                          {gain ? <ArrowUpRight size={15} strokeWidth={3} aria-hidden /> : <ArrowDownLeft size={15} strokeWidth={3} aria-hidden />}
                          {signed(locale, tx.amount)}
                        </Flex>
                      </Flex>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          </Card.Body>
        </Card.Root>
      </motion.section>
    </Flex>
  );
}

// ---- Leaderboard --------------------------------------------------------------------------------

const medals = ['🥇', '🥈', '🥉'];
const podiumOrder = [1, 0, 2]; // 2nd, 1st, 3rd – the classic podium
const podiumHeight = [84, 60, 44];

export function Leaderboard({ locale }: { locale: Locale }) {
  const top = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <Flex asChild direction="column" gap="4">
      <motion.section variants={rise} aria-label={t(locale, 'leaderboard')}>
        <SectionTitle icon={Trophy} title={t(locale, 'leaderboard')}>
          <Button variant="ghost" size="xs" colorPalette="brand">
            {t(locale, 'seeAll')}
            <ChevronRight aria-hidden />
          </Button>
        </SectionTitle>

        <Card.Root variant="outline" overflow="hidden">
          <Card.Body p="0">
            {/* podium */}
            <Grid as="ol" templateColumns="repeat(3, minmax(0, 1fr))" gap="2" alignItems="end" px="4" pt="5" listStyleType="none" bgImage="linear-gradient(180deg, {colors.brand.subtle}, transparent)">
              {podiumOrder.map((index, column) => {
                const entry = top[index];
                if (!entry) return null;
                const first = index === 0;
                return (
                  <Flex as="li" key={entry.rank} direction="column" align="center" gap="1.5" minW="0" order={column}>
                    <motion.div
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 0, maxWidth: '100%' }}
                      initial={{ y: 18 }}
                      whileInView={{ y: 0 }}
                      viewport={{ once: true }}
                      transition={{ ...springs.bouncy, delay: 0.35 + index * 0.12 }}
                    >
                      <Box position="relative">
                        <Avatar.Root size={first ? 'xl' : 'lg'} colorPalette={first ? 'accent' : 'brand'} variant={first ? 'solid' : 'subtle'} borderWidth="3px" borderColor="bg.panel">
                          <Avatar.Fallback fontWeight="black">{initials(entry.name)}</Avatar.Fallback>
                        </Avatar.Root>
                        <Box as="span" aria-hidden position="absolute" bottom="-6px" right="-8px" fontSize={first ? '24px' : '20px'} lineHeight="1">
                          {medals[index]}
                        </Box>
                      </Box>
                      <Text fontWeight="extrabold" fontSize="sm" lineHeight="1.25" textAlign="center" maxW="full" truncate>
                        {entry.name}
                      </Text>
                      <Flex align="center" gap="1" fontSize="xs" fontWeight="black" color="fg.muted" fontVariantNumeric="tabular-nums">
                        <Coin size={14} />
                        {formatNumber(locale, entry.points)}
                      </Flex>
                    </motion.div>
                    <Box asChild w="full" borderTopRadius="l2" bg={first ? 'accent.solid' : 'brand.muted'} color={first ? 'accent.contrast' : 'brand.fg'} transformOrigin="bottom">
                      <motion.div
                        style={{ height: podiumHeight[index], display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}
                        initial={{ scaleY: 0.35 }}
                        whileInView={{ scaleY: 1 }}
                        viewport={{ once: true }}
                        transition={{ ...springs.bouncy, delay: 0.15 + index * 0.12 }}
                      >
                        <Text as="span" fontFamily="heading" fontWeight="black" fontSize={first ? '3xl' : '2xl'} lineHeight="1.3">
                                                    {entry.rank}
                        </Text>
                      </motion.div>
                    </Box>
                  </Flex>
                );
              })}
            </Grid>

            {/* the chasing pack, then me */}
            <Box as="ol" listStyleType="none" borderTopWidth="2px" borderColor="border" p="2">
              {rest.map((entry) => (
                <Flex as="li" key={entry.rank} align="center" gap="3" px="2" py="2">
                  <Center boxSize="8" borderRadius="full" bg="bg.muted" fontWeight="black" fontSize="sm" flexShrink={0}>
                    {entry.rank}
                  </Center>
                  <Text flex="1" minW="0" fontWeight="bold" fontSize="sm" truncate>
                    {entry.name}
                  </Text>
                  <Flex align="center" gap="1" fontSize="sm" fontWeight="black" fontVariantNumeric="tabular-nums">
                    <Coin size={14} />
                    {formatNumber(locale, entry.points)}
                  </Flex>
                </Flex>
              ))}
              <Flex as="li" align="center" gap="3" px="2" py="2" mt="1" borderRadius="l2" bg="brand.subtle" borderWidth="2px" borderColor="brand.muted" borderStyle="dashed">
                <Center boxSize="8" borderRadius="full" bg="brand.solid" color="brand.contrast" fontWeight="black" fontSize="sm" flexShrink={0}>
                  {me.rank}
                </Center>
                <Box flex="1" minW="0">
                  <Text fontWeight="extrabold" fontSize="sm" lineHeight="1.3" truncate>
                    {pick(me.displayName, locale)}
                  </Text>
                  <Text fontSize="xs" fontWeight="bold" color="brand.fg" lineHeight="1.3">
                    {t(locale, 'rank', { rank: me.rank })}
                  </Text>
                </Box>
                <Badge colorPalette="brand" variant="solid" size="sm">
                  <Trophy size={12} strokeWidth={2.8} aria-hidden />
                </Badge>
              </Flex>
            </Box>
          </Card.Body>
        </Card.Root>
      </motion.section>
    </Flex>
  );
}
