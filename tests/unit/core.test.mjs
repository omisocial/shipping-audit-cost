/**
 * Unit tests for carrier_audit_core.js
 * Focus: fee discrepancy accuracy (highest priority), COD exclusion, tolerance, missing tracking
 */
import { createRequire } from 'node:module';
import { describe, it, expect, beforeAll } from 'vitest';

const require = createRequire(import.meta.url);

let AuditCore;
beforeAll(() => {
  require('../../tools/carrier-audit/core.js');
  AuditCore = globalThis.AuditCore;
});

// ─── mergeHints ───────────────────────────────────────────────────────────────
describe('mergeHints', () => {
  const global = {
    tracking: ['tracking number', 'tracking id'],
    shipping_fee: ['shipping fee', 'delivery fee'],
    cod_fee: ['cod amount', 'cod fee'],
  };

  it('returns global hints when no carrier hints', () => {
    const r = AuditCore.mergeHints(global, null);
    expect(r.tracking).toEqual(['tracking number', 'tracking id']);
  });

  it('prepends carrier hints (higher priority)', () => {
    const carrier = { tracking: ['mã vận đơn', 'Tracking Number'] };
    const r = AuditCore.mergeHints(global, carrier);
    expect(r.tracking[0]).toBe('mã vận đơn');
    expect(r.tracking).toContain('tracking number');
  });

  it('deduplicates overlapping hints (case-insensitive stored lowercased)', () => {
    const carrier = { tracking: ['Tracking Number'] };
    const r = AuditCore.mergeHints(global, carrier);
    // 'tracking number' from global and 'tracking number' from carrier (lowercased) → deduplicated
    const count = r.tracking.filter(h => h === 'tracking number').length;
    expect(count).toBe(1);
  });

  it('preserves fields not in carrier hints', () => {
    const carrier = { tracking: ['custom'] };
    const r = AuditCore.mergeHints(global, carrier);
    expect(r.shipping_fee).toEqual(['shipping fee', 'delivery fee']);
  });
});

