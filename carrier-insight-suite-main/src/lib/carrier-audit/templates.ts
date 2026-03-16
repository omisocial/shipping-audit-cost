import type { CarrierTemplate } from './types';

const STORAGE_KEY = 'carrierTemplates';

export function loadTemplates(): Record<string, CarrierTemplate> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

export function saveTemplates(templates: Record<string, CarrierTemplate>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch (e) {
    console.error('Failed to save templates:', e);
  }
}

export function exportTemplatesAsJson(templates: Record<string, CarrierTemplate>) {
  const data = JSON.stringify(templates, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  downloadBlob(blob, 'carrier_templates.json');
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
