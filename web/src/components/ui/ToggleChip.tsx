import { Button, type ButtonProps } from '@chakra-ui/react';
import { Check } from 'lucide-react';
import type { ReactNode } from 'react';

interface ToggleChipProps extends Omit<ButtonProps, 'onChange' | 'value'> {
  value: boolean;
  onChange: (value: boolean) => void;
  children: ReactNode;
}

/** An on/off filter in a toolbar ("In stock"): a pill that fills and gets a tick while it is on. */
export function ToggleChip({ value, onChange, children, ...rest }: ToggleChipProps) {
  return (
    <Button
      type="button"
      size="sm"
      borderRadius="full"
      variant={value ? 'subtle' : 'outline'}
      colorPalette={value ? 'brand' : 'gray'}
      fontWeight="bold"
      aria-pressed={value}
      onClick={() => onChange(!value)}
      {...rest}
    >
      {value && <Check strokeWidth={3} aria-hidden />}
      {children}
    </Button>
  );
}
