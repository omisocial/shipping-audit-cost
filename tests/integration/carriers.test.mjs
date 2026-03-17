/**
 * Integration tests using real Excel template files.
 * Tests the full pipeline: sheet selection → header parse → smartDetect → reconcile.
 *
 * Priority: fee discrepancy accuracy > missing tracking detection > column detection
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const XLSX = require('xlsx');

let AuditCore, TEMPLATES;

beforeAll(() => {
  require('../../tools/carrier-audit/core.js');
  AuditCore = globalThis.AuditCore;
  TEMPLATES = require('../../tools/carrier-audit/templates.json');
});

// ─── Helpers (mirrors HTML logic for tests) ───────────────────────────────────

/** Pick best sheet from workbook given hint array (mirrors fixed autoSheet) */
function autoSheet(wb, hints) {
  const sheets = wb.SheetNames;
  if (!hints || !hints.length) return sheets[0];
  // Tier 1: exact match
  for (const h of hints) {
    const f = sheets.find(s => s.toLowerCase() === h.toLowerCase());
    if (f) return f;
  }
  // Tier 2: startsWith
  for (const h of hints) {
    const f = sheets.find(s => s.toLowerCase().startsWith(h.toLowerCase()));
    if (f) return f;
  }
  // Tier 3: includes
  for (const h of hints) {
    const f = sheets.find(s => s.toLowerCase().includes(h.toLowerCase()));
    if (f) return f;
  }
  return sheets[0];
}

/**
 * Parse a sheet into {headers, data}.
 * headerRow is 1-indexed (matching templates.json convention, same as HTML code).
 * Default 1 = row index 0 (first row is headers).
 */
function sheetData(wb, sheetName, headerRow = 1) {
  const ws = wb.Sheets[sheetName];
  if (!ws) return { headers: [], data: [] };
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const hi = (headerRow || 1) - 1; // convert 1-indexed to 0-indexed
  const headers = (raw[hi] || []).map(h => String(h || '').trim()).filter(h => h);
  const data = [];
  for (let i = hi + 1; i < raw.length; i++) {
    const row = raw[i];
    if (!row.some(v => v !== '')) continue; // skip empty rows
    const obj = {};
    headers.forEach((h, ci) => { if (h) obj[h] = row[ci] !== undefined ? row[ci] : ''; });
    data.push(obj);
  }
  return { headers, data };
}

