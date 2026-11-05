// Phone numbers and email addresses in rendered HTML become links.
//
// A dealer types a number into a heading, a paragraph, a footer or a location's bound text and
// expects a visitor on a phone to be able to tap it. Doing that block by block means every new
// block, bound field and pasted paragraph is one more place to forget, so it is done once, on the
// finished HTML, by `renderShell`: whatever a page, the header or the footer contains is covered,
// including content that did not exist when this was written.
//
// What is left alone, because it is not text a visitor reads as contact details:
//   - anything already inside an `<a>` (a number already linked stays exactly as authored), or a
//     `<button>`, where a nested link is invalid HTML;
//   - attributes, comments, `<script>`, `<style>`, `<title>`, `<textarea>`, `<select>`, `<svg>`,
//     `<noscript>` and `<iframe>` — only text nodes are touched.
//
// Pure string work and no Node or DOM API, like html.mjs: the build, the dashboard preview and the
// Vendure plugin all import this renderer. The storefront (`bznrd-vendure-subsite`) carries the
// same algorithm in `app/lib/storefront/contact-links.ts` for the same reason `facet-code.ts`
// does: two deployables, no shared package. Change one and change the other.

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ESCAPES[c]);

/**
 * Email: a local part, `@`, and a dotted domain ending in letters. The match stops before a
 * sentence's trailing full stop, because the domain must end on `\.[A-Za-z]{2,}`.
 */
const EMAIL = '[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\\.[A-Za-z0-9-]+)*\\.[A-Za-z]{2,}';

/**
 * A North American number: `(813) 621-1331`, `813-621-1331`, `813.621.1331`, `813 621 1331`,
 * `+1 813 621 1331`, `1-813-621-1331`, `+18136211331`.
 *
 * Held to the numbering plan — an area code and an exchange never begin 0 or 1 — and to a
 * boundary on both sides (`NOT_AFTER` before, the trailing lookahead after; no lookbehind, which
 * older Safari rejects and this module runs in the dashboard's browser), so a VIN, a part number (`A-123-456-7890`), a price or a run of digits
 * that merely contains ten of them is not a phone number.
 */
const AREA = '[2-9]\\d{2}';
const PHONE =
  '(?:' +
  `\\+1${AREA}\\d{3}\\d{4}` +
  '|' +
  `(?:\\+?1[\\s.-]?)?(?:\\(${AREA}\\)\\s?|${AREA}[\\s.-])[2-9]\\d{2}[\\s.-]\\d{4}` +
  ')(?![\\w-]|[.,]\\d)';

/** A character a phone number may not directly follow: it would be part of a longer token. */
const NOT_AFTER = /[\w@./$+-]/;

const CONTACT = new RegExp(`(${EMAIL})|(${PHONE})`, 'g');

/** `(813) 621-1331` → `+18136211331`: digits only, with the country code. */
export function telHref(text) {
  const digits = String(text).replace(/\D/g, '');
  return `tel:+${digits.length === 10 ? '1' : ''}${digits}`;
}

/** Elements whose content is not text a visitor reads, and elements that may not hold a link. */
const RAW = 'script|style|textarea|title|select|svg|noscript|iframe';
const NO_LINK = new Set(['a', 'button']);

const TOKENS = new RegExp(
  '<!--[\\s\\S]*?-->' +
    `|<(${RAW})\\b(?:"[^"]*"|'[^']*'|[^'">])*>[\\s\\S]*?<\\/\\1\\s*>` +
    `|<(\\/?)([A-Za-z][^\\s/>]*)(?:"[^"]*"|'[^']*'|[^'">])*>`,
  'gi',
);

/**
 * Split plain text into runs: `{ text }` for ordinary text, `{ text, href, kind }` for a phone
 * number or an email address. The text is not escaped — the caller does that for its medium.
 */
export function contactRuns(text) {
  const source = String(text ?? '');
  const runs = [];
  let last = 0;
  for (const match of source.matchAll(CONTACT)) {
    const email = match[1];
    if (!email && NOT_AFTER.test(source[match.index - 1] ?? '')) continue;
    if (match.index > last) runs.push({ text: source.slice(last, match.index) });
    runs.push(
      email
        ? { text: email, href: `mailto:${email}`, kind: 'email' }
        : { text: match[2], href: telHref(match[2]), kind: 'phone' },
    );
    last = match.index + match[0].length;
  }
  if (last < source.length) runs.push({ text: source.slice(last) });
  return runs;
}

/** An HTML text node, whose `&amp;`-style entities are still escaped, with its contacts linked. */
function linkText(text) {
  if (!/[@\d]/.test(text)) return text;
  return contactRuns(text)
    .map((run) =>
      run.href
        ? `<a href="${esc(run.href)}" data-bz-el="${run.kind === 'email' ? 'link' : 'phone'}" data-bz-intent="${
            run.kind === 'email' ? 'email-dealer' : 'call-dealer'
          }">${run.text}</a>`
        : run.text,
    )
    .join('');
}

/**
 * The HTML with every phone number and email address in its text made a link. Phone links use the
 * digits only (`tel:+18136211331`) and keep the text the author wrote as the link's content.
 * Returns the input untouched when there is nothing to link.
 */
export function linkifyContacts(html) {
  const source = String(html ?? '');
  if (!source || !/[@\d]/.test(source)) return source;

  let out = '';
  let last = 0;
  let inLink = 0;
  for (const match of source.matchAll(TOKENS)) {
    const text = source.slice(last, match.index);
    out += inLink ? text : linkText(text);
    out += match[0];
    last = match.index + match[0].length;

    const name = (match[3] || '').toLowerCase();
    if (NO_LINK.has(name)) {
      const closing = match[2] === '/';
      const selfClosing = /\/\s*>$/.test(match[0]);
      if (closing) inLink = Math.max(0, inLink - 1);
      else if (!selfClosing) inLink += 1;
    }
  }
  const tail = source.slice(last);
  return out + (inLink ? tail : linkText(tail));
}
