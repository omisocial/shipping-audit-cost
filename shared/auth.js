/**
 * Boxme Micro Tools — Auth Module
 * ================================
 * Simple client-side authentication for internal tool protection.
 * Uses sessionStorage for session persistence (clears on browser close).
 * No DOM access — all functions are pure and testable.
 */
(function(global) {
  'use strict';

  const VALID_USERNAME = 'Automation';
  const VALID_PASSWORD = '@1m!nd';
  const SESSION_KEY = 'micro_tools_authenticated';

  /**
   * Validate user credentials
   * @param {string} username
   * @param {string} password
   * @returns {boolean}
   */
  function validateCredentials(username, password) {
    if (!username || !password) return false;
    return username === VALID_USERNAME && password === VALID_PASSWORD;
  }

  /**
   * Set authenticated session
   */
  function setSession() {
    try {
      global.sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ts: Date.now(), user: VALID_USERNAME }));
    } catch (e) { /* storage not available */ }
  }

  /**
   * Check if user is authenticated
   * @returns {boolean}
   */
  function isAuthenticated() {
    try {
      const val = global.sessionStorage.getItem(SESSION_KEY);
      if (!val) return false;
      const data = JSON.parse(val);
      return !!data && !!data.user;
    } catch (e) { return false; }
  }

  /**
   * Clear authentication session
   */
  function logout() {
    try {
      global.sessionStorage.removeItem(SESSION_KEY);
    } catch (e) { /* storage not available */ }
  }

  /**
   * Compute base path from current page to root.
   * tools/carrier-audit/index.html → ../../
   * portal.html → ./
   */
  function getBasePath() {
    try {
      const path = global.location.pathname;
      if (path.includes('/tools/')) {
        // Count depth: /tools/<name>/ = 2 levels deep
        return '../../';
      }
      return './';
    } catch (e) { return './'; }
  }

  /**
   * Redirect to login page if not authenticated.
   * Call at the top of every protected page.
   */
  function requireAuth() {
    if (!isAuthenticated()) {
      try {
        const base = getBasePath();
        global.location.replace(base + 'index.html');
      } catch (e) { /* no location object (test env) */ }
      return false;
    }
    return true;
  }

  global.MicroAuth = {
    validateCredentials,
    setSession,
    isAuthenticated,
    logout,
    requireAuth,
    getBasePath,
    SESSION_KEY
  };

})(typeof window !== 'undefined' ? window : globalThis);
