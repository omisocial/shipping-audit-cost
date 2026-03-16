export interface FieldDefinition {
  label: string;
  required: boolean;
  type: 'string' | 'number';
  validation: (v: unknown) => boolean;
  errorMsg: string;
}

export type FieldKey =
  | 'carrier_tracking'
  | 'boxme_tracking'
  | 'weight'
  | 'volumetric_weight'
  | 'fee'
  | 'cod_amount'
  | 'return_fee'
  | 'insurance_fee'
  | 'other_fees'
  | 'status';

export interface CarrierTemplate {
  name: string;
  mapping: Partial<Record<FieldKey, string | null>>;
  updatedAt: string;
}

export type ValidationStatus = 'valid' | 'warning' | 'invalid' | 'discrepancy';

export interface ValidationResult {
  rowIndex: number;
  data: Partial<Record<FieldKey, string | number>>;
  status: ValidationStatus;
  issues: string[];
  discrepancy: { weight: boolean; fee: boolean };
}

export interface ProcessingState {
  isProcessing: boolean;
  progress: number;
  label: string;
  threads: ThreadStatus[];
  log: string[];
  errors: { row: number; message: string }[];
}

export interface ThreadStatus {
  index: number;
  processed: number;
  total: number;
}

export interface Tolerances {
  weight: number;
  fee: number;
}

export interface CarrierOption {
  value: string;
  label: string;
  group: string;
}
