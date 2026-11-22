(function () {
  var PIECES = window.QUINN_PIECES || [], STORY = window.QUINN_STORY || {}, frame = null, run = 0;
  var $ = function (id) { return document.getElementById(id); };
  var sl = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var SPOKEN = {}, TL_HAS_SAY = false;
  var TOOLN = { PEN: 0, LINE: 1, BOX: 2, SOLID: 3 };
  function putPx(px, n, x, y, c) {
    if (x < 0 || y < 0 || x >= n || y >= n) return;
    px[y * n + x] = c;
  }
  function linePx(px, n, x0, y0, x1, y1, c) {
    var dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, e = dx + dy;
    for (;;) { putPx(px, n, x0, y0, c); if (x0 === x1 && y0 === y1) break; var e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
  }
  function boxPx(px, n, a, c, solid) {
    var x0 = Math.min(a[0], a[2]), x1 = Math.max(a[0], a[2]), y0 = Math.min(a[1], a[3]), y1 = Math.max(a[1], a[3]);
    for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) if (solid || x === x0 || x === x1 || y === y0 || y === y1) putPx(px, n, x, y, c);
  }
  function orderPx(px, n, o) {
    var t = TOOLN[o[0]], a = o[1], c = o[2];
    if (t === 0) putPx(px, n, a[0], a[1], c);
    else if (t === 1) linePx(px, n, a[0], a[1], a[2], a[3], c);
    else if (t === 2) boxPx(px, n, a, c, false);
    else if (t === 3) boxPx(px, n, a, c, true);
  }
  function fillFrame(p, f) {
    var px = new Uint8Array(p.size * p.size);
    for (var j = 0; j < f.length; j++) orderPx(px, p.size, f[j]);
    return px;
  }
  function norm(s) { return (s || '').replace(/\s+/g, ' ').trim().toLowerCase(); }
  function wasSaid(s) { return !!SPOKEN[norm(s)]; }
  var SONGS = [
    ['8-BIT BOOM BAP (SAM STYLE)', 'songs/8-bit-boom-bap-sam-style.mp3'],
    ['FLOOR BREAKER (DARK REMIX)', 'songs/floor-breaker-dark-remix.mp3'],
    ['PIXEL HEARTS (SAM STYLE)', 'songs/pixel-hearts-sam-style.mp3'],
    ['SAM ATMOSPHERIC JUNGLE', 'songs/sam-atmospheric-jungle.mp3'],
    ['SAM CLOUDY BREAKS', 'songs/sam-cloudy-breaks.mp3'],
    ['SAM NEO DRIVE', 'songs/sam-neo-drive.mp3'],
    ['SAM RAINY TAPE REMIX', 'songs/sam-rainy-tape-remix.mp3']
  ];
  function wear(mode) {
    if (mode === 'rest') mode = 'chat';
    if (window.QuinnLive && QuinnLive.mode) QuinnLive.mode(mode);
  }
  function look(to) {
    try { frame.contentWindow.ROOM.look(to === 'front' ? 'front' : 'room'); } catch (e) {}
  }
  PIECES.forEach(function (p, i) {
    var b = document.createElement('button'), c = document.createElement('canvas'), k = 0;
    c.width = c.height = p.size;
    function draw() {
      var g = c.getContext('2d'), px = p.thumb[k % p.thumb.length];
      g.clearRect(0, 0, p.size, p.size);
      for (var n = 0; n < px.length; n++) if (px[n]) { g.fillStyle = p.pal[px[n] - 1]; g.fillRect(n % p.size, Math.floor(n / p.size), 1, 1); }
      k++;
    }
    draw(); if (p.thumb.length > 1) setInterval(draw, p.ms || 133);
    b.appendChild(c); b.appendChild(document.createTextNode(p.title)); b.onclick = function () { play(i); };
    $('gal').appendChild(b);
  });
  async function type(text, id, key, file) {
    var el = $('say'); el.textContent = ''; SPOKEN[norm(text)] = true;
    var vp = null;
    if (window.QuinnVoice && file && QuinnVoice.file) vp = QuinnVoice.file(file);
    else if (window.QuinnVoice && key && QuinnVoice.dur(key)) vp = QuinnVoice.say(key);
    if (vp) {
      var done = false; vp.then(function () { done = true; });
      while (!done && id === run) {
        var a = QuinnVoice.audio, n = a && a.duration ? Math.round(text.length * Math.min(1, a.currentTime / a.duration)) : 0;
        if (el.textContent.length !== n) { el.textContent = text.slice(0, n); if (window.QuinnLive) QuinnLive.say(el.textContent); }
        await sl(40);
      }
    } else {
      for (var i = 0; i < text.length && id === run; i += 2) { el.textContent = text.slice(0, i + 2); if (window.QuinnLive) QuinnLive.say(el.textContent); await sl(50); }
    }
    if (id === run) { el.textContent = text; if (window.QuinnLive) QuinnLive.stopTalking(); }
    else if (window.QuinnVoice) QuinnVoice.stop();
  }
  function rating(r) {
    r = r || {};
    var s = parseInt(r.score, 10) || 0;
    $('stars').textContent = r.stars || (s ? '★'.repeat(s) + '☆'.repeat(5 - s) : '');
    $('rate').innerHTML = '';
    if (r.html) {
      var doc = new DOMParser().parseFromString(r.html, 'text/html');
      [].forEach.call(doc.body.children, function (node) { $('rate').appendChild(document.importNode(node, true)); });
      return;
    }
    [['Matches my plan', r.match], ['Best part', r.best], ['Next time', r.change]].forEach(function (x) {
      if (!x[1]) return;
      var d = document.createElement('div'), b = document.createElement('b');
      b.textContent = x[0] + ': '; d.appendChild(b); d.appendChild(document.createTextNode(x[1])); $('rate').appendChild(d);
    });
  }
  async function recording(id) {
    try {
      var r = await fetch('screens/' + id + '.json');
      if (!r.ok) return null;
      var json = await r.json();
      var h = await fetch('screens/' + id + '.webm', { method: 'HEAD' });
      if (!h.ok) return null;
      return { json: json, src: 'screens/' + id + '.webm' };
    } catch (e) { return null; }
  }
  function sayStep(p, text, id) {
    if (TL_HAS_SAY) return;
    var m = /^Drawing: order (\d+) of/.exec(text || '');
    if (!m) return;
    var steps = ((STORY[p.id] || {}).steps || []), i = parseInt(m[1], 10) - 1;
    var pr = null;   // 22 Nov 2026 (Sam): the replay must WAIT for each spoken line (a new line cut the one still being spoken); replay() awaits this
    for (var k = 0; k < steps.length; k++) if (steps[k].f === 1 && steps[k].at === i && steps[k].say) pr = type(steps[k].say, id, p.id + '.s1.' + i);
    return pr;
  }
  function applyEvent(ev, id, p) {
    if (ev.type === 'state') { $('state').textContent = ev.text || ''; sayStep(p, ev.text, id); }
    else if (ev.type === 'mode') wear(ev.mode);
    else if (ev.type === 'pose' && window.QuinnLive && QuinnLive.pose) QuinnLive.pose(ev.n, ev.ms);
    else if (ev.type === 'look') look(ev.to);
    else if (ev.type === 'say') { if (!wasSaid(ev.text)) type(ev.text || '', id, ev.key, ev.f); }
    else if (ev.type === 'react' && window.QuinnVoice && QuinnVoice.react) QuinnVoice.react(ev.cat);
    else if (ev.type === 'bg' && window.QuinnVoice && QuinnVoice.bg) QuinnVoice.bg(ev.cat, ev.vol);
    else if (ev.type === 'rate') rating(ev);
  }
  function stopReplay() {
    if (!window.__replayOn) return;
    window.__replayOn = false; run++;
    if (window.QuinnVoice) QuinnVoice.stop();
    try { frame.contentWindow.ROOM.hidePicture(); } catch (e) {}
    $('state').textContent = 'Replay stopped.';
  }
  async function replay(p, id, rateNow) {
    if (!p.frames || !p.frames.length) return false;
    window.__replayOn = false;
    var n = p.size, px = new Uint8Array(n * n), first = p.frames[0] || [];
    try { frame.contentWindow.ROOM.showPartial(p, px); } catch (e) {}
    for (var i = 0; i < first.length; i++) {
      if (id !== run) return true;
      orderPx(px, n, first[i]);
      try { frame.contentWindow.ROOM.showPartial(p, px); } catch (e) {}
      var txt = 'Drawing: order ' + (i + 1) + ' of ' + first.length;
      $('state').textContent = txt; var spoken = sayStep(p, txt, id); if (spoken) await spoken;
      await sl(250 + (i % 3) * 80);
    }
    if (id !== run) return true;
    if (p.kind === 'anim') {
      for (var f = 1; f < p.frames.length; f++) {
        if (id !== run) return true;
        try { frame.contentWindow.ROOM.showPartial(p, fillFrame(p, p.frames[f])); } catch (e) {}
        $('state').textContent = 'Frame ' + (f + 1) + ' of ' + p.frames.length;
        await sl(90);
      }
    }
    if (id !== run) return true;
    rating(rateNow); wear('chat'); look('front');
    $('state').textContent = p.kind === 'anim' ? 'Finished. The animation is playing.' : 'Finished. This piece is a still picture.';
    try { frame.contentWindow.ROOM.showPicture(p); } catch (e) {}
    window.__replayOn = true;
    setTimeout(function () { if (id === run) wear('rest'); }, 9000);
    return true;
  }
  // 19 Nov 2026 (Sam): selling step 1. A requested painting can be bought by the person who asked for it, for 5 dollars, during
  // the first 7 days (PayPal.me; Sam checks the buyer's name). After that: auction (coming soon). Every piece is one of a kind.
  var PAYPAL = 'https://paypal.me/samwalcarius/5USD';
  function buyPanel(p) {
    var card = $('buycard'), box = $('buy'); if (!card || !box) return;
    var r = p && p.requested_by; if (!r || !r.at) { card.hidden = true; return; }
    var t0 = new Date(r.at.replace(' ', 'T')), until = new Date(t0.getTime() + 7 * 864e5), open = Date.now() < until.getTime();
    var day = until.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    box.innerHTML = ''; card.hidden = false;
    var who = document.createElement('p'); who.className = 'buyline';
    who.textContent = open ? ('Requested by ' + r.name + ' on ' + (r.platform || 'stream') + '. Reserved for ' + r.name + ' until ' + day + '.')
                           : ('Requested by ' + r.name + '. The 7 days are over: this one-of-a-kind piece goes to auction (coming soon).');
    box.appendChild(who);
    if (open) {
      var a = document.createElement('a'); a.id = 'buybtn'; a.href = PAYPAL; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'BUY FOR 5 DOLLARS';
      var n = document.createElement('p'); n.className = 'buynote'; n.textContent = 'Only for ' + r.name + '. In the PayPal note, write the painting\u2019s name: \u201C' + (p.title || '') + '\u201D and your ' + (r.platform || '') + ' name. After paying you receive your painting by email: a full-size picture file, yours to keep, and the email lets you download it again any time.';
      box.appendChild(a); box.appendChild(n);
    }
  }  async function play(i) {
    var p = PIECES[i], id = ++run;
    window.__replayOn = false;
    if (window.QuinnVoice) QuinnVoice.stop();
    try { frame.contentWindow.ROOM.stopVideo(); frame.contentWindow.ROOM.hidePicture(); } catch (e) {}
    SPOKEN = {}; TL_HAS_SAY = false;
    window.__cur = i; buyPanel(p);
    [].forEach.call($('gal').children, function (b, n) { b.classList.toggle('on', n === i); });
    $('stars').textContent = ''; $('rate').textContent = 'She rates a piece when it is finished.'; $('state').textContent = 'Getting the recording ready';
    wear('chat'); look('front');
    if (STORY._intro && !window.__introDone) {
      window.__introDone = true; $('state').textContent = 'Quinn introduces herself'; await sl(500);
      await type(STORY._intro, id, 'intro'); await sl(900); if (id !== run) return;
    }
    var plan = (STORY[p.id] || {}).plan || p.plan;
    if (plan) { $('state').textContent = 'Quinn tells you what she made'; await type(plan, id, p.id + '.plan'); if (id !== run) return; }
    var insp = (STORY[p.id] || {}).inspiration;
    if (insp) { $('state').textContent = 'Quinn tells where the idea came from'; await type(insp, id, p.id + '.insp'); if (id !== run) return; }
    var rec = await recording(p.id);
    if (id !== run) return;
    var rateNow = p.rate || {};
    if (!rec) {
      var replayed = await replay(p, id, rateNow);
      if (replayed || id !== run) return;
      rating(rateNow); wear('chat'); look('front');
      $('state').textContent = 'Finished. This piece is a still picture.'; try { frame.contentWindow.ROOM.showPicture(p); } catch (e) {}
      setTimeout(function () { if (id === run) wear('rest'); }, 9000);
      return;
    }
    var tl = rec.json, seen = {}, start = performance.now();
    TL_HAS_SAY = (tl.events || []).some(function (ev) { return ev.type === 'say'; });
    $('state').textContent = 'Playing her recording';
    var pump = setInterval(function () {
      if (id !== run) return;
      var w = frame.contentWindow, v = w.document.getElementById('screenVideo');
      var t = v && v.src && !v.paused ? v.currentTime : (performance.now() - start) / 1000;
      (tl.events || []).forEach(function (ev, n) { if (t >= ev.t && !seen[n]) { seen[n] = true; if (ev.type === 'rate') rateNow = ev; applyEvent(ev, id, p); } });
    }, 50);
    await frame.contentWindow.ROOM.playVideo(rec.src, 1);
    clearInterval(pump);
    if (id !== run) return;
    (tl.events || []).forEach(function (ev, n) { if (!seen[n]) { seen[n] = true; if (ev.type === 'rate') rateNow = ev; applyEvent(ev, id, p); } });
    rating(rateNow); wear('chat'); look('front');
    $('state').textContent = p.kind === 'anim' ? 'Finished. The animation is playing.' : 'Finished.'; try { frame.contentWindow.ROOM.showPicture(p); } catch (e) {}
    setTimeout(function () { if (id === run) wear('rest'); }, 9000);
  }
  function scene(ev) {
    var w = frame.contentWindow, b = w.document.getElementById('bezel'), c = b && b.querySelector('canvas');
    if (!c) return null;
    var m = new w.DOMMatrix(w.getComputedStyle(b).transform), w0 = parseFloat(c.style.width), Q = w.DeckKid.QUAD;
    var p1x = (m.m11 * w0 + m.m41) / (m.m14 * w0 + 1), S = (p1x - m.m41) / (Q[1][0] - Q[0][0]), r = frame.getBoundingClientRect();
    var x = ev.clientX - r.left, y = ev.clientY - r.top;
    return { x: x, y: y, sx: (x - (m.m41 - Q[0][0] * S)) / S, sy: (y - (m.m42 - Q[0][1] * S)) / S };
  }
  var near = function (s, cx, cy, r) { return s && Math.hypot(s.sx - cx, s.sy - cy) < r; };
  var box = function (s, x, y, w, h) { return !!s && s.sx >= x && s.sx <= x + w && s.sy >= y && s.sy <= y + h; };
  function what(s) {
    if (!s) return null;
    if (near(s, 1300, 440, 20)) return ['light', 'CLICK: switch the room light on or off'];
    if (near(s, 1100, 676, 18)) return ['volume', 'VOLUME: drag up or down, or click the top half for louder and the bottom half for softer'];
    if (near(s, 1100, 578, 15)) return ['music', 'CLICK: music on or off'];
    if (near(s, 1100, 628, 24)) return ['dial', 'SONG DIAL: click the right side for the next song, or drag / scroll the wheel'];
    if (box(s, 528, 190, 494, 526)) return ['screen', 'CLICK: turn the screen towards you'];
    if (box(s, 270, 236, 174, 414)) return ['arcade', 'CLICK: play a game on the arcade machine'];
    if (box(s, 1096, 64, 126, 176)) return ['p-rain', 'CLICK: open the RAINLIGHT 2091 poster'];
    if (box(s, 1244, 96, 104, 140)) return ['p-space', 'CLICK: play the STAR-TRAX space demo'];
    if (box(s, 450, 60, 92, 128)) return ['p-ninja', 'CLICK: play the CRYSTAL NINJA Amiga demo'];
    if (box(s, 1236, 270, 110, 84)) return ['p-deck', 'CLICK: open the Brain-Deck poster'];
    if (box(s, 556, 100, 470, 78)) return ['toys', 'CLICK: open Quinn\u2019s gallery of finished pictures'];
    return null;
  }
  var shade = null, pop = null, audio = new Audio(), si = 0, musicOn = false, musicWas = false;
  audio.preload = 'none';
  function vol() {
    try { var v = frame.contentWindow.ROOM.volume(); return Math.max(0, Math.min(1, v)); } catch (e) { return .55; }
  }
  function song() { $('song').textContent = musicOn ? SONGS[si][0] + '  (' + Math.round(vol() * 100) + '%)' : 'off'; }
  function music(on, step) {
    si = (si + (step || 0) + SONGS.length) % SONGS.length; musicOn = on;
    if (on) {
      hear(); audio.src = SONGS[si][1]; audio.volume = vol();
      audio.play().catch(function () {});
    } else audio.pause();
    song();
  }
  audio.onended = function () { music(true, 1); };
  var actx = null, ana = null, buf = null, level = 0, phase = 0, still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function hear() {
    if (actx) { actx.resume(); return; }
    try {
      actx = new (window.AudioContext || window.webkitAudioContext)();
      var src = actx.createMediaElementSource(audio);
      ana = actx.createAnalyser(); ana.fftSize = 512; buf = new Uint8Array(ana.fftSize);
      src.connect(ana); ana.connect(actx.destination);
    } catch (e) { ana = null; }
  }
  function groove() {
    var now = 0;
    if (ana && musicOn && !audio.paused) {
      ana.getByteTimeDomainData(buf); var s = 0;
      for (var i = 0; i < buf.length; i++) { var v = (buf[i] - 128) / 128; s += v * v; }
      now = Math.min(1, Math.sqrt(s / buf.length) * 6);
    }
    level += (now - level) * (now > level ? .5 : .12); phase += .11 + level * .12;
    var b = $('qbody');
    if (b) b.style.transform = still || level < .01 ? '' : 'translateY(' + (-level * 9 * Math.abs(Math.sin(phase))).toFixed(2) + 'px) rotate(' + (level * 7 * Math.sin(phase * .5)).toFixed(2) + 'deg)';
    window.QUINN_LEVEL = level; requestAnimationFrame(groove);
  }
  function local(ev, r) {
    return { bubbles: true, cancelable: true, clientX: ev.clientX - r.left, clientY: ev.clientY - r.top, pointerId: 1, pointerType: 'mouse', button: 0, isPrimary: true };
  }
  function inside(s, ev) {
    var w = frame.contentWindow, rc = w.document.getElementById('room'), t = w.document.elementFromPoint(s.x, s.y);
    if (!t) return;
    t.dispatchEvent(new w.PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: s.x, clientY: s.y, pointerId: 1, pointerType: 'mouse', button: 0, isPrimary: true }));
    rc.dispatchEvent(new w.PointerEvent('pointerup', { bubbles: true, clientX: s.x, clientY: s.y, pointerId: 1, pointerType: 'mouse', button: 0, isPrimary: true }));
  }
  function drag(s, ev) {
    var w = frame.contentWindow, rc = w.document.getElementById('room'), r = frame.getBoundingClientRect();
    rc.dispatchEvent(new w.PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: s.x, clientY: s.y, pointerId: 1, pointerType: 'mouse', button: 0, isPrimary: true }));
    try { shade.setPointerCapture(ev.pointerId); } catch (e) {}
    function move(e) { rc.dispatchEvent(new w.PointerEvent('pointermove', local(e, r))); }
    function up(e) { rc.dispatchEvent(new w.PointerEvent('pointerup', local(e, r))); shade.removeEventListener('pointermove', move); shade.removeEventListener('pointerup', up); }
    shade.addEventListener('pointermove', move); shade.addEventListener('pointerup', up); shade.addEventListener('pointercancel', up);
  }
  function openPop(title, node) { $('poptitle').textContent = title; var b = $('popbody'); b.innerHTML = ''; b.appendChild(node); pop.classList.add('on'); $('popx').focus(); }
  function closePop() {
    pop.classList.remove('on'); $('popbody').innerHTML = ''; $('popbody').style.padding = '';
    if (musicWas) { musicWas = false; music(true); }
  }
  function note(text) { var p = document.createElement('p'); p.textContent = text; return p; }
  function picture(src, alt) { var i = document.createElement('img'); i.className = 'big'; i.src = src; i.alt = alt; i.loading = 'lazy'; i.style.imageRendering = 'pixelated'; i.style.minWidth = '55%'; return i; }
  function library() {
    var d = document.createElement('div'); d.className = 'lib';
    PIECES.forEach(function (p) {
      var f = document.createElement('figure'), c = document.createElement('canvas'), k = 0;
      c.width = c.height = p.size;
      function draw() {
        if (!c.isConnected && k) return;
        var g = c.getContext('2d'), px = p.thumb[k % p.thumb.length];
        g.clearRect(0, 0, p.size, p.size);
        for (var n = 0; n < px.length; n++) if (px[n]) { g.fillStyle = p.pal[px[n] - 1]; g.fillRect(n % p.size, Math.floor(n / p.size), 1, 1); }
        k++;
      }
      draw(); if (p.thumb.length > 1) setInterval(draw, p.ms || 133);
      var cap = document.createElement('figcaption'), sm = document.createElement('small'), s = parseInt((p.rate || {}).score, 10) || 0;
      cap.textContent = p.title + '  ' + (p.size + ' x ' + p.size) + (p.kind === 'anim' ? ', ' + p.frames.length + ' frames' : '');
      sm.textContent = (s ? '★'.repeat(s) + '☆'.repeat(5 - s) + '  ' : '') + p.plan;
      cap.appendChild(sm); f.appendChild(c); f.appendChild(cap); d.appendChild(f);
    });
    return d;
  }
  function pauseForVideo() { if (musicOn) { musicWas = true; music(false); } }
  function arcade() {
    var d = document.createElement('div'); d.className = 'carts';
    [['quinntrain', "QUINN'S TRAIN"], ['quinnpaddle', "QUINN'S PADDLE"], ['crystalninja', 'CRYSTAL NINJA'], ['parafruit', 'PARA-FRUIT']].forEach(function (g) {
      var b = document.createElement('button'), i = document.createElement('img');
      b.type = 'button'; i.src = 'boxart/' + g[0] + '.png'; i.alt = g[1] + ' box art'; i.loading = 'lazy';
      b.appendChild(i); b.appendChild(document.createTextNode(g[1])); b.onclick = function () { game(g); }; d.appendChild(b);
    });
    openPop('ARCADE: CHOOSE A GAME', d); d.firstChild.focus();
  }
  function game(g) {
    var f = document.createElement('iframe');
    f.src = 'arcade.html?app=' + g[0]; f.title = g[1]; f.allow = 'gamepad; autoplay';
    f.style.cssText = 'width:100%;height:100%;border:0;display:block';
    pauseForVideo(); openPop(g[1], f); $('popbody').style.padding = '0';
    f.onload = function () { f.contentWindow.focus(); };
  }
  function clickRoom(e) {
    var s = scene(e), h = what(s); if (!h) return;
    e.preventDefault();
    var k = h[0];
    if (k === 'light') {
      var w = frame.contentWindow, t = w.document.elementFromPoint(s.x, s.y);
      if (t) { t.dispatchEvent(new w.PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: s.x, clientY: s.y, pointerId: 1, pointerType: 'mouse', button: 0 })); w.dispatchEvent(new w.PointerEvent('pointerup', { bubbles: true, clientX: s.x, clientY: s.y, pointerId: 1, pointerType: 'mouse', button: 0 })); }
    } else if (k === 'volume' || k === 'dial') drag(s, e);
    else if (k === 'music') music(!musicOn);
    else if (k === 'screen') look('front');
    else if (k === 'toys') openPop('QUINN’S ARTWORK LIBRARY', library());
    else if (k === 'p-space') {
      var v = document.createElement('video'); v.src = 'media/startrax-demo.mp4'; v.autoplay = true; v.controls = false;
      v.onloadedmetadata = function () { v.playbackRate = 1.5; }; v.onplay = function () { v.playbackRate = 1.5; }; v.onended = closePop;
      pauseForVideo(); openPop('STAR-TRAX (1.5x speed)', v);
    } else if (k === 'p-ninja') {
      var vn = document.createElement('video'); vn.src = 'media/crystal-ninja-amiga-demo.mp4'; vn.autoplay = true; vn.controls = false; vn.onended = closePop;
      pauseForVideo(); openPop('CRYSTAL NINJA (AMIGA DEMO)', vn);
    }     else if (k === 'p-rain') openPop('RAINLIGHT 2091', picture('media/rainlight-poster.png', 'Rainlight 2091 poster artwork'));
    else if (k === 'p-deck') openPop('THE BRAIN-DECK', picture('media/braindeck-poster.png', 'Brain-Deck poster artwork'));
    else if (k === 'arcade') arcade();
  }
  function boot() {
    frame = $('deck'); shade = $('shade'); pop = $('pop');
    $('popx').onclick = closePop;
    addEventListener('keydown', function (e) { if (e.key === 'Escape') closePop(); });
    shade.addEventListener('mousemove', function (e) { var h = what(scene(e)), t = $('tip'), r = $('shop').getBoundingClientRect(); shade.style.cursor = h ? 'pointer' : ''; shade.title = '';
      if (!t) return; if (!h) { t.style.display = 'none'; return; } t.textContent = h[1]; t.style.display = 'block';   // 19 Nov (Sam): a clear label at once, next to the mouse
      var x = e.clientX - r.left + 16, y = e.clientY - r.top + 18; if (x + t.offsetWidth > r.width - 8) x = e.clientX - r.left - t.offsetWidth - 12; if (y + t.offsetHeight > r.height - 8) y = e.clientY - r.top - t.offsetHeight - 12; t.style.left = x + 'px'; t.style.top = y + 'px'; });
    shade.addEventListener('mouseleave', function () { var t = $('tip'); if (t) t.style.display = 'none'; });
    $('aboutbtn').onclick = function () { $('about').classList.add('open'); }; $('aboutx').onclick = function () { $('about').classList.remove('open'); };
    addEventListener('keydown', function (e) { if (e.key === 'Escape') $('about').classList.remove('open'); });
    shade.addEventListener('pointerdown', clickRoom);
    function wheelRoom(e) {
      var r = frame.getBoundingClientRect(), s = scene({ clientX: e.clientX, clientY: e.clientY }), h = what(s), w = frame.contentWindow, rc = w.document.getElementById('room');
      if (!h || (h[0] !== 'dial' && h[0] !== 'volume') || !w || !rc) return;
      e.preventDefault();
      rc.dispatchEvent(new w.WheelEvent('wheel', { bubbles: true, cancelable: true, clientX: e.clientX - r.left, clientY: e.clientY - r.top, deltaY: e.deltaY }));
    }
    shade.addEventListener('wheel', wheelRoom, { passive: false });
    frame.addEventListener('wheel', wheelRoom, { passive: false });
    addEventListener('message', function (e) {
      if (e.origin !== location.origin || !e.data) return;
      if (e.data.type === 'arcade-back') closePop();
      else if (e.data.type === 'room-step') music(true, e.data.dir === 'up' || e.data.dir === 'right' ? 1 : -1);
      else if (e.data.type === 'room-volume') { if (musicOn) audio.volume = e.data.v; song(); }
      else if (e.data.type === 'room-video-start') { if (musicOn) { musicWas = true; music(false); } }
      else if (e.data.type === 'room-video-end' && musicWas) { musicWas = false; music(true); }
    });
    if (window.QuinnAnime) {
      QuinnAnime.start($('qcam')); $('qcam').hidden = false; var sv0 = $('quinn'); if (sv0) sv0.style.display = 'none'; var x0 = $('qextra'); if (x0) x0.innerHTML = '';
    }
    wear('rest'); song(); requestAnimationFrame(groove);
    document.addEventListener('pointerdown', function (e) {
      if (!window.__replayOn) return;
      var t = e.target;
      if (t && t.closest && t.closest('#gal')) return;
      if (t && t.id === 'vbtn') return;
      stopReplay();
    }, true);
    var voiceStarted = false;
    document.addEventListener('pointerdown', function (e) {
      if (e.target && e.target.id === 'vbtn') { voiceStarted = true; return; }
      if (!voiceStarted) { voiceStarted = true; if (window.QuinnVoice && !QuinnVoice.on) QuinnVoice.toggle(); }
    });
    window.onQuinnVoiceOn = function () { if (window.__voiceIntro) return; window.__voiceIntro = true; window.__introDone = false; play(window.__cur || 0); };
    $('say').textContent = 'Click anywhere to wake Quinn. Then click the gallery or the room to watch her work.';
    $('state').textContent = 'Her voice and music start with your first click.';
    window.QUINN_SITE = { play: play, music: music, room: function () { return frame.contentWindow.ROOM; }, scene: scene, what: what, arcade: arcade, stopReplay: stopReplay };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
