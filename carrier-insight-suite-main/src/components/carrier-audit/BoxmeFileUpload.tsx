import { useCallback, useRef } from 'react';
import { Upload, X, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useI18n } from '@/hooks/use-i18n';

interface BoxmeFileUploadProps {
  fileName: string | null;
  fileStats: string | null;
  headers: string[];
  trackingCol: string | null;
  weightCol: string | null;
  feeCol: string | null;
  onFile: (file: File) => void;
  onClear: () => void;
  onTrackingColChange: (v: string | null) => void;
  onWeightColChange: (v: string | null) => void;
  onFeeColChange: (v: string | null) => void;
}

export function BoxmeFileUpload({
  fileName, fileStats, headers,
  trackingCol, weightCol, feeCol,
  onFile, onClear,
  onTrackingColChange, onWeightColChange, onFeeColChange,
}: BoxmeFileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useI18n();

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }, [onFile]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) onFile(e.target.files[0]);
  }, [onFile]);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">{t('boxme.title')}</h3>

      <div
        className="border-2 border-dashed border-border rounded-lg p-4 sm:p-6 text-center cursor-pointer transition-colors hover:border-primary hover:bg-accent/50 active:bg-accent/70"
        onClick={() => inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
      >
        <Upload className="mx-auto h-6 w-6 text-muted-foreground mb-1.5" />
        <p className="text-xs sm:text-sm text-muted-foreground">{t('boxme.dropHere')}</p>
        <p className="text-[10px] sm:text-xs text-muted-foreground">{t('step2.orBrowse')}</p>
        <input ref={inputRef} type="file" className="hidden" accept=".csv,.xlsx,.xls" onChange={handleChange} />
      </div>

      {fileName && (
        <>
          <div className="flex items-center justify-between bg-accent/50 rounded-md p-2.5 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <FileSpreadsheet className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium truncate">{fileName}</p>
                {fileStats && <p className="text-[10px] sm:text-xs text-muted-foreground">{fileStats}</p>}
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClear} className="shrink-0 h-7 w-7">
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Column mapping for Boxme */}
          {headers.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">{t('boxme.mapColumns')}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] sm:text-xs">{t('boxme.trackingCol')} *</Label>
                  <Select value={trackingCol ?? ''} onValueChange={v => onTrackingColChange(v || null)}>
                    <SelectTrigger className="h-8 sm:h-9 text-xs"><SelectValue placeholder="--" /></SelectTrigger>
                    <SelectContent>
                      {headers.map(h => <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] sm:text-xs">{t('boxme.weightCol')}</Label>
                  <Select value={weightCol ?? ''} onValueChange={v => onWeightColChange(v || null)}>
                    <SelectTrigger className="h-8 sm:h-9 text-xs"><SelectValue placeholder="--" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__" className="text-xs">--</SelectItem>
                      {headers.map(h => <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] sm:text-xs">{t('boxme.feeCol')}</Label>
                  <Select value={feeCol ?? ''} onValueChange={v => onFeeColChange(v === '__none__' ? null : (v || null))}>
                    <SelectTrigger className="h-8 sm:h-9 text-xs"><SelectValue placeholder="--" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__" className="text-xs">--</SelectItem>
                      {headers.map(h => <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
