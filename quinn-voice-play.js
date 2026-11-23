// QUINN'S VOICE on the page (17 Nov 2026). Her lines were rendered in advance with Kokoro (voice Nova, pitch +25%, see
// E:\Projects\quinn-studio\voice); her giggles, laughs and cheers are real recordings (Happy Girl Voice Pack by Enjaku, itch.io:
// credit Enjaku). Browsers only play sound after a click, so the voice starts when the button is pressed (and is remembered).
window.QuinnVoice = (function () {
  var on = /[?&]live=1/.test(location.search), cur = null;   // live / stream rehearsal: voice on from the start (OBS plays sound by itself; a browser needs one click)
  // always OFF when the page opens: browsers only play sound after a click, and that first click starts her spoken introduction (Sam, 17 Nov)
  function V() { return window.QUINN_VOICE || {}; }
  function R() { return window.QUINN_REACT || {}; }
  function label() { var b = document.getElementById('vbtn'); if (b) { b.textContent = on ? 'ON' : 'OFF'; b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.classList.toggle('on', !!on); b.title = "Quinn's voice"; } }   // 22 Nov 2026 (Sam): just ON / OFF next to her name
  function stop() { if (cur) { try { cur.pause(); } catch (e) {} cur = null; } }
  function play(file, rate, vol, keepPitch) {
    return new Promise(function (res) {
      var a = new Audio(file); a.preservesPitch = !!keepPitch; a.playbackRate = rate || 1; a.volume = vol || 1; cur = a;
      a.onended = a.onerror = function () { res(); };
      var p = a.play(); if (p && p.catch) p.catch(function () { res(); });
    });
  }
  var api = {
    get on() { return on; },
    toggle: function () { on = !on; if (!on) stop(); label(); if (on && window.onQuinnVoiceOn) window.onQuinnVoiceOn(); },
    dur: function (key) { return on && V()[key] ? V()[key].d : 0; },            // length of a spoken line in seconds (0 = no voice)
    say: function (key) { if (!on || !V()[key]) return Promise.resolve(); stop(); return play(V()[key].f, .92, 1, true); },   // Sam, 17 Nov: speech a bit slower (same pitch)
    get audio() { return cur; },                                                    // the line now playing: the typing follows its position
    // 18 Nov (Sam): ONE voice lane. Every sound of hers goes through this one player (cur); chat answers too (file).
    get busy() { return !!(cur && !cur.paused && !cur.ended && !cur.__bg); },       // a spoken line is playing (humming does not count)
    file: function (f) { if (!on || !f) return Promise.resolve(); stop(); return play(f, .92, 1, true); },
    react: function (cat) {                                                         // a real recording, different every time
      var l = R()[cat]; if (!on || !l || !l.length || api.busy) return Promise.resolve();   // little sounds only when nothing else is spoken
      var c = l[Math.floor(Math.random() * l.length)]; stop(); return play(c.f, .95 + Math.random() * .12, .9);
    },
    bg: function (cat, vol) {                                                      // soft humming under her work (not waited for; the next line stops it)
      var l = R()[cat]; if (!on || !l || !l.length || api.busy) return; var c = l[Math.floor(Math.random() * l.length)]; stop(); play(c.f, .9 + Math.random() * .2, vol || .45); if (cur) cur.__bg = true;
    },
    stop: stop
  };
  document.addEventListener('DOMContentLoaded', function () { var b = document.getElementById('vbtn'); if (b) b.onclick = function () { api.toggle(); }; label(); });
  return api;
})();