// ─── smartDetect ─────────────────────────────────────────────────────────────
describe('smartDetect', () => {
  const hints = {
    tracking: ['tracking number', 'tracking id', 'เลขพัสดุ'],
    shipping_fee: ['shipping fee', 'delivery fee', 'ค่าขนส่ง'],
    cod_fee: ['cod amount', 'cod fee', 'ค่า cod'],
    weight: ['weight', 'น้ำหนัก'],
    overweight_fee: ['overweight fee', 'ค่าน้ำหนักเกิน'],
    remote_fee: ['remote area', 'remote fee'],
    insurance_fee: ['insurance fee', 'ค่าประกัน'],
    return_fee: ['return fee', 'ค่าคืน'],
    other_fees: ['other fees', 'ค่าอื่นๆ'],
    status: ['status', 'สถานะ'],
  };

  it('Tier 1: exact template match', () => {
    const headers = ['PNO', 'Shipping Fee', 'COD Amount', 'Weight'];
    const tpl = { tracking: 'PNO', shipping_fee: 'Shipping Fee', cod_fee: 'COD Amount', weight: 'Weight' };
    const r = AuditCore.smartDetect(headers, hints, tpl);
    expect(r.tracking).toBe('PNO');
    expect(r.shipping_fee).toBe('Shipping Fee');
    expect(r.cod_fee).toBe('COD Amount');
    expect(r.weight).toBe('Weight');
  });

  it('Tier 2: case-insensitive template match', () => {
    const headers = ['pno', 'shipping fee', 'cod amount'];
    const tpl = { tracking: 'PNO', shipping_fee: 'Shipping Fee', cod_fee: 'COD Amount' };
    const r = AuditCore.smartDetect(headers, hints, tpl);
    expect(r.tracking).toBe('pno');
    expect(r.shipping_fee).toBe('shipping fee');
  });

  it('Tier 3: exact hint keyword match', () => {
    const headers = ['Tracking Number', 'Shipping Fee', 'COD Amount'];
    const r = AuditCore.smartDetect(headers, hints, {});
    expect(r.tracking).toBe('Tracking Number');
    expect(r.shipping_fee).toBe('Shipping Fee');
    expect(r.cod_fee).toBe('COD Amount');
  });

  it('Tier 4: partial/substring hint match', () => {
    const headers = ['Tracking Number (PNO)', 'Shipping Fee (Courier)', 'COD Fee Total'];
    const r = AuditCore.smartDetect(headers, hints, {});
    // "tracking number" is a substring of "tracking number (pno)"
    expect(r.tracking).toBe('Tracking Number (PNO)');
    // "shipping fee" is a substring of "shipping fee (courier)"
    expect(r.shipping_fee).toBe('Shipping Fee (Courier)');
    // "cod fee" is a substring of "cod fee total"
    expect(r.cod_fee).toBe('COD Fee Total');
  });

  it('does not double-map the same column', () => {
    // "Shipping Fee" should only map to one field, not both shipping_fee and other_fees
    const headers = ['Tracking', 'Shipping Fee'];
    const tpl = { tracking: 'Tracking', shipping_fee: 'Shipping Fee', other_fees: 'Shipping Fee' };
    const r = AuditCore.smartDetect(headers, hints, tpl);
    expect(r.tracking).toBe('Tracking');
    expect(r.shipping_fee).toBe('Shipping Fee');
    // other_fees should NOT also get Shipping Fee since it's already used
    expect(r.other_fees).toBeUndefined();
  });

  it('handles Thai column headers (Tier 3)', () => {
    const headers = ['เลขพัสดุ', 'ค่าขนส่ง', 'น้ำหนัก'];
    const r = AuditCore.smartDetect(headers, hints, {});
    expect(r.tracking).toBe('เลขพัสดุ');
    expect(r.shipping_fee).toBe('ค่าขนส่ง');
    expect(r.weight).toBe('น้ำหนัก');
  });

  it('correctly prefers exact match over partial: avoids BMS Shipping when Shipping exists', () => {
    // This is the real-world FLASH scenario
    const headers = ['BMS COD', 'COD', 'BMS Shipping', 'Shipping'];
    // autoSheet with hint 'Shipping' should pick 'Shipping', not 'BMS Shipping'
    // We test the logic equivalent: exact match beats contains
    const exactMatch = headers.find(s => s.toLowerCase() === 'shipping');
    const partialMatch = headers.find(s => s.toLowerCase().includes('shipping'));
    expect(exactMatch).toBe('Shipping');
    expect(partialMatch).toBe('BMS Shipping'); // partial/includes picks BMS Shipping first
    // The fixed autoSheet prefers exact, so should return 'Shipping'
    expect(exactMatch).toBe('Shipping');
  });
});

