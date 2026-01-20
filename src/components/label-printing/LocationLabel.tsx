import React from 'react';
import { LocationLabelData, PrinterType, LABEL_DIMENSIONS } from '@/types/labelPrinting';
import { BarcodeDisplay } from './BarcodeDisplay';
import { QRCodeDisplay } from './QRCodeDisplay';
import { useLanguage } from '@/contexts/LanguageContext';

interface LocationLabelProps {
  data: LocationLabelData;
  printerType: PrinterType;
  showBarcode?: boolean;
  showQRCode?: boolean;
  isPreview?: boolean;
}

export function LocationLabel({
  data,
  printerType,
  showBarcode = true,
  showQRCode = false,
  isPreview = false,
}: LocationLabelProps) {
  const { t, language } = useLanguage();
  const dimensions = LABEL_DIMENSIONS[printerType];
  const isRTL = language === 'ar';
  const isThermal = printerType !== 'a4';

  return (
    <div
      className={`
        bg-white text-black border-2 border-black
        flex flex-col items-center justify-center
        ${isPreview ? 'shadow-lg' : ''}
      `}
      style={{
        width: isThermal ? dimensions.width : '100mm',
        height: isThermal ? dimensions.height : '50mm',
        padding: dimensions.padding,
        direction: isRTL ? 'rtl' : 'ltr',
        fontFamily: "'IBM Plex Sans Arabic', 'IBM Plex Sans', Arial, sans-serif",
        pageBreakInside: 'avoid',
      }}
    >
      {/* Header */}
      <div 
        className="text-center mb-1"
        style={{ fontSize: dimensions.fontSize.title }}
      >
        <span className="font-semibold">
          {t('locationLabel')} / Location
        </span>
      </div>

      {/* Location Code - Main Content */}
      <div 
        className="text-center font-bold my-2"
        style={{ 
          fontSize: printerType === 'thermal58' ? '16pt' : printerType === 'thermal80' ? '20pt' : '24pt',
          letterSpacing: '0.1em',
        }}
      >
        {data.locationCode}
      </div>

      {/* Zone/Aisle/Rack/Shelf info if available */}
      {(data.zone || data.aisle || data.rack || data.shelf) && (
        <div 
          className="text-center text-xs mb-2"
          style={{ fontSize: dimensions.fontSize.title }}
        >
          {data.zone && <span>{t('zone')}: {data.zone} </span>}
          {data.aisle && <span>{t('aisle')}: {data.aisle} </span>}
          {data.rack && <span>{t('rack')}: {data.rack} </span>}
          {data.shelf && <span>{t('shelf')}: {data.shelf}</span>}
        </div>
      )}

      {/* Barcode */}
      {showBarcode && (
        <BarcodeDisplay
          value={data.locationCode}
          height={isThermal ? 30 : 40}
          width={isThermal ? 1.5 : 2}
          fontSize={isThermal ? 8 : 10}
          className="mt-1"
        />
      )}

      {/* QR Code (typically for A4) */}
      {showQRCode && printerType === 'a4' && (
        <QRCodeDisplay
          value={data.locationCode}
          size={40}
          className="mt-1"
        />
      )}
    </div>
  );
}
