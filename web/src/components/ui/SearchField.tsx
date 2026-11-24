import { CloseButton, Input, InputGroup, type InputGroupProps } from '@chakra-ui/react';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SearchFieldProps extends Omit<InputGroupProps, 'children' | 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  /** Used as placeholder and accessible name. */
  label: string;
  autoFocus?: boolean;
}

/** Search box for list toolbars: magnifier on the left, a clear button once there is text. Debounce the value yourself. */
export function SearchField({ value, onChange, label, autoFocus, ...rest }: SearchFieldProps) {
  const { t } = useTranslation();
  return (
    <InputGroup
      startElement={<Search size={16} strokeWidth={2.5} aria-hidden />}
      endElement={value !== '' ? <CloseButton size="2xs" me="-1" aria-label={t('app.clear')} onClick={() => onChange('')} /> : undefined}
      {...rest}
    >
      <Input type="search" aria-label={label} placeholder={label} value={value} autoFocus={autoFocus} onChange={(event) => onChange(event.currentTarget.value)} css={{ '&::-webkit-search-cancel-button': { display: 'none' } }} />
    </InputGroup>
  );
}
