import { useState, useCallback, useRef } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Download, Upload, Play, Zap } from 'lucide-react';

import { CarrierSelect } from '@/components/carrier-audit/CarrierSelect';
import { FileUpload } from '@/components/carrier-audit/FileUpload';
import { BoxmeFileUpload } from '@/components/carrier-audit/BoxmeFileUpload';
import { ColumnMapping } from '@/components/carrier-audit/ColumnMapping';
import { ProcessingPanel } from '@/components/carrier-audit/ProcessingPanel';
import { ResultsDashboard } from '@/components/carrier-audit/ResultsDashboard';
import { ReconciliationDashboard } from '@/components/carrier-audit/ReconciliationDashboard';
import { LanguageSwitcher } from '@/components/carrier-audit/LanguageSwitcher';
import { OnboardingPage, useOnboarding } from '@/components/carrier-audit/OnboardingPage';

import { useI18n } from '@/hooks/use-i18n';
import { COLUMN_HINTS, CARRIER_OPTIONS } from '@/lib/carrier-audit/constants';
import { autoDetectColumns, processChunk } from '@/lib/carrier-audit/engine';
import { loadTemplates, saveTemplates, exportTemplatesAsJson } from '@/lib/carrier-audit/templates';
import { exportCSV, exportExcel } from '@/lib/carrier-audit/export';
import { reconcile, exportErrorReport, exportMissingTrackingList, exportReconciliationExcel } from '@/lib/carrier-audit/reconciliation';
import { generateFlashExpressDemoData } from '@/lib/carrier-audit/demo-data';
import type { FieldKey, CarrierTemplate, ValidationResult, ProcessingState, Tolerances } from '@/lib/carrier-audit/types';
import type { ReconciliationResult } from '@/lib/carrier-audit/reconciliation';

const BOXME_TRACKING_HINTS = ['tracking', 'tracking_no', 'boxme', 'bx_tracking', 'ma_van_don', 'mã vận đơn', 'order_code'];
const BOXME_WEIGHT_HINTS = ['weight', 'actual_weight', 'kg', 'khoi_luong', 'cân nặng'];
const BOXME_FEE_HINTS = ['fee', 'shipping_fee', 'total_fee', 'phi_van_chuyen'];

function autoDetectBoxmeCol(headers: string[], hints: string[]): string | null {
  for (const hint of hints) {
    const exact = headers.find(h => h.toLowerCase().trim() === hint.toLowerCase());
    if (exact) return exact;
  }
  for (const hint of hints) {
    const partial = headers.find(h => h.toLowerCase().includes(hint.toLowerCase()));
    if (partial) return partial;
  }
  return null;
}

function parseFile(
  file: File,
  onSuccess: (data: Record<string, unknown>[], headers: string[]) => void,
  onError: () => void,
  t: (k: string) => string
) {
  const name = file.name.toLowerCase();
  if (!name.endsWith('.csv') && !name.endsWith('.xlsx') && !name.endsWith('.xls')) {
    toast.error(t('toast.invalidFile'));
    return;
  }
  if (name.endsWith('.csv')) {
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (res) => {
        const data = res.data as Record<string, unknown>[];
        const headers = res.meta.fields || [];
        onSuccess(data, headers);
        toast.success(t('toast.fileParsed'));
      },
      error: () => { toast.error('Failed to parse CSV'); onError(); },
    });
  } else {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Record<string, unknown>[];
        const headers = json.length > 0 ? Object.keys(json[0]) : [];
        onSuccess(json, headers);
        toast.success(t('toast.fileParsed'));
      } catch { toast.error('Failed to parse Excel'); onError(); }
    };
    reader.readAsArrayBuffer(file);
  }
}

