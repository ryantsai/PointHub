import { chakra, Flex, Input, type FlexProps } from '@chakra-ui/react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

type Range = { from: string; to: string };

interface DateRangeProps extends Omit<FlexProps, 'onChange'> {
  /** `YYYY-MM-DD`, or `''` for an open end. Both days are inclusive. */
  from: string;
  to: string;
  onChange: (range: Range) => void;
}

/** A year typed on the keyboard arrives digit by digit ("0002", "0020", …): wait for the typing to stop. */
const SETTLE_MS = 350;

/**
 * "From … to …" for list toolbars, as two native date pickers (localised by the browser, good on phones).
 * The values are plain `YYYY-MM-DD` days, which is what the API's `from` / `to` filters take. The two halves
 * stay side by side while there is room and stack when there is not.
 */
export function DateRange({ from, to, onChange, ...rest }: DateRangeProps) {
  const { t } = useTranslation();
  // What the fields show follows the keyboard at once; `onChange` hears about it once the typing has settled.
  const [draft, setDraft] = useState<Range>({ from, to });
  const [editing, setEditing] = useState(false);
  const timer = useRef<number>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  // The range changed from outside ("clear filters", the back button): the fields follow, unless mid-typing.
  const [seen, setSeen] = useState<Range>({ from, to });
  if (seen.from !== from || seen.to !== to) {
    setSeen({ from, to });
    if (!editing) setDraft({ from, to });
  }

  const change = (key: keyof Range, value: string) => {
    const next = { ...draft, [key]: value };
    setDraft(next);
    setEditing(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setEditing(false);
      onChange(next);
    }, SETTLE_MS);
  };

  const ends = [
    { key: 'from' as const, label: t('filters.from'), min: undefined, max: draft.to || undefined },
    { key: 'to' as const, label: t('filters.to'), min: draft.from || undefined, max: undefined },
  ];
  return (
    <Flex role="group" aria-label={t('filters.dateRange')} gap="2" wrap="wrap" minW="0" {...rest}>
      {ends.map((end) => (
        <chakra.label key={end.key} display="flex" alignItems="center" gap="1.5" flex="1 1 150px" minW="0" fontSize="xs" fontWeight="bold" color="fg.muted" whiteSpace="nowrap">
          {end.label}
          <Input
            type="date"
            aria-label={end.label}
            flex="1"
            minW="0"
            px="2.5"
            color="fg"
            fontWeight="medium"
            value={draft[end.key]}
            min={end.min}
            max={end.max}
            onChange={(event) => change(end.key, event.currentTarget.value)}
          />
        </chakra.label>
      ))}
    </Flex>
  );
}
