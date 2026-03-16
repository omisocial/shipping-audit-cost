import { FIELD_DEFINITIONS } from './constants';
import type { FieldKey, ValidationResult, Tolerances } from './types';

export function validateRow(
  row: Record<string, unknown>,
  rowIndex: number,
  mapping: Partial<Record<FieldKey, string | null>>,
  tolerances: Tolerances
): ValidationResult {
  const result: ValidationResult = {
    rowIndex,
    data: {},
    status: 'valid',
    issues: [],
    discrepancy: { weight: false, fee: false },
  };

  // Extract mapped values
  for (const [fieldKey, def] of Object.entries(FIELD_DEFINITIONS)) {
    const col = mapping[fieldKey as FieldKey];
    if (!col) continue;

    let value = row[col];
    if (value === undefined || value === null || String(value).trim() === '') {
      if (def.required) {
        result.issues.push(def.errorMsg);
        result.status = 'invalid';
      }
      continue;
    }

    if (def.type === 'number') {
      const num = parseFloat(String(value));
      if (isNaN(num)) {
        result.issues.push(`${def.label}: invalid number "${value}"`);
        result.status = 'invalid';
        continue;
      }
      value = num;
    } else {
      value = String(value).trim();
    }

    result.data[fieldKey as FieldKey] = value as string | number;

    if (!def.validation(value)) {
      result.issues.push(def.errorMsg);
      result.status = result.status === 'invalid' ? 'invalid' : 'warning';
    }
  }

  // Weight checks
  const weight = result.data.weight as number | undefined;
  if (weight !== undefined) {
    if (weight > 100) {
      result.issues.push(`Weight ${weight}kg seems unusually high`);
      if (result.status !== 'invalid') result.status = 'warning';
    }
    if (weight < 0.01 && weight > 0) {
      result.issues.push(`Weight ${weight}kg seems unusually low`);
      if (result.status !== 'invalid') result.status = 'warning';
    }
  }

  // Weight discrepancy
  const volWeight = result.data.volumetric_weight as number | undefined;
  if (weight && volWeight && volWeight > 0) {
    const diff = Math.abs(weight - volWeight);
    const diffPercent = (diff / volWeight) * 100;
    if (diffPercent > tolerances.weight) {
      result.discrepancy.weight = true;
      result.issues.push(`Weight discrepancy: actual ${weight}kg vs volumetric ${volWeight}kg (${diffPercent.toFixed(1)}%)`);
    }
  }

  // Fee checks
  const fee = result.data.fee as number | undefined;
  if (fee !== undefined && fee > 10000000) {
    result.issues.push(`Fee ${fee.toLocaleString()} seems unusually high`);
    if (result.status !== 'invalid') result.status = 'warning';
  }

  // Set discrepancy status
  if (result.status === 'valid' && (result.discrepancy.weight || result.discrepancy.fee)) {
    result.status = 'discrepancy';
  }

  return result;
}

export function autoDetectColumns(
  headers: string[],
  hints: Record<string, string[]>
): Partial<Record<FieldKey, string | null>> {
  const mapping: Partial<Record<FieldKey, string | null>> = {};

  for (const [fieldKey, fieldHints] of Object.entries(hints)) {
    let match: string | null = null;

    // Exact match first
    for (const hint of fieldHints) {
      const found = headers.find(h => h.toLowerCase().trim() === hint.toLowerCase());
      if (found) { match = found; break; }
    }

    // Partial match
    if (!match) {
      for (const hint of fieldHints) {
        const found = headers.find(h =>
          h.toLowerCase().includes(hint.toLowerCase()) ||
          hint.toLowerCase().includes(h.toLowerCase())
        );
        if (found) { match = found; break; }
      }
    }

    if (match) mapping[fieldKey as FieldKey] = match;
  }

  return mapping;
}

export interface ProcessChunkResult {
  results: ValidationResult[];
  errors: { row: number; message: string }[];
}

export function processChunk(
  data: Record<string, unknown>[],
  startIndex: number,
  mapping: Partial<Record<FieldKey, string | null>>,
  tolerances: Tolerances
): ProcessChunkResult {
  const results: ValidationResult[] = [];
  const errors: { row: number; message: string }[] = [];

  for (let i = 0; i < data.length; i++) {
    try {
      const result = validateRow(data[i], startIndex + i + 1, mapping, tolerances);
      results.push(result);
      if (result.status === 'invalid') {
        errors.push({ row: startIndex + i + 1, message: result.issues.join('; ') });
      }
    } catch (err) {
      errors.push({ row: startIndex + i + 1, message: String(err) });
    }
  }

  return { results, errors };
}
