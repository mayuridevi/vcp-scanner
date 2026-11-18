(() => {
const $ = id => document.getElementById(id);
const UNI = [['nifty50', 'Nifty 50'], ['nifty200', 'Nifty 200'], ['nifty500', 'Nifty 500'], ['midcap250', 'Midcap 250'], ['smallcap250', 'Smallcap 250'],
  ['midsmall400', 'MidSmall 400'], ['fno', 'F&O Stocks'], ['allcash', 'All NSE Cash']];
const FIELDS = ['tf', 'minT', 'maxLast', 'dev', 'lookback', 'maxAge', 'proxy', 'worker'], CHK = ['higherLows', 'volDry', 'stage2', 'bySector'];
const S = { uni: new Set(['nifty500']), lists: {}, sector: {}, res: [], tab: 'buy', stop: false };
const store = { get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch (e) { $('msg').textContent = 'Storage full: ' + e.message } } };

// ---------- CSV ----------
function parseCSV(t) {
  const rows = []; let r = [], c = '', q = false;
  for (let i = 0; i < t.length; i++) { const ch = t[i];
    if (q) { if (ch === '"') { if (t[i + 1] === '"') { c += '"'; i++ } else q = false } else c += ch }
    else if (ch === '"') q = true; else if (ch === ',') { r.push(c); c = '' }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[i + 1] === '\n') i++; r.push(c); c = ''; if (r.some(x => x.trim())) rows.push(r); r = [] } else c += ch }
  if (c || r.length) { r.push(c); rows.push(r) } return rows;
}
function symbolsFrom(text) { // returns [{s, sec}]
  const rows = parseCSV(text.replace(/^﻿/, '')); if (rows.length < 2) return [];
  const h = rows[0].map(x => x.trim().toLowerCase());
  let si = h.indexOf('symbol'); if (si < 0) si = h.findIndex(x => x.startsWith('symbol')); if (si < 0) si = h.findIndex(x => x.includes('symbol') || x.includes('underlying'));
  if (si < 0) si = 0;
  const ii = h.findIndex(x => x === 'industry' || x === 'sector' || x === 'sectoral index'), ei = h.findIndex(x => x === 'series');
  const out = [], seen = new Set();
  for (const r of rows.slice(1)) { const s = (r[si] || '').trim().toUpperCase();
    if (!s || /\s/.test(s) || seen.has(s) || s === 'SYMBOL' || /^NIFTY/.test(s) || ['BANKNIFTY', 'FINNIFTY', 'MIDCPNIFTY'].includes(s)) continue;
    if (ei >= 0 && (r[ei] || '').trim() && !['EQ', 'BE'].includes((r[ei] || '').trim().toUpperCase())) continue; // drops REIT/InvIT rows
    if (/^DUMMY/.test(s)) continue;
    seen.add(s); out.push({ s, sec: ii >= 0 ? (r[ii] || '').trim() : '' }); }
  return out;
}
function ingest(key, text) { const l = symbolsFrom(text); S.lists[key] = l.map(x => x.s); l.forEach(x => { if (x.sec) S.sector[x.s] = x.sec; }); return l.length; }
function guessKey(name, dflt) { const n = name.toLowerCase();
  if (/equity_l|allcash|all.?cash/.test(n)) return 'allcash'; if (/mktlots|fno|f&o|lot/.test(n)) return 'fno';
  if (/smallcap.?250/.test(n)) return 'smallcap250'; if (/midsmall/.test(n)) return 'midsmall400'; if (/(large)?midcap.?250/.test(n)) return 'midcap250';
  if (/500/.test(n)) return 'nifty500'; if (/200/.test(n)) return 'nifty200'; if (/50(list)?\b|nifty50/.test(n)) return 'nifty50'; return dflt; }
