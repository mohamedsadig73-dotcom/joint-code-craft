import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LabelPrintModal } from './LabelPrintModal';
import { LabelType, LocationLabelData, ItemLabelData } from '@/types/labelPrinting';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLastPrint } from '@/hooks/useLastPrint';
import { Printer, RotateCcw } from 'lucide-react';

interface PrintLabelButtonProps {
  labelType: LabelType;
  prefillData?: Partial<LocationLabelData> | Partial<ItemLabelData>;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showReprintButton?: boolean;
  className?: string;
}

export function PrintLabelButton({
  labelType,
  prefillData,
  variant = 'outline',
  size = 'default',
  showReprintButton = false,
  className = '',
}: PrintLabelButtonProps) {
  const { t } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { canReprint, lastPrintJob } = useLastPrint();

  return (
    <>
      <div className={`flex items-center gap-2 ${className}`}>
        <Button
          variant={variant}
          size={size}
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2"
        >
          <Printer className="h-4 w-4" />
          {size !== 'icon' && t('printLabel')}
        </Button>

        {showReprintButton && canReprint && (
          <Button
            variant="ghost"
            size={size}
            onClick={() => setIsModalOpen(true)}
            title={t('reprintLast')}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            {size !== 'icon' && t('reprintLast')}
          </Button>
        )}
      </div>

      <LabelPrintModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialLabelType={labelType}
        prefillData={prefillData}
      />
    </>
  );
}
