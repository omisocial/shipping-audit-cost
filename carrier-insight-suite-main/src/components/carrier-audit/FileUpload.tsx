import { useCallback, useRef } from 'react';
import { Upload, X, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/hooks/use-i18n';

interface FileUploadProps {
  fileName: string | null;
  fileStats: string | null;
  onFile: (file: File) => void;
  onClear: () => void;
}

export function FileUpload({ fileName, fileStats, onFile, onClear }: FileUploadProps) {
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
      <h3 className="text-sm font-semibold text-foreground">{t('step2.title')}</h3>

      <div
        className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer transition-colors hover:border-primary hover:bg-accent/50 active:bg-accent/70"
        onClick={() => inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
      >
        <Upload className="mx-auto h-7 w-7 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">{t('step2.dropHere')}</p>
        <p className="text-xs text-muted-foreground">{t('step2.orBrowse')}</p>
        <input ref={inputRef} type="file" className="hidden" accept=".csv,.xlsx,.xls" onChange={handleChange} />
      </div>

      {fileName && (
        <div className="flex items-center justify-between bg-accent/50 rounded-md p-3 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <FileSpreadsheet className="h-4 w-4 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{fileName}</p>
              {fileStats && <p className="text-xs text-muted-foreground">{fileStats}</p>}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClear} className="shrink-0 h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
