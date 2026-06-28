import { useEffect, useState, useCallback } from 'react';

/**
 * useDialect — global English-pronunciation preference shared across the LMS.
 *
 * Single source of truth for "US vs UK" anywhere in the app. Persisted in
 * localStorage so it survives reloads, syncs across tabs via the storage
 * event, and can be overridden once via a URL query param (?d=us|uk or
 * ?dialect=AmE|RP) on the FIRST visit to any LMS page.
 *
 *   const { dialect, setDialect, isUS, isUK } = useDialect();
 *   //  dialect ∈ { 'AmE', 'RP' }
 */

const STORAGE_KEY = 'vf.lms.dialect';
const VALID = ['AmE', 'RP'];
const EVENT = 'vf:dialect-change';

const normalise = (raw) => {
  const s = String(raw || '').trim().toLowerCase();
  if (s === 'us' || s === 'ame' || s === 'en-us' || s === 'american') return 'AmE';
  if (s === 'uk' || s === 'rp'  || s === 'en-gb' || s === 'british')  return 'RP';
  return null;
};

const readInitial = () => {
  // URL param wins on the very first read of the session
  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = normalise(params.get('d') || params.get('dialect'));
    if (fromUrl) {
      window.localStorage.setItem(STORAGE_KEY, fromUrl);
      return fromUrl;
    }
  } catch (_) { /* ignore */ }
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (VALID.includes(stored)) return stored;
  } catch (_) { /* ignore */ }
  return 'AmE'; // safe default — matches existing PhonemeCardPage behaviour
};

export const useDialect = () => {
  const [dialect, _setDialect] = useState(() => {
    if (typeof window === 'undefined') return 'AmE';
    return readInitial();
  });

  // Cross-tab + same-page sync via a shared CustomEvent.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY && VALID.includes(e.newValue)) _setDialect(e.newValue);
    };
    const onCustom = (e) => {
      if (e.detail && VALID.includes(e.detail)) _setDialect(e.detail);
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(EVENT, onCustom);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(EVENT, onCustom);
    };
  }, []);

  const setDialect = useCallback((next) => {
    const v = VALID.includes(next) ? next : normalise(next);
    if (!v) return;
    try { window.localStorage.setItem(STORAGE_KEY, v); } catch (_) { /* ignore */ }
    window.dispatchEvent(new CustomEvent(EVENT, { detail: v }));
    _setDialect(v);
  }, []);

  return {
    dialect,
    setDialect,
    isUS: dialect === 'AmE',
    isUK: dialect === 'RP',
    /** Toggle the value (US ⇄ UK). */
    toggle: () => setDialect(dialect === 'AmE' ? 'RP' : 'AmE'),
  };
};

export default useDialect;
