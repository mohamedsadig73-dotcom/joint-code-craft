import React, { forwardRef } from 'react';
import { LabelData, PrintConfig, LocationLabelData, ItemLabelData } from '@/types/labelPrinting';
import { LocationLabel } from './LocationLabel';
import { ItemLabel } from './ItemLabel';
import { A4LabelSheet } from './A4LabelSheet';
import { ThermalLabel } from './ThermalLabel';

interface PrintPreviewProps {
  labelData: LabelData;
  config: PrintConfig;
}

export const PrintPreview = forwardRef<HTMLDivElement, PrintPreviewProps>(
  ({ labelData, config }, ref) => {
    const isA4 = config.printerType === 'a4';

    return (
      <div ref={ref} className="print-content">
        {isA4 ? (
          <A4LabelSheet
            labelData={labelData}
            config={config}
            copies={config.copies}
          />
        ) : (
          <div className="flex flex-col gap-2">
            {Array.from({ length: config.copies }).map((_, index) => (
              <ThermalLabel
                key={index}
                labelData={labelData}
                config={config}
              />
            ))}
          </div>
        )}
      </div>
    );
  }
);

PrintPreview.displayName = 'PrintPreview';
