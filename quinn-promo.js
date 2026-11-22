// QUINN'S SHOP ANNOUNCEMENTS on the website (22 Nov 2026, Sam): now and then she says, in different words, that her pictures can be bought
// as framed prints (30 x 30 cm, delivered home), that every picture is one of a kind, that sold means gone, and that an owner can order the print later.
// Lines + voice come from promo-data.js (rendered with her voice). Voice only plays when the visitor switched her voice on and she is not talking.
(function () {
  var L = window.QUINN_PROMO || [];
  if (!L.length) return;
  try { if (sessionStorage.getItem('qpromo') === 'x') return; } catch (e) {}
  var last = [], box = null, hideT = null;
  function build() {
    box = document.createElement('div'); box.id = 'qpromo'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite'); box.hidden = true;
    box.style.cssText = 'position:fixed;left:14px;bottom:14px;z-index:60;max-width:min(360px,calc(100vw - 28px));background:#171c36;color:#e8ecff;border:2px solid #3fd6c1;border-radius:12px;padding:12px 38px 12px 14px;font:15px/1.45 system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.45)';
    box.innerHTML = '<b style="color:#ffbf47">Quinn says</b><p id="qpromo-t" style="margin:4px 0 8px"></p><a href="shop.html" style="display:inline-block;background:#ffbf47;color:#1a1300;font-weight:700;border-radius:8px;padding:8px 14px;text-decoration:none">Framed prints and cards</a>' +
      '<button type="button" aria-label="Close the announcements" style="position:absolute;top:6px;right:8px;background:none;border:0;color:#9aa3d6;font-size:22px;line-height:1;cursor:pointer">&times;</button>';
    box.querySelector('button').onclick = function () { box.hidden = true; try { sessionStorage.setItem('qpromo', 'x'); } catch (e) {} clearTimeout(timer); };
    document.body.appendChild(box);
  }
  function show() {
    if (document.visibilityState !== 'visible') return;
    var fresh = L.map(function (_, i) { return i; }).filter(function (i) { return last.indexOf(i) < 0; });
    var i = fresh[Math.floor(Math.random() * fresh.length)]; last = last.concat([i]).slice(-4);
    if (!box) build();
    document.getElementById('qpromo-t').textContent = L[i].t; box.hidden = false;
    var QV = window.QuinnVoice;
    if (QV && QV.on && !QV.busy && L[i].f && QV.file) QV.file(L[i].f);
    clearTimeout(hideT); hideT = setTimeout(function () { if (box) box.hidden = true; }, Math.max(14000, ((L[i].d || 6) + 5) * 1000));
  }
  var timer;
  function next(first) { timer = setTimeout(function () { show(); next(false); }, first ? (/[?&]promotest=1/.test(location.search) ? 3000 : 75000 + Math.random() * 45000) : 180000 + Math.random() * 120000); }
  next(true);
})();