async function loadLists() {
  for (const [k] of UNI) {
    const saved = store.get('csv_' + k); let ok = false;
    if (saved) { ingest(k, saved); ok = true }
    else try { const r = await fetch('data/' + k + '.csv', { cache: 'no-cache' }); if (r.ok) { const t = await r.text(); if (ingest(k, t)) ok = true } } catch { }
  }
  renderUni();
}
$('imp').onclick = () => $('file').click();
$('file').onchange = async e => { let msg = [];
  for (const f of e.target.files) { const t = await f.text(), k = guessKey(f.name, null);
    if (!k) { msg.push(f.name + ': could not tell which list (rename it e.g. nifty500.csv)'); continue }
    const n = ingest(k, t); store.set('csv_' + k, t); msg.push(k + ': ' + n); }
  $('impmsg').textContent = msg.join(' · '); renderUni(); e.target.value = ''; };

// ---------- UI ----------
function renderUni() { $('uni').innerHTML = '';
  UNI.forEach(([k, n]) => { const b = document.createElement('button'), c = (S.lists[k] || []).length;
    b.className = 'chip' + (S.uni.has(k) ? ' on' : ''); b.innerHTML = n + '<small>' + (c || 'no CSV') + '</small>';
    b.onclick = () => { S.uni.has(k) ? S.uni.delete(k) : S.uni.add(k); store.set('uni', [...S.uni]); renderUni() }; $('uni').appendChild(b) }); }
function opts() { const o = {}; ['minT', 'maxLast', 'dev', 'lookback', 'maxAge'].forEach(k => o[k] = +$(k).value); CHK.slice(0, 3).forEach(k => o[k] = $(k).checked); return o; }
function loadSettings() { const s = store.get('settings', { tf: 'D', minT: 2, maxLast: 12, dev: 3, lookback: 120, maxAge: 20, proxy: 'corsproxy', worker: '', higherLows: false, volDry: false, stage2: false, bySector: true });
  FIELDS.forEach(k => $(k).value = s[k]); CHK.forEach(k => $(k).checked = !!s[k]); S.uni = new Set(store.get('uni', ['nifty500'])); }
function saveSettings() { const s = {}; FIELDS.forEach(k => s[k] = $(k).value); CHK.forEach(k => s[k] = $(k).checked); store.set('settings', s) }
document.querySelectorAll('input,select').forEach(e => e.addEventListener('change', () => { saveSettings(); if (e.id === 'bySector') render() }));
document.querySelectorAll('.tab').forEach(t => t.onclick = () => { S.tab = t.dataset.t; document.querySelectorAll('.tab').forEach(x => x.classList.toggle('on', x === t)); render() });

// ---------- Data ----------
const RANGE = { D: ['1d', '1y'], W: ['1wk', '5y'], M: ['1mo', '10y'] };
function proxied(url, mode) { const w = $('worker').value.trim().replace(/\/$/, '');
  if (mode === 'worker' && w) return w + '/?u=' + encodeURIComponent(url);
  if (mode === 'allorigins') return 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
  return 'https://corsproxy.io/?url=' + encodeURIComponent(url); }
async function bars(sym, tf) {
  const [iv, rg] = RANGE[tf], url = 'https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(sym) + '.NS?interval=' + iv + '&range=' + rg;
  const first = $('proxy').value, order = [first, ...['worker', 'corsproxy', 'allorigins'].filter(x => x !== first && (x !== 'worker' || $('worker').value.trim()))];
  let err;
  for (const m of order) { try {
      const r = await fetch(proxied(url, m)); if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json(), d = j.chart.result && j.chart.result[0]; if (!d) throw new Error('no data');
      const q = d.indicators.quote[0], out = [];
      d.timestamp.forEach((t, i) => { if (q.close[i] != null && q.high[i] != null && q.low[i] != null) out.push({ t, o: q.open[i], h: q.high[i], l: q.low[i], c: q.close[i], v: q.volume[i] || 0 }) });
      return out;
    } catch (e) { err = e } }
  throw err;
}

