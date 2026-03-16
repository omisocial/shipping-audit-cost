import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { downloadBlob } from './templates';
import type { ValidationResult } from './types';

// ── Types ──

export interface ReconciliationResult {
  missingInBoxme: Record<string, unknown>[];
  missingInCarrier: Record<string, unknown>[];
  matched: MatchedRecord[];
  errorRows: ValidationResult[];
  stats: ReconciliationStats;
  analysis: ReconciliationAnalysis;
  validationIssues: Record<string, number>;
}

export interface MatchedRecord {
  tracking: string;
  carrierRow: Record<string, unknown>;
  boxmeRow: Record<string, unknown>;
  weightDiff: number | null;
  weightDiffPercent: number | null;
  feeDiff: number | null;
  feeDiffPercent: number | null;
  carrierWeight: number | null;
  boxmeWeight: number | null;
  carrierFee: number | null;
  boxmeFee: number | null;
  hasDiscrepancy: boolean;
  weightDiscrepancy: boolean;
  feeDiscrepancy: boolean;
}

export interface ReconciliationStats {
  carrierTotal: number;
  boxmeTotal: number;
  matchedCount: number;
  missingInBoxme: number;
  missingInCarrier: number;
  discrepancyCount: number;
  errorCount: number;
  warningCount: number;
  validCount: number;
}

export interface AnalysisSummary {
  discrepancies: number;
  total: number;
  avg: number;
  max: number;
}

export interface ReconciliationAnalysis {
  weight: AnalysisSummary;
  fee: AnalysisSummary;
}

// ── Normalize tracking ──

function normalizeTracking(val: unknown): string | null {
  if (val === undefined || val === null) return null;
  const s = String(val).trim().toUpperCase();
  return s || null;
}

// ── Core reconciliation ──

