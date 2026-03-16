# Multi-Carrier Shipping Audit Tool — Design Document

## Problem
Boxme cần công cụ so sánh chi phí vận chuyển giữa **hóa đơn hãng vận chuyển (bất kỳ)** và **dữ liệu hệ thống Boxme**. Tool hiện tại (`carrier_audit_tool.html`) hardcoded cho SPX Thailand, không linh hoạt cho nhiều hãng VC.

## Requirements
- **Multi-carrier**: VN (GHN, GHTK, VTP, J&T, Ninja, SPX, Best), TH (Kerry, Flash, J&T, Ninja, SPX), PH (J&T, Ninja, Flash) + Custom
- **2 file upload**: Carrier invoice file + Boxme system file
- **Auto-detect columns**: Keyword-based matching
- **Template save/load**: localStorage + JSON export/import
- **Step-wizard flow**: 5 steps tuần tự
- **ShadCN style**: Neutral colors, clean borders, subtle shadows
- **Mobile-first responsive**
- **Pure HTML + JS** (single file, no build tools)

---

## Proposed Approaches

### Approach A: Enhanced Step-Wizard (⭐ Recommended)

**5-step wizard**, mỗi bước 1 card full-width, mobile-optimized:

```
Step 1: Select Carrier → Chọn hãng VC từ dropdown (grouped by country) + Load template
Step 2: Upload Files → Upload Carrier File + Boxme File (drag & drop, multi-format)
Step 3: Map Columns → Auto-detect + manual adjust, preview data, save template
Step 4: Process → Progress bar + log, chunked processing
Step 5: Results → Summary cards, filter tabs, paginated table, Excel/CSV export
```

**Pros**: Dễ dùng trên mobile, guided flow rõ ràng, người mới không bị lạc
**Cons**: Nhiều bước click

### Approach B: Condensed 3-Step Wizard

Gộp Step 1+2 (Carrier + Upload) và Step 3+4 (Map + Process):

```
Step 1: Setup → Chọn carrier + Upload cả 2 file
Step 2: Configure & Run → Map columns + Start processing
Step 3: Results → Dashboard kết quả
```

**Pros**: Ít bước hơn, nhanh hơn cho người quen
**Cons**: Mỗi step phức tạp hơn, mobile UX kém hơn vì quá nhiều element trên 1 screen

### Approach C: Accordion-Based Single Page

Tất cả sections trên 1 trang, dùng accordion expand/collapse. Mỗi section auto-open khi section trước hoàn thành.

**Pros**: Scroll ngược lại dễ, overview toàn bộ
**Cons**: Dài trên mobile, khó focus

---

## 🏆 Recommendation: Approach A (5-Step Wizard)

Phù hợp nhất vì: mobile-first, guided UX cho team nhiều quốc gia, dễ mở rộng thêm step sau.

---

## Architecture Design

### 1. File Structure (single HTML file)
```
carrier_audit_tool.html
├── <style> — ShadCN-inspired design system
├── <body>
│   ├── Header (app name, template import/export buttons)
│   ├── Step indicator bar (1-2-3-4-5)
│   └── 5 section containers (show/hide)
└── <script>
    ├── STATE — centralized state object
    ├── CARRIERS — carrier registry (VN, TH, PH, Custom)
    ├── COLUMN_HINTS — keyword-based auto-detect per field
    ├── TEMPLATES — localStorage + JSON import/export
    ├── FILE_PARSER — XLSX/CSV parsing with smart header detection
    ├── COLUMN_MAPPER — auto-detect + manual override
    ├── RECONCILIATION_ENGINE — comparison logic
    ├── RENDERER — DOM rendering functions
    └── EXPORT — Excel/CSV download
```

### 2. Carrier Registry
```javascript
const CARRIERS = {
  vietnam: [
    { code: 'GHN', name: 'GHN (Giao Hàng Nhanh)' },
    { code: 'GHTK', name: 'GHTK (Giao Hàng Tiết Kiệm)' },
    { code: 'VTP', name: 'Viettel Post' },
    { code: 'JT_VN', name: 'J&T Express VN' },
    { code: 'NINJA_VN', name: 'Ninja Van VN' },
    { code: 'BEST', name: 'Best Express' },
    { code: 'SPX_VN', name: 'Shopee Express VN' },
  ],
  thailand: [
    { code: 'KERRY', name: 'Kerry Express' },
    { code: 'FLASH', name: 'Flash Express' },
    { code: 'JT_TH', name: 'J&T Express TH' },
    { code: 'NINJA_TH', name: 'Ninja Van TH' },
    { code: 'SPX_TH', name: 'Shopee Express TH' },
  ],
  philippines: [
    { code: 'JT_PH', name: 'J&T Express PH' },
    { code: 'NINJA_PH', name: 'Ninja Van PH' },
    { code: 'FLASH_PH', name: 'Flash Express PH' },
    { code: 'SPX_PH', name: 'Shopee Express PH' },
    { code: 'GRAB_PH', name: 'Grab Express PH' },
  ],
};
// + option "CUSTOM" cho phép nhập tên tùy ý
```

