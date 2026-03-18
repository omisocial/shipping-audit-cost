// ══════════════════════════════════════════════════════════════════
// NVL Forecast Tool v2.0 — Export Module
// Supports: Pending PO qty, Demand Factor, Seasonal Ratio Lift, Adjusted Demand
// ══════════════════════════════════════════════════════════════════

// Standard aging bucket names matching the system template (Inventory-Aging-Report)
const AGING_EXPORT_BUCKETS = [
  '< 15 days', '15 to 30 days', '30 to 45 days', '45 to 60 days',
  '60 to 75 days', '75 to 90 days', '> 90 days'
];

/**
 * Look up an aging bucket value from the row's agingBuckets data.
 * Handles fuzzy matching for bucket names (e.g. "< 15 days" vs "<15 days").
 */
function getAgingBucketValue(agingBuckets, bucketName) {
  if (!agingBuckets || typeof agingBuckets !== 'object') return 0;
  // Exact match first
  if (agingBuckets[bucketName] !== undefined) return parseFloat(agingBuckets[bucketName]) || 0;
  // Normalize: strip spaces and lowercase for fuzzy match
  const norm = s => String(s).replace(/\s+/g, '').toLowerCase();
  const target = norm(bucketName);
  for (const [key, val] of Object.entries(agingBuckets)) {
    if (norm(key) === target) return parseFloat(val) || 0;
  }
  return 0;
}

function exportExcel() {
  const data = state.filteredResults || [];
  if (!data.length) return;
  const now = new Date();
  const month = (now.getMonth() + 1).toString().padStart(2, '0') + '/' + now.getFullYear();
  const cols = t('exportCols');

  const rows = [
    // Header rows
    [t('exportCompany')],
    [t('exportTitle', { month })],
    [],
    cols
  ];

  // Group by warehouse dynamically (sorted alphabetically)
  const warehouses = [...new Set(data.map(r => r.kho))].sort();
  warehouses.forEach(kho => {
    data.filter(r => r.kho === kho && r.qtyBatch > 0).forEach(r => {
      rows.push([
        '', // PO No
        r.kho,
        '', // Supplier
        r.sku,
        r.name,
        r.qtyBatch, // Batch
        r.quyCach, // Pack size
        r.donVi, // Unit
        r.slNhap, // Import qty
        r.donGia, // Unit price
        r.donGia * r.slNhap * r.quyCach, // Amount -VAT
        state.vat + '%', // VAT
        r.thanhTien, // Amount +VAT
        r.demand, // Demand
        r.ratioLift || 1.0, // Ratio Lift (Seasonal)
        r.doiTargetDays || state.doiTarget, // Target Days (per SKU DOI target)
        Math.round(r.adjustedDemand || r.demand), // Adjusted Demand
        r.it, // IT
        r.pendingQty || 0, // Pending PO Qty
        r.agingTotal, // Aging Total (from Aging Report)
        ...AGING_EXPORT_BUCKETS.map(b => getAgingBucketValue(r.agingBuckets, b)), // 7 aging bucket columns
        r.stock, // Inventory
        r.doiAfter, // DOI
        r.outbound25, // 25d outbound
        r.doiAfter < 20 ? '⚠️ Urgent' : '', // Notes
      ]);
    });
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Styling - column widths
  ws['!cols'] = cols.map((_, i) => ({ wch: i === 4 ? 30 : i === 3 ? 18 : 14 }));

  // Merge company name row
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'PO');

  const filename = `PO_${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}.xlsx`;
  XLSX.writeFile(wb, filename);
  toast(t('toastExported'), 'success');
}

function printReport() {
  window.print();
}
