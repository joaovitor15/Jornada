"use client";

import * as React from "react";
import { NumericFormat, type NumericFormatProps } from "react-number-format";
import { Input } from "@/components/ui/input";

type CurrencyInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "prefix"
> & {
  onValueChange?: NumericFormatProps["onValueChange"];
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
        prefix="R$ "
        decimalScale={2}
        fixedDecimalScale
        onValueChange={(values, sourceInfo) => {
          // This allows us to pass the numeric value to react-hook-form
          if (onValueChange) {
            onValueChange(values, sourceInfo);
          }
          // This keeps the standard onChange event working if needed
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
