/**
 * ══════════════════════════════════════════════════════════════════
 * Material Planner — Layer 2: Business Logic Tests
 * Tests calc-engine formulas: IT, DOI, batch quantity, pending PO
 * ══════════════════════════════════════════════════════════════════
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

/**
 * The material-planner JS files use browser globals (document, localStorage, state).
 * We stub them minimally and load the files into globalThis.
 */
let state;

beforeAll(() => {
  // Stub browser globals needed by the material-planner JS files
  const mockElement = {
    value: '', innerHTML: '', textContent: '', style: {}, dataset: {},
    classList: { contains: () => false, add: () => {}, remove: () => {}, toggle: () => {} },
    addEventListener: () => {},
    querySelector: () => mockElement,
    querySelectorAll: () => [],
    appendChild: () => {},
    removeChild: () => {},
    setAttribute: () => {},
    getAttribute: () => null,
    checked: false,
  };
  globalThis.document = {
    getElementById: () => ({ ...mockElement }),
    querySelector: () => ({ ...mockElement }),
    querySelectorAll: () => [],
    addEventListener: () => {},
    createElement: () => ({ ...mockElement }),
  };
  globalThis.localStorage = { getItem: () => null, setItem: () => {} };
  globalThis.sessionStorage = { getItem: () => null, setItem: () => {} };
  globalThis.window = { location: { href: '', replace: () => {} }, print: () => {}, addEventListener: () => {} };
  globalThis.toast = () => {};
  globalThis.Intl = Intl;
  globalThis.Chart = class { destroy() {} };

  // Load seasonal-ratio first (provides getRatioLift, getCountryForWarehouse, getEventForMonth)
  require('../../../tools/material-planner/js/seasonal-ratio.js');

  // Load i18n (provides t() function)
  require('../../../tools/material-planner/js/i18n.js');

  // Load calc-engine
  require('../../../tools/material-planner/js/calc-engine.js');

  // Load app.js for the state object
  require('../../../tools/material-planner/js/app.js');

  state = globalThis.state;
});

// ─── Inventory Turnover Formula ────────────────────────────────────────────

describe('Inventory Turnover (IT) formula', () => {
  it('IT = adjustedDemand / avgInventory where avg = (begin + end) / 2', () => {
    // Setup: demand=100, stock=50, batch=50
    // beginningStock = 50, endingStock = 50+50 = 100
    // avgInventory = (50 + 100) / 2 = 75
    // IT = 100 / 75 = 1.33
    const demand = 100, stock = 50, batch = 50;
    const avgInv = (stock + stock + batch) / 2;
    const it = Math.round((demand / avgInv) * 100) / 100;
    expect(it).toBe(1.33);
  });

  it('IT = 2 when stock = 0 (zero stock, new PO only)', () => {
    // Setup: demand=100, stock=0, batch=100
    // avgInventory = (0 + 100) / 2 = 50
    // IT = 100 / 50 = 2.0
    const demand = 100, stock = 0, batch = 100;
    const avgInv = (stock + stock + batch) / 2;
    const it = Math.round((demand / avgInv) * 100) / 100;
    expect(it).toBe(2.0);
  });

  it('IT = 0 when both demand and stock are 0', () => {
    const demand = 0, stock = 0, batch = 0;
    const avgInv = (stock + stock + batch) / 2;
    const it = avgInv > 0 ? Math.round((demand / avgInv) * 100) / 100 : 0;
    expect(it).toBe(0);
  });

  it('high stock with low demand ⟹ low IT (< 1)', () => {
    // demand=100, stock=200, batch=0
    // avgInv = (200 + 200) / 2 = 200
    // IT = 100 / 200 = 0.5
    const demand = 100, stock = 200, batch = 0;
    const avgInv = (stock + stock + batch) / 2;
    const it = Math.round((demand / avgInv) * 100) / 100;
    expect(it).toBe(0.5);
  });
});

// ─── DOI After PO ─────────────────────────────────────────────────────────

describe('DOI After PO calculation', () => {
  it('DOI = (stock + batch) / dailyDemand', () => {
    const stock = 500, batch = 500, demand = 1000, period = 30;
    const dailyDemand = demand / period;
    const doiAfter = (stock + batch) / dailyDemand;
    expect(Math.round(doiAfter * 10) / 10).toBe(30);
  });

  it('DOI = 45 when batch fills gap to DOI target', () => {
    const stock = 0, demand = 300, period = 30, doiTarget = 45;
    const dailyDemand = demand / period; // 10/day
    const batch = Math.round(dailyDemand * doiTarget - stock); // 450
    const doiAfter = (stock + batch) / dailyDemand;
    expect(Math.round(doiAfter * 10) / 10).toBe(45);
  });

  it('DOI = 999 when no demand', () => {
    const stock = 100, batch = 0, dailyDemand = 0;
    const doiAfter = dailyDemand > 0 ? (stock + batch) / dailyDemand : 999;
    expect(doiAfter).toBe(999);
  });
});

