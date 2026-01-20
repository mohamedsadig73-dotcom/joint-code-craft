import React from 'react';
import { LabelData, PrintConfig, LocationLabelData, ItemLabelData } from '@/types/labelPrinting';
import { LocationLabel } from './LocationLabel';
import { ItemLabel } from './ItemLabel';

interface ThermalLabelProps {
  labelData: LabelData;
  config: PrintConfig;
}

export function ThermalLabel({ labelData, config }: ThermalLabelProps) {
  if (labelData.type === 'location') {
    return (
      <LocationLabel
        data={labelData as LocationLabelData}
        printerType={config.printerType}
        showBarcode={config.showBarcode}
        showQRCode={false} // Thermal doesn't support QR well
      />
    );
  }

  return (
    <ItemLabel
      data={labelData as ItemLabelData}
      printerType={config.printerType}
      showBarcode={config.showBarcode}
      showQRCode={false}
    />
  );
}