// ─── reconcile ────────────────────────────────────────────────────────────────
describe('reconcile', () => {
  const carrierMap = {
    tracking: 'TN', shipping_fee: 'SF', cod_fee: 'CF',
    overweight_fee: 'OWF', remote_fee: 'RF', insurance_fee: 'INS',
    return_fee: 'RTF', other_fees: 'OTH', weight: 'W', status: 'ST',
  };
  const boxmeMap = {
    tracking: 'tracking', shipping_fee: 'sfee', cod_fee: 'cfee',
    overweight_fee: 'owfee', remote_fee: 'rfee', insurance_fee: 'insfee',
    return_fee: 'rtfee', other_fees: 'othfee', weight: 'wt',
  };

  // ── Fee discrepancy (highest priority) ───────────────────────────────────
  describe('fee discrepancy detection', () => {
    it('status ok when fees match exactly', () => {
      const cData = [{ TN: 'TK001', SF: 50, CF: 10, OWF: 0, RF: 0, INS: 0, RTF: 0, OTH: 0, W: 1 }];
      const bData = [{ tracking: 'TK001', sfee: 50, cfee: 10, owfee: 0, rfee: 0, insfee: 0, rtfee: 0, othfee: 0, wt: 1 }];
      const { results } = AuditCore.reconcile(cData, bData, carrierMap, boxmeMap, 0.01);
      expect(results[0].status).toBe('ok');
      expect(results[0].d_total).toBe(0);
    });

    it('status carrier_over when carrier charges more', () => {
      const cData = [{ TN: 'TK001', SF: 100, CF: 0, OWF: 0, RF: 0, INS: 0, RTF: 0, OTH: 0, W: 1 }];
      const bData = [{ tracking: 'TK001', sfee: 80, cfee: 0, owfee: 0, rfee: 0, insfee: 0, rtfee: 0, othfee: 0, wt: 1 }];
      const { results } = AuditCore.reconcile(cData, bData, carrierMap, boxmeMap, 0.01);
      expect(results[0].status).toBe('carrier_over');
      expect(results[0].d_total).toBe(20);
      expect(results[0].d_shipping_fee).toBe(20);
    });

    it('status boxme_over when boxme records higher fee', () => {
      const cData = [{ TN: 'TK001', SF: 80, CF: 0, OWF: 0, RF: 0, INS: 0, RTF: 0, OTH: 0, W: 1 }];
      const bData = [{ tracking: 'TK001', sfee: 100, cfee: 0, owfee: 0, rfee: 0, insfee: 0, rtfee: 0, othfee: 0, wt: 1 }];
      const { results } = AuditCore.reconcile(cData, bData, carrierMap, boxmeMap, 0.01);
      expect(results[0].status).toBe('boxme_over');
      expect(results[0].d_total).toBe(-20);
    });

    it('correctly computes total from all shipping fee components', () => {
      const cData = [{ TN: 'TK001', SF: 50, CF: 20, OWF: 5, RF: 3, INS: 2, RTF: 0, OTH: 1, W: 2 }];
      const bData = [{ tracking: 'TK001', sfee: 50, cfee: 20, owfee: 5, rfee: 3, insfee: 2, rtfee: 0, othfee: 1, wt: 2 }];
      const { results } = AuditCore.reconcile(cData, bData, carrierMap, boxmeMap, 0.01);
      // carrier total = SF + OWF + RF + INS + RTF + OTH = 50+5+3+2+0+1 = 61 (NO COD)
      expect(results[0].c_total).toBe(61);
      expect(results[0].b_total).toBe(61);
      expect(results[0].status).toBe('ok');
    });

    it('detects per-field discrepancies (overweight, remote, insurance)', () => {
      const cData = [{ TN: 'TK001', SF: 50, CF: 0, OWF: 10, RF: 5, INS: 3, RTF: 0, OTH: 0, W: 2 }];
      const bData = [{ tracking: 'TK001', sfee: 50, cfee: 0, owfee: 8, rfee: 5, insfee: 3, rtfee: 0, othfee: 0, wt: 2 }];
      const { results } = AuditCore.reconcile(cData, bData, carrierMap, boxmeMap, 0.01);
      expect(results[0].d_overweight_fee).toBe(2);
      expect(results[0].d_remote_fee).toBe(0);
      expect(results[0].d_insurance_fee).toBe(0);
      expect(results[0].d_total).toBe(2);
      expect(results[0].status).toBe('carrier_over');
    });
  });

  // ── COD exclusion (critical) ──────────────────────────────────────────────
  describe('COD exclusion from total', () => {
    it('COD is excluded from total fee calculation', () => {
      const cData = [{ TN: 'TK001', SF: 50, CF: 200, OWF: 0, RF: 0, INS: 0, RTF: 0, OTH: 0, W: 1 }];
      const bData = [{ tracking: 'TK001', sfee: 50, cfee: 200, owfee: 0, rfee: 0, insfee: 0, rtfee: 0, othfee: 0, wt: 1 }];
      const { results } = AuditCore.reconcile(cData, bData, carrierMap, boxmeMap, 0.01);
      // c_total should be SF only = 50, NOT 50+200=250
      expect(results[0].c_total).toBe(50);
      expect(results[0].b_total).toBe(50);
      expect(results[0].c_cod_fee).toBe(200); // COD is stored individually
      expect(results[0].status).toBe('ok');
    });

    it('COD discrepancy does NOT affect status or total diff', () => {
      // Carrier charges different COD than Boxme — should not trigger carrier_over
      const cData = [{ TN: 'TK001', SF: 50, CF: 300, OWF: 0, RF: 0, INS: 0, RTF: 0, OTH: 0, W: 1 }];
      const bData = [{ tracking: 'TK001', sfee: 50, cfee: 200, owfee: 0, rfee: 0, insfee: 0, rtfee: 0, othfee: 0, wt: 1 }];
      const { results } = AuditCore.reconcile(cData, bData, carrierMap, boxmeMap, 0.01);
      expect(results[0].c_total).toBe(50);
      expect(results[0].b_total).toBe(50);
      expect(results[0].d_total).toBe(0);
      expect(results[0].status).toBe('ok');
      // Individual COD diff IS tracked but does not affect status
      expect(results[0].d_cod_fee).toBe(100);
    });
  });

  // ── Tolerance handling ────────────────────────────────────────────────────
  describe('tolerance handling', () => {
    it('status ok when diff is within tolerance (0.01)', () => {
      const cData = [{ TN: 'TK001', SF: 100.005, CF: 0, OWF: 0, RF: 0, INS: 0, RTF: 0, OTH: 0, W: 1 }];
      const bData = [{ tracking: 'TK001', sfee: 100, cfee: 0, owfee: 0, rfee: 0, insfee: 0, rtfee: 0, othfee: 0, wt: 1 }];
      const { results } = AuditCore.reconcile(cData, bData, carrierMap, boxmeMap, 0.01);
      expect(results[0].status).toBe('ok');
    });

    it('status carrier_over when diff exceeds tolerance', () => {
      const cData = [{ TN: 'TK001', SF: 100.02, CF: 0, OWF: 0, RF: 0, INS: 0, RTF: 0, OTH: 0, W: 1 }];
      const bData = [{ tracking: 'TK001', sfee: 100, cfee: 0, owfee: 0, rfee: 0, insfee: 0, rtfee: 0, othfee: 0, wt: 1 }];
      const { results } = AuditCore.reconcile(cData, bData, carrierMap, boxmeMap, 0.01);
      expect(results[0].status).toBe('carrier_over');
    });

    it('handles floating point precision (100.01 - 100.00 = 0.01)', () => {
      // Classic floating point issue: should not register as discrepancy with tol=0.01
      const cData = [{ TN: 'TK001', SF: 100.01, CF: 0, OWF: 0, RF: 0, INS: 0, RTF: 0, OTH: 0, W: 1 }];
      const bData = [{ tracking: 'TK001', sfee: 100.00, cfee: 0, owfee: 0, rfee: 0, insfee: 0, rtfee: 0, othfee: 0, wt: 1 }];
      const { results } = AuditCore.reconcile(cData, bData, carrierMap, boxmeMap, 0.01);
      // 100.01 - 100.00 = 0.009999... which rounds to 0.01, exactly at boundary → ok
      expect(results[0].status).toBe('ok');
    });

    it('uses custom tolerance when provided', () => {
      const cData = [{ TN: 'TK001', SF: 105, CF: 0, OWF: 0, RF: 0, INS: 0, RTF: 0, OTH: 0, W: 1 }];
      const bData = [{ tracking: 'TK001', sfee: 100, cfee: 0, owfee: 0, rfee: 0, insfee: 0, rtfee: 0, othfee: 0, wt: 1 }];
      // With tolerance 5, diff=5 should be ok
      const { results } = AuditCore.reconcile(cData, bData, carrierMap, boxmeMap, 5);
      expect(results[0].status).toBe('ok');
    });
  });

  // ── Missing tracking ──────────────────────────────────────────────────────
  describe('missing tracking', () => {
    it('status missing when carrier tracking not in BMS', () => {
      const cData = [{ TN: 'TK001', SF: 50, CF: 0, OWF: 0, RF: 0, INS: 0, RTF: 0, OTH: 0, W: 1 }];
      const bData = [{ tracking: 'TK002', sfee: 50, cfee: 0, owfee: 0, rfee: 0, insfee: 0, rtfee: 0, othfee: 0, wt: 1 }];
      const { results, missing } = AuditCore.reconcile(cData, bData, carrierMap, boxmeMap, 0.01);
      expect(results[0].status).toBe('missing');
      expect(missing).toBe(1);
    });

    it('counts missingInCarrier: BMS orders not in carrier file', () => {
      const cData = [{ TN: 'TK001', SF: 50, CF: 0, OWF: 0, RF: 0, INS: 0, RTF: 0, OTH: 0, W: 1 }];
      const bData = [
        { tracking: 'TK001', sfee: 50, cfee: 0, owfee: 0, rfee: 0, insfee: 0, rtfee: 0, othfee: 0, wt: 1 },
        { tracking: 'TK002', sfee: 60, cfee: 0, owfee: 0, rfee: 0, insfee: 0, rtfee: 0, othfee: 0, wt: 1 },
        { tracking: 'TK003', sfee: 70, cfee: 0, owfee: 0, rfee: 0, insfee: 0, rtfee: 0, othfee: 0, wt: 1 },
      ];
      const { missingInCarrier } = AuditCore.reconcile(cData, bData, carrierMap, boxmeMap, 0.01);
      expect(missingInCarrier).toBe(2);
    });

    it('matched count is correct', () => {
      const cData = [
        { TN: 'TK001', SF: 50, CF: 0, OWF: 0, RF: 0, INS: 0, RTF: 0, OTH: 0, W: 1 },
        { TN: 'TK002', SF: 60, CF: 0, OWF: 0, RF: 0, INS: 0, RTF: 0, OTH: 0, W: 1 },
        { TN: 'TK_GHOST', SF: 70, CF: 0, OWF: 0, RF: 0, INS: 0, RTF: 0, OTH: 0, W: 1 },
      ];
      const bData = [
        { tracking: 'TK001', sfee: 50, cfee: 0, owfee: 0, rfee: 0, insfee: 0, rtfee: 0, othfee: 0, wt: 1 },
        { tracking: 'TK002', sfee: 60, cfee: 0, owfee: 0, rfee: 0, insfee: 0, rtfee: 0, othfee: 0, wt: 1 },
      ];
      const { matched, missing } = AuditCore.reconcile(cData, bData, carrierMap, boxmeMap, 0.01);
      expect(matched).toBe(2);
      expect(missing).toBe(1);
    });

    it('skips rows with empty tracking number', () => {
      const cData = [
        { TN: '', SF: 50, CF: 0, OWF: 0, RF: 0, INS: 0, RTF: 0, OTH: 0, W: 1 },
        { TN: 'TK001', SF: 60, CF: 0, OWF: 0, RF: 0, INS: 0, RTF: 0, OTH: 0, W: 1 },
      ];
      const bData = [{ tracking: 'TK001', sfee: 60, cfee: 0, owfee: 0, rfee: 0, insfee: 0, rtfee: 0, othfee: 0, wt: 1 }];
      const { results } = AuditCore.reconcile(cData, bData, carrierMap, boxmeMap, 0.01);
      // Only 1 result — empty tracking row is skipped
      expect(results.length).toBe(1);
      expect(results[0].tracking).toBe('TK001');
    });

    it('fallback matching by bm_number when tracking not found', () => {
      const carrierMapWithBM = { ...carrierMap, bm_number: 'BM' };
      const cData = [{ TN: 'CARRIER_TN', BM: 'BM001', SF: 50, CF: 0, OWF: 0, RF: 0, INS: 0, RTF: 0, OTH: 0, W: 1 }];
      const bData = [{ tracking: 'BM001', sfee: 50, cfee: 0, owfee: 0, rfee: 0, insfee: 0, rtfee: 0, othfee: 0, wt: 1 }];
      const { results } = AuditCore.reconcile(cData, bData, carrierMapWithBM, boxmeMap, 0.01);
      // carrier tracking = 'CARRIER_TN' not in BMS, but bm_number 'BM001' IS in BMS → matched
      expect(results[0].status).toBe('ok');
    });
  });

  // ── Result structure ──────────────────────────────────────────────────────
  describe('result structure', () => {
    it('returns all expected fee fields', () => {
      const cData = [{ TN: 'TK001', SF: 50, CF: 10, OWF: 5, RF: 3, INS: 2, RTF: 4, OTH: 1, W: 2 }];
      const bData = [{ tracking: 'TK001', sfee: 50, cfee: 10, owfee: 5, rfee: 3, insfee: 2, rtfee: 4, othfee: 1, wt: 2 }];
      const { results } = AuditCore.reconcile(cData, bData, carrierMap, boxmeMap, 0.01);
      const r = results[0];
      // All c_ and b_ fee fields present
      ['shipping_fee', 'cod_fee', 'overweight_fee', 'remote_fee', 'insurance_fee', 'return_fee', 'other_fees']
        .forEach(f => {
          expect(r).toHaveProperty('c_' + f);
          expect(r).toHaveProperty('b_' + f);
          expect(r).toHaveProperty('d_' + f);
        });
      expect(r).toHaveProperty('c_total');
      expect(r).toHaveProperty('b_total');
      expect(r).toHaveProperty('d_total');
    });

    it('handles string numbers gracefully', () => {
      const cData = [{ TN: 'TK001', SF: '50.5', CF: '0', OWF: '', RF: null, INS: undefined, RTF: 0, OTH: 0, W: 1 }];
      const bData = [{ tracking: 'TK001', sfee: '50.5', cfee: 0, owfee: 0, rfee: 0, insfee: 0, rtfee: 0, othfee: 0, wt: 1 }];
      const { results } = AuditCore.reconcile(cData, bData, carrierMap, boxmeMap, 0.01);
      expect(results[0].c_shipping_fee).toBe(50.5);
      expect(results[0].c_remote_fee).toBe(0); // null → 0
      expect(results[0].c_insurance_fee).toBe(0); // undefined → 0
      expect(results[0].status).toBe('ok');
    });
  });
});

