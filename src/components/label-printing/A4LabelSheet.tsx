import React from 'react';
import { LabelData, LabelType, A4_LAYOUTS, PrintConfig } from '@/types/labelPrinting';
import { LocationLabel } from './LocationLabel';
import { ItemLabel } from './ItemLabel';
import { LocationLabelData, ItemLabelData } from '@/types/labelPrinting';

interface A4LabelSheetProps {
  labelData: LabelData;
  config: PrintConfig;
  copies?: number;
}

export function A4LabelSheet({
  labelData,
  config,
  copies = 1,
}: A4LabelSheetProps) {
  const layout = A4_LAYOUTS[labelData.type];
  const labelsToRender = Math.min(copies, layout.labelsPerPage);

  const renderLabel = (index: number) => {
    if (labelData.type === 'location') {
      return (
        <LocationLabel
          key={index}
          data={labelData as LocationLabelData}
          printerType="a4"
          showBarcode={config.showBarcode}
          showQRCode={config.showQRCode}
        />
      );
    }
    return (
      <ItemLabel
        key={index}
        data={labelData as ItemLabelData}
        printerType="a4"
        showBarcode={config.showBarcode}
        showQRCode={config.showQRCode}
      />
    );
  };

  return (
    <div
      className="bg-white"
      style={{
        width: '210mm',
        minHeight: '297mm',
        padding: '10mm',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${layout.columns}, ${layout.labelWidth})`,
          gridTemplateRows: `repeat(${layout.rows}, ${layout.labelHeight})`,
          gap: layout.gap,
          justifyContent: 'center',
          alignContent: 'start',
        }}
      >
        {Array.from({ length: labelsToRender }).map((_, index) => (
          <div key={index} className="flex items-center justify-center">
            {renderLabel(index)}
          </div>
        ))}
      </div>
    </div>
  );
}