export function reconcile(
  carrierData: Record<string, unknown>[],
  boxmeData: Record<string, unknown>[],
  carrierTrackingCol: string,
  boxmeTrackingCol: string,
  carrierWeightCol?: string | null,
  boxmeWeightCol?: string | null,
  carrierFeeCol?: string | null,
  boxmeFeeCol?: string | null,
  validationResults?: ValidationResult[],
  weightTolerance: number = 5,
  feeTolerance: number = 2
): ReconciliationResult {
  // Build lookup maps
  const carrierMap = new Map<string, Record<string, unknown>>();
  const boxmeMap = new Map<string, Record<string, unknown>>();

  for (const row of carrierData) {
    const tracking = normalizeTracking(row[carrierTrackingCol]);
    if (tracking) carrierMap.set(tracking, row);
  }

  for (const row of boxmeData) {
    const tracking = normalizeTracking(row[boxmeTrackingCol]);
    if (tracking) boxmeMap.set(tracking, row);
  }

  const missingInBoxme: Record<string, unknown>[] = [];
  const missingInCarrier: Record<string, unknown>[] = [];
  const matched: MatchedRecord[] = [];

  // Weight & fee accumulators for analytics
  const weightValues: number[] = [];
  const feeValues: number[] = [];
  let weightDiscCount = 0;
  let feeDiscCount = 0;

  // Validation issues aggregation
  const validationIssues: Record<string, number> = {};
  const processedBoxme = new Set<string>();

  for (const [tracking, carrierRow] of carrierMap) {
    const boxmeRow = boxmeMap.get(tracking);
    if (!boxmeRow) {
      missingInBoxme.push(carrierRow);
      continue;
    }

    processedBoxme.add(tracking);

    const cWeight = carrierWeightCol ? parseFloat(String(carrierRow[carrierWeightCol] ?? '')) : NaN;
    const bWeight = boxmeWeightCol ? parseFloat(String(boxmeRow[boxmeWeightCol] ?? '')) : NaN;
    const cFee = carrierFeeCol ? parseFloat(String(carrierRow[carrierFeeCol] ?? '')) : NaN;
    const bFee = boxmeFeeCol ? parseFloat(String(boxmeRow[boxmeFeeCol] ?? '')) : NaN;

    // Weight diff percent
    let weightDiffPercent: number | null = null;
    let weightDisc = false;
    if (!isNaN(cWeight) && !isNaN(bWeight)) {
      if (bWeight > 0) {
        weightDiffPercent = (Math.abs(cWeight - bWeight) / bWeight) * 100;
      } else if (cWeight > 0) {
        weightDiffPercent = 100;
      } else {
        weightDiffPercent = 0;
      }
      weightDisc = weightDiffPercent > weightTolerance;
      weightValues.push(cWeight);
    }

    // Fee diff percent
    let feeDiffPercent: number | null = null;
    let feeDisc = false;
    if (!isNaN(cFee) && !isNaN(bFee)) {
      if (bFee > 0) {
        feeDiffPercent = (Math.abs(cFee - bFee) / bFee) * 100;
      } else if (cFee > 0) {
        feeDiffPercent = 100;
      } else {
        feeDiffPercent = 0;
      }
      feeDisc = feeDiffPercent > feeTolerance;
      feeValues.push(cFee);
    }

    const hasDiscrepancy = weightDisc || feeDisc;
    if (weightDisc) {
      weightDiscCount++;
      validationIssues['Weight discrepancy'] = (validationIssues['Weight discrepancy'] || 0) + 1;
    }
    if (feeDisc) {
      feeDiscCount++;
      validationIssues['Fee discrepancy'] = (validationIssues['Fee discrepancy'] || 0) + 1;
    }

    matched.push({
      tracking,
      carrierRow,
      boxmeRow,
      weightDiff: (!isNaN(cWeight) && !isNaN(bWeight)) ? cWeight - bWeight : null,
      weightDiffPercent,
      feeDiff: (!isNaN(cFee) && !isNaN(bFee)) ? cFee - bFee : null,
      feeDiffPercent,
      carrierWeight: !isNaN(cWeight) ? cWeight : null,
      boxmeWeight: !isNaN(bWeight) ? bWeight : null,
      carrierFee: !isNaN(cFee) ? cFee : null,
      boxmeFee: !isNaN(bFee) ? bFee : null,
      hasDiscrepancy,
      weightDiscrepancy: weightDisc,
      feeDiscrepancy: feeDisc,
    });
  }

  for (const [tracking, boxmeRow] of boxmeMap) {
    if (!processedBoxme.has(tracking)) {
      missingInCarrier.push(boxmeRow);
    }
  }

  // Aggregate validation issues from validation results
  const errorRows = validationResults?.filter(r => r.status === 'invalid' || r.status === 'warning') ?? [];
  errorRows.forEach(r => {
    r.issues.forEach(issue => {
      const key = issue.split(':')[0].trim();
      validationIssues[key] = (validationIssues[key] || 0) + 1;
    });
  });

  // Analytics
  const weightTotal = weightValues.reduce((a, b) => a + b, 0);
  const feeTotal = feeValues.reduce((a, b) => a + b, 0);

  return {
    missingInBoxme,
    missingInCarrier,
    matched,
    errorRows,
    validationIssues,
    stats: {
      carrierTotal: carrierData.length,
      boxmeTotal: boxmeData.length,
      matchedCount: matched.length,
      missingInBoxme: missingInBoxme.length,
      missingInCarrier: missingInCarrier.length,
      discrepancyCount: matched.filter(m => m.hasDiscrepancy).length,
      errorCount: errorRows.filter(r => r.status === 'invalid').length,
      warningCount: errorRows.filter(r => r.status === 'warning').length,
      validCount: matched.filter(m => !m.hasDiscrepancy).length,
    },
    analysis: {
      weight: {
        discrepancies: weightDiscCount,
        total: weightTotal,
        avg: weightValues.length > 0 ? weightTotal / weightValues.length : 0,
        max: weightValues.length > 0 ? Math.max(...weightValues) : 0,
      },
      fee: {
        discrepancies: feeDiscCount,
        total: feeTotal,
        avg: feeValues.length > 0 ? feeTotal / feeValues.length : 0,
        max: feeValues.length > 0 ? Math.max(...feeValues) : 0,
      },
    },
  };
}

// ── Exports ──

