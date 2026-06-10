// smoke.mjs — factory gate G4 (generic level): run each app's real inline
// script in Node with stubbed DOM/localStorage/fetch and fail on any uncaught
// exception or unhandled rejection during load + first settle.
//
//   node scripts/smoke.mjs [apps/file.html ...]    (default: all of apps/)
//
// This is the productized version of the DOM-stub harness proven on the Chat
// Triage PR (caught a real fetch-race bug). It asserts "loads, renders, no
// errors, fallback paths don't throw" for every app; app-specific acceptance
// assertions live with their specs and extend this same sandbox.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : readdirSync('apps').filter((f) => f.endsWith('.html')).map((f) => join('apps', f));

function scripts(html) {
  const out = [];
  const re = /<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) if (m[1].trim()) out.push(m[1]);
  return out;
}

function makeSandbox(timers, loadHandlers) {
  const elements = new Map();
  const deferToLoad = (type, fn) => {
    if (type === 'load' || type === 'DOMContentLoaded') loadHandlers.push(fn);
  };
  const elStub = () => {
    const el = {
      innerHTML: '', textContent: '', value: '', style: {}, files: [], dataset: {},
      disabled: false, open: false, checked: false,
      classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
      addEventListener() {}, removeEventListener() {},
      setAttribute() {}, getAttribute: () => null, removeAttribute() {},
      appendChild() {}, removeChild() {}, remove() {}, click() {}, focus() {}, select() {},
      getContext: () => new Proxy({}, { get: () => () => {} }),   // canvas apps
      toDataURL: () => 'data:,', play: () => Promise.resolve(), pause() {},
      querySelectorAll: () => [], querySelector: () => null
    };
    return el;
  };
  const document = {
    getElementById: (id) => { if (!elements.has(id)) elements.set(id, elStub()); return elements.get(id); },
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => elStub(),
    addEventListener: deferToLoad, removeEventListener() {},
    body: elStub(), documentElement: elStub(),
    visibilityState: 'visible', hidden: false
  };
  const store = {};
  const localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { for (const k of Object.keys(store)) delete store[k]; }
  };
  // fetch resolves !ok so every app exercises its designed fallback path
  const fetch = () => Promise.resolve({
    ok: false, status: 0,
    json: () => Promise.resolve({}), text: () => Promise.resolve('')
  });
  const sandbox = {
    document, localStorage, fetch, console,
    // no clipboard/serviceWorker keys: apps' `'x' in navigator` guards must behave as "absent"
    navigator: { vibrate: () => false, userAgent: 'smoke' },
    location: { href: 'https://lab.test/apps/x.html', pathname: '/apps/x.html', search: '', hash: '' },
    history: { pushState() {}, replaceState() {} },
    matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
    requestAnimationFrame: () => 0, cancelAnimationFrame() {},
    setTimeout: (fn, ms, ...a) => { const h = setTimeout(fn, Math.min(ms || 0, 50), ...a); timers.push(h); return h; },
    setInterval: (fn, ms, ...a) => { const h = setInterval(fn, Math.max(ms || 0, 10), ...a); timers.push(h); return h; },
    clearTimeout, clearInterval,
    Audio: class { constructor() { this.play = () => Promise.resolve(); this.pause = () => {}; } },
    AudioContext: class { constructor() { return new Proxy({ currentTime: 0, destination: {} }, { get: (t, p) => p in t ? t[p] : () => new Proxy({ connect() {}, start() {}, stop() {}, gain: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, frequency: { value: 0, setValueAtTime() {} } }, { get: (tt, pp) => pp in tt ? tt[pp] : () => {} }) }); } },
    FileReader: class { readAsText() {} readAsDataURL() {} },
    Blob, URL, crypto: globalThis.crypto, Date, Math, JSON, Promise,
    Intl, isNaN, parseFloat, parseInt, String, Number, Array, Object, RegExp, Error, Map, Set,
    alert() {}, confirm: () => false, prompt: () => null,
    addEventListener: deferToLoad, removeEventListener() {}
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.elements = elements;   // exposed for assertions
  return sandbox;
}

let failures = 0;
for (const file of files) {
  const html = readFileSync(file, 'utf8');
  const timers = [];
  const loadHandlers = [];
  const sandbox = makeSandbox(timers, loadHandlers);
  const ctx = vm.createContext(sandbox);
  const errs = [];
  const onRejection = (reason) => errs.push('unhandled rejection: ' + (reason && reason.stack || reason));
  process.on('unhandledRejection', onRejection);
  try {
    for (const src of scripts(html)) vm.runInContext(src, ctx, { timeout: 5000 });
    loadHandlers.forEach((fn) => fn());   // window load / DOMContentLoaded
  } catch (e) {
    errs.push('threw on load: ' + (e && e.stack || e));
  }
  await new Promise((r) => setTimeout(r, 150));   // let fetch fallbacks + microtasks settle
  process.off('unhandledRejection', onRejection);
  timers.forEach((h) => { clearTimeout(h); clearInterval(h); });

  const rendered = [...sandbox.elements.values()].some((el) => el.innerHTML || el.textContent);
  // static-first apps (markup in the body, JS renders on interaction) are fine
  const bodyHtml = (html.split(/<body[^>]*>/i)[1] || '').split(/<script/i)[0];
  const staticText = bodyHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!errs.length && !rendered && staticText.length < 40) {
    errs.push('script rendered nothing and the body has no static content');
  }
  if (errs.length) {
    failures++;
    console.error('FAIL ' + file);
    errs.forEach((e) => console.error('     ' + e.split('\n').slice(0, 4).join('\n     ')));
  } else {
    console.log('PASS ' + file + (rendered ? '' : ' (static-first)'));
  }
}

console.log('[smoke] ' + files.length + ' apps, ' + failures + ' failures');
process.exit(failures ? 1 : 0);
