'use client';

import { forwardRef, useCallback } from 'react';
import { Input, type InputProps } from './input';
import { maskCpfCnpj, maskPhone, maskCep, unmask } from '@/lib/masks';

type MaskType = 'cpf-cnpj' | 'phone' | 'cep';

const maskFns: Record<MaskType, (v: string) => string> = {
  'cpf-cnpj': maskCpfCnpj,
  phone: maskPhone,
  cep: maskCep,
};

export interface MaskedInputProps extends Omit<InputProps, 'onChange'> {
  mask: MaskType;
  onValueChange?: (raw: string, masked: string) => void;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
}

export const MaskedInput = forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ mask, onValueChange, onChange, ...props }, ref) => {
    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const maskFn = maskFns[mask];
        const masked = maskFn(e.target.value);
        e.target.value = masked;
        onValueChange?.(unmask(masked), masked);
        onChange?.(e);
      },
      [mask, onValueChange, onChange]
    );

    return <Input ref={ref} onChange={handleChange} {...props} />;
  }
);

MaskedInput.displayName = 'MaskedInput';
