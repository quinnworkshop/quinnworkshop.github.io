// QUINN HD PLAYER (17 Nov 2026). The pictures (128 x 128, 255 colours) were made by DECK FORGE's own PHOTO import from
// ChatGPT's concept-art pose sheets; the four animations were built in Forge's FRAMES sequencer. quinn-hd-data.js holds
// exactly what Forge saved. This file only decides WHICH picture shows, so that her movement makes sense with what she does and says:
//   chat  (headset)  IDLE: blinking and glancing left / right; when she TALKS the mouth follows her letters (pictures 2, 3),
//                    a wave when she starts, a happy open mouth after a rating, a thinking pose while she plans
//   paint (beret)    the PAINT animation (brush up, canvas, palette moved, wink)
//   edit  (glasses)  the TYPE animation (hands left / right on the keyboard, a look at the viewers)
// The music moves her whole picture by the player's real sound level. Same calls as QuinnLive.
// Pictures: 0 idle 1 blink 2 talk small 3 talk wide 4 look left 5 look right 6 look down 7 wave 8-11 paint 12-14 edit 15 thinking
window.QuinnAnime = (function () {
  var D = window.QUINN_HD; if (!D) return window.QuinnAnime || null;
  var N = D.size, cv = null, g = null, mode = 'chat', drawn = -1, talk = 0, ch = ' ', seqAt = 0, seqName = '', happyUntil = 0, waveUntil = 0, thinkUntil = 0, surprisedUntil = 0, phase = 0, holdN = 0, holdUntil = 0, glanceN = 4, glanceUntil = 0, nextGlance = 0;
  var cache = {}, pal = D.pal.map(function (h) { return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; });
  function bitmap(n) {
    if (cache[n]) return cache[n];
    var c = document.createElement('canvas'); c.width = c.height = N; var x = c.getContext('2d'), im = x.createImageData(N, N), s = D.pics[n];
    for (var i = 0; i < N * N; i++) { var v = parseInt(s.substr(i * 2, 2), 16), p = pal[v - 1] || [0, 0, 0]; im.data[i * 4] = p[0]; im.data[i * 4 + 1] = p[1]; im.data[i * 4 + 2] = p[2]; im.data[i * 4 + 3] = 255; }
    x.putImageData(im, 0, 0); return (cache[n] = c);
  }
  function anim() { return D.anims[mode === 'paint' ? 2 : mode === 'edit' ? 3 : 0]; }   // Forge slots: 0 IDLE, 2 PAINT (JUMP slot), 3 TYPE (ANIM 4)
  function show(n) { if (n === drawn || !g) return; drawn = n; g.imageSmoothingEnabled = false; g.drawImage(bitmap(n), 0, 0, cv.width, cv.height); }
  function frame(now) {
    var a = anim(), f = a.f, tot = 0, i;
    if (seqName !== mode) { seqName = mode; seqAt = now; }
    for (i = 0; i < f.length; i++) tot += f[i].t * 1000 / 60;
    var t = (now - seqAt) % tot, n = f[f.length - 1].p; for (i = 0; i < f.length; i++) { t -= f[i].t * 1000 / 60; if (t < 0) { n = f[i].p; break; } }
    if (mode === 'measure') n = 8;                         // brush raised at arm's length, no easel (Sam, 17 Nov)
    if (mode === 'chat') {
      if (talk && now - talk < 450) { n = /[aeiouAEIOU]/.test(ch) ? 3 : /[a-zA-Z]/.test(ch) && !/[mpbMPB]/.test(ch) ? 2 : 0; }
      else if (now < waveUntil) n = 7;
      else if (now < happyUntil) n = 3;
      else if (now < surprisedUntil) n = 2;
      else if (now < thinkUntil) n = 15;
      else {                                              // a glance to one side now and then, at random (one side at a time, never left and right in a row)
        if (!nextGlance) nextGlance = now + 12000 + Math.random() * 15000;
        if (now >= nextGlance) { glanceN = Math.random() < .5 ? 4 : 5; glanceUntil = now + 1300; nextGlance = now + 25000 + Math.random() * 25000; }
        if (now < glanceUntil) n = glanceN;
      }
    }
    if (now < holdUntil) n = holdN;                       // a pose held on purpose (looking at her screen, thinking)
    show(n);
    var lv = window.QUINN_LEVEL || 0; phase += .11 + lv * .12; var dy = lv < .01 ? 0 : -Math.abs(Math.sin(phase)) * lv * 5;
    if (cv) cv.style.transform = dy ? 'translateY(' + dy.toFixed(1) + 'px)' : '';
    requestAnimationFrame(frame);
  }
  return {
    start: function (canvas) { cv = canvas; cv.width = cv.height = N; g = cv.getContext('2d'); requestAnimationFrame(frame); },   // the canvas IS the 128 x 128 picture; the page scales it up with hard edges
    mode: function (m) { mode = m === 'rest' ? 'chat' : m; seqName = ''; if ((m === 'chat' || m === 'rest') && !window.QUINN_QUIET) waveUntil = performance.now() + 1800; },
    say: function (text) { talk = performance.now(); ch = text.charAt(text.length - 1) || ' '; if (/rating/i.test(text)) happyUntil = performance.now() + 4000; },
    stopTalking: function () { talk = 0; },
    pose: function (n, ms) { holdN = n; holdUntil = performance.now() + (ms || 2000); },
    look: function () {},
    happy: function (ms) { happyUntil = performance.now() + (ms || 3000); }, surprised: function (ms) { surprisedUntil = performance.now() + (ms || 1500); }, thinking: function (ms) { thinkUntil = performance.now() + (ms || 2500); },
    get state() { return { mode: mode, picture: drawn }; }
  };
})();
if (window.QuinnAnime) window.QuinnLive = window.QuinnAnime;