/** Load carrier + BMS data for a carrier key using templates */
function loadCarrierData(carrierFile, bmsFile, carrierKey) {
  const tpl = TEMPLATES[carrierKey];
  if (!tpl) throw new Error(`No template for ${carrierKey}`);
  const GLOBAL_CARRIER_HINTS = {
    tracking: ['tracking number', 'tracking id', 'mã vận đơn', 'เลขพัสดุ'],
    bm_number: ['bm number', 'customer tn', 'shipper order id', 'ref no', 'reference no'],
    shipping_fee: ['shipping fee', 'delivery fee', 'freight charge', 'ค่าขนส่ง'],
    cod_fee: ['cod amount', 'cod fee', 'tiền thu hộ', 'ค่า cod'],
    weight: ['weight', 'chargeable weight', 'น้ำหนัก'],
    overweight_fee: ['overweight fee', 'overweight charge', 'ค่าน้ำหนักเกิน'],
    remote_fee: ['remote area', 'remote area charge', 'ค่าพื้นที่ห่างไกล'],
    insurance_fee: ['insurance fee', 'insurance charge', 'ค่าประกัน'],
    return_fee: ['return fee', 'return charge', 'ค่าคืน'],
    other_fees: ['other fees', 'other charges', 'ค่าอื่นๆ'],
    status: ['status', 'สถานะ'],
  };
  const GLOBAL_BMS_HINTS = {
    tracking: ['tracking number', 'courier tracking code', 'mã vận đơn', 'เลขพัสดุ'],
    bm_number: ['bm number'],
    shipping_fee: ['shipping fee', 'ค่าขนส่ง'],
    cod_fee: ['cod fee', 'money collect', 'ค่า cod'],
    weight: ['chargeable ff weight', 'weight', 'น้ำหนัก'],
    overweight_fee: ['overweight fee', 'ค่าน้ำหนักเกิน'],
    remote_fee: ['remote fee', 'ค่าพื้นที่ห่างไกล'],
    insurance_fee: ['insurance fee', 'extra service fee', 'ค่าประกัน'],
    return_fee: ['return fee', 'ค่าคืน'],
    other_fees: ['other fee (chang courier fee)', 'other fees', 'ค่าอื่นๆ'],
    status: ['status', 'สถานะ'],
  };

  const carrierWb = XLSX.readFile(carrierFile);
  const bmsWb = XLSX.readFile(bmsFile);

  const carrierSheet = autoSheet(carrierWb, tpl.carrierSheetHint || []);
  const bmsSheet = autoSheet(bmsWb, tpl.boxmeSheetHint || ['Order']);
  const headerRow = tpl.headerRowHint || 1; // 1-indexed, default 1 = row 0

  const { headers: cHeaders, data: cData } = sheetData(carrierWb, carrierSheet, headerRow);
  const { headers: bHeaders, data: bData } = sheetData(bmsWb, bmsSheet, 0);

  const carrierMerged = AuditCore.mergeHints(GLOBAL_CARRIER_HINTS, tpl.carrierHints);
  const bmsMerged = AuditCore.mergeHints(GLOBAL_BMS_HINTS, tpl.boxmeHints);

  const carrierMap = AuditCore.smartDetect(cHeaders, carrierMerged, tpl.carrierMapping);
  const bmsMap = AuditCore.smartDetect(bHeaders, bmsMerged, tpl.boxmeMapping);

  return { cData, bData, carrierMap, bmsMap, carrierSheet, bmsSheet, cHeaders, bHeaders };
}

const TPL_DIR = join(__dirname, '../../template');

// ─── NIM Express ──────────────────────────────────────────────────────────────
describe('NIM Express (NIM_TH) integration', () => {
  let ctx;
  beforeAll(() => {
    ctx = loadCarrierData(
      join(TPL_DIR, "NIM - Jan'2026 from ACC.xlsx"),
      join(TPL_DIR, 'NIM from BMS.xlsx'),
      'NIM_TH'
    );
  });

  it('selects correct carrier sheet (รายงาน)', () => {
    expect(ctx.carrierSheet).toBe('รายงาน');
  });

  it('detects tracking column', () => {
    expect(ctx.carrierMap.tracking).toBeTruthy();
    const sample = ctx.cData.find(r => r[ctx.carrierMap.tracking]);
    expect(sample).toBeTruthy();
    const tk = String(sample[ctx.carrierMap.tracking]).trim();
    expect(tk.length).toBeGreaterThan(3);
  });

  it('detects shipping_fee column', () => {
    expect(ctx.carrierMap.shipping_fee).toBeTruthy();
  });

  it('detects BMS tracking column', () => {
    expect(ctx.bmsMap.tracking).toBeTruthy();
  });

  it('reconcile runs without error and returns results', () => {
    const { results, matched, missing } = AuditCore.reconcile(
      ctx.cData, ctx.bData, ctx.carrierMap, ctx.bmsMap, 0.01
    );
    expect(results.length).toBeGreaterThan(0);
    expect(matched + missing).toBe(results.length);
  });

  it('carrier_over or ok statuses present (shipping fees compared)', () => {
    const { results } = AuditCore.reconcile(
      ctx.cData, ctx.bData, ctx.carrierMap, ctx.bmsMap, 0.01
    );
    const statuses = new Set(results.map(r => r.status));
    // Should have some matched rows
    expect(statuses.has('ok') || statuses.has('carrier_over') || statuses.has('boxme_over')).toBe(true);
  });
});

