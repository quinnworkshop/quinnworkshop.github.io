// PIXEL RELICS RARITY on the website (22 Nov 2026, Sam: Version 1, no NFT claim yet). Reads rarity-data.js (made by rarity-stage\rarity.py)
// and adds: the tier on every card in the shop, rarity filters, and a rarity panel on every card page (theme #n of N, badges, live theme
// supply, season, owner history, painted live). Facts only: no prices or promises of value.
(function () {
  var R = (window.QUINN_RARITY || {}).relics || {};
  var css = '.rr-tier{display:inline-block;font:600 11px/1.6 ui-monospace,Consolas,monospace;letter-spacing:.08em;text-transform:uppercase;padding:0 8px;border-radius:99px;border:1px solid currentColor;margin-top:4px}' +
    '.rr-Legendary{color:#c06a1c}.rr-Rare{color:#3478c0}.rr-Uncommon{color:#3f9160}.rr-Common{color:#808391}' +
    '.rr-box{margin:14px 0 0;text-align:left}.rr-box h2{font-size:1.05rem;margin:0 0 8px}.rr-badges{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}' +
    '.rr-badge{font-size:12px;padding:1px 8px;border-radius:4px;border:1px solid rgba(160,130,60,.6)}.rr-box dl{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;margin:8px 0}' +
    '.rr-box dt{opacity:.75}.rr-box dd{margin:0}.rr-note{font-size:12px;opacity:.75;margin-top:6px}.rr-proof{margin-top:12px}.rr-proof a{font-weight:600}.rr-check{font-size:13px;margin-top:6px}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  function mk(t, c, txt) { var e = document.createElement(t); if (c) e.className = c; if (txt != null) e.textContent = txt; return e; }
  window.relicOf = function (serial) { return R[serial] || null; };
  window.relicTier = function (serial) { var r = R[serial]; return r ? mk('span', 'rr-tier rr-' + r.tier, r.tier) : mk('span'); };
  window.relicMatch = function (serial, f) { var r = R[serial]; if (!f) return true; if (!r) return false;
    if (f === 'first') return r.first; if (f === 'requested') return r.origin === 'requested'; if (f === 'foil') return r.foil; if (f === 'animation') return /animation/.test(r.format); return r.tier === f; };
  window.relicPanel = function (c) {
    var r = R[c.serial], box = mk('div', 'box rr-box'); if (!r) return box;
    box.appendChild(mk('h2', '', 'Rarity')); box.appendChild(mk('span', 'rr-tier rr-' + r.tier, r.tier));
    var b = mk('div', 'rr-badges'), add = function (t) { b.appendChild(mk('span', 'rr-badge', t)); };
    if (r.first) add('First of its theme'); if (r.origin === 'requested') add('Requested by a viewer'); if (r.origin === 'self-portrait') add('Self-portrait');
    if (r.foil) add('Gold foil'); if (r.live === 'live') add('Broadcast live on stream'); if (r.live === 'partly') add('Partly broadcast live');   // Sam 22 Nov: only the positive fact, nothing on the others if (/animation/.test(r.format)) add('Animated'); add('Season ' + r.season); box.appendChild(b);
    var dl = mk('dl'), row = function (k, v) { dl.appendChild(mk('dt', '', k)); dl.appendChild(mk('dd', '', v)); };
    row('Theme', r.theme + ' #' + r.edition + ' of ' + r.of);
    row('In this theme', r.of === 1 ? 'the only one so far' : r.of + ' Relics, ' + r.sold_in_theme + ' sold, ' + r.left_in_theme + ' still free');
    row('Born', (r.format || '') + ', season ' + r.season);
    var when = r.painted_at ? r.painted_at.slice(0, 16) : '';
    if (r.live === 'live' || r.live === 'partly') row('Broadcast live', (r.live === 'live' ? 'yes, the whole painting was broadcast live on stream' : 'partly broadcast live on stream') + (when ? ' (' + when + ')' : ''));
    row('Owners', r.owner_history && r.owner_history.length ? r.owner_history.map(function (h) { return (h.date || '') + ' ' + (h.event || ''); }).join(' / ') : 'none yet');
    box.appendChild(dl);
    var pr = mk('div', 'rr-proof'), a = mk('a', '', 'Watch how it was made'); a.href = 'index.html#replay-' + encodeURIComponent(c.piece);
    pr.appendChild(a); pr.appendChild(mk('div', 'rr-note', 'A replay of Quinn’s own original steps for this Relic, in the same order and colours, with her own words. It is not a video of the stream.'));
    var chk = mk('div', 'rr-check', 'Checking the replay against this Relic’s fingerprint...'); pr.appendChild(chk); box.appendChild(pr);
    try {   // the fingerprint = SHA-256 of [size, frames, palette] of the exact pixels; the replay ends on these pixels
      var p = window.pieceOf && pieceOf(c.piece);
      crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify([p.size, p.thumb, p.pal]))).then(function (h) {
        var hex = Array.prototype.map.call(new Uint8Array(h), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
        chk.textContent = hex === c.fingerprint ? '✓ The replay ends on exactly this Relic: its pixels match the fingerprint.' : 'The replay picture does not match the fingerprint. Please tell the studio.';
      }).catch(function () { chk.textContent = ''; });
    } catch (e) { chk.textContent = ''; }
    box.appendChild(mk('div', 'rr-note', 'Rarity is worked out from Quinn\'s own register and changes as she paints more: the more Relics a theme gets, the lower its theme part; when a theme sells out, its free Relics rise. Born facts (theme number, first of its theme, requested, foil, season) never change.' + (r.foil && r.foil_proof ? ' The foil was decided by public randomness (drand round ' + r.foil_proof.drand_round + '), nobody can choose it.' : '')));
    return box;
  };
})();
