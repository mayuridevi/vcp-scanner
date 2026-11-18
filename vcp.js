// VCP detection (pure functions, no DOM). Works in browser and Node.
// bars: [{t,o,h,l,c,v}] oldest -> newest. The LAST bar is the current (live) candle.
(function (g) {
  const sma = (a, n, end) => { // simple average of a[end-n+1..end]
    if (end - n + 1 < 0) return null; let s = 0;
    for (let i = end - n + 1; i <= end; i++) s += a[i]; return s / n;
  };

  // Percentage zig-zag on completed bars. Returns alternating pivots [{i,p,t:'H'|'L'}]
  function zigzag(h, l, dev) {
    const piv = []; let dir = 0, ei = 0, ep = 0;
    let hi = h[0], hiI = 0, lo = l[0], loI = 0, i = 1;
    for (; i < h.length; i++) { // find the first confirmed leg
      if (h[i] > hi) { hi = h[i]; hiI = i; }
      if (l[i] < lo) { lo = l[i]; loI = i; }
      if (hiI < i && (hi - l[i]) / hi * 100 >= dev) { piv.push({ i: hiI, p: hi, t: 'H' }); dir = -1; ei = i; ep = l[i]; i++; break; }
      if (loI < i && (h[i] - lo) / lo * 100 >= dev) { piv.push({ i: loI, p: lo, t: 'L' }); dir = 1; ei = i; ep = h[i]; i++; break; }
    }
    if (!dir) return piv;
    for (; i < h.length; i++) {
      if (dir === -1) {
        if (l[i] < ep) { ep = l[i]; ei = i; }
        else if ((h[i] - ep) / ep * 100 >= dev) { piv.push({ i: ei, p: ep, t: 'L' }); dir = 1; ep = h[i]; ei = i; }
      } else {
        if (h[i] > ep) { ep = h[i]; ei = i; }
        else if ((ep - l[i]) / ep * 100 >= dev) { piv.push({ i: ei, p: ep, t: 'H' }); dir = -1; ep = l[i]; ei = i; }
      }
    }
    piv.push({ i: ei, p: ep, t: dir === 1 ? 'H' : 'L', prov: true }); // current extreme
    return piv;
  }

  const DEF = { lookback: 120, dev: 3, minT: 2, maxLast: 12, maxAge: 20, higherLows: false, volDry: false, stage2: false };

  function analyze(bars, o) {
    o = Object.assign({}, DEF, o || {});
    const n = bars.length; if (n < 30) return null;
    const cur = bars[n - 1], prev = bars[n - 2];
    const start = Math.max(0, n - 1 - o.lookback), done = bars.slice(start, n - 1); // completed bars only
    const H = done.map(b => b.h), L = done.map(b => b.l);
    const piv = zigzag(H, L, o.dev);
    // pullbacks = High -> next Low, chronological
    const pb = [];
    for (let k = 0; k + 1 < piv.length; k++)
      if (piv[k].t === 'H' && piv[k + 1].t === 'L')
        pb.push({ hi: piv[k].p, lo: piv[k + 1].p, hiI: piv[k].i + start, loI: piv[k + 1].i + start, depth: (piv[k].p - piv[k + 1].p) / piv[k].p * 100 });
    if (!pb.length) return null;
    // count contractions from the LAST candle backwards (right -> left)
    const seq = [pb[pb.length - 1]];
    for (let j = pb.length - 2; j >= 0; j--) {
      const nx = seq[0];
      if (pb[j].depth > nx.depth && (!o.higherLows || pb[j].lo < nx.lo)) seq.unshift(pb[j]); else break;
    }
    const last = seq[seq.length - 1], T = seq.length;
    const age = (n - 2) - last.loI; // completed bars since last pullback low
    const line = prev.h; // VCP line = high of the last completed candle
    const closes = bars.map(b => b.c), vols = bars.map(b => b.v);
    const v5 = sma(vols, 5, n - 2), v50 = sma(vols, 50, n - 2);
    const volRatio = v5 && v50 ? v5 / v50 : null;
    const s50 = sma(closes, 50, n - 1), s150 = sma(closes, 150, n - 1), s200 = sma(closes, 200, n - 1);
    const stage2 = s50 && s150 && s200 ? (cur.c > s50 && s50 > s150 && s150 > s200) : null;
    const setup = T >= o.minT && last.depth <= o.maxLast && age <= o.maxAge &&
      (!o.volDry || (volRatio !== null && volRatio < 1)) && (!o.stage2 || stage2 === true);
    return {
      setup, buy: setup && cur.c > line, T, depths: seq.map(x => +x.depth.toFixed(1)), lastDepth: +last.depth.toFixed(1),
      line, ltp: cur.c, pct: (cur.c - line) / line * 100, age, volRatio, stage2,
      lastLow: last.lo, firstI: seq[0].hiI, bars
    };
  }
  g.VCP = { analyze, zigzag, DEF };
  if (typeof module !== 'undefined') module.exports = g.VCP;
})(typeof window !== 'undefined' ? window : globalThis);
