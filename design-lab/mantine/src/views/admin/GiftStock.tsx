import { Progress } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { motion } from 'motion/react';
import { type Gift, type Locale, pick } from '@shared/data';
import { formatNumber, t } from '@shared/strings';
import { softSpring } from '../../lib/motion';
import classes from './Admin.module.css';

const LOW_STOCK = 10;
const FULL_SHELF = 50; // stock at which the bar reads as full

const group = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { ...softSpring, delayChildren: 0.1, staggerChildren: 0.05 } },
};
const tile = { hidden: { opacity: 0, scale: 0.92 }, show: { opacity: 1, scale: 1, transition: softSpring } };

export function GiftStock({ locale, gifts }: { locale: Locale; gifts: Gift[] }) {
  const sorted = [...gifts].sort((a, b) => a.stock - b.stock);
  return (
    <motion.section className={`${classes.card} ${classes.stockCard}`} variants={group} aria-labelledby="mx-stock">
      <header className={classes.cardHead}>
        <h2 id="mx-stock" className={classes.cardTitle}>
          {t(locale, 'giftsAdmin')}
        </h2>
      </header>
      <ul className={classes.stockGrid}>
        {sorted.map((gift) => {
          const level = gift.stock <= 0 ? 'out' : gift.stock <= LOW_STOCK ? 'low' : 'ok';
          return (
            <motion.li key={gift.id} className={classes.stockTile} variants={tile} data-level={level}>
              <span className={classes.stockArt} aria-hidden="true">
                {gift.emoji}
              </span>
              <div className={classes.stockText}>
                <p className={classes.stockName}>{pick(gift.name, locale)}</p>
                <p className={`${classes.stockCost} mx-num`}>
                  {t(locale, 'colCost')} {formatNumber(locale, gift.pointCost)} {t(locale, 'pts')}
                </p>
              </div>
              <div className={classes.stockLevel}>
                <span className={classes.stockLabel}>{t(locale, 'colStock')}</span>
                <span className={`${classes.stockValue} mx-num`}>
                  {level !== 'ok' && <IconAlertTriangle size={14} stroke={2.2} aria-hidden="true" />}
                  {level === 'out' ? t(locale, 'outOfStock') : t(locale, 'inStock', { count: formatNumber(locale, gift.stock) })}
                </span>
              </div>
              <Progress
                className={classes.stockBar}
                value={Math.min(100, (gift.stock / FULL_SHELF) * 100)}
                size={6}
                radius="xl"
                color={level === 'ok' ? 'var(--mx-primary-strong)' : level === 'low' ? 'var(--mx-warn)' : 'var(--mx-neg)'}
                aria-hidden="true"
              />
            </motion.li>
          );
        })}
      </ul>
    </motion.section>
  );
}