### 3. Column Fields (flexible mapping)
| Field | Label | Type | Required |
|-------|-------|------|----------|
| `tracking` | Carrier Tracking # | string | ✅ |
| `boxme_tracking` | Boxme/BM Number | string | No |
| `weight` | Weight (kg/g) | number | No |
| `shipping_fee` | Shipping Fee | number | No |
| `cod_fee` | COD Fee | number | No |
| `overweight_fee` | Overweight Fee | number | No |
| `remote_fee` | Remote Area Fee | number | No |
| `insurance_fee` | Insurance Fee | number | No |
| `return_fee` | Return Fee | number | No |
| `other_fees` | Other Fees | number | No |
| `status` | Delivery Status | string | No |

### 4. Auto-Detect Column Logic
```javascript
COLUMN_HINTS = {
  tracking: ['tracking', 'tracking_no', 'awb', 'waybill', 'bill_code', 
             'courier tracking', 'ma_van_don', 'เลขพัสดุ'],
  boxme_tracking: ['bm number', 'customer tn', 'boxme', 'bx_tracking'],
  weight: ['weight', 'chargeable weight', 'actual_weight', 'kg', 
           'khoi_luong', 'น้ำหนัก'],
  shipping_fee: ['shipping fee', 'freight', 'delivery_fee', 'cuoc_phi',
                 'ค่าขนส่ง'],
  // ... more hints per field
};
```

### 5. Template System
- **Save**: `localStorage.setItem('carrierTemplates', JSON.stringify(templates))`
- **Export**: Download as `carrier_templates.json`
- **Import**: Upload JSON file → merge into localStorage
- **Auto-load**: Khi chọn carrier, nếu có template → tự động fill mapping

### 6. Reconciliation Engine
```
For each Carrier row:
  1. Match with Boxme row by tracking number (exact match)
  2. Compare: shipping_fee, cod_fee, overweight_fee, remote_fee, etc.
  3. Calculate diff for each fee type
  4. Status: OK | CARRIER_OVER | BOXME_OVER | MISSING_IN_BOXME | MISSING_IN_CARRIER
  5. Apply tolerance thresholds
```

### 7. ShadCN Design System (CSS Variables)
```css
:root {
  --background: #ffffff;
  --foreground: #0a0a0a;
  --card: #ffffff;
  --card-foreground: #0a0a0a;
  --primary: #171717;
  --primary-foreground: #fafafa;
  --secondary: #f5f5f5;
  --muted: #f5f5f5;
  --muted-foreground: #737373;
  --border: #e5e5e5;
  --ring: #171717;
  --radius: 0.5rem;
  /* Status colors */
  --success: #22c55e;
  --danger: #ef4444;
  --warning: #f59e0b;
}
```
Neutral, professional. Không dùng gradient sặc sỡ. Focus vào typography, spacing, border.

### 8. Mobile Optimizations
- Touch-friendly: min 44px tap targets
- Upload zone: full-width, large tap area
- Table: horizontal scroll with sticky first column
- Step dots: scrollable on narrow screens
- Pagination: large buttons
- Cards: edge-to-edge on mobile (16px padding)

---

## Step-by-Step UX Flow

### Step 1 — Select Carrier
- Dropdown grouped by country (Vietnam / Thailand / Philippines)
- Option "Other / Custom" → text input for carrier name  
- If template exists → badge "Template saved Mar 10'26"
- Button: `Continue →`

### Step 2 — Upload Files
- **Card 1**: Carrier Invoice File (drag/drop or tap)
  - Sheet selector (if Excel has multiple sheets)
  - Smart header row detection (scan first 25 rows)
- **Card 2**: Boxme File (drag/drop or tap)
  - Same sheet selector + header detection
- File badges with size, sheet count
- Button: `Continue to Column Mapping →`

### Step 3 — Map Columns & Settings
- **Carrier columns**: auto-detected, dropdowns to override
- **Boxme columns**: auto-detected (tracking, weight, fee)
- **Tolerance settings**: fee tolerance, weight tolerance
- **Template actions**: Save Template / Load Template
- Data preview: first 3 rows in mini-table
- Button: `▶ Start Reconciliation`

### Step 4 — Processing
- Progress bar with percentage
- Log box (terminal-style)
- Auto-advance to Step 5 when complete

### Step 5 — Results
- **Summary cards**: Total, Matched, Carrier Over, Boxme Over, Missing
- **Filter tabs**: All / Differences / Carrier Over / Boxme Over / OK
- **Results table**: paginated (50/page), horizontal scroll
  - Grouped headers: Carrier Data | Boxme Data | Differences | Status
  - Highlighted diff cells
- **Export buttons**: Full Report (.xlsx), Differences Only (.csv)
- **Start New Comparison** button

---

## Verification Plan

### Browser Testing (automated via browser tool)
1. Open tool in browser
2. Verify step-wizard navigation (1→2→3→4→5, back navigation)
3. Test carrier dropdown with grouped options
4. Test responsive layout at mobile (375px) + desktop (1280px)
5. Verify template save/load to localStorage

### Manual Testing by User
1. Upload real ACC + BMS Excel files from team
2. Verify auto-detect column accuracy
3. Check reconciliation results against manual Excel comparison
4. Test export files open correctly in Excel
