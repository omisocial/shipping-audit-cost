/**
 * Unit tests for shared/auth.js
 * Tests: credential validation, session lifecycle, edge cases
 */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';

let MicroAuth;

beforeAll(() => {
  // Mock sessionStorage for Node.js environment
  const store = {};
  globalThis.sessionStorage = {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
  };
  // Mock location
  globalThis.location = { pathname: '/', replace: () => {}, href: '' };

  require('../../shared/auth.js');
  MicroAuth = globalThis.MicroAuth;
});

beforeEach(() => {
  // Clear session before each test
  globalThis.sessionStorage.clear();
});

// ── validateCredentials ──────────────────────────────────────────────────────
describe('validateCredentials', () => {
  it('returns true for correct credentials', () => {
    expect(MicroAuth.validateCredentials('Automation', '@1m!nd')).toBe(true);
  });

  it('returns false for wrong username', () => {
    expect(MicroAuth.validateCredentials('admin', '@1m!nd')).toBe(false);
  });

  it('returns false for wrong password', () => {
    expect(MicroAuth.validateCredentials('Automation', 'wrongpass')).toBe(false);
  });

  it('returns false for empty username', () => {
    expect(MicroAuth.validateCredentials('', '@1m!nd')).toBe(false);
  });

  it('returns false for empty password', () => {
    expect(MicroAuth.validateCredentials('Automation', '')).toBe(false);
  });

  it('returns false for null/undefined inputs', () => {
    expect(MicroAuth.validateCredentials(null, '@1m!nd')).toBe(false);
    expect(MicroAuth.validateCredentials('Automation', undefined)).toBe(false);
    expect(MicroAuth.validateCredentials(null, null)).toBe(false);
  });

  it('is case-sensitive for username', () => {
    expect(MicroAuth.validateCredentials('automation', '@1m!nd')).toBe(false);
    expect(MicroAuth.validateCredentials('AUTOMATION', '@1m!nd')).toBe(false);
  });

  it('is case-sensitive for password', () => {
    expect(MicroAuth.validateCredentials('Automation', '@1M!ND')).toBe(false);
  });
});

// ── Session lifecycle ────────────────────────────────────────────────────────
describe('session lifecycle', () => {
  it('is not authenticated by default', () => {
    expect(MicroAuth.isAuthenticated()).toBe(false);
  });

  it('becomes authenticated after setSession', () => {
    MicroAuth.setSession();
    expect(MicroAuth.isAuthenticated()).toBe(true);
  });

  it('becomes unauthenticated after logout', () => {
    MicroAuth.setSession();
    expect(MicroAuth.isAuthenticated()).toBe(true);
    MicroAuth.logout();
    expect(MicroAuth.isAuthenticated()).toBe(false);
  });

  it('stores session data as JSON with timestamp', () => {
    MicroAuth.setSession();
    const raw = globalThis.sessionStorage.getItem(MicroAuth.SESSION_KEY);
    const data = JSON.parse(raw);
    expect(data.user).toBe('Automation');
    expect(typeof data.ts).toBe('number');
  });

  it('handles corrupted session data gracefully', () => {
    globalThis.sessionStorage.setItem(MicroAuth.SESSION_KEY, 'not-valid-json');
    expect(MicroAuth.isAuthenticated()).toBe(false);
  });

  it('handles empty session value', () => {
    globalThis.sessionStorage.setItem(MicroAuth.SESSION_KEY, '');
    expect(MicroAuth.isAuthenticated()).toBe(false);
  });
});

// ── getBasePath ──────────────────────────────────────────────────────────────
describe('getBasePath', () => {
  it('returns ./ for root-level pages', () => {
    globalThis.location.pathname = '/portal.html';
    expect(MicroAuth.getBasePath()).toBe('./');
  });

  it('returns ../../ for tool pages', () => {
    globalThis.location.pathname = '/tools/carrier-audit/index.html';
    expect(MicroAuth.getBasePath()).toBe('../../');
  });

  it('returns ./ for index.html', () => {
    globalThis.location.pathname = '/index.html';
    expect(MicroAuth.getBasePath()).toBe('./');
  });
});

// ── requireAuth ──────────────────────────────────────────────────────────────
describe('requireAuth', () => {
  it('returns true when authenticated', () => {
    MicroAuth.setSession();
    expect(MicroAuth.requireAuth()).toBe(true);
  });

  it('returns false when not authenticated', () => {
    expect(MicroAuth.requireAuth()).toBe(false);
  });

  it('calls location.replace when not authenticated', () => {
    let redirectUrl = null;
    globalThis.location.replace = (url) => { redirectUrl = url; };
    globalThis.location.pathname = '/portal.html';
    MicroAuth.requireAuth();
    expect(redirectUrl).toBe('./index.html');
  });

  it('redirects to correct path from tool page', () => {
    let redirectUrl = null;
    globalThis.location.replace = (url) => { redirectUrl = url; };
    globalThis.location.pathname = '/tools/carrier-audit/index.html';
    MicroAuth.requireAuth();
    expect(redirectUrl).toBe('../../index.html');
  });
});