// ---------- Scan ----------
async function scan() {
  const syms = [...new Set([...S.uni].flatMap(k => S.lists[k] || []))];
  if (!syms.length) { $('msg').textContent = 'No symbols: add CSVs in /data or use Import CSV.'; return }
  saveSettings(); S.res = []; S.stop = false; $('go').disabled = true; $('stop').hidden = false;
  const tf = $('tf').value, o = opts(); let done = 0, fail = 0, idx = 0;
  const worker = async () => { while (!S.stop && idx < syms.length) { const s = syms[idx++];
      try { const b = await bars(s, tf); const a = VCP.analyze(b, o); if (a && a.setup) S.res.push(Object.assign(a, { sym: s, bars: b.slice(-60) })); }
      catch { fail++ }
      done++; $('pb').style.width = (done / syms.length * 100) + '%'; $('msg').textContent = done + '/' + syms.length + (fail ? ' · ' + fail + ' failed' : '');
      if (done % 10 === 0) render(); } };
  await Promise.all(Array.from({ length: 6 }, worker));
  $('go').disabled = false; $('stop').hidden = true; render();
  $('msg').textContent = (S.stop ? 'Stopped. ' : 'Done. ') + done + ' scanned' + (fail ? ', ' + fail + ' failed (try another proxy)' : '') + '.';
  $('stat').textContent = new Date().toLocaleTimeString();
}
$('go').onclick = scan; $('stop').onclick = () => S.stop = true;

// ---------- Render ----------
function spark(r) { const b = r.bars, lo = Math.min(...b.map(x => x.l), r.line), hi = Math.max(...b.map(x => x.h), r.line), W = 300, H = 46,
    X = i => i / (b.length - 1) * W, Y = v => H - (v - lo) / (hi - lo || 1) * (H - 4) - 2;
  return '<svg class="sp" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none"><polyline fill="none" stroke="#7aa2d6" stroke-width="1.5" points="' + b.map((x, i) => X(i).toFixed(1) + ',' + Y(x.c).toFixed(1)).join(' ') + '"/><line x1="0" x2="' + W + '" y1="' + Y(r.line) + '" y2="' + Y(r.line) + '" stroke="#f5b942" stroke-dasharray="4 3"/></svg>'; }
function card(r) { const buy = r.buy;
  return '<div class="stk' + (buy ? '' : ' w') + '"><a target="_blank" rel="noopener" href="https://www.tradingview.com/chart/?symbol=NSE:' + encodeURIComponent(r.sym) + '">' + r.sym + '</a>' +
    '<div style="text-align:right"><b>' + r.ltp.toFixed(2) + '</b> <span class="' + (buy ? 'up' : 'mu') + '">' + (r.pct >= 0 ? '+' : '') + r.pct.toFixed(1) + '% vs line</span></div>' +
    '<div class="mu"><span class="pill">T' + r.T + '</span>' + r.depths.join('% → ') + '%</div><div class="mu" style="text-align:right">VCP line ' + r.line.toFixed(2) + '</div>' +
    '<div class="mu">' + (r.volRatio != null ? 'Vol ' + r.volRatio.toFixed(2) + '× 50-avg · ' : '') + 'last low ' + r.age + ' bars ago' + (r.stage2 === true ? ' · Stage 2' : '') + '</div><div></div>' + spark(r) + '</div>'; }
function render() {
  const b = S.res.filter(r => r.buy), w = S.res.filter(r => !r.buy); $('nb').textContent = b.length; $('nw').textContent = w.length;
  const list = (S.tab === 'buy' ? b : w).sort((x, y) => y.T - x.T || x.lastDepth - y.lastDepth), out = $('out');
  if (!list.length) { out.innerHTML = '<p class="note">Nothing here yet.</p>'; return }
  if (!$('bySector').checked) { out.innerHTML = list.map(card).join(''); return }
  const g = {}; list.forEach(r => (g[S.sector[r.sym] || 'Other'] ||= []).push(r));
  out.innerHTML = ''; Object.entries(g).sort((a, c) => c[1].length - a[1].length).forEach(([sec, arr]) => {
    const h = document.createElement('div'), body = document.createElement('div'); h.className = 'sec-h'; h.innerHTML = '<span>' + sec + '</span><span>' + arr.length + '</span>';
    body.innerHTML = arr.map(card).join(''); body.hidden = true; h.onclick = () => body.hidden = !body.hidden; out.append(h, body); });
}
loadSettings(); loadLists(); render();
})();
