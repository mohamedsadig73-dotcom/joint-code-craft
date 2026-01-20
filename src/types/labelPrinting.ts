// Label Printing Types
// Complete type definitions for the label printing module

export type LabelType = 'location' | 'item';
export type PrinterType = 'thermal58' | 'thermal80' | 'a4';
export type PaperSize = '58mm' | '80mm' | 'A4';

export interface LocationLabelData {
  type: 'location';
  locationCode: string;  // e.g., A-01-L2
  zone?: string;
  aisle?: string;
  rack?: string;
  shelf?: string;
  bin?: string;
}

export interface ItemLabelData {
  type: 'item';
  itemName: string;
  itemNameEn?: string;
  sku: string;
  quantity?: number;
  countryOfOrigin?: string;
  storageDate?: string;
  lotNumber?: string;
  expiryDate?: string;
  barcode?: string;
}

export type LabelData = LocationLabelData | ItemLabelData;

export interface PrintConfig {
  labelType: LabelType;
  printerType: PrinterType;
  paperSize: PaperSize;
  copies: number;
  showBarcode: boolean;
  showQRCode: boolean;
  labelsPerSheet?: number; // For A4: 4 for location, 6 for item
}

export interface PrintJob {
  id: string;
  labelData: LabelData;
  config: PrintConfig;
  printedAt: string;
  printedBy: string;
}

export interface PrinterSettings {
  defaultPrinterType: PrinterType;
  defaultPaperSize: PaperSize;
  showBarcodeDefault: boolean;
  showQRCodeDefault: boolean;
}

export interface LabelDimensions {
  width: string;
  height: string;
  padding: string;
  fontSize: {
    title: string;
    value: string;
    barcode: string;
  };
}

export const LABEL_DIMENSIONS: Record<PrinterType, LabelDimensions> = {
  thermal58: {
    width: '58mm',
    height: '40mm',
    padding: '2mm',
    fontSize: {
      title: '8pt',
      value: '10pt',
      barcode: '8pt',
    },
  },
  thermal80: {
    width: '80mm',
    height: '50mm',
    padding: '3mm',
    fontSize: {
      title: '10pt',
      value: '12pt',
      barcode: '9pt',
    },
  },
  a4: {
    width: '100%',
    height: 'auto',
    padding: '5mm',
    fontSize: {
      title: '11pt',
      value: '14pt',
      barcode: '10pt',
    },
  },
};

// A4 Layout configurations
export const A4_LAYOUTS = {
  location: {
    columns: 2,
    rows: 2,
    labelWidth: '100mm',
    labelHeight: '50mm',
    gap: '5mm',
    labelsPerPage: 4,
  },
  item: {
    columns: 2,
    rows: 3,
    labelWidth: '80mm',
    labelHeight: '40mm',
    gap: '5mm',
    labelsPerPage: 6,
  },
};

// Audit log entry for printing
export interface PrintAuditLog {
  userId: string;
  username: string;
  labelType: LabelType;
  labelCode: string;
  printedAt: string;
  printerType: PrinterType;
  copies: number;
}
