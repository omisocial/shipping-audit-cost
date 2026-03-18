/**
 * ══════════════════════════════════════════════════════════════════
 * Material Planner — Layer 1: Frontend Safety Tests
 * Prevents white screens and syntax catastrophes in browser JS
 * ══════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const JS_DIR = path.resolve(__dirname, '../../../tools/material-planner/js');
const HTML_DIR = path.resolve(__dirname, '../../../tools/material-planner');

// All JS files in the material-planner module
const JS_FILES = [
  'app.js', 'calc-engine.js', 'chart-renderer.js', 'column-detector.js',
  'export.js', 'file-parser.js', 'i18n.js', 'onboarding.js',
  'seasonal-ratio.js', 'table-renderer.js', 'template-generator.js', 'tooltips.js',
];

describe('Frontend Safety — JS Files Parse Without Error', () => {
  JS_FILES.forEach(file => {
    it(`${file} has valid JavaScript syntax`, () => {
      const content = fs.readFileSync(path.join(JS_DIR, file), 'utf-8');
      // Attempt to parse with Function constructor — catches SyntaxErrors
      expect(() => new Function(content)).not.toThrow();
    });
  });
});

describe('Frontend Safety — Template Literal Integrity', () => {
  JS_FILES.forEach(file => {
    const content = fs.readFileSync(path.join(JS_DIR, file), 'utf-8');

    it(`${file}: no single-quote wrapping template literals`, () => {
      // Bug pattern: = '...\${t(...' → should use backtick, not single quote
      expect(content).not.toMatch(/=\s*'[^']*\$\{t\(/);
    });

    it(`${file}: no mismatched t() delimiters`, () => {
      // Bug pattern: t('key`) or t(\`key')
      expect(content).not.toMatch(/t\('[^']*`/);
      expect(content).not.toMatch(/t\(`[^`]*'\)/);
    });
  });
});

describe('Frontend Safety — HTML Structural Integrity', () => {
  const htmlFiles = ['index.html', 'guide.html'].filter(f =>
    fs.existsSync(path.join(HTML_DIR, f))
  );

  htmlFiles.forEach(file => {
    const content = fs.readFileSync(path.join(HTML_DIR, file), 'utf-8');

    it(`${file}: no broken HTML open tags (e.g. "< div")`, () => {
      expect(content).not.toMatch(/<\s+[a-zA-Z]/);
    });

    it(`${file}: no broken HTML close tags (e.g. "</ div")`, () => {
      expect(content).not.toMatch(/<\/\s+[a-zA-Z]/);
    });

    it(`${file}: has DOCTYPE declaration`, () => {
      expect(content.trim().toLowerCase()).toMatch(/^<!doctype html>/);
    });

    it(`${file}: has matching <html> and </html>`, () => {
      expect(content).toMatch(/<html[\s>]/);
      expect(content).toMatch(/<\/html>/);
    });

    it(`${file}: has <head> and <body>`, () => {
      expect(content).toMatch(/<head[\s>]/);
      expect(content).toMatch(/<body[\s>]/);
    });
  });
});

describe('Frontend Safety — No Orphaned Function References', () => {
  it('calc-engine.js: onDaysChange function exists (replaces old onFactorChange)', () => {
    const content = fs.readFileSync(path.join(JS_DIR, 'calc-engine.js'), 'utf-8');
    expect(content).toMatch(/function\s+onDaysChange/);
    // The old function should NOT exist anymore
    expect(content).not.toMatch(/function\s+onFactorChange/);
  });

  it('table-renderer.js: calls onDaysChange (not onFactorChange)', () => {
    const content = fs.readFileSync(path.join(JS_DIR, 'table-renderer.js'), 'utf-8');
    expect(content).toMatch(/onDaysChange/);
    expect(content).not.toMatch(/onFactorChange/);
  });

  it('calc-engine.js: uses doiTargetDays (not demandFactor)', () => {
    const content = fs.readFileSync(path.join(JS_DIR, 'calc-engine.js'), 'utf-8');
    expect(content).toMatch(/doiTargetDays/);
    // demandFactor should not appear as a variable declaration or assignment
    expect(content).not.toMatch(/const\s+demandFactor\b/);
    expect(content).not.toMatch(/r\.demandFactor/);
    expect(content).not.toMatch(/row\.demandFactor/);
  });

  it('calc-engine.js: uses agingTotal (not pendingInv)', () => {
    const content = fs.readFileSync(path.join(JS_DIR, 'calc-engine.js'), 'utf-8');
    expect(content).toMatch(/agingTotal/);
    expect(content).not.toMatch(/\bpendingInv\b/);
  });

  it('export.js: uses agingTotal (not pendingInv)', () => {
    const content = fs.readFileSync(path.join(JS_DIR, 'export.js'), 'utf-8');
    expect(content).toMatch(/agingTotal/);
    expect(content).not.toMatch(/\bpendingInv\b/);
  });
});
