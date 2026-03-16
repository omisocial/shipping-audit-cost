import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { downloadBlob } from './templates';
import type { ValidationResult } from './types';

export function exportCSV(results: ValidationResult[], carrier: string) {
  const timestamp = new Date().toISOString().slice(0, 10);
  const data = results.map(r => ({
    row: r.rowIndex,
    carrier_tracking: r.data.carrier_tracking || '',
    boxme_tracking: r.data.boxme_tracking || '',
    weight: r.data.weight || '',
    volumetric_weight: r.data.volumetric_weight || '',
    fee: r.data.fee || '',
    cod_amount: r.data.cod_amount || '',
    status: r.status,
    issues: r.issues.join('; '),
  }));
  const csv = Papa.unparse(data);
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${carrier}_audit_${timestamp}.csv`);
}

export function exportExcel(results: ValidationResult[], carrier: string, carrierName: string) {
  const timestamp = new Date().toISOString().slice(0, 10);
  const wb = XLSX.utils.book_new();

  const validCount = results.filter(r => r.status === 'valid').length;
  const summary = [
    ['Carrier Audit Report'],
    ['Generated', new Date().toLocaleString()],
    ['Carrier', carrierName || carrier],
    [''],
    ['Metric', 'Count', 'Percentage'],
    ['Total Records', results.length, '100%'],
    ['Valid', validCount, ((validCount / results.length) * 100).toFixed(1) + '%'],
    ['Warnings', results.filter(r => r.status === 'warning').length],
    ['Invalid', results.filter(r => r.status === 'invalid').length],
    ['Discrepancies', results.filter(r => r.status === 'discrepancy').length],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), 'Summary');

  const allData = results.map(r => ({
    'Row': r.rowIndex,
    'Carrier Tracking': r.data.carrier_tracking || '',
    'Boxme Tracking': r.data.boxme_tracking || '',
    'Weight (kg)': r.data.weight || '',
    'Volumetric Weight': r.data.volumetric_weight || '',
    'Fee': r.data.fee || '',
    'COD': r.data.cod_amount || '',
    'Status': r.status,
    'Issues': r.issues.join('; '),
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(allData), 'All Results');

  const issuesData = results.filter(r => r.status !== 'valid').map(r => ({
    'Row': r.rowIndex,
    'Carrier Tracking': r.data.carrier_tracking || '',
    'Status': r.status,
    'Issues': r.issues.join('; '),
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(issuesData), 'Issues Only');

  XLSX.writeFile(wb, `${carrier}_audit_report_${timestamp}.xlsx`);
}