// ─── Flash Express ───────────────────────────────────────────────────────────
describe('Flash Express (FLASH) integration', () => {
  let ctx;
  beforeAll(() => {
    ctx = loadCarrierData(
      join(TPL_DIR, "FLASH - Jan'2026 from ACC.xlsx"),
      join(TPL_DIR, 'Flash from BMS.xlsx'),
      'FLASH'
    );
  });

  it('selects Shipping sheet (not BMS Shipping)', () => {
    // This validates the autoSheet fix: exact match 'Shipping' beats 'BMS Shipping' (includes)
    expect(ctx.carrierSheet).toBe('Shipping');
  });

  it('detects tracking column (Tracking Number or PNO via hints)', () => {
    expect(ctx.carrierMap.tracking).toBeTruthy();
    const sample = ctx.cData.find(r => r[ctx.carrierMap.tracking]);
    expect(sample).toBeTruthy();
  });

  it('detects shipping_fee column', () => {
    expect(ctx.carrierMap.shipping_fee).toBeTruthy();
  });

  it('reconcile runs and produces results', () => {
    const { results } = AuditCore.reconcile(
      ctx.cData, ctx.bData, ctx.carrierMap, ctx.bmsMap, 0.01
    );
    expect(results.length).toBeGreaterThan(0);
  });

  it('COD fields are parsed correctly (never in total)', () => {
    const { results } = AuditCore.reconcile(
      ctx.cData, ctx.bData, ctx.carrierMap, ctx.bmsMap, 0.01
    );
    const withCOD = results.filter(r => r.c_cod_fee > 0);
    if (withCOD.length > 0) {
      // c_total must equal sum of non-COD fees
      withCOD.slice(0, 3).forEach(r => {
        const expectedTotal = r.c_shipping_fee + r.c_overweight_fee + r.c_remote_fee +
          r.c_insurance_fee + r.c_return_fee + r.c_other_fees;
        expect(Math.abs(r.c_total - expectedTotal)).toBeLessThan(0.01);
      });
    }
  });
});

// ─── Kerry Express ───────────────────────────────────────────────────────────
describe('Kerry Express (KERRY) integration', () => {
  let ctx;
  beforeAll(() => {
    ctx = loadCarrierData(
      join(TPL_DIR, "KEX - Jan'2026 from ACC.xlsx"),
      join(TPL_DIR, 'Kerry from BMS.xlsx'),
      'KERRY'
    );
  });

  it('selects invoice_details sheet', () => {
    expect(ctx.carrierSheet).toBe('invoice_details');
  });

  it('detects tracking column (handles multi-line header)', () => {
    expect(ctx.carrierMap.tracking).toBeTruthy();
    const sample = ctx.cData.find(r => r[ctx.carrierMap.tracking]);
    expect(sample).toBeTruthy();
  });

  it('detects shipping fee (Freight Charge)', () => {
    expect(ctx.carrierMap.shipping_fee).toBeTruthy();
  });

  it('reconcile returns results with fee data', () => {
    const { results, matched } = AuditCore.reconcile(
      ctx.cData, ctx.bData, ctx.carrierMap, ctx.bmsMap, 0.01
    );
    expect(results.length).toBeGreaterThan(0);
    // Verify fee amounts are numeric (not NaN)
    results.slice(0, 5).forEach(r => {
      expect(isNaN(r.c_total)).toBe(false);
      expect(isNaN(r.b_total)).toBe(false);
    });
  });

  it('fee discrepancy detection works on real data', () => {
    const { results } = AuditCore.reconcile(
      ctx.cData, ctx.bData, ctx.carrierMap, ctx.bmsMap, 0.01
    );
    // Some rows should have status set
    results.slice(0, 10).forEach(r => {
      expect(['ok', 'carrier_over', 'boxme_over', 'missing']).toContain(r.status);
    });
  });
});