export function exportErrorReport(errorRows: ValidationResult[], carrier: string) {
  const timestamp = new Date().toISOString().slice(0, 10);
  const data = errorRows.map(r => ({
    row: r.rowIndex,
    carrier_tracking: r.data.carrier_tracking || '',
    weight: r.data.weight || '',
    fee: r.data.fee || '',
    status: r.status,
    issues: r.issues.join('; '),
  }));
  const csv = Papa.unparse(data);
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${carrier}_error_report_${timestamp}.csv`);
}

export function exportMissingTrackingList(
  missingInBoxme: Record<string, unknown>[],
  missingInCarrier: Record<string, unknown>[],
  carrierTrackingCol: string,
  boxmeTrackingCol: string,
  carrier: string
) {
  const timestamp = new Date().toISOString().slice(0, 10);
  const wb = XLSX.utils.book_new();

  const sheet1Data = missingInBoxme.map(row => ({
    'Tracking': String(row[carrierTrackingCol] ?? ''),
    'Source': 'Carrier file',
    'Note': 'Not found in Boxme system',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet1Data.length ? sheet1Data : [{ Tracking: '', Source: '', Note: 'None' }]), 'Missing in Boxme');

  const sheet2Data = missingInCarrier.map(row => ({
    'Tracking': String(row[boxmeTrackingCol] ?? ''),
    'Source': 'Boxme system',
    'Note': 'Not found in Carrier file',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet2Data.length ? sheet2Data : [{ Tracking: '', Source: '', Note: 'None' }]), 'Missing in Carrier');

  XLSX.writeFile(wb, `${carrier}_missing_tracking_${timestamp}.xlsx`);
}

export function exportReconciliationExcel(
  result: ReconciliationResult,
  carrierTrackingCol: string,
  boxmeTrackingCol: string,
  carrier: string,
  carrierName: string,
  weightTolerance: number = 5,
  feeTolerance: number = 2
) {
  const timestamp = new Date().toISOString().slice(0, 10);
  const wb = XLSX.utils.book_new();

  // Summary sheet
  const summary = [
    ['Reconciliation Report'],
    ['Generated', new Date().toLocaleString()],
    ['Carrier', carrierName || carrier],
    ['Weight Tolerance', `${weightTolerance}%`],
    ['Fee Tolerance', `${feeTolerance}%`],
    [''],
    ['Metric', 'Count'],
    ['Carrier file records', result.stats.carrierTotal],
    ['Boxme records', result.stats.boxmeTotal],
    ['Matched (within tolerance)', result.stats.validCount],
    ['Discrepancies', result.stats.discrepancyCount],
    ['Missing in Boxme', result.stats.missingInBoxme],
    ['Missing in Carrier', result.stats.missingInCarrier],
    ['Validation errors', result.stats.errorCount],
    ['Validation warnings', result.stats.warningCount],
    [''],
    ['Weight Analysis'],
    ['Total Weight', `${result.analysis.weight.total.toFixed(2)} kg`],
    ['Average Weight', `${result.analysis.weight.avg.toFixed(3)} kg`],
    ['Max Weight', `${result.analysis.weight.max.toFixed(2)} kg`],
    ['Weight Discrepancies', result.analysis.weight.discrepancies],
    [''],
    ['Fee Analysis'],
    ['Total Fees', result.analysis.fee.total.toLocaleString()],
    ['Average Fee', Math.round(result.analysis.fee.avg).toLocaleString()],
    ['Max Fee', result.analysis.fee.max.toLocaleString()],
    ['Fee Discrepancies', result.analysis.fee.discrepancies],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), 'Summary');

  // Discrepancies with full detail
  const discRows = result.matched.filter(m => m.hasDiscrepancy).map(m => ({
    'Tracking': m.tracking,
    'Carrier Weight': m.carrierWeight?.toFixed(3) ?? '',
    'Boxme Weight': m.boxmeWeight?.toFixed(3) ?? '',
    'Weight Diff': m.weightDiff?.toFixed(3) ?? '',
    'Weight Diff %': m.weightDiffPercent != null ? `${m.weightDiffPercent.toFixed(1)}%` : '',
    'Weight Over Tolerance': m.weightDiscrepancy ? 'YES' : '',
    'Carrier Fee': m.carrierFee?.toLocaleString() ?? '',
    'Boxme Fee': m.boxmeFee?.toLocaleString() ?? '',
    'Fee Diff': m.feeDiff?.toFixed(0) ?? '',
    'Fee Diff %': m.feeDiffPercent != null ? `${m.feeDiffPercent.toFixed(1)}%` : '',
    'Fee Over Tolerance': m.feeDiscrepancy ? 'YES' : '',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(discRows.length ? discRows : [{ Tracking: 'None' }]), 'Discrepancies');

  // Matched (valid)
  const validRows = result.matched.filter(m => !m.hasDiscrepancy).map(m => ({
    'Tracking': m.tracking,
    'Carrier Weight': m.carrierWeight?.toFixed(3) ?? '',
    'Boxme Weight': m.boxmeWeight?.toFixed(3) ?? '',
    'Carrier Fee': m.carrierFee?.toLocaleString() ?? '',
    'Boxme Fee': m.boxmeFee?.toLocaleString() ?? '',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(validRows.length ? validRows : [{ Tracking: 'None' }]), 'Matched');

  // Missing in Boxme
  const mis1 = result.missingInBoxme.map(row => ({ 'Tracking': String(row[carrierTrackingCol] ?? '') }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mis1.length ? mis1 : [{ Tracking: 'None' }]), 'Missing in Boxme');

  // Missing in Carrier
  const mis2 = result.missingInCarrier.map(row => ({ 'Tracking': String(row[boxmeTrackingCol] ?? '') }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mis2.length ? mis2 : [{ Tracking: 'None' }]), 'Missing in Carrier');

  // Errors
  const errData = result.errorRows.map(r => ({
    'Row': r.rowIndex,
    'Tracking': r.data.carrier_tracking || '',
    'Status': r.status,
    'Issues': r.issues.join('; '),
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(errData.length ? errData : [{ Row: '', Tracking: 'None' }]), 'Errors');

  // Validation Issues Summary
  const issueRows = Object.entries(result.validationIssues)
    .sort((a, b) => b[1] - a[1])
    .map(([issue, count]) => ({ 'Issue': issue, 'Count': count }));
  if (issueRows.length > 0) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(issueRows), 'Issue Summary');
  }

  XLSX.writeFile(wb, `${carrier}_reconciliation_${timestamp}.xlsx`);
}
