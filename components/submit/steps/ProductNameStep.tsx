"use client";

import { ProductNameInput } from "@/components/ProductNameInput";

interface ProductNameStepProps {
  name: string;
  onNameChange: (val: string) => void;
  onNameValidityChange: (valid: boolean) => void;
}

export function ProductNameStep({
  name,
  onNameChange,
  onNameValidityChange,
}: ProductNameStepProps) {
  return (
    <div>
      <ProductNameInput
        value={name}
        onChange={onNameChange}
        onValidityChange={onNameValidityChange}
      />
    </div>
  );
}