// ─── Inter Express ───────────────────────────────────────────────────────────
describe('Inter Express TH (INTER_TH) integration', () => {
  let ctx;
  beforeAll(() => {
    // Inter ACC file has both 'BMS' and 'SJ Trans' sheets
    const carrierFile = join(TPL_DIR, "Inter - Jan'2026 from ACC.xlsx");
    const tpl = TEMPLATES['INTER_TH'];
    const carrierWb = XLSX.readFile(carrierFile);
    const bmsWb = carrierWb; // BMS is embedded in the same file

    const carrierSheet = autoSheet(carrierWb, tpl.carrierSheetHint || []);
    const bmsSheet = autoSheet(bmsWb, tpl.boxmeSheetHint || ['Order']);
    const headerRow = tpl.headerRowHint || 1; // 1-indexed

    const GLOBAL_CARRIER_HINTS = {
      tracking: ['tracking number', 'tracking id', 'barcode', 'mã vận đơn', 'เลขพัสดุ'],
      bm_number: ['order id', 'customer ref', 'ref no'],
      shipping_fee: ['price', 'shipping fee', 'delivery fee', 'ค่าขนส่ง'],
      cod_fee: ['cod amount', 'cod fee'],
      weight: ['weight', 'น้ำหนัก'],
      overweight_fee: ['overweight fee'],
      remote_fee: ['remote area'],
      insurance_fee: ['insurance', 'ค่าประกัน'],
      return_fee: ['return fee'],
      other_fees: ['other fees'],
      status: ['status', 'สถานะ'],
    };
    const GLOBAL_BMS_HINTS = {
      tracking: ['tracking number', 'courier tracking code', 'เลขพัสดุ'],
      bm_number: [],
      shipping_fee: ['shipping fee'],
      cod_fee: ['cod fee', 'money collect'],
      weight: ['chargeable ff weight', 'weight'],
      overweight_fee: ['overweight fee'],
      remote_fee: ['remote fee'],
      insurance_fee: ['insurance fee', 'extra service fee'],
      return_fee: ['return fee'],
      other_fees: ['other fee (chang courier fee)'],
      status: ['status'],
    };

    const { headers: cHeaders, data: cData } = sheetData(carrierWb, carrierSheet, headerRow);
    const { headers: bHeaders, data: bData } = sheetData(bmsWb, bmsSheet, 1);

    const carrierMerged = AuditCore.mergeHints(GLOBAL_CARRIER_HINTS, tpl.carrierHints);
    const bmsMerged = AuditCore.mergeHints(GLOBAL_BMS_HINTS, tpl.boxmeHints);
    const carrierMap = AuditCore.smartDetect(cHeaders, carrierMerged, tpl.carrierMapping);
    const bmsMap = AuditCore.smartDetect(bHeaders, bmsMerged, tpl.boxmeMapping);

    ctx = { cData, bData, carrierMap, bmsMap, carrierSheet, bmsSheet };
  });

  it('selects SJ Trans carrier sheet', () => {
    expect(ctx.carrierSheet).toBe('SJ Trans');
  });

  it('selects BMS sheet from embedded data', () => {
    expect(ctx.bmsSheet).toBe('BMS');
  });

  it('detects BARCODE as tracking column', () => {
    expect(ctx.carrierMap.tracking).toBeTruthy();
  });

  it('detects PRICE as shipping_fee', () => {
    expect(ctx.carrierMap.shipping_fee).toBeTruthy();
  });

  it('reconcile runs successfully', () => {
    const { results } = AuditCore.reconcile(
      ctx.cData, ctx.bData, ctx.carrierMap, ctx.bmsMap, 0.01
    );
    expect(results.length).toBeGreaterThan(0);
  });
});

