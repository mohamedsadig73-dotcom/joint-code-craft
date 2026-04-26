import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Settings2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { PaperSize, PaperOrientation, WindowsPrintMode } from '@/utils/printDocument';

export interface PrintSettings {
  paperSize: PaperSize;
  orientation: PaperOrientation;
  marginMm: number;
  /** Windows-only transport selector. Defaults to 'auto'. */
  windowsMode: WindowsPrintMode;
}

interface PrintSettingsPopoverProps {
  value: PrintSettings;
  onChange: (next: PrintSettings) => void;
}

/**
 * Compact print settings panel: paper size (A4 / Letter), orientation,
 * and a simple margin selector. Persisted by the caller via localStorage
 * (see usePrintSettings).
 */
export function PrintSettingsPopover({ value, onChange }: PrintSettingsPopoverProps) {
  const { t } = useLanguage();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" title={t('printSettings')}>
          <Settings2 className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-4" align="end">
        <div className="space-y-1.5">
          <h4 className="text-sm font-semibold">{t('printSettings')}</h4>
          <p className="text-xs text-muted-foreground">{t('printSettingsHint')}</p>
        </div>

        {/* Paper size */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">{t('paperSize')}</Label>
          <RadioGroup
            value={value.paperSize}
            onValueChange={(v) => onChange({ ...value, paperSize: v as PaperSize })}
            className="grid grid-cols-2 gap-2"
          >
            <Label className="flex items-center gap-2 border rounded-md p-2 cursor-pointer hover:bg-accent">
              <RadioGroupItem value="A4" />
              <span className="text-sm">A4</span>
            </Label>
            <Label className="flex items-center gap-2 border rounded-md p-2 cursor-pointer hover:bg-accent">
              <RadioGroupItem value="Letter" />
              <span className="text-sm">Letter</span>
            </Label>
          </RadioGroup>
        </div>

        {/* Orientation */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">{t('orientation')}</Label>
          <RadioGroup
            value={value.orientation}
            onValueChange={(v) => onChange({ ...value, orientation: v as PaperOrientation })}
            className="grid grid-cols-2 gap-2"
          >
            <Label className="flex items-center gap-2 border rounded-md p-2 cursor-pointer hover:bg-accent">
              <RadioGroupItem value="portrait" />
              <span className="text-sm">{t('portrait')}</span>
            </Label>
            <Label className="flex items-center gap-2 border rounded-md p-2 cursor-pointer hover:bg-accent">
              <RadioGroupItem value="landscape" />
              <span className="text-sm">{t('landscape')}</span>
            </Label>
          </RadioGroup>
        </div>

        {/* Margins */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">{t('margins')}</Label>
          <RadioGroup
            value={String(value.marginMm)}
            onValueChange={(v) => onChange({ ...value, marginMm: Number(v) })}
            className="grid grid-cols-3 gap-2"
          >
            {[5, 10, 20].map((m) => (
              <Label
                key={m}
                className="flex items-center justify-center gap-1.5 border rounded-md p-2 cursor-pointer hover:bg-accent"
              >
                <RadioGroupItem value={String(m)} />
                <span className="text-sm tabular-nums">{m}mm</span>
              </Label>
            ))}
          </RadioGroup>
        </div>

        {/* Windows print mode */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">{t('printMode')}</Label>
          <p className="text-[11px] text-muted-foreground leading-snug">{t('printModeHint')}</p>
          <RadioGroup
            value={value.windowsMode}
            onValueChange={(v) => onChange({ ...value, windowsMode: v as WindowsPrintMode })}
            className="grid grid-cols-1 gap-1.5"
          >
            <Label className="flex items-center gap-2 border rounded-md p-2 cursor-pointer hover:bg-accent">
              <RadioGroupItem value="auto" />
              <span className="text-sm">{t('printModeAuto')}</span>
            </Label>
            <Label className="flex items-center gap-2 border rounded-md p-2 cursor-pointer hover:bg-accent">
              <RadioGroupItem value="native" />
              <span className="text-sm">{t('printModeNative')}</span>
            </Label>
            <Label className="flex items-center gap-2 border rounded-md p-2 cursor-pointer hover:bg-accent">
              <RadioGroupItem value="preview" />
              <span className="text-sm">{t('printModePreview')}</span>
            </Label>
          </RadioGroup>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Hook helper to persist settings across sessions. */
const STORAGE_KEY = 'dts.print.settings';
const DEFAULTS: PrintSettings = {
  paperSize: 'A4',
  orientation: 'portrait',
  marginMm: 10,
  windowsMode: 'auto',
};

export function loadPrintSettings(): PrintSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<PrintSettings>;
    return {
      paperSize: parsed.paperSize === 'Letter' ? 'Letter' : 'A4',
      orientation: parsed.orientation === 'landscape' ? 'landscape' : 'portrait',
      marginMm: typeof parsed.marginMm === 'number' ? parsed.marginMm : 10,
      windowsMode:
        parsed.windowsMode === 'native' || parsed.windowsMode === 'preview'
          ? parsed.windowsMode
          : 'auto',
    };
  } catch {
    return DEFAULTS;
  }
}

export function savePrintSettings(s: PrintSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // ignore quota/serialization errors
  }
}