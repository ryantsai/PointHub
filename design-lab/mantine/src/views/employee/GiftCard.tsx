import { useEffect, useRef, useState } from 'react';
import { Button, Progress } from '@mantine/core';
import { IconCheck, IconGift, IconLock } from '@tabler/icons-react';
import { AnimatePresence, motion } from 'motion/react';
import { type Gift, type Locale, pick } from '@shared/data';
import { formatNumber, type StringKey, t } from '@shared/strings';
import { Burst } from '../../components/Burst';
import { rise, spring } from '../../lib/motion';
import classes from './Employee.module.css';

const tagKey: Record<NonNullable<Gift['tag']>, StringKey> = { new: 'tagNew', popular: 'tagPopular', limited: 'tagLimited' };
export const LOW_STOCK = 5;

type Props = { gift: Gift; locale: Locale; balance: number; onRedeem: (gift: Gift) => void };

export function GiftCard({ gift, locale, balance, onRedeem }: Props) {
  const [party, setParty] = useState(0);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const out = gift.stock <= 0;
  const missing = Math.max(0, gift.pointCost - balance);
  const state = out ? 'out' : missing > 0 ? 'short' : 'ok';
  const celebrating = party > 0;

  const redeem = () => {
    onRedeem(gift);
    setParty((n) => n + 1);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setParty(0), 1700);
  };

  return (
    <motion.article className={classes.gift} variants={rise} data-state={state} whileHover={out ? undefined : { y: -4 }} transition={spring}>
      <div className={classes.giftTicket}>
        <div className={classes.giftArt}>
          <motion.span
            key={`emoji-${party}`}
            className={classes.giftEmoji}
            aria-hidden="true"
            animate={celebrating ? { scale: [1, 1.45, 0.92, 1.08, 1], rotate: [0, -14, 10, -4, 0], y: [0, -10, 0] } : undefined}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            {gift.emoji}
          </motion.span>
          {gift.tag && (
            <span className={classes.giftTag} data-tag={gift.tag}>
              {t(locale, tagKey[gift.tag])}
            </span>
          )}
          {celebrating && <Burst key={`burst-${party}`} count={20} spread={105} />}
        </div>

        <div className={classes.giftBody}>
          <h3 className={classes.giftName}>{pick(gift.name, locale)}</h3>
          <p className={classes.giftDesc}>{pick(gift.description, locale)}</p>

          <div className={classes.giftRow}>
            <span className={`${classes.giftCost} mx-num`}>
              {formatNumber(locale, gift.pointCost)}
              <small>{t(locale, 'pts')}</small>
            </span>
            {!out && (
              <motion.span
                key={gift.stock}
                className={`${classes.giftStock} mx-num`}
                data-low={gift.stock <= LOW_STOCK || undefined}
                initial={{ y: -6, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.25 }}
              >
                {t(locale, 'inStock', { count: formatNumber(locale, gift.stock) })}
              </motion.span>
            )}
          </div>

          <div className={classes.giftAction}>
            {state === 'out' && (
              <span className={classes.giftNote} data-kind="out">
                {t(locale, 'outOfStock')}
              </span>
            )}
            {state === 'short' && !celebrating && (
              <>
                <Progress value={(balance / gift.pointCost) * 100} size={5} radius="xl" transitionDuration={700} aria-hidden="true" />
                <span className={`${classes.giftNote} mx-num`} data-kind="short">
                  <IconLock size={14} stroke={2} aria-hidden="true" />
                  {t(locale, 'notEnough', { count: formatNumber(locale, missing) })}
                </span>
              </>
            )}
            {(state === 'ok' || (celebrating && !out)) && (
              <Button
                fullWidth
                size="sm"
                onClick={celebrating ? undefined : redeem}
                aria-live="polite"
                className={classes.giftButton}
                data-done={celebrating || undefined}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={celebrating ? 'done' : 'go'}
                    className={classes.giftButtonLabel}
                    initial={{ y: 12, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -12, opacity: 0 }}
                    transition={{ duration: 0.16 }}
                  >
                    {celebrating ? <IconCheck size={17} stroke={2.6} aria-hidden="true" /> : <IconGift size={17} stroke={1.9} aria-hidden="true" />}
                    {t(locale, celebrating ? 'redeemed' : 'redeem')}
                  </motion.span>
                </AnimatePresence>
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );
}
