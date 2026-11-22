// QUINN CARDS page code (21 Nov 2026): reads cards.json (the register) and pieces.js (the pixels).
var TIP = 'https://streamelements.com/quinnworkshop/tip';
var SHOP = { digital: { 16: 'https://walcarius.gumroad.com/l/quinn16', 32: 'https://walcarius.gumroad.com/l/quinn32', 64: 'https://walcarius.gumroad.com/l/quinn64', 128: 'https://walcarius.gumroad.com/l/quinn128' }, bundle: 'https://walcarius.gumroad.com/l/quinnprint', request: 'https://walcarius.gumroad.com/l/quinnrequest', requestprint: 'https://walcarius.gumroad.com/l/quinnrequestprint', printlater: 'https://walcarius.gumroad.com/l/quinnprintlater' };   // the Gumroad product links, filled in when the products exist (empty = the tip page is used)
var BUNDLE_PRICE = 64.99, LATER_PRICE = 59.99;
var API = 'https://quinn-cards.quinnworkshop.workers.dev';   // the address of the automatic shop (Cloudflare Worker); empty = the shop is not connected yet, the tip page is used

function loadCards(cb) { var s = document.createElement('script'); s.src = 'cards-data.js?t=' + Date.now();
  s.onload = function () { var r = window.QUINN_CARDS || null; if (!r || !API) return cb(r);
    fetch(API + '/api/register').then(function (x) { return x.json(); }).then(function (o) { r.cards.forEach(function (c) { if (o[c.serial]) { c.owner = o[c.serial].owner; c.status = 'owned'; c.history = c.history.concat([{ date: o[c.serial].date, event: 'bought at the shop by ' + o[c.serial].owner, price: o[c.serial].price }]); } }); cb(r); }).catch(function () { cb(r); }); };
  s.onerror = function () { cb(null); }; document.head.appendChild(s); }
function pieceOf(id) { var a = window.QUINN_PIECES || []; for (var i = 0; i < a.length; i++) if (a[i].id === id) return a[i]; return null; }
function drawer(canvas, p) { var n = p.size, k = 0; canvas.width = canvas.height = n;
  function draw() { var g = canvas.getContext('2d'), px = p.thumb[k % p.thumb.length]; g.fillStyle = '#000'; g.fillRect(0, 0, n, n);
    for (var i = 0; i < px.length; i++) if (px[i]) { var h = String(p.pal[px[i] - 1] || '#000'); g.fillStyle = h.charAt(0) === '#' ? h : '#' + h; g.fillRect(i % n, Math.floor(i / n), 1, 1); } k++; }
  draw(); if (p.thumb.length > 1) setInterval(draw, p.ms || 150); }
function el(t, c, txt) { var e = document.createElement(t); if (c) e.className = c; if (txt) e.textContent = txt; return e; }
function money(v) { return v + ' dollars'; }
function priceOf(reg, c) { return reg.prices[String(c.size)]; }

var FRAMES = [['white', 'White'], ['wood', 'Wood'], ['dark', 'Dark wood'], ['black', 'Black']];
function link(base, serial, extra) { return base + (base.indexOf('?') >= 0 ? '&' : '?') + 'card=' + serial + (extra || ''); }
// the buying box of a card page: digital card, or card plus framed print with a frame colour
function buyBox(b, r, c, k) {
  var rq = !!k, base = rq ? SHOP.request : SHOP.digital[c.size], BUNDLE = rq ? SHOP.requestprint : SHOP.bundle, DPRICE = rq ? r.request_price : priceOf(r, c), KX = rq ? '&k=' + k : '';
  if (!base) {
    b.innerHTML = '';
    b.appendChild(el('b', '', 'Get this card for ' + money(DPRICE) + '.'));
    var ul = el('ul'); ['Pay on the tip page.', 'In the message write ' + c.serial + ' and your name.', "Quinn's studio then sends you the full card file and puts your name here as the owner."].forEach(function (t) { ul.appendChild(el('li', '', t)); }); b.appendChild(ul);
    var pp = el('p'); var tl = el('a', 'btn', 'Get this card'); tl.href = TIP; tl.target = '_blank'; tl.rel = 'noopener'; pp.appendChild(tl); b.appendChild(pp); return;
  }
  var frame = 'black', pf = 0, pc = pieceOf(c.piece);
  b.innerHTML = '';
  b.appendChild(el('b', '', 'Get this card'));
  b.appendChild(el('p', '', 'Pay in the secure checkout (Google Pay and cards work). Type the name you want shown as the owner. After paying you download your card file and your name appears on this page.'));
  var d = el('p'); var a1 = el('a', 'btn', 'Digital card: ' + money(DPRICE)); a1.href = link(base, c.serial, KX); d.appendChild(a1); b.appendChild(d);
  if (BUNDLE) {
    b.appendChild(el('p', '', 'Or get the card AND a framed print (30 x 30 cm, ready to hang, shipped to you): ' + money(BUNDLE_PRICE) + ', the same for every size.'));
    var wall = el('div', 'wall'), fr = el('div', 'fr ' + frame), cv = el('canvas'); fr.appendChild(cv); wall.appendChild(fr); b.appendChild(wall);
   // same look as the approved frame preview (reportrame-preview.html)
    function still() { var one = { size: pc.size, pal: pc.pal, thumb: [pc.thumb[pf]], ms: 0 }; drawer(cv, one); }
    still();
    if (pc.thumb.length > 1) { b.appendChild(el('p', '', 'This card is an animation. Pick the frame that will be printed:')); var strip = el('div', 'strip');
      pc.thumb.forEach(function (_, i) { var t = el('canvas'); t.setAttribute('role', 'button'); t.tabIndex = 0; drawer(t, { size: pc.size, pal: pc.pal, thumb: [pc.thumb[i]], ms: 0 }); t.onclick = function () { pf = i; [].forEach.call(strip.children, function (x, k) { x.className = k === i ? 'on' : ''; }); still(); setLink(); }; if (i === 0) t.className = 'on'; strip.appendChild(t); }); b.appendChild(strip); }
    var row = el('div', 'frames'); var a2 = el('a', 'btn', 'Card + framed print: ' + money(BUNDLE_PRICE));
    function setLink() { a2.href = link(BUNDLE, c.serial, KX + '&frame=' + frame + '&pf=' + pf); fr.className = 'fr ' + frame; }
    FRAMES.forEach(function (f) { var bt = el('button', '', f[1]); bt.type = 'button'; bt.setAttribute('aria-pressed', f[0] === frame ? 'true' : 'false'); bt.onclick = function () { frame = f[0]; [].forEach.call(row.children, function (x) { x.setAttribute('aria-pressed', x === bt ? 'true' : 'false'); }); setLink(); }; row.appendChild(bt); });
    b.appendChild(row); setLink(); var d2 = el('p'); d2.appendChild(a2); b.appendChild(d2);
  }
}
