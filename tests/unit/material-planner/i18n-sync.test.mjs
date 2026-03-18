/**
 * ══════════════════════════════════════════════════════════════════
 * Material Planner — Layer 3: i18n Synchronization Tests
 * Ensures all language files have identical key structure
 * ══════════════════════════════════════════════════════════════════
 */
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';

const I18N_FILE = path.resolve(__dirname, '../../../tools/material-planner/js/i18n.js');

// Extract the translations object from i18n.js by evaluating it
let translations;

beforeAll(() => {
  const content = fs.readFileSync(I18N_FILE, 'utf-8');
  // Extract the translations object using a regex match
  const match = content.match(/const\s+translations\s*=\s*(\{[\s\S]*?\n\});\s*\n/);
  if (match) {
    translations = new Function(`return ${match[1]}`)();
  }
});

/**
 * Recursively collect all keys from a nested object
 * Returns sorted flat key paths (dot-separated)
 */
function collectKeys(obj, prefix = '') {
  const keys = [];
  for (const k of Object.keys(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
      keys.push(...collectKeys(obj[k], path));
    } else {
      keys.push(path);
    }
  }
  return keys.sort();
}

describe('i18n Key Synchronization', () => {
  it('translations object loads correctly', () => {
    expect(translations).toBeDefined();
    expect(translations).toHaveProperty('vi');
    expect(translations).toHaveProperty('en');
    expect(translations).toHaveProperty('th');
  });

  it('vi and en have identical key counts', () => {
    const viKeys = collectKeys(translations.vi);
    const enKeys = collectKeys(translations.en);
    expect(viKeys.length).toBe(enKeys.length);
  });

  it('vi and th have identical key counts', () => {
    const viKeys = collectKeys(translations.vi);
    const thKeys = collectKeys(translations.th);
    expect(viKeys.length).toBe(thKeys.length);
  });

  it('vi and en have identical key names', () => {
    const viKeys = collectKeys(translations.vi);
    const enKeys = collectKeys(translations.en);
    const missingInEn = viKeys.filter(k => !enKeys.includes(k));
    const extraInEn = enKeys.filter(k => !viKeys.includes(k));

    if (missingInEn.length || extraInEn.length) {
      const msg = [
        missingInEn.length ? `Missing in EN: ${missingInEn.join(', ')}` : '',
        extraInEn.length ? `Extra in EN: ${extraInEn.join(', ')}` : '',
      ].filter(Boolean).join('\n');
      expect.fail(msg);
    }
  });

  it('vi and th have identical key names', () => {
    const viKeys = collectKeys(translations.vi);
    const thKeys = collectKeys(translations.th);
    const missingInTh = viKeys.filter(k => !thKeys.includes(k));
    const extraInTh = thKeys.filter(k => !viKeys.includes(k));

    if (missingInTh.length || extraInTh.length) {
      const msg = [
        missingInTh.length ? `Missing in TH: ${missingInTh.join(', ')}` : '',
        extraInTh.length ? `Extra in TH: ${extraInTh.join(', ')}` : '',
      ].filter(Boolean).join('\n');
      expect.fail(msg);
    }
  });
});

describe('i18n Critical Keys Exist', () => {
  const REQUIRED_KEYS = [
    // New keys from formula fix
    'thTargetDays',
    'tipTargetDays',
    'toastDaysChanged',
    // Core UI keys
    'appTitle', 'btnCalculate', 'btnExportExcel',
    'thKho', 'thDOI', 'thIT', 'thBatch', 'thInsight',
    'thRatioLift', 'thInventory', 'thDemand',
    // Export columns
    'exportCols',
  ];

  const LANGUAGES = ['vi', 'en', 'th'];

  LANGUAGES.forEach(lang => {
    REQUIRED_KEYS.forEach(key => {
      it(`${lang}.${key} exists and is non-empty`, () => {
        const val = translations[lang][key];
        expect(val, `${lang}.${key} is missing`).toBeDefined();
        if (typeof val === 'string') {
          expect(val.length, `${lang}.${key} is empty string`).toBeGreaterThan(0);
        }
      });
    });
  });
});

describe('i18n Deprecated Keys Removed', () => {
  const DEPRECATED_KEYS = [
    'thFactor',         // Replaced by thTargetDays
    'tipFactor',        // Replaced by tipTargetDays
    'toastFactorChanged', // Replaced by toastDaysChanged
  ];

  const LANGUAGES = ['vi', 'en', 'th'];

  LANGUAGES.forEach(lang => {
    DEPRECATED_KEYS.forEach(key => {
      it(`${lang} does not have deprecated key '${key}'`, () => {
        expect(translations[lang]).not.toHaveProperty(key);
      });
    });
  });
});

describe('i18n Export Columns Consistency', () => {
  it('All languages have exactly 31 export columns', () => {
    ['vi', 'en', 'th'].forEach(lang => {
      const cols = translations[lang].exportCols;
      expect(Array.isArray(cols), `${lang}.exportCols should be an array`).toBe(true);
      expect(cols.length, `${lang}.exportCols should have 31 columns, has ${cols.length}`).toBe(31);
    });
  });

  it('Column 16 (idx 15) is Target Days, not Demand Factor', () => {
    expect(translations.vi.exportCols[15]).toBe('Số ngày mục tiêu');
    expect(translations.en.exportCols[15]).toBe('Target Days');
  });

  it('Column 20 (idx 19) is Aging Total, not Pending Inventory', () => {
    expect(translations.vi.exportCols[19]).toBe('Aging Total');
    expect(translations.en.exportCols[19]).toBe('Aging Total');
    expect(translations.th.exportCols[19]).toBe('Aging Total');
  });
});
