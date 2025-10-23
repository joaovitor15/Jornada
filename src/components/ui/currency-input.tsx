"use client";

import * as React from "react";
import { NumericFormat, type OnValueChange, type NumericFormatProps } from "react-number-format";
import { Input } from "@/components/ui/input";

type CurrencyInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "prefix"
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
        fixedDecimalScale={true}
        valueIsNumericString={true}
        onValueChange={(values, sourceInfo) => {
          if (onValueChange) {
            onValueChange(values, sourceInfo);
          }
          if (onChange) {
            onChange(values.floatValue as any);
          }
            onChange(event);
          }
          onFocus={handleFocus}
        }}
        {...props}
      />
    );
  }
);
CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };