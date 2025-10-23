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
  ({ onChange, onValueChange, ...props }, ref) => {
    return (
      <NumericFormat
        customInput={Input}
        getInputRef={ref}
        inputMode="decimal"
        thousandSeparator="."
        decimalSeparator=","
        decimalScale={2}
        onValueChange={(values, sourceInfo) => {
          if (onValueChange) {
            onValueChange(values, sourceInfo);
          }
          if (onChange) {
            const event = {
              target: {
                name: props.name,
                value: values.value,
              },
            } as React.ChangeEvent<HTMLInputElement>;
            onChange(event);
          }
        }}
        {...props}
      />
    );
  }
);
CurrencyInput.displayName = 'CurrencyInput';

export { CurrencyInput };
