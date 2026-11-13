// Language switch: the head wiring, emitted from baked configuration.
//
// Same shape as cookie consent (consent.mjs). `platform/language.json` is
// written by the platform at publish from the dealer's language settings. A
// dealer with no such file — or with `enabled: false` — gets nothing from this
// module, and their build is byte-identical to one made before it existed.
//
// Nothing is translated on the server. With the plugin on, the page carries one
// script (client/language.js) that puts an "English | Español" switch in the
// header, next to the nav. Choosing a language stores a `googtrans` cookie and
// hands the page to Google's in-browser translator; nothing is requested from
// Google until a visitor does that, or arrives holding the cookie.

import { json } from './analytics-bootstrap.mjs';

/** Labels a visitor reads. They are never translated, so a visitor who landed in the wrong language can still find the way back. */
export const LANGUAGE_LABELS = { en: 'English', es: 'Español' };

const DEFAULT_LANGUAGES = ['en', 'es'];
const isCode = (c) => typeof c === 'string' && /^[a-z]{2,3}(-[a-z0-9]{2,8})?$/.test(c);

/**
 * The dealer's language settings, or null when the plugin is off.
 *
 * English is the page's own language, so it is always first: without it a
 * visitor in Spanish would have no way back. A code that is not a plain
 * language tag is dropped, because it ends up in a cookie value and a script.
 */
export function languageConfig(config) {
  const raw = config?.platformLanguage;
  if (!raw || typeof raw !== 'object' || raw.enabled === false) return null;
  const named = Array.isArray(raw.languages) ? raw.languages : DEFAULT_LANGUAGES;
  const languages = ['en'];
  for (const c of named.map((x) => String(x).trim().toLowerCase())) {
    if (isCode(c) && !languages.includes(c)) languages.push(c);
  }
  return { languages, labels: Object.fromEntries(languages.map((c) => [c, LANGUAGE_LABELS[c] || c.toUpperCase()])) };
}

/**
 * This dealer's configuration followed by the client code, as bare JavaScript,
 * or '' with the plugin off. The build publishes it as `scripts/language.js`
 * for brand pages and `partials/language.js` for the storefront's `/store/*`
 * pages, so both run the same switch and share the one cookie.
 */
export function languageScript(config, clientSource) {
  const language = languageConfig(config);
  if (!language) return '';
  return `window.bzLanguage=${json(language)};\n${clientSource}`;
}

/** The brand-page script tag, or '' with the plugin off. */
export function languageTag(config) {
  return languageConfig(config) ? '\n<script src="/scripts/language.js" defer></script>' : '';
}
