import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { PrinterType } from '@/types/labelPrinting';
import { useLanguage } from '@/contexts/LanguageContext';
import { Printer } from 'lucide-react';

interface PrinterSelectorProps {
  value: PrinterType;
  onChange: (value: PrinterType) => void;
  disabled?: boolean;
}

export function PrinterSelector({ value, onChange, disabled }: PrinterSelectorProps) {
  const { t } = useLanguage();

  const printerOptions: { value: PrinterType; label: string; description: string }[] = [
    {
      value: 'thermal58',
      label: t('thermal58mm'),
      description: 'Epson TM-T20II, POS printers',
    },
    {
      value: 'thermal80',
      label: t('thermal80mm'),
      description: 'Zebra ZD220, shipping labels',
    },
    {
      value: 'a4',
      label: t('a4Laser'),
      description: 'HP LaserJet, standard printers',
    },
  ];

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Printer className="h-4 w-4" />
        {t('printerType')}
      </Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={t('selectPrinter')} />
        </SelectTrigger>
        <SelectContent>
          {printerOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex flex-col">
                <span className="font-medium">{option.label}</span>
                <span className="text-xs text-muted-foreground">{option.description}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
