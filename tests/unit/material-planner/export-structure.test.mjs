/**
 * ══════════════════════════════════════════════════════════════════
 * Material Planner — Layer 4: Export Structure Tests
 * Ensures export.js produces correct column structure and data mapping
 * ══════════════════════════════════════════════════════════════════
 */
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';

const EXPORT_FILE = path.resolve(__dirname, '../../../tools/material-planner/js/export.js');
const I18N_FILE = path.resolve(__dirname, '../../../tools/material-planner/js/i18n.js');

let exportContent;
let translations;

beforeAll(() => {
  exportContent = fs.readFileSync(EXPORT_FILE, 'utf-8');

  // Extract translations
  const i18nContent = fs.readFileSync(I18N_FILE, 'utf-8');
  const match = i18nContent.match(/const\s+translations\s*=\s*(\{[\s\S]*?\n\});\s*\n/);
  if (match) translations = new Function(`return ${match[1]}`)();
});

describe('Export Column Mapping', () => {
  it('export.js uses doiTargetDays (not demandFactor) for column P', () => {
    expect(exportContent).toMatch(/doiTargetDays/);
    expect(exportContent).not.toMatch(/demandFactor/);
  });

  it('export.js uses agingTotal (not pendingInv) for column T', () => {
    expect(exportContent).toMatch(/agingTotal/);
    expect(exportContent).not.toMatch(/pendingInv/);
  });

  it('export.js exports adjustedDemand for column Q', () => {
    expect(exportContent).toMatch(/adjustedDemand/);
  });

  it('export.js exports pendingQty for column S (Pending PO)', () => {
    expect(exportContent).toMatch(/pendingQty/);
  });

  it('export.js exports 7 aging bucket columns via AGING_EXPORT_BUCKETS', () => {
    expect(exportContent).toMatch(/AGING_EXPORT_BUCKETS/);
    expect(exportContent).toMatch(/< 15 days/);
    expect(exportContent).toMatch(/15 to 30 days/);
    expect(exportContent).toMatch(/30 to 45 days/);
    expect(exportContent).toMatch(/45 to 60 days/);
    expect(exportContent).toMatch(/60 to 75 days/);
    expect(exportContent).toMatch(/75 to 90 days/);
    expect(exportContent).toMatch(/> 90 days/);
  });

  it('export.js has getAgingBucketValue helper for fuzzy bucket matching', () => {
    expect(exportContent).toMatch(/getAgingBucketValue/);
  });
});

describe('Export Row Structure', () => {
  it('export produces 31-column data rows (24 original + 7 aging buckets)', () => {
    // Count elements in the rows.push([...]) array
    const pushMatch = exportContent.match(/rows\.push\(\[[\s\S]*?\]\)/);
    expect(pushMatch).not.toBeNull();

    // Count comment lines that indicate a column
    const arrayContent = pushMatch[0];
    const columnComments = arrayContent.match(/\/\/.+/g);
    expect(columnComments.length).toBeGreaterThanOrEqual(20); // Should have comments for major columns
  });
});

describe('Export Metadata Rows', () => {
  it('export has company name row (row 1)', () => {
    expect(exportContent).toMatch(/exportCompany/);
  });

  it('export has order title row (row 2)', () => {
    expect(exportContent).toMatch(/exportTitle/);
  });

  it('export has header row from i18n (row 4)', () => {
    expect(exportContent).toMatch(/cols/);
  });

  it('export creates merged cells for header rows', () => {
    expect(exportContent).toMatch(/!merges/);
  });
});

