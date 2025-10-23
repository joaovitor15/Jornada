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
  ({ onChange, onValueChange, onFocus, ...props }, ref) => {
    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      const inputElement = e.target;
      const length = inputElement.value.length;
      setTimeout(() => {
        inputElement.setSelectionRange(length, length);
      }, 0);
      if (onFocus) {
        onFocus(e);
      }
    };

    return (
      <NumericFormat
        customInput={Input}
        getInputRef={ref}
        inputMode="decimal"
        thousandSeparator="."
        decimalSeparator=","
        decimalScale={2}
        fixedDecimalScale
        valueIsNumericString
        onValueChange={(values, sourceInfo) => {
          if (onValueChange) {
            onValueChange(values, sourceInfo);
          }
          if (onChange) {
            // Create a synthetic event to pass to the original onChange
            const event = {
              target: {
                name: props.name,
                value: values.value,
              },
            } as React.ChangeEvent<HTMLInputElement>;
            onChange(event);
          }
        }}
        onFocus={handleFocus}
        {...props}
      />
    );
  }
);
CurrencyInput.displayName = 'CurrencyInput';

export { CurrencyInput };
