import { Badge, Flex, type BadgeProps } from '@chakra-ui/react';
import { Check, Hourglass, Undo2, X, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type {
  CheckInMethod,
  CheckInStatus,
  EventStatus,
  RedemptionStatus,
  Role,
  RosterMatchStatus,
  TransactionType,
} from '../api/types';

// One chip per status / type in the contract. Colour is never the only signal: every chip carries its label,
// and the check-in states also carry an icon.

const EVENT_COLORS: Record<EventStatus, string> = { draft: 'gray', open: 'green', closed: 'blue', cancelled: 'red' };
const CHECKIN_COLORS: Record<CheckInStatus, string> = { pending: 'yellow', approved: 'green', rejected: 'red', reverted: 'gray' };
const CHECKIN_ICONS: Record<CheckInStatus, LucideIcon> = { pending: Hourglass, approved: Check, rejected: X, reverted: Undo2 };
const REDEMPTION_COLORS: Record<RedemptionStatus, string> = { requested: 'yellow', fulfilled: 'green', cancelled: 'gray', refunded: 'orange' };
const TX_COLORS: Record<TransactionType, string> = {
  eventAward: 'brand',
  redemption: 'accent',
  adjustment: 'purple',
  reversal: 'orange',
  expiry: 'gray',
  externalCredit: 'cyan',
  externalDebit: 'pink',
};
const ROSTER_COLORS: Record<RosterMatchStatus, string> = { matched: 'green', notFound: 'red', inactive: 'orange', duplicate: 'yellow' };

type ChipProps<T> = { value: T } & Omit<BadgeProps, 'children' | 'colorPalette'>;

const chip = { variant: 'subtle', px: '2', whiteSpace: 'nowrap' } as const;

export function EventStatusBadge({ value, ...rest }: ChipProps<EventStatus>) {
  const { t } = useTranslation();
  return (
    <Badge colorPalette={EVENT_COLORS[value]} {...chip} {...rest}>
      {t(`eventStatus.${value}`)}
    </Badge>
  );
}

export function CheckInStatusBadge({ value, ...rest }: ChipProps<CheckInStatus | null>) {
  const { t } = useTranslation();
  if (value === null) {
    return (
      <Badge colorPalette="gray" {...chip} variant="outline" {...rest}>
        {t('checkInStatus.none')}
      </Badge>
    );
  }
  const Icon = CHECKIN_ICONS[value];
  return (
    <Badge colorPalette={CHECKIN_COLORS[value]} {...chip} {...rest}>
      <Icon size={12} strokeWidth={3} aria-hidden />
      {t(`checkInStatus.${value}`)}
    </Badge>
  );
}

export function CheckInMethodBadge({ value, ...rest }: ChipProps<CheckInMethod>) {
  const { t } = useTranslation();
  return (
    <Badge colorPalette="gray" {...chip} variant="outline" {...rest}>
      {t(`checkInMethod.${value}`)}
    </Badge>
  );
}

export function RedemptionStatusBadge({ value, ...rest }: ChipProps<RedemptionStatus>) {
  const { t } = useTranslation();
  return (
    <Badge colorPalette={REDEMPTION_COLORS[value]} {...chip} {...rest}>
      {t(`redemptionStatus.${value}`)}
    </Badge>
  );
}

export function TransactionTypeBadge({ value, ...rest }: ChipProps<TransactionType>) {
  const { t } = useTranslation();
  return (
    <Badge colorPalette={TX_COLORS[value]} {...chip} {...rest}>
      {t(`txType.${value}`)}
    </Badge>
  );
}

export function RosterMatchBadge({ value, ...rest }: ChipProps<RosterMatchStatus>) {
  const { t } = useTranslation();
  return (
    <Badge colorPalette={ROSTER_COLORS[value]} {...chip} {...rest}>
      {t(`rosterMatch.${value}`)}
    </Badge>
  );
}

const ROLE_COLORS: Record<Role, string> = { systemAdmin: 'red', eventAdmin: 'brand', giftAdmin: 'accent', auditor: 'purple' };

/** A person with no role is a normal employee, so an empty list shows the plain "Employee" chip. */
export function RoleBadges({ roles }: { roles: Role[] }) {
  const { t, i18n } = useTranslation();
  if (roles.length === 0) {
    return (
      <Badge colorPalette="gray" size="sm" {...chip}>
        {t('role.employee')}
      </Badge>
    );
  }
  return (
    <Flex gap="1" wrap="wrap">
      {roles.map((role) => (
        <Badge key={role} colorPalette={ROLE_COLORS[role] ?? 'gray'} size="sm" {...chip}>
          {/* A server on an older contract may still send a role this build has no label for: show it as it came. */}
          {i18n.exists(`role.${role}`) ? t(`role.${role}`) : role}
        </Badge>
      ))}
    </Flex>
  );
}
