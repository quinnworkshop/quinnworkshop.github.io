'use strict';
window.deckTV = 'kidroom';
window.cv = document.getElementById('c');
window.W = 214;
window.H = 180;
window.$ = id => document.getElementById(id);
window.out = { gain: { value: .55 } };
window.SET = { sound: 1, screen: 8, look: 0, mono: 0, room: 7, size: 1, fx: 0 };
window.applySet = () => {};
window.audio = () => {
  if (!window.__roomAudio) {
    try { window.__roomAudio = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    const a = window.__roomAudio.createGain();
    a.gain.value = .12;
    a.connect(window.__roomAudio.destination);
    window.__roomOut = a;
  }
  if (window.__roomAudio.state === 'suspended') window.__roomAudio.resume();
};
window.press = (n, d) => {
  if (!d) return;
  if (n === 'up' || n === 'right' || n === 'down' || n === 'left') parent.postMessage({ type: 'room-step', dir: n }, '*');
  else if (n === 'start' || n === 'select') parent.postMessage({ type: 'room-button', button: n }, '*');
  else parent.postMessage({ type: 'room-button', button: n }, '*');
};
window.pressStart = () => parent.postMessage({ type: 'room-button', button: 'start' }, '*');
window.pressSelect = () => parent.postMessage({ type: 'room-button', button: 'select' }, '*');
window.FONT = {};
const rc = document.getElementById('room');
const video = document.getElementById('screenVideo');
function paintPic(c, p, px) {
  const g = c.getContext('2d'), n = p.size, s = Math.max(1, Math.floor(Math.min(c.width, c.height) * 0.88 / n)), x0 = Math.floor((c.width - n * s) / 2), y0 = Math.floor((c.height - n * s) / 2);
  g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < px.length; i++) if (px[i]) { const h = String(p.pal[px[i] - 1] || '#000'); g.fillStyle = h[0] === '#' ? h : '#' + h; g.fillRect(x0 + (i % n) * s, y0 + Math.floor(i / n) * s, s, s); }
}
function doneCanvas() {
  let c = document.getElementById('donePic');
  if (!c) { c = document.createElement('canvas'); c.id = 'donePic'; c.width = 642; c.height = 564; c.style.cssText = 'position:absolute;left:0;top:0;z-index:3;image-rendering:pixelated;background:#000'; document.getElementById('bezel').appendChild(c); }
  c.style.width = cv.style.width; c.style.height = cv.style.height; c.style.display = 'block';
  return c;
}
const room = {
  start() { DeckRoom.start(rc, 'room', 'kid'); },
  look(to) { DeckKid.go(to); },
  volume() { return out.gain.value; },
  // 19 Nov 2026 (Sam): when a replay ends, her monitor shows the WHOLE finished picture (an animation keeps playing) until
  // another painting is clicked. p = a piece from pieces.js (thumb = the dots Forge saved, pal = its colours).
  showPartial(p, px) {
    clearInterval(room._picTimer);
    paintPic(doneCanvas(), p, px);
  },
  showPicture(p) {
    const c = doneCanvas();
    clearInterval(room._picTimer);
    let k = 0; const frames = (p.thumb && p.thumb.length) ? p.thumb : [];
    const draw = () => { if (!frames.length) return; paintPic(c, p, frames[k % frames.length]); k++; };
    draw(); if (frames.length > 1) room._picTimer = setInterval(draw, p.ms || 150);
  },
  hidePicture() { clearInterval(room._picTimer); const c = document.getElementById('donePic'); if (c) c.style.display = 'none'; },  stopVideo() {
    video.pause();
    video.style.display = 'none';
    video.removeAttribute('src');
    parent.postMessage({ type: 'room-video-end' }, '*');
  },
  playVideo(src, rate) {
      return new Promise(resolve => {
        let done = false, timer = null;
        const finish = () => {
          if (done) return;
          done = true;
          if (timer) clearInterval(timer);
          video.style.display = 'none';
          video.removeAttribute('src');
          parent.postMessage({ type: 'room-video-end' }, '*');
          resolve();
        };
        video.pause();
        video.src = src;
        video.playbackRate = rate || 1;
        video.style.display = 'block';
        video.style.width = cv.style.width;
        video.style.height = cv.style.height;
        video.onended = finish;
        parent.postMessage({ type: 'room-video-start' }, '*');
        const p = video.play();
        if (p && p.catch) p.catch(() => {
          const start = performance.now();
          timer = setInterval(() => { if ((performance.now() - start) / 1000 >= (video.duration || 8) / (rate || 1)) finish(); }, 100);
        });
      });
    }
};
window.ROOM = room;
addEventListener('resize', () => { if (rc) DeckRoom.layout(rc, 'room', 'kid'); });
setInterval(() => {
  if (video.style.display === 'block') { video.style.width = cv.style.width; video.style.height = cv.style.height; }
  parent.postMessage({ type: 'room-volume', v: out.gain.value }, '*');
}, 200);
DeckRoom.start(rc, 'room', 'kid');
