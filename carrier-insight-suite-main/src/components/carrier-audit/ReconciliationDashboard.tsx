import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useI18n } from '@/hooks/use-i18n';
import type { ReconciliationResult } from '@/lib/carrier-audit/reconciliation';
import { AlertTriangle, Search, FileSpreadsheet } from 'lucide-react';

interface ReconciliationDashboardProps {
  result: ReconciliationResult;
  carrierTrackingCol: string;
  boxmeTrackingCol: string;
  onExportErrors: () => void;
  onExportMissing: () => void;
  onExportFull: () => void;
}

export function ReconciliationDashboard({
  result, carrierTrackingCol, boxmeTrackingCol,
  onExportErrors, onExportMissing, onExportFull,
}: ReconciliationDashboardProps) {
  const { t } = useI18n();
  const { stats, analysis, validationIssues } = result;
  const [detailFilter, setDetailFilter] = useState('all');

  const statItems: [string, number, string][] = [
    [t('recon.carrierRecords'), stats.carrierTotal, 'bg-accent'],
    [t('recon.boxmeRecords'), stats.boxmeTotal, 'bg-accent'],
    [t('recon.matched'), stats.matchedCount, 'bg-green-50 dark:bg-green-900/20'],
    [t('recon.missingBoxme'), stats.missingInBoxme, 'bg-orange-50 dark:bg-orange-900/20'],
    [t('recon.missingCarrier'), stats.missingInCarrier, 'bg-red-50 dark:bg-red-900/20'],
    [t('recon.discrepancies'), stats.discrepancyCount, 'bg-yellow-50 dark:bg-yellow-900/20'],
  ];

  const sortedIssues = useMemo(() =>
    Object.entries(validationIssues).sort((a, b) => b[1] - a[1]),
  [validationIssues]);

  // Combined detail records
  const allDetailRecords = useMemo(() => {
    const records: { tracking: string; status: string; source: string; detail: string }[] = [];

    result.matched.filter(m => !m.hasDiscrepancy).forEach(m => {
      records.push({ tracking: m.tracking, status: 'valid', source: 'matched', detail: 'OK' });
    });
    result.matched.filter(m => m.hasDiscrepancy).forEach(m => {
      const parts: string[] = [];
      if (m.weightDiscrepancy) parts.push(`Weight: ${m.carrierWeight?.toFixed(2)} vs ${m.boxmeWeight?.toFixed(2)} (${m.weightDiffPercent?.toFixed(1)}%)`);
      if (m.feeDiscrepancy) parts.push(`Fee: ${m.carrierFee?.toLocaleString()} vs ${m.boxmeFee?.toLocaleString()} (${m.feeDiffPercent?.toFixed(1)}%)`);
      records.push({ tracking: m.tracking, status: 'discrepancy', source: 'matched', detail: parts.join('; ') });
    });
    result.missingInBoxme.forEach(row => {
      records.push({ tracking: String(row[carrierTrackingCol] ?? '-'), status: 'missing_boxme', source: 'carrier', detail: t('recon.notInBoxme') });
    });
    result.missingInCarrier.forEach(row => {
      records.push({ tracking: String(row[boxmeTrackingCol] ?? '-'), status: 'missing_carrier', source: 'boxme', detail: t('recon.notInCarrier') });
    });
    result.errorRows.forEach(r => {
      records.push({ tracking: String(r.data.carrier_tracking || '-'), status: r.status, source: 'validation', detail: r.issues.join('; ') });
    });

    return records;
  }, [result, carrierTrackingCol, boxmeTrackingCol, t]);

  const filteredRecords = useMemo(() => {
    if (detailFilter === 'all') return allDetailRecords;
    return allDetailRecords.filter(r => r.status === detailFilter);
  }, [allDetailRecords, detailFilter]);

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      valid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      discrepancy: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      invalid: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      missing_boxme: 'bg-muted text-muted-foreground',
      missing_carrier: 'bg-muted text-muted-foreground',
    };
    return <span className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] font-medium ${colors[status] || 'bg-muted text-muted-foreground'}`}>{status}</span>;
  };

  return (
    <div className="space-y-4">
      {/* Header + exports */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{t('recon.title')}</h3>
        <div className="flex flex-wrap gap-1.5">
          <Button variant="outline" size="sm" onClick={onExportErrors} className="h-8 text-xs">
            <AlertTriangle className="h-3.5 w-3.5 mr-1" /> {t('recon.exportErrors')}
          </Button>
          <Button variant="outline" size="sm" onClick={onExportMissing} className="h-8 text-xs">
            <Search className="h-3.5 w-3.5 mr-1" /> {t('recon.exportMissing')}
          </Button>
          <Button variant="outline" size="sm" onClick={onExportFull} className="h-8 text-xs">
            <FileSpreadsheet className="h-3.5 w-3.5 mr-1" /> {t('recon.exportFull')}
          </Button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {statItems.map(([label, value, bg]) => (
          <div key={label} className={`${bg} rounded-lg p-2 text-center`}>
            <p className="text-base sm:text-lg font-bold text-foreground">{value.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
          </div>
        ))}
      </div>

      {/* Analysis Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-3 sm:p-4 space-y-1">
            <h4 className="text-xs font-semibold text-foreground">{t('results.weightAnalysis')}</h4>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
              <span className="text-muted-foreground">{t('results.discrepancies')}:</span><span className="font-medium text-destructive">{analysis.weight.discrepancies}</span>
              <span className="text-muted-foreground">{t('results.total')}:</span><span className="font-medium">{analysis.weight.total.toFixed(2)} kg</span>
              <span className="text-muted-foreground">{t('results.avg')}:</span><span className="font-medium">{analysis.weight.avg.toFixed(3)} kg</span>
              <span className="text-muted-foreground">{t('results.max')}:</span><span className="font-medium">{analysis.weight.max.toFixed(2)} kg</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 space-y-1">
            <h4 className="text-xs font-semibold text-foreground">{t('results.feeAnalysis')}</h4>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
              <span className="text-muted-foreground">{t('results.discrepancies')}:</span><span className="font-medium text-destructive">{analysis.fee.discrepancies}</span>
              <span className="text-muted-foreground">{t('results.total')}:</span><span className="font-medium">{analysis.fee.total.toLocaleString()}</span>
              <span className="text-muted-foreground">{t('results.avg')}:</span><span className="font-medium">{Math.round(analysis.fee.avg).toLocaleString()}</span>
              <span className="text-muted-foreground">{t('results.max')}:</span><span className="font-medium">{analysis.fee.max.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Validation Issues */}
      {sortedIssues.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-foreground">{t('results.issues')}</h4>
          <div className="space-y-1">
            {sortedIssues.slice(0, 10).map(([issue, count]) => (
              <div key={issue} className="flex items-center gap-2 text-xs">
                <Badge variant="outline" className="text-[10px] h-4 shrink-0">{count}</Badge>
                <span className="text-muted-foreground truncate">{issue}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="discrepancies" className="w-full">
        <TabsList className="w-full grid grid-cols-4 h-9">
          <TabsTrigger value="discrepancies" className="text-[10px] sm:text-xs px-1">
            {t('recon.discrepancies')} ({stats.discrepancyCount})
          </TabsTrigger>
          <TabsTrigger value="missing-boxme" className="text-[10px] sm:text-xs px-1">
            {t('recon.missingBoxme')} ({stats.missingInBoxme})
          </TabsTrigger>
          <TabsTrigger value="missing-carrier" className="text-[10px] sm:text-xs px-1">
            {t('recon.missingCarrier')} ({stats.missingInCarrier})
          </TabsTrigger>
          <TabsTrigger value="errors" className="text-[10px] sm:text-xs px-1">
            {t('recon.errors')} ({stats.errorCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="discrepancies">
          <div className="border rounded-md overflow-auto max-h-72">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{t('recon.tracking')}</TableHead>
                  <TableHead className="text-xs">Carrier W</TableHead>
                  <TableHead className="text-xs">Boxme W</TableHead>
                  <TableHead className="text-xs">{t('recon.weightDiff')}</TableHead>
                  <TableHead className="text-xs hidden sm:table-cell">Carrier Fee</TableHead>
                  <TableHead className="text-xs hidden sm:table-cell">Boxme Fee</TableHead>
                  <TableHead className="text-xs">{t('recon.feeDiff')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.matched.filter(m => m.hasDiscrepancy).slice(0, 200).map((m, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs py-1.5 font-mono">{m.tracking}</TableCell>
                    <TableCell className="text-xs py-1.5">{m.carrierWeight?.toFixed(2) ?? '-'}</TableCell>
                    <TableCell className="text-xs py-1.5">{m.boxmeWeight?.toFixed(2) ?? '-'}</TableCell>
                    <TableCell className="text-xs py-1.5">
                      {m.weightDiff !== null ? (
                        <span className={m.weightDiscrepancy ? 'text-destructive font-medium' : ''}>
                          {m.weightDiff > 0 ? '+' : ''}{m.weightDiff.toFixed(3)} ({m.weightDiffPercent?.toFixed(1)}%)
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-xs py-1.5 hidden sm:table-cell">{m.carrierFee?.toLocaleString() ?? '-'}</TableCell>
                    <TableCell className="text-xs py-1.5 hidden sm:table-cell">{m.boxmeFee?.toLocaleString() ?? '-'}</TableCell>
                    <TableCell className="text-xs py-1.5">
                      {m.feeDiff !== null ? (
                        <span className={m.feeDiscrepancy ? 'text-destructive font-medium' : ''}>
                          {m.feeDiff > 0 ? '+' : ''}{m.feeDiff.toLocaleString()} ({m.feeDiffPercent?.toFixed(1)}%)
                        </span>
                      ) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
                {result.matched.filter(m => m.hasDiscrepancy).length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-xs text-center text-muted-foreground py-4">{t('recon.noDiscrepancy')}</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="missing-boxme">
          <div className="border rounded-md overflow-auto max-h-64">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">#</TableHead>
                  <TableHead className="text-xs">{t('recon.tracking')}</TableHead>
                  <TableHead className="text-xs">{t('recon.note')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.missingInBoxme.slice(0, 200).map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs py-1.5">{i + 1}</TableCell>
                    <TableCell className="text-xs py-1.5 font-mono">{String(row[carrierTrackingCol] ?? '-')}</TableCell>
                    <TableCell className="text-xs py-1.5 text-muted-foreground">{t('recon.notInBoxme')}</TableCell>
                  </TableRow>
                ))}
                {result.missingInBoxme.length === 0 && (
                  <TableRow><TableCell colSpan={3} className="text-xs text-center text-muted-foreground py-4">{t('recon.noMissing')}</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="missing-carrier">
          <div className="border rounded-md overflow-auto max-h-64">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">#</TableHead>
                  <TableHead className="text-xs">{t('recon.tracking')}</TableHead>
                  <TableHead className="text-xs">{t('recon.note')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.missingInCarrier.slice(0, 200).map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs py-1.5">{i + 1}</TableCell>
                    <TableCell className="text-xs py-1.5 font-mono">{String(row[boxmeTrackingCol] ?? '-')}</TableCell>
                    <TableCell className="text-xs py-1.5 text-muted-foreground">{t('recon.notInCarrier')}</TableCell>
                  </TableRow>
                ))}
                {result.missingInCarrier.length === 0 && (
                  <TableRow><TableCell colSpan={3} className="text-xs text-center text-muted-foreground py-4">{t('recon.noMissing')}</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="errors">
          <div className="border rounded-md overflow-auto max-h-64">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{t('results.row')}</TableHead>
                  <TableHead className="text-xs">{t('results.tracking')}</TableHead>
                  <TableHead className="text-xs">{t('results.status')}</TableHead>
                  <TableHead className="text-xs hidden sm:table-cell">{t('results.issuesCol')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.errorRows.slice(0, 200).map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs py-1.5">{r.rowIndex}</TableCell>
                    <TableCell className="text-xs py-1.5 font-mono">{String(r.data.carrier_tracking || '-')}</TableCell>
                    <TableCell className="text-xs py-1.5">
                      <Badge variant="destructive" className="text-[10px] h-4">{r.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs py-1.5 text-muted-foreground truncate max-w-[180px] hidden sm:table-cell">{r.issues.join('; ')}</TableCell>
                  </TableRow>
                ))}
                {result.errorRows.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-xs text-center text-muted-foreground py-4">{t('recon.noErrors')}</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* All detail records table */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h4 className="text-xs font-semibold text-foreground">{t('results.detailRecords')}</h4>
          <Select value={detailFilter} onValueChange={setDetailFilter}>
            <SelectTrigger className="h-8 w-full sm:w-44 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('results.allRecords')}</SelectItem>
              <SelectItem value="valid">Valid</SelectItem>
              <SelectItem value="discrepancy">{t('results.discrepancy')}</SelectItem>
              <SelectItem value="missing_boxme">{t('recon.missingBoxme')}</SelectItem>
              <SelectItem value="missing_carrier">{t('recon.missingCarrier')}</SelectItem>
              <SelectItem value="invalid">{t('results.invalid')}</SelectItem>
              <SelectItem value="warning">{t('results.warning')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="border rounded-md overflow-auto max-h-72">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">{t('recon.tracking')}</TableHead>
                <TableHead className="text-xs w-24">{t('results.status')}</TableHead>
                <TableHead className="text-xs hidden sm:table-cell">Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.slice(0, 500).map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="text-xs py-1.5 font-mono">{r.tracking}</TableCell>
                  <TableCell className="text-xs py-1.5">{statusBadge(r.status)}</TableCell>
                  <TableCell className="text-xs py-1.5 text-muted-foreground truncate max-w-[220px] hidden sm:table-cell">{r.detail}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="text-[10px] text-muted-foreground">{t('results.showing')} {Math.min(filteredRecords.length, 500)} {t('results.of')} {filteredRecords.length} {t('results.records')}</p>
      </div>
    </div>
  );
}
