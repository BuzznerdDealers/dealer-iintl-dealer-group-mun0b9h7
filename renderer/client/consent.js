/* The cookie consent banner and preference center. Zero dependencies,
 * platform-owned.
 *
 * Loaded only for a dealer with consent on, after the head gate
 * (renderer/consent.mjs) has defined `window.bzConsent`. The gate owns the
 * decision — the cookie, Global Privacy Control, which blocked tags run — and
 * this file asks the visitor, hands their answer to `bzConsent.set`, and keeps
 * the local proof-of-consent record.
 *
 * Every string comes from the dealer's settings and is set as text, never as
 * markup.
 *
 * Anything on the page with `data-bz-consent-open`, or a link to
 * `#cookie-settings`, opens the preferences — that is how a dealer puts a
 * "Cookie settings" link in their footer menu. A link to `#do-not-sell`, or
 * `data-bz-do-not-sell`, is the California "Do Not Sell or Share" opt-out, and
 * an element with `data-bz-cookie-declaration` is filled with the cookie
 * declaration table.
 *
 * The editor's Design canvas never runs this file. */
(function () {
  'use strict';

  var api = window.bzConsent;
  if (!api || !api.config || typeof api.set !== 'function') return;

  var C = api.config;
  var T = C.text;
  var root = null;
  var banner = null;
  var prefs = null;
  var revisit = null;
  var lastFocus = null;
  var TOAST_KEY = 'bzConsentToast';

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  /* Dealer copy keeps its paragraphs, as the plugin's wpautop did: a blank
   * line starts a new paragraph, a single newline is a line break. Text only —
   * never markup. */
  function paragraphs(parent, text, className) {
    var blocks = String(text || '').split(/\n\s*\n/);
    for (var i = 0; i < blocks.length; i++) {
      var block = blocks[i].replace(/^\s+|\s+$/g, '');
      if (!block) continue;
      var p = el('p', className || null);
      var lines = block.split('\n');
      for (var j = 0; j < lines.length; j++) {
        if (j) p.appendChild(document.createElement('br'));
        p.appendChild(document.createTextNode(lines[j]));
      }
      parent.appendChild(p);
    }
  }

  function button(label, variant, action) {
    var b = el('button', 'bz-cbtn bz-cbtn--' + variant, label);
    b.type = 'button';
    b.setAttribute('data-bz-action', action);
    return b;
  }

  /* ------------------------------------------------------------- choices */

  function all(value) {
    var out = {};
    for (var i = 0; i < C.categories.length; i++) out[C.categories[i]] = value;
    return out;
  }

  function fromToggles() {
    var out = {};
    var boxes = prefs ? prefs.querySelectorAll('[data-bz-cat-input]') : [];
    for (var i = 0; i < boxes.length; i++) {
      var name = boxes[i].getAttribute('data-bz-cat-input');
      if (!api.necessary(name)) out[name] = boxes[i].checked;
    }
    return out;
  }

  function granted(choices) {
    var out = ['essential'];
    for (var k in choices) if (choices.hasOwnProperty(k) && choices[k]) out.push(k);
    return out;
  }

  /* Local proof of consent, recorded against this dealer by the storefront on
   * the dealer's own domain. No IP address is stored; the id is random and
   * generated in the browser. */
  function logUrl() {
    var node = document.querySelector('[data-bz-prefix]');
    var prefix = node && node.getAttribute('data-bz-prefix');
    return prefix ? '/' + prefix + '/api/consent-log' : C.logUrl;
  }

  function log(record) {
    if (!C.logging || !record) return;
    var url = logUrl();
    if (!url) return;
    var payload = JSON.stringify({
      consentId: record.id,
      action: record.a,
      categories: granted(record.c),
      url: location.href,
    });
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }))) return;
      fetch(url, {
        method: 'POST',
        credentials: 'same-origin',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });
    } catch (e) {}
  }

  /* Record a choice. A reload follows when the visitor withdraws a category
   * whose script already ran (the gate does that), or when the dealer asked
   * for one after every choice; a confirmation is carried across it. */
  function decide(choices, action, confirmation) {
    var reload = api.wouldWithdraw(choices) || C.reloadOnChoice;
    if (confirmation) {
      if (reload) queueToast(confirmation);
      else toast(confirmation);
    }
    hideBanner();
    hidePrefs();
    /* Logged first: a withdrawal reloads inside `set`, and the beacon
     * survives the unload. */
    log(recordFor(choices, action));
    api.set(choices, action);
    showRevisit();
    if (C.reloadOnChoice) location.reload();
  }

  /* What `set` is about to store, for the log: the same id it will keep. */
  function recordFor(choices, action) {
    var c = {};
    for (var i = 0; i < C.categories.length; i++) c[C.categories[i]] = choices[C.categories[i]] === true;
    return { id: api.id(), a: action, c: c };
  }

  function acceptAll() { decide(all(true), 'accept_all'); }
  function rejectAll() { decide(all(false), 'reject_all'); }
  function doNotSell() {
    if (!C.dns.enabled) return;
    decide(all(false), 'do_not_sell', T.dnsConfirmation);
  }

  /* ---------------------------------------------------------------- toast */

  function queueToast(message) {
    try { sessionStorage.setItem(TOAST_KEY, message); } catch (e) {}
  }

  function showQueuedToast() {
    try {
      var message = sessionStorage.getItem(TOAST_KEY);
      if (message) {
        sessionStorage.removeItem(TOAST_KEY);
        toast(message);
      }
    } catch (e) {}
  }

  function toast(message) {
    if (!message || !document.body) return;
    var node = el('div', 'bz-consent-toast', message);
    node.setAttribute('role', 'status');
    document.body.appendChild(node);
    void node.offsetWidth;
    node.classList.add('is-visible');
    setTimeout(function () {
      node.classList.remove('is-visible');
      setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 400);
    }, 5000);
  }

  /* ----------------------------------------------------------------- root */

  /* A colour the dealer did not set is left to the theme preset and the
   * site's own tokens, so the banner matches the brand by default. */
  function styleVars() {
    var vars = [];
    var c = C.colors || {};
    if (c.primary) vars.push('--bzc-primary:' + c.primary);
    if (c.buttonText) vars.push('--bzc-btn-text:' + c.buttonText);
    if (c.text) vars.push('--bzc-text:' + c.text);
    if (c.background) vars.push('--bzc-bg:' + c.background);
    if (C.fontFamily) vars.push('--bzc-font:' + C.fontFamily);
    vars.push('--bzc-font-size:' + C.fontSize + 'px');
    return vars.join(';');
  }

  function policyLink() {
    if (!C.policyUrl) return null;
    var a = el('a', 'bz-consent__policy', T.policyLabel);
    a.href = C.policyUrl;
    a.target = '_blank';
    a.rel = 'noopener';
    return a;
  }

  function buildRoot() {
    root = el('div', 'bz-consent-root bz-theme-' + C.theme);
    root.id = 'bz-consent-root';
    root.setAttribute('style', styleVars());
    root.addEventListener('click', onRootClick);
    root.addEventListener('keydown', onKeydown);
    document.body.appendChild(root);
  }

  /* --------------------------------------------------------------- banner */

  function buildBanner() {
    banner = el('div', 'bz-consent bz-consent--' + C.layout + ' bz-pos-' + C.position);
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-live', 'polite');
    banner.setAttribute('aria-label', T.title);
    banner.hidden = true;

    var body = el('div', 'bz-consent__body');
    body.appendChild(el('h2', 'bz-consent__title', T.title));
    var message = el('div', 'bz-consent__message');
    paragraphs(message, T.body);
    var link = policyLink();
    if (link) message.appendChild(link);
    body.appendChild(message);

    var actions = el('div', 'bz-consent__actions');
    actions.appendChild(button(T.acceptAll, 'primary', 'accept_all'));
    if (C.showReject) actions.appendChild(button(T.rejectAll, 'secondary', 'reject_all'));
    if (C.showPreferences) actions.appendChild(button(T.preferences, 'link', 'open_prefs'));

    banner.appendChild(body);
    banner.appendChild(actions);
    root.appendChild(banner);
  }

  function showBanner() { if (banner) banner.hidden = false; }
  function hideBanner() { if (banner) banner.hidden = true; }

  /* ------------------------------------------------------ preference center */

  function cookieTable(cookies) {
    var table = el('table', 'bz-cookie-table');
    var thead = el('thead');
    var head = el('tr');
    var cols = ['Cookie', 'Domain', 'Duration', 'Description'];
    for (var i = 0; i < cols.length; i++) head.appendChild(el('th', null, cols[i]));
    thead.appendChild(head);
    table.appendChild(thead);
    var tbody = el('tbody');
    for (var j = 0; j < cookies.length; j++) {
      var row = el('tr');
      var name = el('td');
      name.appendChild(el('code', null, cookies[j].name));
      row.appendChild(name);
      row.appendChild(el('td', null, cookies[j].domain));
      row.appendChild(el('td', null, cookies[j].duration));
      row.appendChild(el('td', null, cookies[j].description));
      tbody.appendChild(row);
    }
    table.appendChild(tbody);
    return table;
  }

  function cookiesIn(name) {
    var out = [];
    for (var i = 0; i < C.cookies.length; i++) {
      var c = C.cookies[i];
      if (c.enabled && c.category === name && c.name) out.push(c);
    }
    return out;
  }

  function categoryRow(name) {
    var info = C.categoryText[name] || { label: name, description: '' };
    var locked = api.necessary(name);
    var row = el('div', 'bz-cat');
    row.setAttribute('data-bz-category', name);

    var head = el('div', 'bz-cat__head');
    var toggle = el('button', 'bz-cat__toggle');
    toggle.type = 'button';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.appendChild(el('span', 'bz-cat__name', info.label));
    head.appendChild(toggle);

    var sw = el('label', 'bz-switch');
    var input = el('input');
    input.type = 'checkbox';
    input.setAttribute('data-bz-cat-input', name);
    input.setAttribute('aria-label', info.label);
    var slider = el('span', 'bz-switch__slider');
    if (locked) {
      input.checked = true;
      input.disabled = true;
      slider.className += ' bz-switch__slider--locked';
    }
    sw.appendChild(input);
    sw.appendChild(slider);
    if (locked) sw.appendChild(el('span', 'bz-switch__always', T.alwaysActive));
    head.appendChild(sw);
    row.appendChild(head);

    var cookies = cookiesIn(name);
    if (info.description || cookies.length) {
      var desc = el('div', 'bz-cat__desc');
      desc.hidden = true;
      if (info.description) paragraphs(desc, info.description);
      if (cookies.length) desc.appendChild(cookieTable(cookies));
      row.appendChild(desc);
    }
    return row;
  }

  function buildPrefs() {
    prefs = el('div', 'bz-consent-prefs');
    prefs.hidden = true;
    var overlay = el('div', 'bz-consent-prefs__overlay');
    overlay.setAttribute('data-bz-action', 'close_prefs');
    prefs.appendChild(overlay);

    var modal = el('div', 'bz-consent-prefs__modal');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', T.preferencesTitle);

    var header = el('div', 'bz-consent-prefs__header');
    header.appendChild(el('h2', null, T.preferencesTitle));
    var close = el('button', 'bz-consent-prefs__close', '×');
    close.type = 'button';
    close.setAttribute('aria-label', T.close);
    close.setAttribute('data-bz-action', 'close_prefs');
    header.appendChild(close);
    modal.appendChild(header);

    var intro = el('div', 'bz-consent-prefs__intro');
    paragraphs(intro, T.prefsIntro);
    if (api.gpc) intro.appendChild(el('p', 'bz-consent-prefs__notice', T.gpcNotice));
    var link = policyLink();
    if (link) intro.appendChild(link);
    modal.appendChild(intro);

    var list = el('div', 'bz-consent-prefs__categories');
    list.appendChild(categoryRow('essential'));
    for (var i = 0; i < C.categories.length; i++) list.appendChild(categoryRow(C.categories[i]));
    modal.appendChild(list);

    var actions = el('div', 'bz-consent-prefs__actions');
    actions.appendChild(button(T.save, 'primary', 'save_prefs'));
    actions.appendChild(button(T.acceptAll, 'secondary', 'accept_all'));
    if (C.showReject) actions.appendChild(button(T.rejectAll, 'secondary', 'reject_all'));
    modal.appendChild(actions);

    prefs.appendChild(modal);
    root.appendChild(prefs);
  }

  /* With no choice yet a switch shows the category's default: on where the
   * dealer pre-selected it, or where it is already in force under opt-out. */
  function syncToggles() {
    var current = api.choice();
    var boxes = prefs.querySelectorAll('[data-bz-cat-input]');
    for (var i = 0; i < boxes.length; i++) {
      var name = boxes[i].getAttribute('data-bz-cat-input');
      if (api.necessary(name)) continue;
      if (current) boxes[i].checked = current[name] === true;
      else if (api.gpc) boxes[i].checked = false;
      else boxes[i].checked = api.allowed(name) || C.defaultOn.indexOf(name) > -1;
    }
  }

  function openPrefs() {
    if (!prefs) return;
    lastFocus = document.activeElement;
    syncToggles();
    /* The banner and the modal would fight over the same corner. */
    hideBanner();
    prefs.hidden = false;
    document.documentElement.classList.add('bz-consent-open');
    var first = prefs.querySelector('.bz-consent-prefs__close');
    if (first) first.focus();
  }

  function hidePrefs() {
    if (!prefs || prefs.hidden) return;
    prefs.hidden = true;
    document.documentElement.classList.remove('bz-consent-open');
    if (lastFocus && lastFocus.focus) {
      try { lastFocus.focus(); } catch (e) {}
    }
  }

  function closePrefs() {
    hidePrefs();
    /* Closed without a choice: bring the banner back, so they can still
     * accept or reject. */
    if (api.needsChoice()) showBanner();
  }

  /* -------------------------------------------------------------- revisit */

  function buildRevisit() {
    if (!C.revisitButton) return;
    revisit = el('button', 'bz-consent-revisit bz-pos-' + C.revisitPosition);
    revisit.type = 'button';
    revisit.hidden = true;
    revisit.title = T.settingsButton;
    revisit.setAttribute('aria-label', T.settingsButton);
    revisit.setAttribute('data-bz-action', 'open_prefs');
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '22');
    svg.setAttribute('height', '22');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    var path = document.createElementNS(ns, 'path');
    path.setAttribute('fill', 'currentColor');
    path.setAttribute(
      'd',
      'M12 2a10 10 0 1 0 10 10c0-.46-.03-.92-.1-1.36a2.5 2.5 0 0 1-3.79-2.3 2.5 2.5 0 0 1-2.85-3.35A2.5 2.5 0 0 1 12 2Zm-3 6a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm-1 5.5A1.5 1.5 0 1 1 8 16.5 1.5 1.5 0 0 1 8 13.5Zm6 1A1.5 1.5 0 1 1 14 17.5a1.5 1.5 0 0 1 0-3Z',
    );
    svg.appendChild(path);
    revisit.appendChild(svg);
    root.appendChild(revisit);
  }

  function showRevisit() { if (revisit) revisit.hidden = false; }

  /* ---------------------------------------------------------- declaration */

  function fillDeclarations() {
    var targets = document.querySelectorAll('[data-bz-cookie-declaration], [data-bznrd-consent-declaration]');
    for (var t = 0; t < targets.length; t++) {
      var wrap = el('div', 'bz-cookie-declaration');
      var names = ['essential'].concat(C.categories);
      for (var i = 0; i < names.length; i++) {
        var info = C.categoryText[names[i]] || { label: names[i], description: '' };
        var section = el('div', 'bz-cookie-declaration__category');
        section.appendChild(el('h3', null, info.label));
        if (info.description) paragraphs(section, info.description);
        var cookies = cookiesIn(names[i]);
        if (cookies.length) section.appendChild(cookieTable(cookies));
        wrap.appendChild(section);
      }
      targets[t].textContent = '';
      targets[t].appendChild(wrap);
    }
  }

  /* --------------------------------------------------------------- events */

  function onAction(action) {
    if (action === 'accept_all') acceptAll();
    else if (action === 'reject_all') rejectAll();
    else if (action === 'save_prefs') decide(fromToggles(), 'custom');
    else if (action === 'open_prefs') openPrefs();
    else if (action === 'close_prefs') closePrefs();
  }

  function onRootClick(event) {
    var target = event.target;
    if (!target || !target.closest) return;
    var action = target.closest('[data-bz-action]');
    if (action) {
      event.preventDefault();
      onAction(action.getAttribute('data-bz-action'));
      return;
    }
    var toggle = target.closest('.bz-cat__toggle');
    if (!toggle) return;
    var desc = toggle.closest('.bz-cat').querySelector('.bz-cat__desc');
    if (!desc) return;
    var open = !desc.hidden;
    desc.hidden = open;
    toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
  }

  /* Escape closes the preference center; Tab stays inside it while open. */
  function onKeydown(event) {
    if (!prefs || prefs.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closePrefs();
      return;
    }
    if (event.key !== 'Tab') return;
    var focusable = prefs.querySelectorAll('button:not([disabled]), input:not([disabled]), a[href]');
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  /* The plugin's own hooks work too, so markup copied from a WordPress site
   * (its shortcodes' output, a theme's footer link) behaves the same here. */
  var DNS_HOOK = '[data-bz-do-not-sell], a[href="#do-not-sell"], .bznrd-do-not-sell, [data-bznrd-do-not-sell]';
  var OPEN_HOOK = '[data-bz-consent-open], a[href="#cookie-settings"], .bznrd-open-consent, [data-bznrd-open-consent]';

  function bindPage() {
    document.addEventListener('click', function (event) {
      if (!event.target || !event.target.closest) return;
      if (event.target.closest(DNS_HOOK)) {
        event.preventDefault();
        doNotSell();
        return;
      }
      if (event.target.closest(OPEN_HOOK)) {
        event.preventDefault();
        openPrefs();
      }
    });
    /* A "Do Not Sell" link has nothing to do when the dealer turned the
     * opt-out off, so it is not shown. */
    if (!C.dns.enabled) {
      var links = document.querySelectorAll(DNS_HOOK);
      for (var i = 0; i < links.length; i++) links[i].hidden = true;
    }
  }

  /* ----------------------------------------------------------------- start */

  function start() {
    showQueuedToast();
    buildRoot();
    buildBanner();
    buildPrefs();
    buildRevisit();
    bindPage();
    fillDeclarations();

    /* Global Privacy Control on a first visit is an explicit opt-out: it is
     * recorded like a Reject, and confirmed visibly, without a banner. */
    if (api.gpc && !api.record()) {
      decide(all(false), 'gpc_optout', C.gpc.showConfirmation ? T.gpcConfirmation : '');
    } else if (api.needsChoice()) {
      showBanner();
    } else {
      showRevisit();
    }

    /* Cookies set during rendering by something that did not go through a
     * blocked script: a second clearing pass once the page has loaded. */
    window.addEventListener('load', function () { api.clear(); });
  }

  window.bzConsentUi = {
    open: openPrefs,
    acceptAll: acceptAll,
    rejectAll: rejectAll,
    doNotSell: doNotSell,
    getConsent: function () { return api.record(); },
  };

  /* The plugin's public API, by its own names and shapes. */
  window.bznrdConsent = {
    openPreferences: openPrefs,
    acceptAll: acceptAll,
    rejectAll: rejectAll,
    doNotSell: doNotSell,
    getConsent: function () {
      var r = api.record();
      return r ? { id: r.id, categories: r.c, action: r.a, ts: Math.round(r.t / 1000) } : null;
    },
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