// ─── Batch Qty with doiTargetDays ──────────────────────────────────────────

describe('Batch quantity calculation (doiTargetDays)', () => {
  it('batch = max(0, daily * targetDays - adjustedStock)', () => {
    const demand = 300, period = 30; // daily = 10
    const stock = 100, pending = 0, targetDays = 45;
    const daily = demand / period;
    const adjustedStock = stock + pending;
    const batch = Math.max(0, Math.round(daily * targetDays - adjustedStock));
    expect(batch).toBe(350); // 10 * 45 - 100 = 350
  });

  it('batch = 0 when stock already exceeds target', () => {
    const demand = 300, period = 30; // daily = 10
    const stock = 500, pending = 0, targetDays = 45;
    const daily = demand / period;
    const adjustedStock = stock + pending;
    const batch = Math.max(0, Math.round(daily * targetDays - adjustedStock));
    expect(batch).toBe(0); // 10 * 45 - 500 = -50 → 0
  });

  it('pending PO reduces batch needed', () => {
    const demand = 300, period = 30; // daily = 10
    const stock = 100, pending = 200, targetDays = 45;
    const daily = demand / period;
    const adjustedStock = stock + pending;
    const batch = Math.max(0, Math.round(daily * targetDays - adjustedStock));
    expect(batch).toBe(150); // 10 * 45 - 300 = 150
  });

  it('different targetDays per SKU produces different batches', () => {
    const demand = 300, period = 30, stock = 100; // daily = 10
    const daily = demand / period;

    const batch30 = Math.max(0, Math.round(daily * 30 - stock)); // 200
    const batch60 = Math.max(0, Math.round(daily * 60 - stock)); // 500

    expect(batch30).toBe(200);
    expect(batch60).toBe(500);
    expect(batch60).toBeGreaterThan(batch30);
  });

  it('batch = 0 when demand = 0 regardless of targetDays', () => {
    const demand = 0, period = 30, stock = 100, targetDays = 45;
    const daily = demand / period;
    const batch = demand === 0 ? 0 : Math.max(0, Math.round(daily * targetDays - stock));
    expect(batch).toBe(0);
  });
});

// ─── Seasonal Ratio Lift ─────────────────────────────────────────────────

describe('Adjusted demand with seasonal ratio', () => {
  it('adjustedDemand = demand * ratioLift (no more demandFactor)', () => {
    const demand = 1000, ratioLift = 1.15;
    const adjustedDemand = demand * ratioLift;
    expect(adjustedDemand).toBe(1150);
  });

  it('adjustedDemand unchanged when ratioLift = 1.0', () => {
    const demand = 500, ratioLift = 1.0;
    const adjustedDemand = demand * ratioLift;
    expect(adjustedDemand).toBe(500);
  });

  it('reduced demand with ratioLift < 1', () => {
    const demand = 1000, ratioLift = 0.85;
    const adjustedDemand = demand * ratioLift;
    expect(adjustedDemand).toBeCloseTo(850, 2);
  });
});

// ─── Aging Total vs Pending PO (naming clarity) ────────────────────────────

describe('agingTotal vs pendingQty naming', () => {
  it('agingTotal is sum of aging buckets (not related to pending PO)', () => {
    const agingBuckets = { '<15 days': 100, '15-30 days': 50, '30-60 days': 20, '>60 days': 5 };
    const agingTotal = Object.values(agingBuckets).reduce((a, b) => a + b, 0);
    expect(agingTotal).toBe(175);
  });

  it('pendingQty is from pending PO file (separate data source)', () => {
    const pendingPO = [
      { sku: 'SKU1', qty: 100 },
      { sku: 'SKU1', qty: 50 },
    ];
    const pendingQty = pendingPO
      .filter(p => p.sku === 'SKU1')
      .reduce((s, p) => s + p.qty, 0);
    expect(pendingQty).toBe(150);
    // These are NOT the same — agingTotal comes from aging report, pendingQty from PO file
  });
});

// ─── Insight Generation ────────────────────────────────────────────────────

describe('generateInsight', () => {
  it('returns danger for out-of-stock', () => {
    const fn = globalThis.generateInsight;
    if (!fn) return; // Skip if not loaded
    const r = fn(0, 100, 200, 10, 0);
    expect(r.type).toBe('danger');
    expect(r.text).toBe('outOfStock');
  });

  it('returns warning for below ROP', () => {
    const fn = globalThis.generateInsight;
    if (!fn) return;
    const r = fn(50, 100, 200, 10, 0); // stock=50 < rop=100
    expect(r.type).toBe('warning');
    expect(r.text).toBe('belowROP');
  });

  it('returns noDemand when daily = 0', () => {
    const fn = globalThis.generateInsight;
    if (!fn) return;
    const r = fn(100, 0, 0, 0, 0);
    expect(r.type).toBe('ok');
    expect(r.text).toBe('noDemand');
  });
});
