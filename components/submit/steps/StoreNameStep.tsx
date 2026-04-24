"use client";

import { StoreNameInput } from "@/components/StoreNameInput";

interface StoreNameStepProps {
  value: string;
  onChange: (val: string) => void;
  onValidityChange: (valid: boolean) => void;
}

export function StoreNameStep({ value, onChange, onValidityChange }: StoreNameStepProps) {
  return (
    <div>
      <StoreNameInput
        value={value}
        onChange={onChange}
        onValidityChange={onValidityChange}
      />
    </div>
  );
}