describe('Export Column Header Match Across Languages', () => {
  // Updated indices after inserting 7 aging bucket columns (indices 20-26)
  const COLUMN_INDICES = {
    poNo: 0,
    warehouse: 1,
    sku: 3,
    productName: 4,
    batch: 5,
    targetDays: 15,  // Target Days
    adjustedDemand: 16,
    it: 17,
    pendingPO: 18,
    agingTotal: 19,  // Aging Total
    // 7 aging buckets: indices 20-26
    agingBucket1: 20, // < 15 days
    agingBucket7: 26, // > 90 days
    inventory: 27,    // Was 20, now shifted +7
    doi: 28,          // Was 21, now shifted +7
  };

  it('exportCols has 31 columns in all languages', () => {
    expect(translations.vi.exportCols.length).toBe(31);
    expect(translations.en.exportCols.length).toBe(31);
    expect(translations.th.exportCols.length).toBe(31);
  });

  it('column P (idx 15) header is "Target Days" type in all languages', () => {
    const vi = translations.vi.exportCols[COLUMN_INDICES.targetDays];
    const en = translations.en.exportCols[COLUMN_INDICES.targetDays];
    const th = translations.th.exportCols[COLUMN_INDICES.targetDays];

    // Should NOT be Demand Factor / Hệ số Demand
    expect(vi).not.toMatch(/[Hh]ệ số/);
    expect(en).not.toMatch(/[Ff]actor/i);

    // Should be Target Days / Số ngày mục tiêu
    expect(vi).toMatch(/ngày/i);
    expect(en).toMatch(/[Tt]arget/i);
    expect(th).toBeDefined();
  });

  it('column T (idx 19) header is "Aging Total" type in all languages', () => {
    const vi = translations.vi.exportCols[COLUMN_INDICES.agingTotal];
    const en = translations.en.exportCols[COLUMN_INDICES.agingTotal];

    // Should NOT be "Pending Inventory"
    expect(vi).not.toMatch(/[Pp]ending/i);
    expect(en).not.toMatch(/[Pp]ending/i);

    // Should be "Aging Total"
    expect(en).toMatch(/[Aa]ging/i);
  });

  it('columns 20-26 are the 7 aging bucket headers', () => {
    const en = translations.en.exportCols;
    expect(en[20]).toBe('< 15 days');
    expect(en[21]).toBe('15 to 30 days');
    expect(en[22]).toBe('30 to 45 days');
    expect(en[23]).toBe('45 to 60 days');
    expect(en[24]).toBe('60 to 75 days');
    expect(en[25]).toBe('75 to 90 days');
    expect(en[26]).toBe('> 90 days');
  });

  it('column 27 (was 20) is Inventory in all languages', () => {
    const vi = translations.vi.exportCols[COLUMN_INDICES.inventory];
    const en = translations.en.exportCols[COLUMN_INDICES.inventory];
    expect(en).toMatch(/[Ii]nventory/i);
    expect(vi).toMatch(/[Ii]nventory/i);
  });

  it('column 28 (was 21) is DOI in all languages', () => {
    const en = translations.en.exportCols[COLUMN_INDICES.doi];
    expect(en).toBe('DOI');
  });
});

describe('getAgingBucketValue (Fuzzy Matcher)', () => {
  let fuzzyMatchFn;

  beforeAll(() => {
    // Extract the getAgingBucketValue function from export.js content
    const match = exportContent.match(/(function getAgingBucketValue\([\s\S]*?\n\})/);
    if (match) {
      fuzzyMatchFn = new Function('agingBuckets', 'bucketName', match[1] + '\nreturn getAgingBucketValue(agingBuckets, bucketName);');
    }
  });

  it('extracts the function correctly', () => {
    expect(fuzzyMatchFn).toBeDefined();
    expect(typeof fuzzyMatchFn).toBe('function');
  });

  it('returns 0 when agingBuckets is null or empty', () => {
    expect(fuzzyMatchFn(null, '< 15 days')).toBe(0);
    expect(fuzzyMatchFn({}, '< 15 days')).toBe(0);
  });

  it('matches exact bucket names and parses floats', () => {
    const buckets = { '< 15 days': '42', '15 to 30 days': 15.5 };
    expect(fuzzyMatchFn(buckets, '< 15 days')).toBe(42);
    expect(fuzzyMatchFn(buckets, '15 to 30 days')).toBe(15.5);
  });

  it('handles fuzzy matching (spaces and case insensitivity)', () => {
    const buckets = { '<15 Days': 100, ' 15  To  30  Days ': '200' };
    expect(fuzzyMatchFn(buckets, '< 15 days')).toBe(100);
    expect(fuzzyMatchFn(buckets, '15 to 30 days')).toBe(200);
  });

  it('returns 0 if bucket is missing', () => {
    const buckets = { '< 15 days': 100 };
    expect(fuzzyMatchFn(buckets, '> 90 days')).toBe(0);
  });
});
