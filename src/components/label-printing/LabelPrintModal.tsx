import React, { useState, useRef, useCallback } from 'react';
import { useReactToPrint } from 'react-to-print';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  LabelData,
  LabelType,
  PrintConfig,
  PrinterType,
  LocationLabelData,
  ItemLabelData,
} from '@/types/labelPrinting';
import { PrinterSelector } from './PrinterSelector';
import { PrintPreview } from './PrintPreview';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLastPrint } from '@/hooks/useLastPrint';
import { usePrinterSettings } from '@/hooks/usePrinterSettings';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Printer,
  QrCode,
  Barcode,
  Copy,
  TestTube,
  RotateCcw,
  Settings2,
  MapPin,
  Package,
} from 'lucide-react';
import './printStyles.css';

interface LabelPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialLabelType?: LabelType;
  prefillData?: Partial<LocationLabelData> | Partial<ItemLabelData>;
}

export function LabelPrintModal({
  isOpen,
  onClose,
  initialLabelType = 'location',
  prefillData,
}: LabelPrintModalProps) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { settings, updateSettings } = usePrinterSettings();
  const { saveLastPrint, lastPrintJob, canReprint } = useLastPrint();
  
  const printRef = useRef<HTMLDivElement>(null);
  
  // Form state
  const [labelType, setLabelType] = useState<LabelType>(initialLabelType);
  const [printerType, setPrinterType] = useState<PrinterType>(settings.defaultPrinterType);
  const [copies, setCopies] = useState(1);
  const [showBarcode, setShowBarcode] = useState(settings.showBarcodeDefault);
  const [showQRCode, setShowQRCode] = useState(settings.showQRCodeDefault);
  
  // Location label data
  const [locationCode, setLocationCode] = useState(
    (prefillData as LocationLabelData)?.locationCode || ''
  );
  const [zone, setZone] = useState((prefillData as LocationLabelData)?.zone || '');
  const [aisle, setAisle] = useState((prefillData as LocationLabelData)?.aisle || '');
  const [rack, setRack] = useState((prefillData as LocationLabelData)?.rack || '');
  const [shelf, setShelf] = useState((prefillData as LocationLabelData)?.shelf || '');
  
  // Item label data
  const [itemName, setItemName] = useState((prefillData as ItemLabelData)?.itemName || '');
  const [itemNameEn, setItemNameEn] = useState((prefillData as ItemLabelData)?.itemNameEn || '');
  const [sku, setSku] = useState((prefillData as ItemLabelData)?.sku || '');
  const [quantity, setQuantity] = useState<number | undefined>(
    (prefillData as ItemLabelData)?.quantity
  );
  const [countryOfOrigin, setCountryOfOrigin] = useState(
    (prefillData as ItemLabelData)?.countryOfOrigin || ''
  );
  const [storageDate, setStorageDate] = useState(
    (prefillData as ItemLabelData)?.storageDate || new Date().toISOString().split('T')[0]
  );
  const [lotNumber, setLotNumber] = useState((prefillData as ItemLabelData)?.lotNumber || '');
  const [expiryDate, setExpiryDate] = useState((prefillData as ItemLabelData)?.expiryDate || '');

  // Build label data object
  const getLabelData = useCallback((): LabelData => {
    if (labelType === 'location') {
      return {
        type: 'location',
        locationCode,
        zone,
        aisle,
        rack,
        shelf,
      };
    }
    return {
      type: 'item',
      itemName,
      itemNameEn,
      sku,
      quantity,
      countryOfOrigin,
      storageDate,
      lotNumber,
      expiryDate,
      barcode: sku,
    };
  }, [
    labelType,
    locationCode,
    zone,
    aisle,
    rack,
    shelf,
    itemName,
    itemNameEn,
    sku,
    quantity,
    countryOfOrigin,
    storageDate,
    lotNumber,
    expiryDate,
  ]);

  const getConfig = useCallback((): PrintConfig => ({
    labelType,
    printerType,
    paperSize: printerType === 'thermal58' ? '58mm' : printerType === 'thermal80' ? '80mm' : 'A4',
    copies,
    showBarcode,
    showQRCode,
  }), [labelType, printerType, copies, showBarcode, showQRCode]);

  // Log print action
  const logPrintAction = async (labelData: LabelData) => {
    if (!user) return;
    
    try {
      const labelCode = labelData.type === 'location' 
        ? (labelData as LocationLabelData).locationCode 
        : (labelData as ItemLabelData).sku;
      
      await supabase.from('audit_logs').insert([{
        user_id: user.id,
        action: 'PRINT_LABEL',
        table_name: 'labels',
        record_id: labelCode,
        new_values: JSON.parse(JSON.stringify({
          labelType: labelData.type,
          printerType,
          copies,
        })),
      }]);
    } catch (error) {
      console.error('Failed to log print action:', error);
    }
  };

  // Print handler
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Label-${labelType}-${Date.now()}`,
    onAfterPrint: () => {
      const labelData = getLabelData();
      saveLastPrint(labelData, getConfig(), user?.id || 'anonymous');
      logPrintAction(labelData);
      toast.success(t('printSuccess'));
    },
    onPrintError: (error) => {
      console.error('Print error:', error);
      toast.error(t('printFailed'));
    },
  });

  // Test print
  const handleTestPrint = () => {
    const testData: LabelData = labelType === 'location'
      ? { type: 'location', locationCode: 'TEST-000', zone: 'TEST' }
      : { type: 'item', itemName: 'اختبار Test', sku: 'TEST-000', quantity: 0 };
    
    setLocationCode('TEST-000');
    setZone('TEST');
    setItemName('اختبار Test');
    setSku('TEST-000');
    setQuantity(0);
    
    setTimeout(() => handlePrint(), 100);
  };

  // Reprint last
  const handleReprint = () => {
    if (!lastPrintJob) return;
    
    const { labelData, config } = lastPrintJob;
    
    // Restore settings
    setLabelType(labelData.type);
    setPrinterType(config.printerType);
    setCopies(config.copies);
    setShowBarcode(config.showBarcode);
    setShowQRCode(config.showQRCode);
    
    if (labelData.type === 'location') {
      const loc = labelData as LocationLabelData;
      setLocationCode(loc.locationCode);
      setZone(loc.zone || '');
      setAisle(loc.aisle || '');
      setRack(loc.rack || '');
      setShelf(loc.shelf || '');
    } else {
      const item = labelData as ItemLabelData;
      setItemName(item.itemName);
      setItemNameEn(item.itemNameEn || '');
      setSku(item.sku);
      setQuantity(item.quantity);
      setCountryOfOrigin(item.countryOfOrigin || '');
      setStorageDate(item.storageDate || '');
      setLotNumber(item.lotNumber || '');
      setExpiryDate(item.expiryDate || '');
    }
    
    setTimeout(() => handlePrint(), 100);
  };

  // Save as default
  const handleSaveDefaults = () => {
    updateSettings({
      defaultPrinterType: printerType,
      showBarcodeDefault: showBarcode,
      showQRCodeDefault: showQRCode,
    });
    toast.success(t('settingsSaved'));
  };

  const isValid = labelType === 'location' 
    ? locationCode.trim().length > 0 
    : itemName.trim().length > 0 && sku.trim().length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            {t('printLabel')}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Form */}
          <div className="space-y-4">
            {/* Label Type Tabs */}
            <Tabs value={labelType} onValueChange={(v) => setLabelType(v as LabelType)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="location" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {t('locationLabel')}
                </TabsTrigger>
                <TabsTrigger value="item" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  {t('itemLabel')}
                </TabsTrigger>
              </TabsList>

              {/* Location Label Form */}
              <TabsContent value="location" className="space-y-3 mt-4">
                <div>
                  <Label>{t('locationCode')} *</Label>
                  <Input
                    value={locationCode}
                    onChange={(e) => setLocationCode(e.target.value.toUpperCase())}
                    placeholder="A-01-L2"
                    className="font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>{t('zone')}</Label>
                    <Input
                      value={zone}
                      onChange={(e) => setZone(e.target.value)}
                      placeholder="A"
                    />
                  </div>
                  <div>
                    <Label>{t('aisle')}</Label>
                    <Input
                      value={aisle}
                      onChange={(e) => setAisle(e.target.value)}
                      placeholder="01"
                    />
                  </div>
                  <div>
                    <Label>{t('rack')}</Label>
                    <Input
                      value={rack}
                      onChange={(e) => setRack(e.target.value)}
                      placeholder="R1"
                    />
                  </div>
                  <div>
                    <Label>{t('shelf')}</Label>
                    <Input
                      value={shelf}
                      onChange={(e) => setShelf(e.target.value)}
                      placeholder="L2"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Item Label Form */}
              <TabsContent value="item" className="space-y-3 mt-4">
                <div>
                  <Label>{t('labelItemName')} ({t('arabic')}) *</Label>
                  <Input
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder="اسم الصنف"
                    dir="rtl"
                  />
                </div>
                <div>
                  <Label>{t('labelItemName')} ({t('english')})</Label>
                  <Input
                    value={itemNameEn}
                    onChange={(e) => setItemNameEn(e.target.value)}
                    placeholder="Item Name"
                    dir="ltr"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>SKU *</Label>
                    <Input
                      value={sku}
                      onChange={(e) => setSku(e.target.value.toUpperCase())}
                      placeholder="SKU-001"
                      className="font-mono"
                    />
                  </div>
                  <div>
                    <Label>{t('labelQuantity')}</Label>
                    <Input
                      type="number"
                      value={quantity || ''}
                      onChange={(e) => setQuantity(e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>{t('origin')}</Label>
                    <Input
                      value={countryOfOrigin}
                      onChange={(e) => setCountryOfOrigin(e.target.value)}
                      placeholder="SA"
                    />
                  </div>
                  <div>
                    <Label>{t('lotNumber')}</Label>
                    <Input
                      value={lotNumber}
                      onChange={(e) => setLotNumber(e.target.value)}
                      placeholder="LOT-001"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>{t('storageDate')}</Label>
                    <Input
                      type="date"
                      value={storageDate}
                      onChange={(e) => setStorageDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>{t('expiryDate')}</Label>
                    <Input
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <Separator />

            {/* Printer Settings */}
            <PrinterSelector
              value={printerType}
              onChange={setPrinterType}
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('copies')}</Label>
                <Input
                  type="number"
                  min={1}
                  max={printerType === 'a4' ? 6 : 20}
                  value={copies}
                  onChange={(e) => setCopies(Math.max(1, Number(e.target.value)))}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Barcode className="h-4 w-4" />
                    {t('showBarcode')}
                  </Label>
                  <Switch checked={showBarcode} onCheckedChange={setShowBarcode} />
                </div>
                {printerType === 'a4' && (
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <QrCode className="h-4 w-4" />
                      {t('showQRCode')}
                    </Label>
                    <Switch checked={showQRCode} onCheckedChange={setShowQRCode} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Preview */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">{t('preview')}</Label>
              <Badge variant="outline">
                {printerType === 'a4' ? 'A4' : printerType === 'thermal80' ? '80mm' : '58mm'}
              </Badge>
            </div>
            
            <div className="label-preview-container bg-muted rounded-lg p-4 min-h-[300px] flex items-center justify-center overflow-auto">
              <div 
                className={printerType === 'a4' ? 'label-preview-a4' : 'label-preview-thermal'}
                style={{ transform: printerType === 'a4' ? 'scale(0.4)' : 'scale(0.9)' }}
              >
                <PrintPreview
                  ref={printRef}
                  labelData={getLabelData()}
                  config={getConfig()}
                />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestPrint}
                className="flex items-center gap-1"
              >
                <TestTube className="h-4 w-4" />
                {t('testPrint')}
              </Button>
              
              {canReprint && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReprint}
                  className="flex items-center gap-1"
                >
                  <RotateCcw className="h-4 w-4" />
                  {t('reprintLast')}
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveDefaults}
                className="flex items-center gap-1"
              >
                <Settings2 className="h-4 w-4" />
                {t('saveAsDefault')}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button
            onClick={() => handlePrint()}
            disabled={!isValid}
            className="flex items-center gap-2"
          >
            <Printer className="h-4 w-4" />
            {t('print')} ({copies} {copies === 1 ? t('copy') : t('copies')})
          </Button>
        </DialogFooter>

        {/* Hidden print container */}
        <div className="hidden print:block print-container">
          <PrintPreview
            ref={printRef}
            labelData={getLabelData()}
            config={getConfig()}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