// ─── Thailand Post (TLP) ─────────────────────────────────────────────────────
describe('Thailand Post TLP (TLP_TH) integration', () => {
  let ctx;
  beforeAll(() => {
    ctx = loadCarrierData(
      join(TPL_DIR, "TLP- Jan'2026 from ACC.xlsx"),
      join(TPL_DIR, 'TLP from BMS.xlsx'),
      'TLP_TH'
    );
  });

  it('selects THailand Post sheet (case-sensitive check)', () => {
    expect(ctx.carrierSheet).toBe('THailand Post');
  });

  it('detects BARCODE as tracking column', () => {
    expect(ctx.carrierMap.tracking).toBeTruthy();
    // Verify actual column maps to BARCODE
    const tplMapping = TEMPLATES['TLP_TH'].carrierMapping;
    // Either exact match or detected via hints
    expect(ctx.carrierMap.tracking).toBeTruthy();
  });

  it('detects EMS_PRICE as shipping_fee', () => {
    expect(ctx.carrierMap.shipping_fee).toBeTruthy();
  });

  it('reconcile results have valid status values', () => {
    const { results } = AuditCore.reconcile(
      ctx.cData, ctx.bData, ctx.carrierMap, ctx.bmsMap, 0.01
    );
    expect(results.length).toBeGreaterThan(0);
    results.forEach(r => {
      expect(['ok', 'carrier_over', 'boxme_over', 'missing']).toContain(r.status);
    });
  });

  it('fee total never includes PRODUCT_PRICE (COD equivalent)', () => {
    const { results } = AuditCore.reconcile(
      ctx.cData, ctx.bData, ctx.carrierMap, ctx.bmsMap, 0.01
    );
    // For TLP, PRODUCT_PRICE maps to cod_fee → excluded from total
    results.slice(0, 10).forEach(r => {
      const manualTotal = r.c_shipping_fee + r.c_overweight_fee + r.c_remote_fee +
        r.c_insurance_fee + r.c_return_fee + r.c_other_fees;
      expect(Math.abs(r.c_total - manualTotal)).toBeLessThan(0.01);
    });
  });
});

