import React from 'react';
import { ItemLabelData, PrinterType, LABEL_DIMENSIONS } from '@/types/labelPrinting';
import { BarcodeDisplay } from './BarcodeDisplay';
import { QRCodeDisplay } from './QRCodeDisplay';
import { useLanguage } from '@/contexts/LanguageContext';
import { format } from 'date-fns';

interface ItemLabelProps {
  data: ItemLabelData;
  printerType: PrinterType;
  showBarcode?: boolean;
  showQRCode?: boolean;
  isPreview?: boolean;
}

export function ItemLabel({
  data,
  printerType,
  showBarcode = true,
  showQRCode = false,
  isPreview = false,
}: ItemLabelProps) {
  const { t, language } = useLanguage();
  const dimensions = LABEL_DIMENSIONS[printerType];
  const isRTL = language === 'ar';
  const isThermal = printerType !== 'a4';

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'yyyy/MM/dd');
    } catch {
      return dateString;
    }
  };

  return (
    <div
      className={`
        bg-white text-black border-2 border-black
        flex flex-col
        ${isPreview ? 'shadow-lg' : ''}
      `}
      style={{
        width: isThermal ? dimensions.width : '80mm',
        height: isThermal ? dimensions.height : '40mm',
        padding: dimensions.padding,
        direction: isRTL ? 'rtl' : 'ltr',
        fontFamily: "'IBM Plex Sans Arabic', 'IBM Plex Sans', Arial, sans-serif",
        pageBreakInside: 'avoid',
      }}
    >
      {/* Item Name - Bilingual */}
      <div 
        className="text-center font-bold border-b border-black pb-1 mb-1"
        style={{ fontSize: isThermal ? '10pt' : '12pt' }}
      >
        <div>{data.itemName}</div>
        {data.itemNameEn && (
          <div className="text-xs font-normal">{data.itemNameEn}</div>
        )}
      </div>

      {/* SKU */}
      <div 
        className="flex justify-between items-center text-xs"
        style={{ fontSize: dimensions.fontSize.title }}
      >
        <span className="font-semibold">SKU:</span>
        <span className="font-mono">{data.sku}</span>
      </div>

      {/* Quantity */}
      {data.quantity !== undefined && (
        <div 
          className="flex justify-between items-center text-xs"
          style={{ fontSize: dimensions.fontSize.title }}
        >
          <span className="font-semibold">{t('labelQuantity')} / Qty:</span>
          <span>{data.quantity}</span>
        </div>
      )}

      {/* Country of Origin */}
      {data.countryOfOrigin && (
        <div 
          className="flex justify-between items-center text-xs"
          style={{ fontSize: dimensions.fontSize.title }}
        >
          <span className="font-semibold">{t('origin')} / Origin:</span>
          <span>{data.countryOfOrigin}</span>
        </div>
      )}

      {/* Storage Date */}
      {data.storageDate && (
        <div 
          className="flex justify-between items-center text-xs"
          style={{ fontSize: dimensions.fontSize.title }}
        >
          <span className="font-semibold">{t('storageDate')} / Stored:</span>
          <span>{formatDate(data.storageDate)}</span>
        </div>
      )}

      {/* Lot Number */}
      {data.lotNumber && (
        <div 
          className="flex justify-between items-center text-xs"
          style={{ fontSize: dimensions.fontSize.title }}
        >
          <span className="font-semibold">{t('lotNumber')} / Lot:</span>
          <span>{data.lotNumber}</span>
        </div>
      )}

      {/* Expiry Date */}
      {data.expiryDate && (
        <div 
          className="flex justify-between items-center text-xs text-red-600"
          style={{ fontSize: dimensions.fontSize.title }}
        >
          <span className="font-semibold">{t('expiryDate')} / Exp:</span>
          <span>{formatDate(data.expiryDate)}</span>
        </div>
      )}

      {/* Barcode */}
      {showBarcode && (
        <BarcodeDisplay
          value={data.barcode || data.sku}
          height={isThermal ? 25 : 35}
          width={isThermal ? 1.2 : 1.8}
          fontSize={isThermal ? 7 : 9}
          className="mt-auto pt-1"
        />
      )}

      {/* QR Code for A4 - includes all data */}
      {showQRCode && printerType === 'a4' && (
        <QRCodeDisplay
          value={JSON.stringify({
            sku: data.sku,
            name: data.itemName,
            qty: data.quantity,
            lot: data.lotNumber,
          })}
          size={35}
          className="absolute bottom-2 right-2"
        />
      )}
    </div>
  );
}