const Index = () => {
  const { t } = useI18n();
  const { showOnboarding, dismissOnboarding } = useOnboarding();

  const [carrier, setCarrier] = useState('');
  const [carrierName, setCarrierName] = useState('');
  const [templates, setTemplates] = useState<Record<string, CarrierTemplate>>(loadTemplates);

  const [fileData, setFileData] = useState<Record<string, unknown>[]>([]);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileStats, setFileStats] = useState<string | null>(null);

  const [boxmeData, setBoxmeData] = useState<Record<string, unknown>[]>([]);
  const [boxmeHeaders, setBoxmeHeaders] = useState<string[]>([]);
  const [boxmeFileName, setBoxmeFileName] = useState<string | null>(null);
  const [boxmeFileStats, setBoxmeFileStats] = useState<string | null>(null);
  const [boxmeTrackingCol, setBoxmeTrackingCol] = useState<string | null>(null);
  const [boxmeWeightCol, setBoxmeWeightCol] = useState<string | null>(null);
  const [boxmeFeeCol, setBoxmeFeeCol] = useState<string | null>(null);

  const [mapping, setMapping] = useState<Partial<Record<FieldKey, string | null>>>({});
  const [tolerances, setTolerances] = useState<Tolerances>({ weight: 5, fee: 2 });
  const [threadCount, setThreadCount] = useState(4);

  const [processing, setProcessing] = useState<ProcessingState>({
    isProcessing: false, progress: 0, label: '', threads: [], log: [], errors: [],
  });
  const [showProcessing, setShowProcessing] = useState(false);

  const [results, setResults] = useState<ValidationResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [reconResult, setReconResult] = useState<ReconciliationResult | null>(null);

  const importRef = useRef<HTMLInputElement>(null);

  // ===== DEMO DATA LOADER =====
  const loadDemoData = useCallback(() => {
    const demo = generateFlashExpressDemoData();
    setCarrier('FLASH');
    setCarrierName('Flash Express');
    setFileData(demo.carrierData);
    setFileHeaders(demo.carrierHeaders);
    setFileName('flash_express_demo.csv');
    setFileStats(`${demo.carrierData.length} rows × ${demo.carrierHeaders.length} columns`);
    setMapping(autoDetectColumns(demo.carrierHeaders, COLUMN_HINTS));
    setBoxmeData(demo.boxmeData);
    setBoxmeHeaders(demo.boxmeHeaders);
    setBoxmeFileName('boxme_flash_demo.csv');
    setBoxmeFileStats(`${demo.boxmeData.length} rows × ${demo.boxmeHeaders.length} columns`);
    setBoxmeTrackingCol(autoDetectBoxmeCol(demo.boxmeHeaders, BOXME_TRACKING_HINTS));
    setBoxmeWeightCol(autoDetectBoxmeCol(demo.boxmeHeaders, BOXME_WEIGHT_HINTS));
    setBoxmeFeeCol(autoDetectBoxmeCol(demo.boxmeHeaders, BOXME_FEE_HINTS));
    setResults([]); setShowResults(false); setShowProcessing(false); setReconResult(null);
    toast.success(t('toast.demoLoaded'));
  }, [t]);

  const handleCarrierChange = useCallback((value: string) => {
    setCarrier(value);
    const opt = CARRIER_OPTIONS.find(c => c.value === value);
    setCarrierName(opt?.label || '');
    if (value !== 'CUSTOM' && templates[value]) {
      setMapping({ ...templates[value].mapping });
    }
  }, [templates]);

  const handleCarrierFile = useCallback((file: File) => {
    setFileName(file.name);
    setFileStats('Parsing...');
    parseFile(file, (data, headers) => {
      setFileData(data);
      setFileHeaders(headers);
      setFileStats(`${data.length.toLocaleString()} rows × ${headers.length} columns`);
      if (carrier && templates[carrier]) {
        setMapping({ ...templates[carrier].mapping });
      } else {
        setMapping(autoDetectColumns(headers, COLUMN_HINTS));
      }
    }, () => clearCarrierFile(), t);
  }, [carrier, templates, t]);

  const handleBoxmeFile = useCallback((file: File) => {
    setBoxmeFileName(file.name);
    setBoxmeFileStats('Parsing...');
    parseFile(file, (data, headers) => {
      setBoxmeData(data);
      setBoxmeHeaders(headers);
      setBoxmeFileStats(`${data.length.toLocaleString()} rows × ${headers.length} columns`);
      setBoxmeTrackingCol(autoDetectBoxmeCol(headers, BOXME_TRACKING_HINTS));
      setBoxmeWeightCol(autoDetectBoxmeCol(headers, BOXME_WEIGHT_HINTS));
      setBoxmeFeeCol(autoDetectBoxmeCol(headers, BOXME_FEE_HINTS));
    }, () => clearBoxmeFile(), t);
  }, [t]);

  const clearCarrierFile = useCallback(() => {
    setFileData([]); setFileHeaders([]); setFileName(null); setFileStats(null);
    setMapping({}); setResults([]); setShowResults(false); setShowProcessing(false); setReconResult(null);
  }, []);

  const clearBoxmeFile = useCallback(() => {
    setBoxmeData([]); setBoxmeHeaders([]); setBoxmeFileName(null); setBoxmeFileStats(null);
    setBoxmeTrackingCol(null); setBoxmeWeightCol(null); setBoxmeFeeCol(null); setReconResult(null);
  }, []);

  const handleMappingChange = useCallback((field: FieldKey, value: string | null) => {
    setMapping(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleAutoDetect = useCallback(() => {
    setMapping(autoDetectColumns(fileHeaders, COLUMN_HINTS));
    toast.info(t('toast.autoDetected'));
  }, [fileHeaders, t]);

  const handleSaveTemplate = useCallback(() => {
    let code = carrier;
    if (code === 'CUSTOM') {
      if (!carrierName.trim()) { toast.error(t('toast.enterCarrier')); return; }
      code = carrierName.toUpperCase().replace(/\s+/g, '_');
    }
    if (!code) { toast.error(t('toast.selectCarrier')); return; }
    const updated = {
      ...templates,
      [code]: { name: carrierName, mapping: { ...mapping }, updatedAt: new Date().toISOString() },
    };
    setTemplates(updated);
    saveTemplates(updated);
    toast.success(t('toast.templateSaved'));
  }, [carrier, carrierName, mapping, templates, t]);

  const handleImportTemplate = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target!.result as string);
        const updated = { ...templates, ...imported };
        setTemplates(updated);
        saveTemplates(updated);
        toast.success(`Imported ${Object.keys(imported).length} templates`);
      } catch { toast.error('Invalid template file'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [templates]);

  const startProcessing = useCallback(async () => {
    if (!mapping.carrier_tracking) {
      toast.error(t('toast.mapTracking'));
      return;
    }

    setShowProcessing(true);
    setShowResults(false);
    setReconResult(null);

    const totalRows = fileData.length;
    const chunkSize = Math.ceil(totalRows / threadCount);
    const chunks: Record<string, unknown>[][] = [];
    for (let i = 0; i < totalRows; i += chunkSize) {
      chunks.push(fileData.slice(i, i + chunkSize));
    }

    const threads = chunks.map((c, i) => ({ index: i, processed: 0, total: c.length }));

    setProcessing({
      isProcessing: true, progress: 0, label: 'Processing...',
      threads,
      log: [`[${new Date().toLocaleTimeString()}] ✓ Starting validation with ${threadCount} threads for ${totalRows} records...`],
      errors: [],
    });

    const allResults: ValidationResult[] = [];
    const allErrors: { row: number; message: string }[] = [];
    const startTime = Date.now();

    for (let i = 0; i < chunks.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 50));
      const result = processChunk(chunks[i], i * chunkSize, mapping, tolerances);
      allResults.push(...result.results);
      allErrors.push(...result.errors);
      const progress = Math.round(((i + 1) / chunks.length) * 100);
      setProcessing(prev => ({
        ...prev, progress,
        threads: prev.threads.map((th, ti) => ti === i ? { ...th, processed: th.total } : th),
        log: [...prev.log, `[${new Date().toLocaleTimeString()}] ✓ Thread ${i + 1} completed: ${chunks[i].length} records`],
        errors: allErrors,
      }));
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    allResults.sort((a, b) => a.rowIndex - b.rowIndex);

    let recon: ReconciliationResult | null = null;
    if (boxmeData.length > 0 && boxmeTrackingCol && mapping.carrier_tracking) {
      recon = reconcile(
        fileData, boxmeData,
        mapping.carrier_tracking, boxmeTrackingCol,
        mapping.weight, boxmeWeightCol,
        mapping.fee, boxmeFeeCol,
        allResults,
        tolerances.weight,
        tolerances.fee
      );
      setProcessing(prev => ({
        ...prev,
        log: [
          ...prev.log,
          `[${new Date().toLocaleTimeString()}] ✓ Reconciliation: ${recon!.stats.matchedCount} matched, ${recon!.stats.discrepancyCount} discrepancies, ${recon!.stats.missingInBoxme} missing in Boxme, ${recon!.stats.missingInCarrier} missing in Carrier`,
        ],
      }));
    }

    setProcessing(prev => ({
      ...prev, isProcessing: false, progress: 100, label: t('processing.complete'),
      log: [...prev.log, `[${new Date().toLocaleTimeString()}] ✓ Processing complete in ${elapsed}s`],
    }));

    setResults(allResults);
    setReconResult(recon);
    setShowResults(true);
  }, [fileData, boxmeData, boxmeTrackingCol, boxmeWeightCol, boxmeFeeCol, mapping, tolerances, threadCount, t]);

  const hasCarrierFile = fileData.length > 0;
  const canProcess = hasCarrierFile && !!mapping.carrier_tracking;
  const hasTemplate = !!carrier && carrier !== 'CUSTOM' && !!templates[carrier];
  const templateDate = hasTemplate ? new Date(templates[carrier].updatedAt).toLocaleDateString() : undefined;

  if (showOnboarding) {
    return <OnboardingPage onDismiss={dismissOnboarding} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-foreground truncate">{t('app.title')}</h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">{t('app.subtitle')}</p>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <LanguageSwitcher />
              {/* Demo button */}
              <Button variant="secondary" size="sm" onClick={loadDemoData} className="h-8 text-xs gap-1">
                <Zap className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t('app.loadDemo')}</span>
                <span className="sm:hidden">Demo</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportTemplatesAsJson(templates)} className="h-8 text-xs hidden sm:flex">
                <Download className="h-3.5 w-3.5 mr-1" /> {t('app.exportTemplates')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => importRef.current?.click()} className="h-8 text-xs hidden sm:flex">
                <Upload className="h-3.5 w-3.5 mr-1" /> {t('app.importTemplates')}
              </Button>
              <Button variant="outline" size="icon" onClick={() => exportTemplatesAsJson(templates)} className="h-8 w-8 sm:hidden">
                <Download className="h-3.5 w-3.5" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => importRef.current?.click()} className="h-8 w-8 sm:hidden">
                <Upload className="h-3.5 w-3.5" />
              </Button>
              <input ref={importRef} type="file" className="hidden" accept=".json" onChange={handleImportTemplate} />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-20">
        {/* Row 1: Carrier + Validation Rules */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          <Card>
            <CardContent className="p-3 sm:p-4">
              <CarrierSelect
                carrier={carrier} carrierName={carrierName}
                hasTemplate={hasTemplate} templateDate={templateDate}
                onCarrierChange={handleCarrierChange} onCustomNameChange={setCarrierName}
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">{t('step3.title')}</h3>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] sm:text-xs">{t('step3.weightTolerance')}</Label>
                  <Input type="number" value={tolerances.weight}
                    onChange={e => setTolerances(prev => ({ ...prev, weight: parseFloat(e.target.value) || 0 }))}
                    className="h-9 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] sm:text-xs">{t('step3.feeTolerance')}</Label>
                  <Input type="number" value={tolerances.fee}
                    onChange={e => setTolerances(prev => ({ ...prev, fee: parseFloat(e.target.value) || 0 }))}
                    className="h-9 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] sm:text-xs">{t('step3.threads')}</Label>
                  <Select value={String(threadCount)} onValueChange={v => setThreadCount(Number(v))}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">{t('step3.threadsSafe')}</SelectItem>
                      <SelectItem value="4">{t('step3.threadsBalanced')}</SelectItem>
                      <SelectItem value="8">{t('step3.threadsFast')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Row 2: Carrier File + Boxme File */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          <Card>
            <CardContent className="p-3 sm:p-4">
              <FileUpload fileName={fileName} fileStats={fileStats} onFile={handleCarrierFile} onClear={clearCarrierFile} />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <BoxmeFileUpload
                fileName={boxmeFileName} fileStats={boxmeFileStats}
                headers={boxmeHeaders}
                trackingCol={boxmeTrackingCol} weightCol={boxmeWeightCol} feeCol={boxmeFeeCol}
                onFile={handleBoxmeFile} onClear={clearBoxmeFile}
                onTrackingColChange={setBoxmeTrackingCol}
                onWeightColChange={setBoxmeWeightCol}
                onFeeColChange={setBoxmeFeeCol}
              />
            </CardContent>
          </Card>
        </div>

        {/* Start Button */}
        <Button className="w-full h-12 text-sm font-semibold" disabled={!canProcess || processing.isProcessing} onClick={startProcessing}>
          <Play className="h-4 w-4 mr-2" /> {t('btn.startValidation')}
        </Button>

        {/* Column Mapping (Carrier) */}
        {hasCarrierFile && (
          <Card>
            <CardContent className="p-3 sm:p-4">
              <ColumnMapping
                headers={fileHeaders} mapping={mapping}
                previewData={fileData.slice(0, 5)}
                onMappingChange={handleMappingChange}
                onAutoDetect={handleAutoDetect}
                onSaveTemplate={handleSaveTemplate}
              />
            </CardContent>
          </Card>
        )}

        <Separator />

        {showProcessing && (
          <Card>
            <CardContent className="p-3 sm:p-4">
              <ProcessingPanel state={processing} />
            </CardContent>
          </Card>
        )}

        {showResults && results.length > 0 && (
          <Card>
            <CardContent className="p-3 sm:p-4">
              <ResultsDashboard
                results={results}
                onExportCSV={() => exportCSV(results, carrier || 'carrier')}
                onExportExcel={() => exportExcel(results, carrier || 'carrier', carrierName)}
              />
            </CardContent>
          </Card>
        )}

        {showResults && reconResult && (
          <Card>
            <CardContent className="p-3 sm:p-4">
              <ReconciliationDashboard
                result={reconResult}
                carrierTrackingCol={mapping.carrier_tracking || ''}
                boxmeTrackingCol={boxmeTrackingCol || ''}
                onExportErrors={() => exportErrorReport(reconResult.errorRows, carrier || 'carrier')}
                onExportMissing={() => exportMissingTrackingList(
                  reconResult.missingInBoxme, reconResult.missingInCarrier,
                  mapping.carrier_tracking || '', boxmeTrackingCol || '', carrier || 'carrier'
                )}
                onExportFull={() => exportReconciliationExcel(
                  reconResult, mapping.carrier_tracking || '', boxmeTrackingCol || '',
                  carrier || 'carrier', carrierName, tolerances.weight, tolerances.fee
                )}
              />
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Index;
