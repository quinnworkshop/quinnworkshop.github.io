// QUINN CARDS page code (21 Nov 2026): reads cards.json (the register) and pieces.js (the pixels).
var TIP = 'https://streamelements.com/quinnworkshop/tip';
function loadCards(cb) { var s = document.createElement('script'); s.src = 'cards-data.js?t=' + Date.now(); s.onload = function () { cb(window.QUINN_CARDS || null); }; s.onerror = function () { cb(null); }; document.head.appendChild(s); }
function pieceOf(id) { var a = window.QUINN_PIECES || []; for (var i = 0; i < a.length; i++) if (a[i].id === id) return a[i]; return null; }
function drawer(canvas, p) { var n = p.size, k = 0; canvas.width = canvas.height = n;
  function draw() { var g = canvas.getContext('2d'), px = p.thumb[k % p.thumb.length]; g.fillStyle = '#000'; g.fillRect(0, 0, n, n);
    for (var i = 0; i < px.length; i++) if (px[i]) { var h = String(p.pal[px[i] - 1] || '#000'); g.fillStyle = h.charAt(0) === '#' ? h : '#' + h; g.fillRect(i % n, Math.floor(i / n), 1, 1); } k++; }
  draw(); if (p.thumb.length > 1) setInterval(draw, p.ms || 150); }
function el(t, c, txt) { var e = document.createElement(t); if (c) e.className = c; if (txt) e.textContent = txt; return e; }
function money(v) { return v + ' dollars'; }
function priceOf(reg, c) { return reg.prices[String(c.size)]; }
