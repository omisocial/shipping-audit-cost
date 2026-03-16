import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useMemo } from 'react';
import { useI18n } from '@/hooks/use-i18n';
import type { ValidationResult, ValidationStatus } from '@/lib/carrier-audit/types';
import { FileDown, FileSpreadsheet } from 'lucide-react';

interface ResultsDashboardProps {
  results: ValidationResult[];
  onExportCSV: () => void;
  onExportExcel: () => void;
}

const statusColors: Record<ValidationStatus, string> = {
  valid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  invalid: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  discrepancy: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
};

export function ResultsDashboard({ results, onExportCSV, onExportExcel }: ResultsDashboardProps) {
  const [filter, setFilter] = useState('all');
  const { t } = useI18n();

  const stats = useMemo(() => ({
    total: results.length,
    valid: results.filter(r => r.status === 'valid').length,
    warning: results.filter(r => r.status === 'warning').length,
    invalid: results.filter(r => r.status === 'invalid').length,
    discrepancy: results.filter(r => r.status === 'discrepancy').length,
  }), [results]);

  const weightData = useMemo(() => {
    const weights = results.filter(r => r.data.weight).map(r => r.data.weight as number);
    const discCount = results.filter(r => r.discrepancy.weight).length;
    if (weights.length === 0) return null;
    const total = weights.reduce((a, b) => a + b, 0);
    return { discCount, total, avg: total / weights.length, max: Math.max(...weights) };
  }, [results]);

  const feeData = useMemo(() => {
    const fees = results.filter(r => r.data.fee).map(r => r.data.fee as number);
    const discCount = results.filter(r => r.discrepancy.fee).length;
    if (fees.length === 0) return null;
    const total = fees.reduce((a, b) => a + b, 0);
    return { discCount, total, avg: total / fees.length, max: Math.max(...fees) };
  }, [results]);

  const issueCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    results.forEach(r => r.issues.forEach(issue => {
      const key = issue.split(':')[0];
      counts[key] = (counts[key] || 0) + 1;
    }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [results]);

  const filtered = useMemo(() => {
    if (filter === 'all') return results;
    return results.filter(r => r.status === filter);
  }, [results, filter]);

  const display = filtered.slice(0, 500);

  const statItems: [string, number, string][] = [
    [t('results.total'), stats.total, 'bg-accent'],
    [t('results.valid'), stats.valid, 'bg-green-50 dark:bg-green-900/20'],
    [t('results.warning'), stats.warning, 'bg-yellow-50 dark:bg-yellow-900/20'],
    [t('results.invalid'), stats.invalid, 'bg-red-50 dark:bg-red-900/20'],
    [t('results.discrepancy'), stats.discrepancy, 'bg-orange-50 dark:bg-orange-900/20'],
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{t('results.title')}</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onExportCSV} className="h-8 text-xs">
            <FileDown className="h-3.5 w-3.5 mr-1" /> {t('results.csv')}
          </Button>
          <Button variant="outline" size="sm" onClick={onExportExcel} className="h-8 text-xs">
            <FileSpreadsheet className="h-3.5 w-3.5 mr-1" /> {t('results.excel')}
          </Button>
        </div>
      </div>

      {/* Stats - scrollable on mobile */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {statItems.map(([label, value, bg]) => (
          <div key={label} className={`${bg} rounded-lg p-2 sm:p-3 text-center`}>
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
            {weightData ? (
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
                <span className="text-muted-foreground">{t('results.discrepancies')}:</span><span className="font-medium">{weightData.discCount}</span>
                <span className="text-muted-foreground">{t('results.total')}:</span><span className="font-medium">{weightData.total.toFixed(2)} kg</span>
                <span className="text-muted-foreground">{t('results.avg')}:</span><span className="font-medium">{weightData.avg.toFixed(3)} kg</span>
                <span className="text-muted-foreground">{t('results.max')}:</span><span className="font-medium">{weightData.max.toFixed(2)} kg</span>
              </div>
            ) : <p className="text-xs text-muted-foreground">{t('results.noData')}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 space-y-1">
            <h4 className="text-xs font-semibold text-foreground">{t('results.feeAnalysis')}</h4>
            {feeData ? (
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
                <span className="text-muted-foreground">{t('results.discrepancies')}:</span><span className="font-medium">{feeData.discCount}</span>
                <span className="text-muted-foreground">{t('results.total')}:</span><span className="font-medium">{feeData.total.toLocaleString()}</span>
                <span className="text-muted-foreground">{t('results.avg')}:</span><span className="font-medium">{Math.round(feeData.avg).toLocaleString()}</span>
                <span className="text-muted-foreground">{t('results.max')}:</span><span className="font-medium">{feeData.max.toLocaleString()}</span>
              </div>
            ) : <p className="text-xs text-muted-foreground">{t('results.noData')}</p>}
          </CardContent>
        </Card>
      </div>

      {/* Issues */}
      {issueCounts.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-foreground">{t('results.issues')}</h4>
          <div className="space-y-1">
            {issueCounts.map(([issue, count]) => (
              <div key={issue} className="flex items-center gap-2 text-xs">
                <Badge variant="outline" className="text-[10px] h-4 shrink-0">{count}</Badge>
                <span className="text-muted-foreground truncate">{issue}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detail Table */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h4 className="text-xs font-semibold text-foreground">{t('results.detailRecords')}</h4>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="h-8 w-full sm:w-44 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('results.allRecords')}</SelectItem>
              <SelectItem value="invalid">{t('results.invalidOnly')}</SelectItem>
              <SelectItem value="warning">{t('results.warningsOnly')}</SelectItem>
              <SelectItem value="discrepancy">{t('results.discrepanciesOnly')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border rounded-md overflow-auto max-h-80 -mx-1 px-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs w-12">{t('results.row')}</TableHead>
                <TableHead className="text-xs">{t('results.tracking')}</TableHead>
                <TableHead className="text-xs hidden sm:table-cell">{t('results.weight')}</TableHead>
                <TableHead className="text-xs hidden sm:table-cell">{t('results.fee')}</TableHead>
                <TableHead className="text-xs w-20">{t('results.status')}</TableHead>
                <TableHead className="text-xs hidden md:table-cell">{t('results.issuesCol')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {display.map(r => (
                <TableRow key={r.rowIndex}>
                  <TableCell className="text-xs py-1.5">{r.rowIndex}</TableCell>
                  <TableCell className="text-xs py-1.5 font-mono truncate max-w-[120px]">{String(r.data.carrier_tracking || '-')}</TableCell>
                  <TableCell className="text-xs py-1.5 hidden sm:table-cell">{r.data.weight != null ? Number(r.data.weight).toFixed(2) : '-'}</TableCell>
                  <TableCell className="text-xs py-1.5 hidden sm:table-cell">{r.data.fee != null ? Number(r.data.fee).toLocaleString() : '-'}</TableCell>
                  <TableCell className="text-xs py-1.5">
                    <span className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] font-medium ${statusColors[r.status]}`}>
                      {r.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs py-1.5 max-w-[180px] truncate text-muted-foreground hidden md:table-cell">
                    {r.issues.join('; ') || 'OK'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="text-[10px] text-muted-foreground">{t('results.showing')} {display.length} {t('results.of')} {filtered.length} {t('results.records')}</p>
      </div>
    </div>
  );
}
