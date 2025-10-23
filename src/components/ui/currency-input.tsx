"use client";

import * as React from "react";
import { NumericFormat, type NumericFormatProps, type OnValueChange } from "react-number-format";
import { Input } from "@/components/ui/input";

type CurrencyInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "prefix"
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
        fixedDecimalScale
        onValueChange={(values, sourceInfo) => {
          if (onValueChange) {
            onValueChange(values, sourceInfo);
          }
          if (onChange) {
            const event = {
              target: {
                value: values.value,
                name: props.name,
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
CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };