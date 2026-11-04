// Cookie consent: the head gate, emitted from baked configuration.
//
// `platform/consent.json` is written by the platform at publish from the
// dealer's consent settings. A dealer with no such file — or with `mode: "off"`
// — gets nothing from this module, and their build is byte-identical to one
// made before consent existed.
//
// With consent on, nothing here names a vendor. A provider is gated by the
// `consentCategory` its own descriptor declared, which is data, so adding a
// provider never edits this file (docs/02 invariant 12a). Everything else a
// page loads from a third party — a pixel pasted into custom code, a chat
// widget, an embed — is gated by the dealer's cookie register: each cookie may
// name the script that sets it, and that script is held back until its
// category is allowed. That is the only reliable way to block a cookie.
//
// The gate is a small inline script, not a deferred one, because it has to run
// before the provider tags it unblocks: those tags have a head-placement
// requirement for complete page-view capture, and activating them from a
// deferred script would move every one of them behind the parse.

import { json } from './analytics-bootstrap.mjs';

export const CONSENT_MODES = ['off', 'opt-out', 'opt-in'];

/** The categories offered when the dealer's settings name none. */
const DEFAULT_CATEGORIES = ['analytics', 'marketing'];

/** The BZNrd Consent plugin's limit: up to ten years. */
const MAX_EXPIRY_DAYS = 3650;
const DEFAULT_EXPIRY_DAYS = 365;

/** A category name is written into an HTML attribute and a cookie key. */
const isCategory = (name) => typeof name === 'string' && /^[a-z][a-z0-9-]{0,31}$/.test(name);

/**
 * The category a provider is gated under.
 *
 * A provider that declared nothing usable is gated as `analytics` rather than
 * let through: under opt-in, a tag nobody classified is exactly the tag that
 * must not run before the visitor has said yes. The client runtime applies the
 * same rule (`bzConsent.category`), so the head and the adapters agree.
 */
export function consentCategoryOf(provider) {
  const raw = provider?.consentCategory;
  return isCategory(raw) ? raw : 'analytics';
}

const DEFAULT_TEXT = {
  title: 'We value your privacy',
  body:
    'We use cookies to enhance your browsing experience, serve personalized ads or content, ' +
    'and analyze our traffic. By clicking "Accept All", you consent to our use of cookies.',
  acceptAll: 'Accept All',
  rejectAll: 'Reject All',
  preferences: 'Customize',
  save: 'Save My Preferences',
  close: 'Close',
  policyLabel: 'Cookie Policy',
  settingsButton: 'Manage consent',
  preferencesTitle: 'Customize Consent Preferences',
  prefsIntro:
    'We use cookies to help you navigate efficiently and perform certain functions. You will find ' +
    'detailed information about all cookies under each consent category below.',
  gpcNotice:
    "Your browser is sending a Global Privacy Control signal, so non-essential cookies stay off.",
  gpcConfirmation: 'Your Global Privacy Control opt-out signal was detected and honored.',
  dnsLabel: 'Do Not Sell or Share My Personal Information',
  dnsConfirmation: 'You have opted out of the sale/sharing of your personal information.',
  alwaysActive: 'Always Active',
};

const DEFAULT_CATEGORY_TEXT = {
  essential: {
    label: 'Essential',
    description:
      'Essential cookies are required to enable the basic features of this site, such as providing ' +
      'secure log-in or adjusting your consent preferences. These cookies do not store any ' +
      'personally identifiable data.',
  },
  functional: {
    label: 'Functional',
    description:
      'Functional cookies help perform certain functionalities like sharing the content of the ' +
      'website on social media platforms, collecting feedback, and other third-party features.',
  },
  analytics: {
    label: 'Analytics',
    description:
      'Analytical cookies are used to understand how visitors interact with the website. These ' +
      'cookies help provide information on metrics such as the number of visitors, bounce rate, ' +
      'traffic source, etc.',
  },
  marketing: {
    label: 'Marketing',
    description:
      'Marketing cookies are used to provide visitors with customized advertisements based on the ' +
      'pages you visited previously and to analyze the effectiveness of the ad campaigns.',
  },
};

/**
 * The cookie register a dealer starts with: both a declaration a visitor can
 * read and, where a cookie names the script that sets it, a blocking rule.
 *
 * `bz_vid` and `bz_sid` are the platform's own analytics identifiers. The
 * storefront re-issues them HttpOnly, so they are declared but never cleared
 * from the browser — the analytics runtime drops them itself on withdrawal.
 */
export const DEFAULT_COOKIES = [
  {
    id: 'ck_bz_consent',
    name: 'bz_consent',
    domain: '',
    duration: '1 year',
    description: "Stores the visitor's cookie consent choices for this site.",
    category: 'essential',
    pattern: '',
    httpOnly: false,
    enabled: true,
  },
  {
    id: 'ck_bz_vid',
    name: 'bz_vid',
    domain: '',
    duration: '1 year',
    description: 'Identifies a returning visitor so this site can count unique visits.',
    category: 'analytics',
    pattern: '',
    httpOnly: true,
    enabled: true,
  },
  {
    id: 'ck_bz_sid',
    name: 'bz_sid',
    domain: '',
    duration: '30 minutes',
    description: 'Groups the pages a visitor views in one visit.',
    category: 'analytics',
    pattern: '',
    httpOnly: true,
    enabled: true,
  },
  {
    id: 'ck_ga',
    name: '_ga',
    domain: '.google-analytics.com',
    duration: '2 years',
    description: 'Google Analytics cookie used to distinguish unique users.',
    category: 'analytics',
    pattern: 'google-analytics.com|googletagmanager.com|analytics.google.com|stats.g.doubleclick.net',
    httpOnly: false,
    enabled: true,
  },
  {
    id: 'ck_gid',
    name: '_gid',
    domain: '.google-analytics.com',
    duration: '1 day',
    description: 'Google Analytics cookie used to distinguish users.',
    category: 'analytics',
    pattern: '',
    httpOnly: false,
    enabled: true,
  },
  {
    id: 'ck_hjsessionuser',
    name: '_hjSessionUser',
    domain: '.hotjar.com',
    duration: '1 year',
    description: 'Hotjar cookie set when a user first lands on a page.',
    category: 'analytics',
    pattern: 'hotjar.com',
    httpOnly: false,
    enabled: true,
  },
  {
    id: 'ck_fbp',
    name: '_fbp',
    domain: '',
    duration: '3 months',
    description: 'Meta (Facebook) Pixel cookie used to deliver and measure advertising.',
    category: 'marketing',
    pattern: 'connect.facebook.net|facebook.com/tr',
    httpOnly: false,
    enabled: true,
  },
  {
    id: 'ck_gcl_au',
    name: '_gcl_au',
    domain: '',
    duration: '3 months',
    description: 'Google Ads / DoubleClick conversion cookie.',
    category: 'marketing',
    pattern: 'googleadservices.com|googlesyndication.com|doubleclick.net|google.com/ads',
    httpOnly: false,
    enabled: true,
  },
];

const str = (value, fallback) => (typeof value === 'string' && value.trim() ? value : fallback);
const bool = (value, fallback) => (typeof value === 'boolean' ? value : fallback);
const oneOf = (value, options, fallback) => (options.includes(value) ? value : fallback);

/** Only a same-site path or an http(s) URL; anything else is dropped, never linked. */
const safeUrl = (value) =>
  typeof value === 'string' && /^(\/(?!\/)|https?:\/\/)/i.test(value.trim()) ? value.trim() : null;

/** A colour is written into a style attribute, so only a hex literal is kept. */
const hex = (value) =>
  typeof value === 'string' && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim()) ? value.trim() : null;

/** A font stack is written into a style attribute too: names, quotes, commas, spaces, hyphens. */
const fontFamily = (value) =>
  typeof value === 'string' && value.trim() && value.length <= 120 && /^[A-Za-z0-9 ,'"-]+$/.test(value)
    ? value.trim()
    : null;

/** The storefront prefix the consent log posts under, as the analytics beacon does. */
const prefixOf = (config) =>
  typeof config?.storefrontPrefix === 'string' && /^[a-z0-9-]+$/i.test(config.storefrontPrefix)
    ? config.storefrontPrefix
    : 'store';

/** Pipe, comma or newline separated needles, trimmed and de-duplicated. */
function needlesOf(pattern) {
  if (typeof pattern !== 'string') return [];
  const out = [];
  for (const raw of pattern.split(/[\r\n,|]+/)) {
    const needle = raw.trim();
    if (needle && !out.includes(needle)) out.push(needle);
  }
  return out;
}

function cookieOf(raw, i) {
  if (!raw || typeof raw !== 'object' || !isCategory(raw.category)) return null;
  const text = (value, limit) => (typeof value === 'string' ? value.trim().slice(0, limit) : '');
  return {
    id: text(raw.id, 40) || `ck_${i}`,
    name: text(raw.name, 100),
    domain: text(raw.domain, 255),
    duration: text(raw.duration, 60),
    description: text(raw.description, 500),
    category: raw.category,
    pattern: needlesOf(raw.pattern).join('|'),
    httpOnly: raw.httpOnly === true,
    enabled: raw.enabled !== false,
  };
}

/**
 * The blocking rules a register implies: one entry per enabled, non-essential
 * cookie that names the script setting it. A necessary category — Essential,
 * and any the dealer marked always active — is never blocked.
 */
function providersOf(cookies, necessary) {
  const out = [];
  const seen = new Set();
  for (const cookie of cookies) {
    if (!cookie.enabled || necessary.has(cookie.category)) continue;
    const needles = needlesOf(cookie.pattern);
    const key = `${cookie.category}::${needles.join('|')}`;
    if (!needles.length || seen.has(key)) continue;
    seen.add(key);
    out.push({ needles, category: cookie.category });
  }
  return out;
}

/**
 * The cookies deleted from the browser while their category is not allowed —
 * the backstop for anything that set a cookie without going through a blocked
 * script. HttpOnly cookies are skipped: the browser cannot touch them.
 */
function clearMapOf(cookies, necessary) {
  return cookies
    .filter((c) => c.enabled && !necessary.has(c.category) && !c.httpOnly && c.name)
    .map((c) => ({ name: c.name, domain: c.domain, category: c.category }));
}

/**
 * Read and normalise the baked consent file.
 *
 * Returns null when consent is off — absent file, or `mode: "off"` — which is
 * the signal every caller uses to emit nothing at all.
 *
 * A file that is present but malformed fails *closed*: an unknown mode is read
 * as opt-in. The file is platform-written, so a bad one is a platform bug, and
 * the safe reading of a bug in a consent setting is the strict one.
 */
export function consentConfig(config) {
  const raw = config?.platformConsent;
  if (!raw || typeof raw !== 'object' || raw.mode === 'off') return null;

  const mode = raw.mode === 'opt-out' ? 'opt-out' : 'opt-in';
  const version = Number.isInteger(raw.version) && raw.version > 0 ? raw.version : 1;
  const expiryDays =
    Number.isInteger(raw.expiryDays) && raw.expiryDays > 0 && raw.expiryDays <= MAX_EXPIRY_DAYS
      ? raw.expiryDays
      : DEFAULT_EXPIRY_DAYS;

  // Every category a provider is gated under must be offered, or a visitor
  // could never grant it and that provider would never load under opt-in.
  const providers = Array.isArray(config?.platformAnalytics?.providers) ? config.platformAnalytics.providers : [];
  const named = Array.isArray(raw.categories) ? raw.categories.filter(isCategory) : DEFAULT_CATEGORIES;
  const categories = [];
  for (const name of [...named, ...providers.map(consentCategoryOf)]) {
    if (name !== 'essential' && !categories.includes(name)) categories.push(name);
  }

  const cookies = (Array.isArray(raw.cookies) ? raw.cookies : DEFAULT_COOKIES)
    .slice(0, 100)
    .map(cookieOf)
    .filter(Boolean);
  // A register entry under a category nobody offers could never be allowed,
  // so that category is offered too — the same rule as for providers.
  for (const cookie of cookies) {
    if (cookie.category !== 'essential' && !categories.includes(cookie.category)) categories.push(cookie.category);
  }

  const text = {};
  for (const [key, fallback] of Object.entries(DEFAULT_TEXT)) text[key] = str(raw.text?.[key], fallback);

  const categoryText = {};
  for (const name of ['essential', ...categories]) {
    const own = raw.categoryText?.[name] ?? {};
    const fallback = DEFAULT_CATEGORY_TEXT[name] ?? {
      label: name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, ' '),
      description: '',
    };
    categoryText[name] = { label: str(own.label, fallback.label), description: str(own.description, fallback.description) };
  }

  const logging = bool(raw.logging, true);
  // Categories the dealer marked always active, like the plugin's "Necessary"
  // flag: locked on for the visitor, never blocked, never cleared.
  const necessaryCategories = Array.isArray(raw.necessaryCategories)
    ? raw.necessaryCategories.filter((c, i, list) => categories.includes(c) && list.indexOf(c) === i)
    : [];
  const necessary = new Set(['essential', ...necessaryCategories]);

  return {
    mode,
    version,
    expiryDays,
    categories,
    policyUrl: safeUrl(raw.policyUrl),
    revisitButton: raw.revisitButton !== false,
    text,
    categoryText,
    layout: oneOf(raw.layout, ['box', 'banner'], 'box'),
    position: oneOf(raw.position, ['bottom-left', 'bottom-right', 'bottom', 'top', 'center'], 'bottom-left'),
    theme: oneOf(raw.theme, ['light', 'dark'], 'light'),
    colors: {
      primary: hex(raw.primaryColor),
      buttonText: hex(raw.buttonTextColor),
      text: hex(raw.textColor),
      background: hex(raw.backgroundColor),
    },
    fontFamily: fontFamily(raw.fontFamily),
    fontSize: Number.isInteger(raw.fontSize) && raw.fontSize >= 10 && raw.fontSize <= 24 ? raw.fontSize : 14,
    showReject: bool(raw.showReject, true),
    showPreferences: bool(raw.showPreferences, true),
    reloadOnChoice: bool(raw.reloadOnChoice, false),
    revisitPosition: oneOf(raw.revisitPosition, ['bottom-left', 'bottom-right'], 'bottom-left'),
    defaultOn: Array.isArray(raw.defaultOn) ? raw.defaultOn.filter((c) => categories.includes(c) && !necessary.has(c)) : [],
    necessaryCategories,
    gcm: {
      enabled: bool(raw.gcmEnabled, false),
      adsDataRedaction: bool(raw.gcmAdsDataRedaction, true),
      urlPassthrough: bool(raw.gcmUrlPassthrough, true),
    },
    gpc: { enabled: bool(raw.gpcEnabled, true), showConfirmation: bool(raw.gpcShowConfirmation, true) },
    dns: { enabled: bool(raw.dnsEnabled, true) },
    autoclear: bool(raw.autoclear, true),
    logging,
    logUrl: logging ? `/${prefixOf(config)}/api/consent-log` : null,
    cookies,
    providers: providersOf(cookies, necessary),
    clearMap: clearMapOf(cookies, necessary),
  };
}

/**
 * The gate, as JavaScript source. ES5, no dependencies, defined once per page.
 *
 * `window.bzConsent` is the whole contract the rest of the page sees:
 *
 * - `allowed(category)` — may this category run now. `essential`, and any
 *   category the dealer marked necessary, always may. A stored choice decides
 *   the rest; with none, Global Privacy Control (honoured unless the dealer
 *   turned it off) denies them, and otherwise the mode does.
 * - `activate()` — turn every blocked `<script type="text/plain"
 *   data-bz-consent>` and `<iframe data-bz-consent data-bz-src>` whose
 *   category is now allowed into the real thing, in document order, each at
 *   most once. Runs again at DOMContentLoaded for tags later in the page.
 * - `set(choices, action)` — record a choice, update Google Consent Mode,
 *   clear the cookies it does not allow, activate what it does, and announce
 *   it with a `bz:consent` event. Withdrawing a category that was granted (or
 *   whose script already ran) reloads the page, because a script that has run
 *   cannot be un-run.
 *
 * Anything a page injects at runtime — `createElement('script')`, a parsed or
 * `innerHTML` script or iframe — is matched against the register's script
 * patterns and held back the same way until its category is allowed.
 *
 * The cookie carries the settings `version`: raising it asks every visitor
 * again, which is what a changed policy requires.
 */
const GATE = `(function(){
var api=window.bzConsent;var C=api&&api.config;if(!C)return;
var KEY='bz_consent';var gpc=!!(C.gpc&&C.gpc.enabled)&&navigator.globalPrivacyControl===true;
var P=C.providers||[];var N=C.necessaryCategories||[];
function category(c){return typeof c==='string'&&/^[a-z][a-z0-9-]{0,31}$/.test(c)?c:'analytics';}
function read(){try{var m=document.cookie.match(/(?:^|; )bz_consent=([^;]*)/);if(!m)return null;var v=JSON.parse(decodeURIComponent(m[1]));return v&&v.v===C.version&&v.c&&typeof v.c==='object'?v:null;}catch(e){return null;}}
var choice=read();var ran={};
function necessary(c){return c==='essential'||N.indexOf(c)>-1;}
function allowed(c){c=category(c);if(necessary(c))return true;if(choice)return choice.c[c]===true;if(gpc)return false;return C.mode==='opt-out';}
function match(url){if(!url)return '';url=String(url);for(var i=0;i<P.length;i++){for(var j=0;j<P[i].needles.length;j++){if(url.indexOf(P[i].needles[j])>-1)return P[i].category;}}return '';}
function blocking(url){var c=match(url);if(!c)return '';if(allowed(c)){ran[c]=true;return '';}return c;}
function tagOf(el){return el.getAttribute('data-bz-consent')||el.getAttribute('data-bznrd-category');}
function srcOf(el){return el.getAttribute('data-bz-src')||el.getAttribute('data-bznrd-src');}
function hold(el,c,src){el.setAttribute('data-bz-consent',c);el.setAttribute('data-bz-src',src);}
function activate(){var list=document.querySelectorAll('script[type="text/plain"][data-bz-consent],iframe[data-bz-consent][data-bz-src],script[type="text/plain"][data-bznrd-category],iframe[data-bznrd-category][data-bznrd-src]');for(var i=0;i<list.length;i++){var el=list[i];if(el.getAttribute('data-bz-ran'))continue;var c=tagOf(el);if(!allowed(c))continue;el.setAttribute('data-bz-ran','1');ran[category(c)]=true;var src=srcOf(el);if(String(el.tagName).toLowerCase()==='iframe'){if(src)el.setAttribute('src',src);continue;}var s=document.createElement('script');for(var a=0;a<el.attributes.length;a++){var n=el.attributes[a].name;if(n!=='type'&&n.indexOf('data-bz-')!==0&&n.indexOf('data-bznrd-')!==0)s.setAttribute(n,el.attributes[a].value);}if(src){s.src=src;s.async=true;}else{s.text=el.text;}el.parentNode.insertBefore(s,el.nextSibling);}}
function gcmState(){var g=function(c){return allowed(c)?'granted':'denied';};return{ad_storage:g('marketing'),ad_user_data:g('marketing'),ad_personalization:g('marketing'),analytics_storage:g('analytics'),functionality_storage:g('functional'),personalization_storage:g('functional'),security_storage:'granted'};}
function gtag(){window.dataLayer=window.dataLayer||[];if(typeof window.gtag==='function')window.gtag.apply(window,arguments);else window.dataLayer.push(arguments);}
function erase(name,domain){var exp='=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=';var host=location.hostname||'';var ds=['',host];var parts=host.split('.');while(parts.length>1){ds.push('.'+parts.join('.'));parts.shift();}if(domain&&ds.indexOf(domain)<0)ds.push(domain);var ps=['/',location.pathname||'/'];for(var d=0;d<ds.length;d++){for(var p=0;p<ps.length;p++){document.cookie=name+exp+ps[p]+(ds[d]?'; domain='+ds[d]:'');}}}
function clear(){if(!C.autoclear)return;var map=C.clearMap||[];for(var i=0;i<map.length;i++){if(!allowed(map[i].category))erase(map[i].name,map[i].domain);}}
function uid(){return 'bzc-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);}var pending=null;function id(){return (choice&&choice.id)||pending||(pending=uid());}
function normalise(next){var c={};for(var i=0;i<C.categories.length;i++){var k=C.categories[i];c[k]=necessary(k)||!!(next&&next[k]===true);}return c;}
function wouldWithdraw(next){var c=normalise(next);var prev=choice?choice.c:{};for(var k in c){if(c[k]!==true&&(prev[k]===true||ran[k]))return true;}return false;}
function set(next,action){var c=normalise(next);var withdrawn=wouldWithdraw(next);choice={v:C.version,c:c,t:Date.now(),id:id(),a:typeof action==='string'?action:'custom'};var exp=new Date(Date.now()+C.expiryDays*864e5).toUTCString();document.cookie=KEY+'='+encodeURIComponent(JSON.stringify(choice))+'; path=/; expires='+exp+'; SameSite=Lax'+(location.protocol==='https:'?'; Secure':'');if(C.gcm&&C.gcm.enabled)gtag('consent','update',gcmState());clear();try{document.dispatchEvent(new CustomEvent('bz:consent',{detail:{choices:c,withdrawn:withdrawn,action:choice.a,id:choice.id}}));}catch(e){}if(withdrawn){location.reload();return;}activate();}
if(P.length){var nativeCreate=document.createElement;
document.createElement=function(tag){var el=nativeCreate.apply(document,arguments);if((''+tag).toLowerCase()!=='script')return el;var nativeSet=el.setAttribute;var proto=window.HTMLScriptElement&&HTMLScriptElement.prototype;var desc=proto?Object.getOwnPropertyDescriptor(proto,'src'):null;
try{Object.defineProperty(el,'src',{configurable:true,enumerable:true,get:function(){return desc&&desc.get?desc.get.call(el):el.getAttribute('src');},set:function(v){var c='';try{c=blocking(v);}catch(e){}if(c){el.type='text/plain';hold(el,c,String(v));return;}if(desc&&desc.set)desc.set.call(el,v);else nativeSet.call(el,'src',v);}});}catch(e){}
el.setAttribute=function(n,v){if((''+n).toLowerCase()==='src'){var c='';try{c=blocking(v);}catch(e){}if(c){nativeSet.call(el,'type','text/plain');nativeSet.call(el,'data-bz-consent',c);nativeSet.call(el,'data-bz-src',String(v));return;}}return nativeSet.call(el,n,v);};return el;};
try{new MutationObserver(function(ms){for(var i=0;i<ms.length;i++){var added=ms[i].addedNodes;for(var j=0;j<added.length;j++){var n=added[j];if(!n||n.nodeType!==1||n.hasAttribute('data-bz-consent')||n.hasAttribute('data-bznrd-category'))continue;var t=n.tagName.toLowerCase();var src=n.getAttribute('src')||'';if(t==='script'){if((n.getAttribute('type')||'').toLowerCase()==='text/plain')continue;var c=blocking(src);if(c&&n.parentNode){var r=nativeCreate.call(document,'script');r.type='text/plain';hold(r,c,src);n.parentNode.replaceChild(r,n);}}else if(t==='iframe'&&src.indexOf('about:blank')!==0){var ic=blocking(src);if(ic){hold(n,ic,src);n.setAttribute('src','about:blank');}}}}}).observe(document.documentElement,{childList:true,subtree:true});}catch(e){}
}
if(C.gcm&&C.gcm.enabled){if(C.gcm.urlPassthrough)gtag('set','url_passthrough',true);if(C.gcm.adsDataRedaction)gtag('set','ads_data_redaction',true);var d=gcmState();d.wait_for_update=500;gtag('consent','default',d);}
try{clear();}catch(e){}
api.category=category;api.allowed=allowed;api.activate=activate;api.set=set;api.gpc=gpc;api.match=match;api.clear=clear;api.wouldWithdraw=wouldWithdraw;api.id=id;api.necessary=necessary;
api.choice=function(){return choice?choice.c:null;};api.record=function(){return choice;};api.needsChoice=function(){return !choice&&!gpc;};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',activate);
})();`;

/**
 * Everything consent puts in `<head>`: its configuration and the gate.
 *
 * Emitted before anything else that can run script — dealer custom code, the
 * platform loader, provider tags — so that `bzConsent` and its blocker exist by
 * the time any of them is parsed.
 */
export function consentHead(config) {
  const gate = consentGateScript(config);
  return gate ? `\n<script>${gate}</script>` : '';
}

/**
 * The same gate as bare JavaScript — this dealer's configuration and the gate
 * code, no `<script>` tags — or '' with consent off. The build publishes it as
 * `partials/consent-gate.js` so the storefront's `/store/*` pages run exactly
 * the gate the brand site does, first in their `<head>`.
 */
export function consentGateScript(config) {
  const consent = consentConfig(config);
  if (!consent) return '';
  return `window.bzConsent={config:${json(consent)}};${GATE}`;
}

/** An inline script held back until `category` is allowed. */
export function gatedInline(category, code) {
  return `<script type="text/plain" data-bz-consent="${category}">${code}</script>`;
}

/**
 * An external script held back until `category` is allowed; loaded async when
 * it is. `attrs` is a pre-escaped attribute string the gate copies onto the
 * real script — every attribute except `type` and the gate's own `data-bz-*`.
 */
export function gatedSrc(category, src, escape, attrs = '') {
  return `<script type="text/plain" data-bz-consent="${category}" data-bz-src="${escape(src)}"${attrs}></script>`;
}

/** Runs the gate over every blocked tag parsed so far. Emitted after the last one. */
export const ACTIVATE = '\n<script>window.bzConsent&&bzConsent.activate&&bzConsent.activate();</script>';

const SRC_ATTR = /(\s)src\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/i;

/**
 * Hold back every `<script src>` and `<iframe src>` in a piece of markup whose
 * URL matches a script pattern in the register — the build-time half of the
 * blocker, for dealer custom code and embeds that are in the page as written.
 *
 * The output is the same for every visitor, so it is safe to cache; the gate
 * restores each tag in the visitor's browser once its category is allowed.
 * With consent off, or a register that blocks nothing, the markup is returned
 * untouched.
 */
export function gateMarkup(html, config) {
  if (!html || typeof html !== 'string') return html;
  const consent = consentConfig(config);
  if (!consent || !consent.providers.length) return html;
  const categoryFor = (url) => {
    for (const p of consent.providers) if (p.needles.some((n) => url.includes(n))) return p.category;
    return '';
  };
  return html.replace(/<(script|iframe)\b([^>]*)>/gi, (tag, name, attrs) => {
    if (/\sdata-(?:bz-consent|bznrd-category)\s*=/i.test(attrs)) return tag;
    const m = attrs.match(SRC_ATTR);
    if (!m) return tag;
    const category = categoryFor(m[3] ?? m[4] ?? m[5] ?? '');
    if (!category) return tag;
    const value = m[5] !== undefined ? `"${m[5]}"` : m[2];
    // Function replacers, so a `$` in a dealer's URL is never read as a pattern.
    if (name.toLowerCase() === 'iframe') {
      const rest = attrs.replace(SRC_ATTR, (_, space) => `${space}src="about:blank" data-bz-consent="${category}" data-bz-src=${value}`);
      return `<${name}${rest}>`;
    }
    const rest = attrs
      .replace(/\stype\s*=\s*("[^"]*"|'[^']*'|[^\s"'>]+)/i, () => '')
      .replace(SRC_ATTR, (_, space) => `${space}data-bz-src=${value}`);
    return `<${name} type="text/plain" data-bz-consent="${category}"${rest}>`;
  });
}
