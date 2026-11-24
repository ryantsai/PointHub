import type { ReactElement } from 'react';
import CallMadeRounded from '@mui/icons-material/CallMadeRounded';
import CallReceivedRounded from '@mui/icons-material/CallReceivedRounded';
import EventAvailableRounded from '@mui/icons-material/EventAvailableRounded';
import RedeemRounded from '@mui/icons-material/RedeemRounded';
import TuneRounded from '@mui/icons-material/TuneRounded';
import UndoRounded from '@mui/icons-material/UndoRounded';
import type { Locale, TransactionType } from '@shared/data';
import { formatNumber } from '@shared/strings';
import type { StringKey } from '@shared/strings';

/** "+1,280" / "−80" with a real minus sign. */
export const signed = (locale: Locale, amount: number) => `${amount < 0 ? '−' : '+'}${formatNumber(locale, Math.abs(amount))}`;

export const typeKey = (type: TransactionType) => `type_${type}` as StringKey;

export const typeIcon: Record<TransactionType, ReactElement> = {
  eventAward: <EventAvailableRounded fontSize="inherit" />,
  redemption: <RedeemRounded fontSize="inherit" />,
  adjustment: <TuneRounded fontSize="inherit" />,
  reversal: <UndoRounded fontSize="inherit" />,
  externalCredit: <CallReceivedRounded fontSize="inherit" />,
  externalDebit: <CallMadeRounded fontSize="inherit" />,
};

/** Chip colour per transaction type (maps onto the tonal Chip variants in the theme). */
export const typeTone: Record<TransactionType, 'primary' | 'secondary' | 'default' | 'error' | 'success'> = {
  eventAward: 'primary',
  redemption: 'secondary',
  adjustment: 'success',
  reversal: 'error',
  externalCredit: 'default',
  externalDebit: 'default',
};
