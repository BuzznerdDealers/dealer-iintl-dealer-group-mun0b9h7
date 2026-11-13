/* Language switch plugin. Zero dependencies.
 *
 * `window.bzLanguage` is defined just above this file by the build
 * (renderer/language.mjs): { languages: ['en','es'], labels: { en: 'English', ... } }.
 * A dealer without the plugin never loads this file.
 *
 * Translation happens in the browser, by Google's translator, the way the GTranslate
 * plugin does it. Nothing is translated or stored on the server. The choice is one
 * cookie, `googtrans=/en/<code>`, which is also what the translator reads — so
 * setting it before the script loads is enough for the page to translate on arrival.
 *
 * Two rules matter more than the rest:
 *  - Nothing is requested from Google until a visitor has picked a language other
 *    than English, or arrives holding the cookie from an earlier visit.
 *  - The storefront is served under /<prefix> on the same host, so the one
 *    host-wide cookie keeps both halves of the site in the same language.
 *
 * Platform-owned: this file is not in the editor's writable path set. */
(function () {
  'use strict';

  var CONFIG = window.bzLanguage;
  if (!CONFIG || !CONFIG.languages || CONFIG.languages.length < 2) return;
  var CODES = CONFIG.languages;

  var STYLE =
    '.bz-lang{display:inline-flex;align-items:center;gap:var(--space-2,.5rem);font-size:var(--text-small,.875rem);margin-inline-start:var(--space-4,1rem);white-space:nowrap}' +
    '.bz-lang-host{display:flex!important;flex-direction:row!important;flex-wrap:wrap;align-items:center;justify-content:center}' +
    '.bz-lang-host>.bz-block{flex:0 1 auto}' +
    '.bz-lang--fixed{position:fixed;top:.5rem;right:.5rem;z-index:2147483000;background:var(--card,#fff);padding:.25rem .5rem;border-radius:.375rem;box-shadow:0 1px 4px rgba(0,0,0,.2);margin:0}' +
    '.bz-lang__b{background:none;border:0;padding:.25rem .375rem;font:inherit;color:inherit;cursor:pointer;opacity:.7}' +
    '.bz-lang__b:hover,.bz-lang__b:focus-visible{opacity:1;text-decoration:underline}' +
    '.bz-lang__b[aria-pressed="true"]{opacity:1;font-weight:700}' +
    '.bz-lang__sep{opacity:.4}' +
    /* Google's own toolbar, banner and hover balloons: the switch is the only control. */
    'body{top:0!important}' +
    '.skiptranslate>iframe,iframe.goog-te-banner-frame,#goog-gt-tt,.goog-te-balloon-frame,.goog-tooltip,.goog-te-spinner-pos{display:none!important;visibility:hidden!important}' +
    '.goog-text-highlight{background:none!important;box-shadow:none!important}' +
    '#bz-google-translate{display:none}';

  /* ----------------------------------------------------------------- cookie */

  function readLanguage() {
    var match = document.cookie.match(/(?:^|;\s*)googtrans=([^;]*)/);
    var value = match ? decodeURIComponent(match[1]) : '';
    var parts = /^\/([a-z-]+)\/([a-z-]+)$/i.exec(value);
    var code = parts ? parts[2].toLowerCase() : 'en';
    return CODES.indexOf(code) > -1 ? code : 'en';
  }

  function writeLanguage(code) {
    var clear = code === 'en';
    var value = clear ? '' : '/en/' + code;
    var host = location.hostname;
    var parts = host.split('.');
    // Google writes this cookie on the host and on the parent domain, so a cleared
    // choice has to be cleared on both or the page snaps back to Spanish on reload.
    var domains = [null];
    if (clear) {
      domains.push(host);
      if (parts.length > 2) domains.push('.' + parts.slice(-2).join('.'));
    }
    domains.forEach(function (domain) {
      document.cookie =
        'googtrans=' + encodeURIComponent(value) +
        '; path=/; SameSite=Lax' +
        (clear ? '; expires=Thu, 01 Jan 1970 00:00:00 GMT' : '; max-age=31536000') +
        (location.protocol === 'https:' ? '; Secure' : '') +
        (domain ? '; domain=' + domain : '');
    });
  }

  /* -------------------------------------------------------------- translator */

  var translatorRequested = false;

  /** Load Google's translator once. With the cookie already set it translates the page itself. */
  function startTranslator() {
    if (translatorRequested) return;
    translatorRequested = true;
    var holder = document.createElement('div');
    holder.id = 'bz-google-translate';
    holder.setAttribute('translate', 'no');
    document.body.appendChild(holder);
    window.bzGoogleTranslateInit = function () {
      if (!window.google || !window.google.translate) return;
      new window.google.translate.TranslateElement(
        { pageLanguage: 'en', includedLanguages: CODES.join(','), autoDisplay: false },
        'bz-google-translate',
      );
    };
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://translate.google.com/translate_a/element.js?cb=bzGoogleTranslateInit';
    document.head.appendChild(script);
  }

  /* ------------------------------------------------------------------ switch */

  function build() {
    var wrap = document.createElement('div');
    wrap.className = 'bz-lang notranslate';
    wrap.setAttribute('translate', 'no');
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', 'Language');
    wrap.setAttribute('data-bz-language', '');
    CODES.forEach(function (code, i) {
      if (i) {
        var sep = document.createElement('span');
        sep.className = 'bz-lang__sep';
        sep.setAttribute('aria-hidden', 'true');
        sep.textContent = '|';
        wrap.appendChild(sep);
      }
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'bz-lang__b';
      b.setAttribute('data-bz-lang', code);
      b.setAttribute('lang', code);
      b.textContent = (CONFIG.labels && CONFIG.labels[code]) || code.toUpperCase();
      wrap.appendChild(b);
    });
    return wrap;
  }

  /** In the header, next to the nav. A page with no nav gets a small fixed control instead. */
  function place(wrap) {
    var navs = document.querySelectorAll('.bz-menu-wrap, nav');
    var nav = null;
    Array.prototype.forEach.call(navs, function (n) {
      if (!nav && !n.closest('main, footer')) nav = n;
    });
    if (nav) {
      var anchor = nav.closest('.bz-block') || nav;
      // The nav's column becomes a row, so the switch sits beside the nav, not under it.
      anchor.parentNode.classList.add('bz-lang-host');
      anchor.parentNode.insertBefore(wrap, anchor.nextSibling);
      return;
    }
    var header = document.querySelector('header');
    if (header) {
      header.appendChild(wrap);
      return;
    }
    wrap.className += ' bz-lang--fixed';
    document.body.appendChild(wrap);
  }

  function init() {
    if (document.querySelector('[data-bz-language]')) return;
    var style = document.createElement('style');
    style.setAttribute('data-bz-language-style', '');
    style.textContent = STYLE;
    document.head.appendChild(style);

    var wrap = build();
    place(wrap);

    var current = readLanguage();
    // A returning visitor keeps their language: translate straight away.
    if (current !== 'en') startTranslator();

    function mark() {
      Array.prototype.forEach.call(wrap.querySelectorAll('[data-bz-lang]'), function (b) {
        b.setAttribute('aria-pressed', String(b.getAttribute('data-bz-lang') === current));
      });
    }
    mark();

    wrap.addEventListener('click', function (event) {
      var button = event.target.closest ? event.target.closest('[data-bz-lang]') : null;
      if (!button) return;
      var next = button.getAttribute('data-bz-lang');
      if (next === current) return;
      var wasTranslated = current !== 'en';
      writeLanguage(next);
      current = next;
      mark();
      // Back to English, or from one language to another, is a reload: the translator
      // rewrites the page in place and cannot cleanly undo itself.
      if (next === 'en' || wasTranslated) location.reload();
      else startTranslator();
    });
  }

  window.BuzzNerd = window.BuzzNerd || {};
  window.BuzzNerd.language = readLanguage;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