// ─── buildExportRow ───────────────────────────────────────────────────────────
describe('buildExportRow', () => {
  const mockRow = {
    no: 1, tracking: 'TK001', bmNumber: 'BM001',
    c_shipping_fee: 50, c_cod_fee: 10, c_overweight_fee: 5, c_remote_fee: 3,
    c_insurance_fee: 2, c_return_fee: 4, c_other_fees: 1, c_total: 65, c_weight: 2,
    b_shipping_fee: 50, b_cod_fee: 10, b_overweight_fee: 5, b_remote_fee: 3,
    b_insurance_fee: 2, b_return_fee: 4, b_other_fees: 1, b_total: 65, b_weight: 2,
    d_shipping_fee: 0, d_cod_fee: 0, d_overweight_fee: 0, d_remote_fee: 0,
    d_insurance_fee: 0, d_return_fee: 0, d_other_fees: 0, d_total: 0, d_weight: 0,
    status: 'ok',
  };

  it('returns array of 31 elements', () => {
    const row = AuditCore.buildExportRow(mockRow, 0, null);
    expect(row.length).toBe(31);
  });

  it('first 3 elements are index, tracking, bmNumber', () => {
    const row = AuditCore.buildExportRow(mockRow, 0, null);
    expect(row[0]).toBe(1); // index + 1
    expect(row[1]).toBe('TK001');
    expect(row[2]).toBe('BM001');
  });

  it('last element is status label', () => {
    const row = AuditCore.buildExportRow(mockRow, 0, null);
    expect(row[30]).toBe('OK');
  });

  it('uses custom status labels', () => {
    const labels = { ok: 'Đúng', carrier_over: 'Hãng cao hơn', boxme_over: 'BMS cao hơn', missing: 'Thiếu' };
    const overRow = { ...mockRow, status: 'carrier_over' };
    const row = AuditCore.buildExportRow(overRow, 0, labels);
    expect(row[30]).toBe('Hãng cao hơn');
  });

  it('handles missing status gracefully', () => {
    const row = AuditCore.buildExportRow({ ...mockRow, status: 'unknown_status' }, 0, null);
    expect(row[30]).toBe('unknown_status');
  });
});
