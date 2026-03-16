/**
 * Carrier Audit Tool — Shared Core Module
 * ═══════════════════════════════════════
 * Pure testable functions used by both carrier_audit_tool.html and carrier_audit_test.html.
 * No DOM access, no async — all functions are synchronous and side-effect-free.
 */
(function(global){
  'use strict';

  // ── Constants ──────────────────────────────────────────────
  const FEE_FIELDS = ['shipping_fee','cod_fee','overweight_fee','remote_fee','insurance_fee','return_fee','other_fees'];
  // COD is NOT a shipping cost — it's money collected from customer.
  // Total fee = only actual shipping charges (excludes cod_fee)
  const TOTAL_FEE_FIELDS = ['shipping_fee','overweight_fee','remote_fee','insurance_fee','return_fee','other_fees'];

  // ── mergeHints ─────────────────────────────────────────────
  // Merge global hints with carrier-specific multilingual hints
  function mergeHints(globalHints, carrierHints){
    if(!carrierHints) return globalHints;
    const merged = {};
    Object.keys(globalHints).forEach(field => {
      const g = globalHints[field] || [];
      const c = (carrierHints[field] || []).map(h => h.toLowerCase().trim());
      // Carrier hints first (higher priority), then global, deduplicated
      const all = [...c, ...g];
      merged[field] = [...new Set(all)];
    });
    return merged;
  }

  // ── smartDetect ────────────────────────────────────────────
  // 4-tier column auto-detection with multilingual keyword matching
  function smartDetect(headers, hints, templateMap){
    const map = {};
    const lHeaders = headers.map(h => h.toLowerCase().trim());
    const used = new Set(); // track used headers to avoid double-mapping

    Object.keys(hints).forEach(field => {
      const tplVal = templateMap && templateMap[field]; // e.g. "Shipping fee" from template
      const kws = hints[field] || [];

      // Tier 1: Exact match from template value
      if(tplVal){
        const exactIdx = headers.findIndex(h => h === tplVal && !used.has(h));
        if(exactIdx >= 0){ map[field] = headers[exactIdx]; used.add(headers[exactIdx]); return; }
      }

      // Tier 2: Case-insensitive match from template value
      if(tplVal){
        const tplLower = tplVal.toLowerCase().trim();
        const ciIdx = lHeaders.findIndex((h,i) => h === tplLower && !used.has(headers[i]));
        if(ciIdx >= 0){ map[field] = headers[ciIdx]; used.add(headers[ciIdx]); return; }
      }

      // Tier 3: Exact keyword match from hints (case-insensitive)
      for(const k of kws){
        const idx = lHeaders.findIndex((h,i) => h === k && !used.has(headers[i]));
        if(idx >= 0){ map[field] = headers[idx]; used.add(headers[idx]); return; }
      }

      // Tier 4: Partial/substring match from hints
      for(const k of kws){
        const idx = lHeaders.findIndex((h,i) => h.includes(k) && !used.has(headers[i]));
        if(idx >= 0){ map[field] = headers[idx]; used.add(headers[idx]); return; }
      }
    });

    return map;
  }

  // ── reconcile ──────────────────────────────────────────────
  // Core reconciliation: compare carrier records against Boxme records
  // Returns { results, matched, missing, missingInCarrier }
  function reconcile(cData, bData, carrierMap, boxmeMap, tolFee){
    if(typeof tolFee !== 'number') tolFee = 0.01;
    const n = v => parseFloat(v) || 0;
    const cm = carrierMap, bm = boxmeMap;

    // Build Boxme lookup by tracking
    const bLookup = new Map();
    bData.forEach(row => {
      const tk = String(row[bm.tracking] || '').trim();
      if(tk) bLookup.set(tk, row);
    });

    const results = [];
    let matched = 0, missing = 0;

    for(let i = 0; i < cData.length; i++){
      const cr = cData[i];
      const tk = String(cr[cm.tracking] || '').trim();
      if(!tk) continue;
      const bmNum = cm.bm_number ? String(cr[cm.bm_number] || '').trim() : '';
      const br = bLookup.get(tk) || bLookup.get(bmNum);

      const row = { no: i + 1, tracking: tk, bmNumber: bmNum };

      // Carrier fees — store all individual fees
      FEE_FIELDS.forEach(f => { row['c_' + f] = cm[f] ? n(cr[cm[f]]) : 0; });
      // Total = shipping charges only (no COD)
      let cTotal = 0;
      TOTAL_FEE_FIELDS.forEach(f => { cTotal += row['c_' + f]; });
      row.c_weight = cm.weight ? n(cr[cm.weight]) : 0;
      row.c_total = cTotal;
      row.c_status = cm.status ? String(cr[cm.status] || '') : '';

      // Boxme fees
      if(br){
        matched++;
        FEE_FIELDS.forEach(f => { row['b_' + f] = bm[f] ? n(br[bm[f]]) : 0; });
      } else {
        missing++;
        FEE_FIELDS.forEach(f => { row['b_' + f] = 0; });
      }
      let bTotal = 0;
      TOTAL_FEE_FIELDS.forEach(f => { bTotal += row['b_' + f]; });
      row.b_weight = bm.weight ? n(br ? br[bm.weight] : 0) : 0;
      row.b_total = bTotal;

      // Diffs
      FEE_FIELDS.forEach(f => { row['d_' + f] = row['c_' + f] - row['b_' + f]; });
      row.d_total = cTotal - bTotal;
      row.d_weight = row.c_weight - row.b_weight;

      // Status (round to avoid floating-point noise like 100.01-100.00=0.01000000000005)
      const dTotalRounded = Math.round(row.d_total * 100) / 100;
      if(!br) row.status = 'missing';
      else if(Math.abs(dTotalRounded) <= tolFee) row.status = 'ok';
      else row.status = dTotalRounded > 0 ? 'carrier_over' : 'boxme_over';

      results.push(row);
    }

    // Also find missing in carrier (Boxme records not matched)
    const cTrackings = new Set(results.map(r => r.tracking));
    let missingInCarrier = 0;
    bData.forEach(br => {
      const tk = String(br[bm.tracking] || '').trim();
      if(tk && !cTrackings.has(tk)) missingInCarrier++;
    });

    return { results, matched, missing, missingInCarrier };
  }

  // ── buildExportRow ─────────────────────────────────────────
  // Transform a result row into an export-ready array
  function buildExportRow(row, index, statusLabels){
    const labels = statusLabels || {
      ok: 'OK', carrier_over: 'Carrier Higher', boxme_over: 'Boxme Higher', missing: 'Missing in Boxme'
    };
    return [
      index + 1, row.tracking, row.bmNumber,
      row.c_shipping_fee, row.c_cod_fee, row.c_overweight_fee, row.c_remote_fee,
      row.c_insurance_fee, row.c_return_fee, row.c_other_fees, row.c_total, row.c_weight,
      row.b_shipping_fee, row.b_cod_fee, row.b_overweight_fee, row.b_remote_fee,
      row.b_insurance_fee, row.b_return_fee, row.b_other_fees, row.b_total, row.b_weight,
      row.d_shipping_fee, row.d_cod_fee, row.d_overweight_fee, row.d_remote_fee,
      row.d_insurance_fee, row.d_return_fee, row.d_other_fees, row.d_total, row.d_weight,
      labels[row.status] || row.status
    ];
  }

  // ── Expose ─────────────────────────────────────────────────
  global.AuditCore = {
    FEE_FIELDS,
    TOTAL_FEE_FIELDS,
    mergeHints,
    smartDetect,
    reconcile,
    buildExportRow
  };

})(typeof window !== 'undefined' ? window : globalThis);
