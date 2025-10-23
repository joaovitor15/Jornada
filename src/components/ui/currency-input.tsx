'use client';

import * as React from 'react';
import {
  NumericFormat,
  type OnValueChange,
  type NumberFormatValues,
} from 'react-number-format';

import { Input } from '@/components/ui/input';

interface CurrencyInputProps {
  value?: number;
  onValueChange?: (values: NumberFormatValues) => void;
  [key: string]: any; // Allow other props
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onValueChange, ...props }, ref) => {
    return (
      <NumericFormat
        customInput={Input}
        getInputRef={ref}
        inputMode="decimal"
        thousandSeparator="."
        decimalSeparator=","
        decimalScale={2}
        fixedDecimalScale
        value={value === 0 ? '' : value}
        onValueChange={onValueChange}
        {...props}
      />
    );
  }
);
CurrencyInput.displayName = 'CurrencyInput';

export { CurrencyInput };
