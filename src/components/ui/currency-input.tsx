'use client';

import * as React from 'react';
import {
  NumericFormat,
  type OnValueChange,
} from 'react-number-format';

import { Input } from '@/components/ui/input';

type CurrencyInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'prefix'
> & {
  onValueChange?: OnValueChange;
};

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ onValueChange, ...props }, ref) => {
    return (
      <NumericFormat
        customInput={Input}
        getInputRef={ref}
        inputMode="decimal"
        thousandSeparator="."
        decimalSeparator=","
        decimalScale={2}
        fixedDecimalScale
        onValueChange={onValueChange}
        {...props}
      />
    );
  }
);
CurrencyInput.displayName = 'CurrencyInput';

export { CurrencyInput };