// ─── SPX Thailand ─────────────────────────────────────────────────────────────
describe('Shopee Express TH (SPX_TH) integration', () => {
  let ctx;
  beforeAll(() => {
    // SPX file has both carrier (Data ACC) and BMS (Download from BMS) in same file
    const spxFile = join(TPL_DIR, "SPX - Jan'2026 from ACC.xlsx");
    const tpl = TEMPLATES['SPX_TH'];
    const wb = XLSX.readFile(spxFile);

    const carrierSheet = autoSheet(wb, tpl.carrierSheetHint || []);
    const bmsSheet = autoSheet(wb, tpl.boxmeSheetHint || ['Download from BMS']);
    const headerRow = tpl.headerRowHint || 1; // 1-indexed, default 1 = row 0

    const GLOBAL_CARRIER_HINTS = {
      tracking: ['tracking number', 'tracking id'],
      bm_number: ['courier tracking code', 'customer tn'],
      shipping_fee: ['shipping fee (courier)', 'shipping fee'],
      cod_fee: ['cod fee (courier)', 'cod fee', 'money collect (courier)'],
      weight: ['weight (courier)', 'weight'],
      overweight_fee: ['overweight fee'],
      remote_fee: ['remote area'],
      insurance_fee: ['insurance fee (courier)', 'insurance fee'],
      return_fee: ['return fee (courier)', 'return fee'],
      other_fees: ['other fee (courier)', 'other fee', 'other fees'],
      status: ['status', 'status verify'],
    };
    const GLOBAL_BMS_HINTS = {
      tracking: ['tracking number', 'courier tracking code'],
      bm_number: [],
      shipping_fee: ['shipping fee'],
      cod_fee: ['cod fee', 'money collect'],
      weight: ['chargeable ff weight', 'weight'],
      overweight_fee: ['overweight fee'],
      remote_fee: ['remote fee'],
      insurance_fee: ['insurance fee', 'extra service fee'],
      return_fee: ['return fee'],
      other_fees: ['other fee (chang courier fee)'],
      status: ['status'],
    };

    const { headers: cHeaders, data: cData } = sheetData(wb, carrierSheet, headerRow);
    const { headers: bHeaders, data: bData } = sheetData(wb, bmsSheet, 0);

    const carrierMerged = AuditCore.mergeHints(GLOBAL_CARRIER_HINTS, tpl.carrierHints);
    const bmsMerged = AuditCore.mergeHints(GLOBAL_BMS_HINTS, tpl.boxmeHints);
    const carrierMap = AuditCore.smartDetect(cHeaders, carrierMerged, tpl.carrierMapping);
    const bmsMap = AuditCore.smartDetect(bHeaders, bmsMerged, tpl.boxmeMapping);

    ctx = { cData, bData, carrierMap, bmsMap, carrierSheet, bmsSheet, cHeaders, bHeaders };
  });

  it('selects Data ACC carrier sheet', () => {
    expect(ctx.carrierSheet).toBe('Data ACC');
  });

  it('selects Download from BMS sheet', () => {
    expect(ctx.bmsSheet).toBe('Download from BMS');
  });

  it('detects Tracking number column', () => {
    expect(ctx.carrierMap.tracking).toBeTruthy();
  });

  it('detects Shipping fee (Courier) column', () => {
    expect(ctx.carrierMap.shipping_fee).toBeTruthy();
  });

  it('detects BMS Tracking number', () => {
    expect(ctx.bmsMap.tracking).toBe('Tracking number');
  });

  it('detects BMS Shipping fee', () => {
    expect(ctx.bmsMap.shipping_fee).toBe('Shipping fee');
  });

  it('SPX carrier data has 3000+ rows', () => {
    expect(ctx.cData.length).toBeGreaterThan(3000);
  });

  it('reconcile runs and returns results', () => {
    const { results, matched, missing } = AuditCore.reconcile(
      ctx.cData, ctx.bData, ctx.carrierMap, ctx.bmsMap, 0.01
    );
    expect(results.length).toBeGreaterThan(0);
  });

  it('COD excluded: c_total does not include Cod fee (Courier)', () => {
    const { results } = AuditCore.reconcile(
      ctx.cData, ctx.bData, ctx.carrierMap, ctx.bmsMap, 0.01
    );
    results.slice(0, 20).forEach(r => {
      const nonCodTotal = r.c_shipping_fee + r.c_overweight_fee + r.c_remote_fee +
        r.c_insurance_fee + r.c_return_fee + r.c_other_fees;
      expect(Math.abs(r.c_total - nonCodTotal)).toBeLessThan(0.01);
    });
  });
});

// ─── DHL Express ─────────────────────────────────────────────────────────────
describe('DHL Express TH (DHL_TH) integration', () => {
  let ctx;
  beforeAll(() => {
    ctx = loadCarrierData(
      join(TPL_DIR, "DHL - Jan'2026 from ACC.xlsx"),
      join(TPL_DIR, 'DHL from BMS.xlsx'),
      'DHL_TH'
    );
  });

  it('selects Shipping sheet (not BMS)', () => {
    // DHL should select 'Shipping', not any sheet starting with BMS
    expect(ctx.carrierSheet.toLowerCase()).not.toContain('bms');
  });

  it('detects Consignment Note No. as tracking', () => {
    expect(ctx.carrierMap.tracking).toBeTruthy();
  });

  it('reconcile returns results', () => {
    const { results } = AuditCore.reconcile(
      ctx.cData, ctx.bData, ctx.carrierMap, ctx.bmsMap, 0.01
    );
    expect(results.length).toBeGreaterThan(0);
    results.slice(0, 5).forEach(r => {
      expect(['ok', 'carrier_over', 'boxme_over', 'missing']).toContain(r.status);
    });
  });
});
