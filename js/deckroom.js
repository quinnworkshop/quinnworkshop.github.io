// DECK ROOM (version 82, Sam, 21 October 2026): the Brain-Deck as an old TV in a young gamer's room at night.
// "The TV close to us, the room slightly darker with more contrast, the Brain-Deck on the floor half under the TV like
// an old home console, a home computer next to the TV, an arcade machine in the back left corner, a nerdy kid's room
// with a bit of neon." Drawn in code at the screen's real resolution (no pictures from outside). Our own designs and
// names: the computer and the arcade have no maker's badge; the posters are our own games.
// The TV's CHANNEL dial is the D-pad (click its top, bottom, left or right; the mouse wheel turns it), the VOLUME dial
// switches the sound (wheel: volume), and the push buttons under the screen are SELECT, START, Y, X, B and A.
// Two views: 'room' (the TV's screen as big as the console's screen, the room round it) and 'close' (the TV fills the window).
// Uses the deck's globals while it runs: cv, W, H, $, press, pressStart, pressSelect, SET, applySet, out, FONT.
'use strict';
const DeckRoom = (() => {
  const VW = 1600, VH = 900, SCRV = { x: 552, y: 214, w: 470, h: 413 };   // the scene in its own units; the TV's glass (aspect of the deck screen)
  const TV0 = { x: 468, y: 150, w: 642, h: 516 }; let TV = TV0;   // the TV's wooden body
  let rc = null, x = null, base = null, M = null, timer = null, glow = [40, 60, 120], held = {}, chanA = 0, volA = .55, mode = 'room', hooked = false;
  // the controls on the TV, in scene units
  const CTL0 = [
    { id: 'chan', kind: 'dial', cx: 1066, cy: 456, r: 25, label: 'CHANNEL' }, { id: 'vol', kind: 'dial', cx: 1066, cy: 548, r: 19, label: 'VOLUME' },
    { id: 'select', kind: 'btn', cx: 606, cy: 646, r: 10, label: 'SELECT' }, { id: 'start', kind: 'btn', cx: 652, cy: 646, r: 10, label: 'START' },
    { id: 'y', kind: 'btn', cx: 868, cy: 646, r: 10, label: 'Y', col: '#3aa85a' }, { id: 'x', kind: 'btn', cx: 900, cy: 646, r: 10, label: 'X', col: '#3a5fd0' },
    { id: 'b', kind: 'btn', cx: 932, cy: 646, r: 10, label: 'B', col: '#e8c12e' }, { id: 'a', kind: 'btn', cx: 964, cy: 646, r: 10, label: 'A', col: '#d23a3a' }];
  let CTL = CTL0;

  // ---------- where everything goes in the window ----------
  function consoleScreen() {   // how big the console's screen would be in this window (the deck's own fit() rule)
    const tall = innerHeight >= innerWidth, tw = tall ? innerWidth - 68 : innerWidth - 2 * Math.max(165, innerWidth * .21) - 36, th = tall ? innerHeight * .5 : innerHeight - 50;
    const s = Math.max(.5, Math.min(tw / W, th / H)); return [W * s, H * s];
  }
  let STYLE = '16bit';   // '16bit': 32 colours from 512, about 420 dots across; 'amiga': 32 from 4096, about 320 across, more dither
  function layout(canvas, m, style) {
    rc = canvas; x = rc.getContext('2d'); mode = m || 'room'; STYLE = style || '16bit';
    const kid = STYLE === 'kid' && typeof DeckKid !== 'undefined'; CTL = kid ? DeckKid.CTL : CTL0; TV = kid ? DeckKid.CLOSE : TV0;   // version 84: the new kid's room with a gaming monitor (deckkid.js)
    // Sam: the room in 16-bit style: drawn in big dots (about 400 across the window), then pressed into 32 colours from 512
    const Wd = innerWidth, Hd = innerHeight, px = STYLE === 'kid' ? Math.max(2, Wd / 560) : STYLE === 'lw' ? Math.max(1, Wd / 640) : Math.max(2, Math.round(Wd / (STYLE === 'amiga' ? 320 : 420))), dpr = 1 / px;   // 'lw': a smooth LightWave-style render at about 640 across
    let S, ox, oy;
    if (mode === 'close') { S = Math.min(Wd / (TV.w + 60), Hd / (TV.h + 150)); ox = Wd / 2 - (TV.x + TV.w / 2) * S; oy = Hd / 2 - (TV.y - 70 + (TV.h + 150) / 2) * S; }
    else { const cs = consoleScreen(); const baseS = Math.min(cs[0] / SCRV.w, cs[1] / SCRV.h); if (kid) DeckKid.fitRoom(Wd, Hd, baseS); S = baseS; ox = Wd / 2 - (SCRV.x + SCRV.w / 2) * S; oy = Hd / 2 - (SCRV.y + SCRV.h / 2) * S; }
    M = { S, ox, oy, dpr, Wd, Hd };
    rc.width = Math.ceil(Wd * dpr); rc.height = Math.ceil(Hd * dpr); rc.style.width = rc.width * px + 'px'; rc.style.height = rc.height * px + 'px'; rc.style.left = rc.style.top = '0px'; rc.style.imageRendering = STYLE === 'lw' ? 'auto' : 'pixelated';   // the kid's room: big clean blocks (Sam: a little bit blocky)
    if (kid && mode !== 'close') { DeckKid.setFull(Math.min(Wd / 404, Hd / 362) / S); const c = DeckKid.cam(); S *= c.far; ox = Wd / 2 - c.cx * S; oy = Hd / 2 - c.cy * S; M.S = S; M.ox = ox; M.oy = oy; }   // the camera: wide, three-quarter, frontal or full
    const b = $('bezel'); b.style.left = ox + SCRV.x * S + 'px'; b.style.top = oy + SCRV.y * S + 'px'; cv.style.width = SCRV.w * S + 'px'; cv.style.height = SCRV.h * S + 'px'; b.style.transform = ''; b.style.transformOrigin = '';
    if (kid) {   // warp the game's picture onto the turned monitor's glass (a 4-corner perspective map)
      const w0 = SCRV.w * S, h0 = SCRV.h * S, P = DeckKid.QUAD.map(q => [ox + q[0] * S, oy + q[1] * S]);
      const [x0, y0] = P[0], [x1, y1] = P[1], [x2, y2] = P[2], [x3, y3] = P[3], dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3, dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3, den = dx1 * dy2 - dx2 * dy1;
      const gg = (dx3 * dy2 - dx2 * dy3) / den, hh = (dx1 * dy3 - dx3 * dy1) / den, A = x1 - x0 + gg * x1, B = x3 - x0 + hh * x3, D = y1 - y0 + gg * y1, E = y3 - y0 + hh * y3;
      b.style.left = '0px'; b.style.top = '0px'; b.style.transformOrigin = '0 0';
      b.style.transform = 'matrix3d(' + [A / w0, D / w0, 0, gg / w0, B / h0, E / h0, 0, hh / h0, 0, 0, 1, 0, x0, y0, 0, 1].join(',') + ')';
    }
    base = drawBase(); if (STYLE !== 'lw' && STYLE !== 'kid') makePal(base); hook(); frame();
  }
  const toScene = (cx2, cy2) => [(cx2 - M.ox) / M.S, (cy2 - M.oy) / M.S];
  function sceneT(c2) { c2.setTransform(M.dpr * M.S, 0, 0, M.dpr * M.S, M.dpr * M.ox, M.dpr * M.oy); }

  // ---------- small drawing helpers ----------
  let seed = 9; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  function rr(c, a, b, w, h, r) { c.beginPath(); c.moveTo(a + r, b); c.arcTo(a + w, b, a + w, b + h, r); c.arcTo(a + w, b + h, a, b + h, r); c.arcTo(a, b + h, a, b, r); c.arcTo(a, b, a + w, b, r); c.closePath(); }
  function poly(c, pts, fill) { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach(p => c.lineTo(p[0], p[1])); c.closePath(); c.fillStyle = fill; c.fill(); }
  function glowAt(c, gx, gy, r, col, a) { const g = c.createRadialGradient(gx, gy, 0, gx, gy, r); g.addColorStop(0, 'rgba(' + col + ',' + a + ')'); g.addColorStop(1, 'rgba(' + col + ',0)'); c.fillStyle = g; c.fillRect(gx - r, gy - r, r * 2, r * 2); }
  function wood(c, a, b, w, h, rad, dark) {   // walnut with its grain
    c.save(); rr(c, a, b, w, h, rad); c.clip();
    const g = c.createLinearGradient(0, b, 0, b + h); g.addColorStop(0, dark ? '#3e2614' : '#5e3a20'); g.addColorStop(1, dark ? '#1e1208' : '#2e1a0c'); c.fillStyle = g; c.fillRect(a, b, w, h);
    for (let i = 0; i < h / 1.6; i++) { const y0 = b + i * 1.6 + rnd() * 1.5, f = .01 + rnd() * .02, ph = rnd() * 6.28, amp = .5 + rnd() * 2.5, d = rnd() < .55;
      c.strokeStyle = d ? 'rgba(25,12,4,' + (.15 + rnd() * .25) + ')' : 'rgba(150,96,52,' + (.05 + rnd() * .12) + ')'; c.lineWidth = .4 + rnd() * .9; c.beginPath();
      for (let xx = a; xx <= a + w; xx += 8) { const y = y0 + Math.sin(xx * f + ph) * amp + Math.sin(xx * .004 + i * .07) * 4; xx === a ? c.moveTo(xx, y) : c.lineTo(xx, y); } c.stroke(); }
    c.restore();
  }
  function label(c, s, lx, ly, size, col, font) { c.font = (font || '700 ') + size + 'px system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = col; c.fillText(s, lx, ly); }

  // ---------- the room, drawn once for this window size ----------
  function drawBase() {
    seed = 9; const c = document.createElement('canvas'); c.width = rc.width; c.height = rc.height; const k = c.getContext('2d');
    k.fillStyle = '#05040a'; k.fillRect(0, 0, c.width, c.height); sceneT(k);
    if (STYLE === 'kid') { DeckKid.base(k, { rr, poly, glowAt, label, rnd, wood, star, poster });
      k.setTransform(1, 0, 0, 1, 0, 0); const vk = k.createRadialGradient(c.width / 2, c.height * .45, c.width * .3, c.width / 2, c.height * .45, c.width * .8); vk.addColorStop(0, 'rgba(0,0,0,0)'); vk.addColorStop(1, 'rgba(0,0,0,.5)'); k.fillStyle = vk; k.fillRect(0, 0, c.width, c.height); return c; }
    // the walls: back wall, the left wall going back into the corner, glow-in-the-dark stars stuck on them
    const bw = k.createLinearGradient(0, 0, 0, 620); bw.addColorStop(0, '#16132c'); bw.addColorStop(1, '#0f0c1e'); k.fillStyle = bw; k.fillRect(-400, -200, 2400, 820);
    poly(k, [[-400, -200], [300, -200], [300, 620], [-400, 860]], '#0c0a18');
    k.strokeStyle = 'rgba(0,0,0,.6)'; k.lineWidth = 3; k.beginPath(); k.moveTo(300, -200); k.lineTo(300, 620); k.stroke();
    for (let i = 0; i < 60; i++) { const sx2 = 320 + rnd() * 1250, sy2 = 10 + rnd() * 260; k.fillStyle = 'rgba(190,255,200,' + (.15 + rnd() * .25) + ')'; star(k, sx2, sy2, 2 + rnd() * 3); }
    // the floor: a dark carpet with a pattern, the skirting board
    poly(k, [[300, 620], [2000, 620], [2000, 1100], [-400, 1100], [-400, 860]], '#17122a');
    for (let i = 0; i < 500; i++) { const fx = -300 + rnd() * 2200, fy = 640 + rnd() * 440; k.fillStyle = rnd() < .5 ? 'rgba(90,60,140,.18)' : 'rgba(0,0,0,.25)'; k.fillRect(fx, fy, 3, 2); }
    k.fillStyle = '#231c3a'; k.fillRect(300, 612, 1700, 10); poly(k, [[-400, 852], [300, 612], [300, 622], [-400, 864]], '#1c1630');
    // posters of our own games on the back wall
    poster(k, 1186, 104, 150, 220, 'RAINLIGHT', '2091', ['#1a0f2e', '#ff3fa8', '#3ff0ff']);
    poster(k, 366, 118, 124, 180, 'CRYSTAL', 'NINJA', ['#3a1430', '#d82800', '#f8d030']);
    poster(k, 1360, 148, 112, 132, 'DECK', 'TRAX', ['#0f2030', '#3fd6c1', '#ffb84d']);
    // a shelf with game boxes, cartridges, a robot toy (the lava lamp is lit in each frame)
    for (const sy2 of [388, 486]) { wood(k, 1340, sy2, 230, 12, 2, true); k.fillStyle = 'rgba(0,0,0,.4)'; k.fillRect(1344, sy2 + 12, 222, 6); }
    let bx = 1350; for (let i = 0; i < 14; i++) { const w2 = 10 + rnd() * 8, h2 = 52 + rnd() * 22, cl = ['#7a1f3a', '#1f3a7a', '#2a6a3a', '#8a5a1a', '#4a2a7a', '#6a6a7a'][Math.floor(rnd() * 6)];
      k.fillStyle = cl; k.fillRect(bx, 486 - h2, w2, h2); k.fillStyle = 'rgba(255,255,255,.25)'; k.fillRect(bx + 2, 486 - h2 + 6, w2 - 4, 4); bx += w2 + 1; if (bx > 1560) break; }
    for (let i = 0; i < 6; i++) { k.fillStyle = ['#3a3a44', '#5a2a2a', '#2a2a5a'][i % 3]; k.fillRect(1452 + i * 18, 362, 14, 26); k.fillStyle = '#c8c0a8'; k.fillRect(1454 + i * 18, 366, 10, 8); }
    rr(k, 1356, 340, 26, 34, 6); k.fillStyle = '#8a8a96'; k.fill(); k.fillStyle = '#3ff0ff'; k.fillRect(1362, 350, 5, 3); k.fillRect(1371, 350, 5, 3); k.fillStyle = '#6a6a76'; k.fillRect(1360, 374, 18, 14);
    // the arcade machine in the back left corner (our own: NEON RUN), the screen and lights are lit each frame
    arcade(k);
    // the TV stand, the Brain-Deck on the floor half under it with its cable, the TV itself
    floorStuff(k);
    stand(k);
    tvBody(k);
    // the home computer next to the TV, its mouse and some floppy disks
    computer(k);
    // a bean bag and a few things on the floor in front
    k.fillStyle = '#2a1844'; k.beginPath(); k.ellipse(1460, 846, 160, 70, -.1, 0, 6.283); k.fill(); k.fillStyle = 'rgba(255,255,255,.05)'; k.beginPath(); k.ellipse(1420, 820, 90, 30, -.2, 0, 6.283); k.fill();
    rr(k, 180, 760, 120, 26, 4); k.fillStyle = '#c8a46a'; k.fill(); k.fillStyle = '#7a1f1f'; k.font = '800 14px system-ui'; k.textAlign = 'center'; k.fillText('PIZZA', 240, 778);
    k.fillStyle = '#d82848'; rr(k, 1160, 806, 18, 30, 3); k.fill(); k.fillStyle = '#e8e8f0'; k.fillRect(1160, 814, 18, 5);
    // the dark: a little darker round the edges, more contrast in the middle (Sam)
    k.setTransform(1, 0, 0, 1, 0, 0); const vg = k.createRadialGradient(c.width / 2, c.height * .45, c.width * .25, c.width / 2, c.height * .45, c.width * .75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.62)'); k.fillStyle = vg; k.fillRect(0, 0, c.width, c.height);
    return c;
  }
  function star(k, sx, sy, r) { k.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, rr2 = i % 2 ? r * .45 : r; k.lineTo(sx + Math.cos(a) * rr2, sy + Math.sin(a) * rr2); } k.closePath(); k.fill(); }
  function poster(k, px, py, w, h, t1, t2, cols) {
    k.fillStyle = '#0a0812'; k.fillRect(px - 4, py - 4, w + 8, h + 8); k.fillStyle = cols[0]; k.fillRect(px, py, w, h);
    const g = k.createRadialGradient(px + w / 2, py + h * .42, 4, px + w / 2, py + h * .42, w * .45); g.addColorStop(0, cols[1]); g.addColorStop(1, 'rgba(0,0,0,0)'); k.fillStyle = g; k.fillRect(px, py, w, h);
    k.fillStyle = 'rgba(0,0,0,.7)'; for (let i = 0; i < 7; i++) { const bh = 20 + ((i * 37) % 50); k.fillRect(px + i * w / 7, py + h * .7 - bh, w / 7 - 2, bh); }
    label(k, t1, px + w / 2, py + h * .8, Math.round(w * .15), cols[2], '900 '); label(k, t2, px + w / 2, py + h * .91, Math.round(w * .11), cols[1], '700 ');
    k.fillStyle = 'rgba(255,255,255,.08)'; k.fillRect(px, py, w, 6); k.fillStyle = '#c8c8d0'; k.fillRect(px + w / 2 - 3, py - 8, 6, 6);
  }
  function arcade(k) {
    poly(k, [[80, 230], [150, 214], [150, 650], [80, 690]], '#120a22');   // its side, going back into the corner
    k.strokeStyle = 'rgba(255,63,168,.55)'; k.lineWidth = 4; k.beginPath(); k.moveTo(88, 300); k.lineTo(146, 286); k.moveTo(88, 520); k.lineTo(146, 504); k.stroke();
    poly(k, [[150, 214], [306, 214], [306, 650], [150, 650]], '#1a1030');
    poly(k, [[150, 214], [306, 214], [306, 270], [150, 270]], '#2a0f28');   // the marquee (lit each frame)
    poly(k, [[162, 286], [294, 286], [290, 412], [166, 412]], '#05050a');   // the screen (lit each frame)
    poly(k, [[146, 430], [310, 430], [322, 470], [134, 470]], '#2a2040');   // the control panel
    k.fillStyle = '#111'; k.fillRect(178, 436, 6, 22); k.fillStyle = '#d82848'; k.beginPath(); k.arc(181, 434, 9, 0, 6.283); k.fill();
    [[222, 450, '#3ff0ff'], [246, 446, '#ffb84d'], [270, 450, '#ff3fa8'], [294, 446, '#b8f818']].forEach(([bx, by, cl]) => { k.fillStyle = cl; k.beginPath(); k.ellipse(bx, by, 8, 5, 0, 0, 6.283); k.fill(); });
    poly(k, [[160, 470], [298, 470], [298, 650], [160, 650]], '#140c26'); rr(k, 196, 526, 66, 54, 4); k.fillStyle = '#0a0612'; k.fill();
  }
  function stand(k) {
    wood(k, 446, 664, 690, 18, 3);   // the top board
    k.fillStyle = '#1a0f08'; k.fillRect(456, 682, 670, 76); k.fillStyle = '#0c0704'; k.fillRect(470, 692, 642, 56);   // the open shelf under it, dark inside
    for (const lx of [452, 1112]) wood(k, lx, 682, 18, 112, 2, true);
    wood(k, 452, 774, 678, 16, 2, true);   // the bottom rail (it hides half of the Brain-Deck)
    k.fillStyle = 'rgba(0,0,0,.6)'; k.beginPath(); k.ellipse(790, 800, 380, 16, 0, 0, 6.283); k.fill();
  }
  function floorStuff(k) {
    // the Brain-Deck lying on the floor, half under the stand, its cable going up to the TV
    k.save(); k.translate(700, 790); k.transform(1, 0, -.35, .55, 0, 0);
    rr(k, -60, -70, 150, 120, 16); k.fillStyle = '#c9c5b8'; k.fill(); rr(k, -50, -62, 130, 52, 6); k.fillStyle = '#5a5d72'; k.fill(); rr(k, -40, -56, 110, 40, 3); k.fillStyle = '#0a0a12'; k.fill();
    k.fillStyle = '#2b2b33'; k.fillRect(-40, 6, 30, 10); k.fillRect(-30, -4, 10, 30);
    k.fillStyle = '#a8275f'; k.beginPath(); k.arc(52, 10, 9, 0, 6.283); k.fill(); k.beginPath(); k.arc(30, 20, 9, 0, 6.283); k.fill();
    k.font = 'italic 800 16px system-ui'; k.fillStyle = '#2b3186'; k.textAlign = 'left'; k.fillText('Brain-Deck', -44, -2);
    k.restore();
    k.strokeStyle = '#141418'; k.lineWidth = 5; k.beginPath(); k.moveTo(760, 760); k.bezierCurveTo(820, 720, 1000, 760, 1060, 690); k.stroke();
    // floppy disks and a cassette on the floor
    [[1010, 812, -.3, '#2a2a34'], [1050, 826, .2, '#3a1a24'], [930, 830, .5, '#1a2a3a']].forEach(([fx, fy, a, cl]) => { k.save(); k.translate(fx, fy); k.rotate(a); k.transform(1, 0, 0, .5, 0, 0); k.fillStyle = cl; k.fillRect(-18, -18, 36, 36); k.fillStyle = '#9a9aa6'; k.fillRect(-8, -18, 16, 12); k.fillStyle = '#e8e0c8'; k.fillRect(-12, 2, 24, 14); k.restore(); });
  }
  function computer(k) {
    // an old beige home computer, the keyboard in its wedge, the floppy drive on its side; no badge
    poly(k, [[1150, 712], [1420, 712], [1450, 784], [1124, 784]], '#cfc6ad'); poly(k, [[1124, 784], [1450, 784], [1450, 800], [1124, 800]], '#a69c82');
    for (let r = 0; r < 4; r++) for (let q = 0; q < 14; q++) { const kx = 1170 + q * 16 + r * 4, ky = 724 + r * 13; k.fillStyle = r === 3 && q > 3 && q < 10 ? '#bcb39a' : '#e3dbc4'; k.fillRect(kx, ky, 13, 10); k.fillStyle = 'rgba(0,0,0,.25)'; k.fillRect(kx, ky + 9, 13, 1); }
    k.fillStyle = '#b8ae94'; k.fillRect(1400, 730, 28, 36); k.fillStyle = '#3a3a3a'; k.fillRect(1430, 764, 14, 3);
    k.fillStyle = '#3aff6a'; k.fillRect(1156, 778, 8, 3);
    k.fillStyle = '#d8d0b8'; k.beginPath(); k.ellipse(1488, 790, 16, 10, .2, 0, 6.283); k.fill(); k.strokeStyle = '#8a826c'; k.lineWidth = 2; k.beginPath(); k.moveTo(1476, 784); k.bezierCurveTo(1460, 760, 1452, 760, 1444, 772); k.stroke();
  }
  function tvBody(k) {
    // the antenna
    k.strokeStyle = '#9a9aa6'; k.lineWidth = 3; k.beginPath(); k.moveTo(780, 150); k.lineTo(690, 40); k.moveTo(800, 150); k.lineTo(900, 50); k.stroke();
    k.fillStyle = '#c8c8d0'; k.beginPath(); k.arc(690, 40, 5, 0, 6.283); k.arc(900, 50, 5, 0, 6.283); k.fill(); rr(k, 770, 140, 40, 14, 4); k.fillStyle = '#2a2a30'; k.fill();
    // the wooden body, varnish on its top edge
    wood(k, TV.x, TV.y, TV.w, TV.h, 26);
    k.strokeStyle = 'rgba(255,210,160,.3)'; k.lineWidth = 2; rr(k, TV.x + 2, TV.y + 2, TV.w - 4, TV.h - 4, 24); k.stroke();
    const top = k.createLinearGradient(0, TV.y, 0, TV.y + 60); top.addColorStop(0, 'rgba(255,220,170,.25)'); top.addColorStop(1, 'rgba(255,220,170,0)'); k.fillStyle = top; k.fillRect(TV.x, TV.y, TV.w, 60);
    // the frame round the glass
    const g2 = 18, bx = SCRV.x - g2, by = SCRV.y - g2, bw2 = SCRV.w + g2 * 2, bh2 = SCRV.h + g2 * 2;
    const bev = k.createLinearGradient(0, by, 0, by + bh2); bev.addColorStop(0, '#0a0705'); bev.addColorStop(.5, '#1c130c'); bev.addColorStop(1, '#2c1e14'); k.fillStyle = bev; rr(k, bx, by, bw2, bh2, 30); k.fill();
    k.strokeStyle = 'rgba(0,0,0,.85)'; k.lineWidth = 3; rr(k, bx, by, bw2, bh2, 30); k.stroke(); k.strokeStyle = 'rgba(255,210,160,.16)'; k.lineWidth = 1.5; rr(k, bx + 2, by + 2, bw2 - 4, bh2 - 4, 28); k.stroke();
    k.fillStyle = '#050302'; rr(k, SCRV.x - 4, SCRV.y - 4, SCRV.w + 8, SCRV.h + 8, 22); k.fill();
    // the speaker on the right, above the dials
    rr(k, 1042, 222, 50, 190, 8); k.fillStyle = '#20140a'; k.fill(); for (let yy = 230; yy < 404; yy += 7) { k.fillStyle = 'rgba(0,0,0,.6)'; k.fillRect(1048, yy, 38, 3); }
    // the brass name plate
    const plg = k.createLinearGradient(0, 632, 0, 660); plg.addColorStop(0, '#f0cc80'); plg.addColorStop(.5, '#b8843e'); plg.addColorStop(1, '#6e4a1c'); rr(k, 726, 634, 120, 24, 6); k.fillStyle = plg; k.fill();
    label(k, 'Brain-Deck', 786, 647, 15, '#3a2208', 'italic 800 ');
    // labels under the push buttons
    CTL.filter(c => c.kind === 'btn').forEach(c => label(k, c.label, c.cx, c.cy + 17, 7, 'rgba(230,200,150,.7)', '700 '));
  }

  // ---------- each frame: the lights, the arcade's screen, the controls ----------
  function frame() {
    if (!M || !base) return; const k = x, tt = performance.now() / 1000;
    try { const tc = glowTiny.getContext('2d'); tc.drawImage(cv, 0, 0, 1, 1); const d = tc.getImageData(0, 0, 1, 1).data; glow = glow.map((v, i) => v + (d[i] - v) * .35); } catch (e) {}
    k.setTransform(1, 0, 0, 1, 0, 0); k.globalCompositeOperation = 'source-over'; k.drawImage(base, 0, 0);
    // version 110 (Sam): the main light off: the room goes dark; what glows (arcade, fish tank, lamps, monitor) is drawn after
    if (STYLE === 'kid' && DeckKid.dark) { k.fillStyle = 'rgba(3,3,12,.7)'; k.fillRect(0, 0, rc.width, rc.height); }
    applyVol(); sceneT(k);
    k.globalCompositeOperation = 'lighter';
    if (STYLE === 'kid') { const cl2 = glow.map(v => Math.round(Math.min(255, v * 1.5 + 10))).join(','); DeckKid.lights(k, tt, cl2, (glow[0] + glow[1] + glow[2]) / 765); }
    else {
    // the neon strip along the ceiling and the PLAYER 1 sign
    const fl = Math.sin(tt * 7) * Math.sin(tt * 1.3) > -.9 ? 1 : .35;
    k.strokeStyle = 'rgba(255,63,168,.85)'; k.lineWidth = 5; k.beginPath(); k.moveTo(-400, -60); k.lineTo(300, 26); k.lineTo(2000, 26); k.stroke();
    const ng = k.createLinearGradient(0, 26, 0, 160); ng.addColorStop(0, 'rgba(255,63,168,.25)'); ng.addColorStop(1, 'rgba(255,63,168,0)'); k.fillStyle = ng; k.fillRect(300, 26, 1700, 140);
    glowAt(k, 820, 92, 170, '63,240,255', .22 * fl); k.font = 'italic 900 46px system-ui'; k.textAlign = 'center'; k.textBaseline = 'middle'; k.fillStyle = 'rgba(120,250,255,' + .95 * fl + ')'; k.fillText('PLAYER 1', 820, 92);
    // the arcade: marquee, its screen showing a game by itself, the coin lights
    glowAt(k, 228, 242, 120, '255,63,168', .4); k.font = '900 26px system-ui'; k.fillStyle = 'rgba(255,200,240,.95)'; k.fillText('NEON RUN', 228, 243);
    k.save(); k.beginPath(); k.moveTo(162, 286); k.lineTo(294, 286); k.lineTo(290, 412); k.lineTo(166, 412); k.closePath(); k.clip();
    for (let i = 0; i < 12; i++) { const yy = 286 + ((i * 11 + tt * 60) % 126); k.fillStyle = 'rgba(' + ['255,63,168', '63,240,255', '255,184,77'][i % 3] + ',.5)'; k.fillRect(170 + (i * 29 + tt * 40) % 110, yy, 10, 4); }
    k.fillStyle = 'rgba(184,248,24,.9)'; k.fillRect(220 + Math.sin(tt * 2) * 40, 396, 14, 8); k.restore();
    glowAt(k, 228, 350, 150, '63,240,255', .18);
    [[214, 548], [244, 548]].forEach(([cx2, cy2]) => { k.fillStyle = 'rgba(255,150,40,.9)'; k.fillRect(cx2, cy2, 8, 14); glowAt(k, cx2 + 4, cy2 + 7, 20, '255,150,40', .5); });
    // the lava lamp on the shelf
    const lx = 1540, ly = 330; k.fillStyle = 'rgba(255,90,40,.35)'; rr(k, lx - 10, ly, 20, 56, 8); k.fill();
    for (let i = 0; i < 3; i++) { const by = ly + 46 - ((tt * 8 + i * 18) % 46); k.fillStyle = 'rgba(255,140,60,.8)'; k.beginPath(); k.ellipse(lx, by, 5 + i, 6 + i, 0, 0, 6.283); k.fill(); } glowAt(k, lx, ly + 28, 70, '255,110,50', .3);
    }
    // the screen's own light on the room, in the colour it shows
    const cl = glow.map(v => Math.round(Math.min(255, v * 1.5 + 10))).join(','), lum = (glow[0] + glow[1] + glow[2]) / 765, sa = .25 + lum * .55;
    const sg = k.createRadialGradient(SCRV.x + SCRV.w / 2, SCRV.y + SCRV.h / 2, 120, SCRV.x + SCRV.w / 2, SCRV.y + SCRV.h / 2, 760); sg.addColorStop(0, 'rgba(' + cl + ',' + sa + ')'); sg.addColorStop(1, 'rgba(' + cl + ',0)'); k.fillStyle = sg; k.fillRect(-400, -200, 2400, 1300);
    k.fillStyle = 'rgba(' + cl + ',' + sa * .35 + ')'; k.beginPath(); k.moveTo(470, 800); k.lineTo(1110, 800); k.lineTo(1500, 1100); k.lineTo(80, 1100); k.closePath(); k.fill();   // on the floor in front
    k.globalCompositeOperation = 'source-over';
    // the dials and push buttons, as they are right now
    CTL.forEach(c => {
      if (c.kind === 'dial') {
        const a = c.id === 'chan' ? chanA : -2.2 + volA * 4.4;
        for (let q = 0; q < 12; q++) { const qa = -2.4 + q / 11 * 4.8; k.fillStyle = 'rgba(200,154,90,.7)'; k.fillRect(c.cx + Math.sin(qa) * c.r * 1.3 - 1, c.cy - Math.cos(qa) * c.r * 1.3 - 1, 2, 2); }
        const kg = k.createRadialGradient(c.cx - c.r * .3, c.cy - c.r * .35, c.r * .1, c.cx, c.cy, c.r); kg.addColorStop(0, '#5a4636'); kg.addColorStop(.7, '#1e140e'); kg.addColorStop(1, '#0a0604'); k.fillStyle = kg; k.beginPath(); k.arc(c.cx, c.cy, c.r, 0, 6.283); k.fill();
        k.strokeStyle = held[c.id] ? 'rgba(255,220,150,.95)' : 'rgba(220,180,120,.55)'; k.lineWidth = 2; k.beginPath(); k.arc(c.cx, c.cy, c.r, 0, 6.283); k.stroke();
        k.strokeStyle = '#d8b07a'; k.lineWidth = 3; k.beginPath(); k.moveTo(c.cx + Math.sin(a) * c.r * .2, c.cy - Math.cos(a) * c.r * .2); k.lineTo(c.cx + Math.sin(a) * c.r * .85, c.cy - Math.cos(a) * c.r * .85); k.stroke();
        label(k, c.id === 'vol' ? 'VOLUME ' + Math.round(volA * 100) + '%' : c.label, c.cx, c.cy + c.r + 13, 8, 'rgba(230,200,150,.75)', '700 ');
      } else if (c.kind === 'switch') {   // version 110: the light switch on the wall: a plate with a rocker, lit a little in the dark
        const off = STYLE === 'kid' && DeckKid.dark;
        rr(k, c.cx - 10, c.cy - 15, 20, 30, 3); k.fillStyle = off ? '#8a8676' : '#e8e4d4'; k.fill(); k.strokeStyle = 'rgba(0,0,0,.5)'; k.lineWidth = 1.5; k.stroke();
        rr(k, c.cx - 5, off ? c.cy - 1 : c.cy - 10, 10, 11, 2); k.fillStyle = off ? '#5a5648' : '#fffaf0'; k.fill();
        if (off) { k.fillStyle = 'rgba(255,170,60,.9)'; k.fillRect(c.cx - 2, c.cy - 11, 4, 3); }   // the little orange light so it can be found in the dark
        label(k, c.label, c.cx, c.cy + 25, 8, 'rgba(230,220,200,.8)', '700 ');
      } else {
        const on = !!held[c.id], g = k.createRadialGradient(c.cx - 3, c.cy - 3, 1, c.cx, c.cy, c.r); g.addColorStop(0, on ? '#ffffff' : c.col || '#8a8278'); g.addColorStop(1, '#140c08'); k.fillStyle = g; k.beginPath(); k.arc(c.cx, c.cy + (on ? 1 : 0), c.r, 0, 6.283); k.fill();
        k.strokeStyle = 'rgba(0,0,0,.7)'; k.lineWidth = 1.5; k.stroke();
      }
    });
    k.setTransform(1, 0, 0, 1, 0, 0);
    if (STYLE === 'lw') lwPass(k); else if (STYLE === 'kid') kidPass(k); else press16(k);
    if (STYLE === 'kid') { const fa = DeckKid.fullness(); if (fa > 0) { k.fillStyle = 'rgba(0,0,0,' + fa + ')'; k.fillRect(0, 0, rc.width, rc.height); } }   // the full frame: only the game is left
  }
  // the kid's room: no colour crunch, only a little more contrast and colour (Sam: less lo-fi)
  function kidPass(k) {
    if (!lwTmp || lwTmp.width !== rc.width || lwTmp.height !== rc.height) { lwTmp = document.createElement('canvas'); lwTmp.width = rc.width; lwTmp.height = rc.height; }
    const tc = lwTmp.getContext('2d'); tc.globalCompositeOperation = 'copy'; tc.drawImage(rc, 0, 0); k.filter = 'contrast(1.08) saturate(1.15)'; k.globalCompositeOperation = 'copy'; k.drawImage(lwTmp, 0, 0); k.filter = 'none'; k.globalCompositeOperation = 'source-over';
  }
  // ---------- the LightWave look (Sam: the Amiga version 'LightWave 3D rendered'): a glossy floor that mirrors the room, lens flares, a rich grade ----------
  let lwTmp = null;
  function lwPass(k) {
    if (!lwTmp || lwTmp.width !== rc.width || lwTmp.height !== rc.height) { lwTmp = document.createElement('canvas'); lwTmp.width = rc.width; lwTmp.height = rc.height; }
    const tc = lwTmp.getContext('2d'); tc.globalCompositeOperation = 'copy'; tc.drawImage(rc, 0, 0); tc.globalCompositeOperation = 'source-over';
    const fy = Math.round((M.oy + 620 * M.S) * M.dpr), hgt = rc.height - fy;
    if (hgt > 0 && fy > 0) { k.save(); k.globalAlpha = .26; k.translate(0, fy * 2); k.scale(1, -1); k.drawImage(lwTmp, 0, Math.max(0, fy - hgt), rc.width, Math.min(hgt, fy), 0, Math.max(0, fy - hgt), rc.width, Math.min(hgt, fy)); k.restore();
      const fd = k.createLinearGradient(0, fy, 0, rc.height); fd.addColorStop(0, 'rgba(0,0,0,0)'); fd.addColorStop(1, 'rgba(0,0,0,.55)'); k.fillStyle = fd; k.fillRect(0, fy, rc.width, hgt); }
    const P2 = (sx, sy) => [(M.ox + sx * M.S) * M.dpr, (M.oy + sy * M.S) * M.dpr], cxy = P2(SCRV.x + SCRV.w / 2, SCRV.y + SCRV.h / 2), sc = M.S * M.dpr;
    k.globalCompositeOperation = 'lighter';
    const tv = glow.map(v => Math.round(Math.min(255, v * 1.4 + 30))).join(',');
    [[820, 92, '120,250,255', 1], [228, 243, '255,90,200', .8], [1540, 358, '255,140,60', .6], [SCRV.x + SCRV.w * .78, SCRV.y + SCRV.h * .18, tv, .7]].forEach(([lx, ly, col, s]) => {
      const [px2, py2] = P2(lx, ly), r = 60 * sc * s;
      const core = k.createRadialGradient(px2, py2, 0, px2, py2, r); core.addColorStop(0, 'rgba(255,255,255,.9)'); core.addColorStop(.15, 'rgba(' + col + ',.55)'); core.addColorStop(1, 'rgba(' + col + ',0)'); k.fillStyle = core; k.fillRect(px2 - r, py2 - r, r * 2, r * 2);
      const st = k.createLinearGradient(px2 - r * 4, 0, px2 + r * 4, 0); st.addColorStop(0, 'rgba(' + col + ',0)'); st.addColorStop(.5, 'rgba(255,255,255,.55)'); st.addColorStop(1, 'rgba(' + col + ',0)'); k.fillStyle = st; k.fillRect(px2 - r * 4, py2 - Math.max(1, r * .03), r * 8, Math.max(2, r * .06));
      for (let i = 1; i <= 3; i++) { const fx = px2 + (cxy[0] - px2) * i * .45, fy2 = py2 + (cxy[1] - py2) * i * .45, rr2 = r * (.25 + i * .12); k.strokeStyle = 'rgba(' + col + ',' + (.22 - i * .05) + ')'; k.lineWidth = Math.max(1, rr2 * .12); k.beginPath(); k.arc(fx, fy2, rr2, 0, 6.283); k.stroke(); }
    });
    k.globalCompositeOperation = 'source-over';
    tc.globalCompositeOperation = 'copy'; tc.drawImage(rc, 0, 0); k.filter = 'contrast(1.12) saturate(1.25)'; k.globalCompositeOperation = 'copy'; k.drawImage(lwTmp, 0, 0); k.filter = 'none'; k.globalCompositeOperation = 'source-over';
  }
  // ---------- 16-bit: 32 colours from 512 (3 bits per red, green, blue), chosen from the room, plus the neon ----------
  let PAL = [], pmemo = new Map();
  const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], to3 = v => Math.round(v / 255 * 7) * 255 / 7;
  function makePal(c) {
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, count = new Map();
    const LV = STYLE === 'amiga' ? 15 : 7, SH2 = STYLE === 'amiga' ? 4 : 3, MK = LV;
    for (let i = 0; i < d.length; i += 16) { const k2 = (Math.round(d[i] / 255 * LV) << (SH2 * 2)) | (Math.round(d[i + 1] / 255 * LV) << SH2) | Math.round(d[i + 2] / 255 * LV); count.set(k2, (count.get(k2) || 0) + 1); }
    const top = [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 22).map(e => e[0]);
    const neon = [[7, 2, 5], [2, 7, 7], [7, 5, 2], [7, 1, 1], [5, 7, 1], [7, 7, 7], [0, 0, 0], [7, 4, 1], [2, 3, 7], [6, 6, 5]].map(c3 => c3.map(v => Math.round(v / 7 * LV))).map(c3 => (c3[0] << (SH2 * 2)) | (c3[1] << SH2) | c3[2]);
    PAL = [...new Set(top.concat(neon))].slice(0, 32).map(k2 => [(k2 >> (SH2 * 2)) * 255 / LV, ((k2 >> SH2) & MK) * 255 / LV, (k2 & MK) * 255 / LV]); pmemo = new Map();
  }
  function press16(k) {
    const im = k.getImageData(0, 0, rc.width, rc.height), d = im.data, w = rc.width;
    for (let i = 0, p = 0; i < d.length; i += 4, p++) {
      const b = (BAY[((p / w | 0) & 3) * 4 + (p % w & 3)] - 7.5) * (STYLE === 'amiga' ? 4.2 : 3), r = d[i] + b, g = d[i + 1] + b, bl = d[i + 2] + b, key = ((r < 0 ? 0 : r > 255 ? 255 : r) >> 3) << 10 | ((g < 0 ? 0 : g > 255 ? 255 : g) >> 3) << 5 | ((bl < 0 ? 0 : bl > 255 ? 255 : bl) >> 3);
      let q = pmemo.get(key); if (q === undefined) { let bd = 1e9; q = 0; for (let j = 0; j < PAL.length; j++) { const P = PAL[j], e = (r - P[0]) ** 2 + (g - P[1]) ** 2 + (bl - P[2]) ** 2; if (e < bd) { bd = e; q = j; } } pmemo.set(key, q); }
      const P = PAL[q]; d[i] = P[0]; d[i + 1] = P[1]; d[i + 2] = P[2];
    }
    k.putImageData(im, 0, 0);
  }
  const glowTiny = document.createElement('canvas'); glowTiny.width = glowTiny.height = 1;

  // ---------- the controls work with a mouse or a finger ----------
  function hit(e) { const [sx, sy] = toScene(e.clientX, e.clientY); return CTL.find(c => Math.hypot(sx - c.cx, sy - c.cy) < c.r + 6) ? [CTL.find(c => Math.hypot(sx - c.cx, sy - c.cy) < c.r + 6), sx, sy] : null; }
  let dialDir = null;
  // version 110 (Sam): the VOLUME dial is a real volume knob (drag up or down, the wheel, or click its top or bottom half),
  // kept on this computer; the deck's sound goes through out.gain (0.5 was the old level)
  try { const v = parseFloat(localStorage.getItem('deck-vol')); if (v >= 0 && v <= 1) volA = v; } catch (e) {}
  let volDrag = null;
  const setVol = v => { volA = Math.max(0, Math.min(1, v)); try { localStorage.setItem('deck-vol', String(volA)); } catch (e) {} applyVol(); };
  function applyVol() { if (typeof out !== 'undefined' && out && !(typeof OfflineAudioContext !== 'undefined' && out.context instanceof OfflineAudioContext)) { const t = volA * .9; if (Math.abs(out.gain.value - t) > .001) out.gain.value = t; } }
  const inRoom = () => !!window.deckTV && ['nerd', 'close', 'amigaroom', 'lwroom', 'kidroom'].includes(window.deckTV);
  const kidNow = () => window.deckTV === 'kidroom' && STYLE === 'kid' && typeof DeckKid !== 'undefined';
  const fullNow = () => kidNow() && DeckKid.fullness() > .9;
  const onMonitor = e => { if (!kidNow()) return false; const [sx, sy] = toScene(e.clientX, e.clientY), m = DeckKid.MON; return sx >= m.x && sx <= m.x + m.w && sy >= m.y && sy <= m.y + m.h; };
  // version 110: a small prompt by the pointer says what can be clicked and what it does
  let tip = null;
  function showTip(e, s) {
    if (!tip) { tip = document.createElement('div'); tip.style.cssText = 'position:fixed;z-index:50;pointer-events:none;padding:4px 8px;border-radius:4px;background:rgba(10,12,28,.88);color:#ffe8b0;font:700 13px system-ui,sans-serif;border:1px solid rgba(255,184,77,.6);white-space:nowrap;display:none'; document.body.appendChild(tip); }
    if (!s) { tip.style.display = 'none'; return; }
    tip.textContent = s; tip.style.display = 'block'; tip.style.left = Math.min(innerWidth - tip.offsetWidth - 6, e.clientX + 16) + 'px'; tip.style.top = Math.min(innerHeight - 30, e.clientY + 18) + 'px';
  }
  const TIPS = { chan: 'MOVE: CLICK A SIDE (UP, DOWN, LEFT, RIGHT)', start: 'START: PLAY OR PAUSE MENU', select: 'SELECT: CONSOLE', a: 'A BUTTON', b: 'B BUTTON: BACK', x: 'X BUTTON', y: 'Y BUTTON', view: 'VIEW: NEXT CAMERA (KEY V)' };
  function tipFor(e) {
    if (!inRoom()) return '';
    const over = e.target === cv || (typeof $ === 'function' && $('bezel') && $('bezel').contains(e.target));
    if (kidNow() && over) return fullNow() ? '' : 'CLICK: ZOOM IN TO THE SCREEN';
    if (e.target !== rc) return '';
    if (fullNow()) return 'CLICK: ZOOM OUT TO THE ROOM';
    const h2 = hit(e);
    if (h2) { const c = h2[0]; return c.id === 'vol' ? 'VOLUME ' + Math.round(volA * 100) + '%: DRAG UP OR DOWN, WHEEL, OR CLICK TOP / BOTTOM' : c.id === 'light' ? 'LIGHT: CLICK TO SWITCH ' + (DeckKid.dark ? 'ON' : 'OFF') : TIPS[c.id] || c.label; }
    if (onMonitor(e)) return 'CLICK: ZOOM IN TO THE SCREEN';
    return '';
  }
  function hook() {
    if (hooked) return; hooked = true;
    // version 110: a click on the screen while the room is in view zooms in first (the game does not get that click);
    // fully zoomed in, the screen works as the game's screen again
    const bz = $('bezel');
    if (bz) bz.addEventListener('pointerdown', e => {
      if (!kidNow() || fullNow()) return;
      DeckKid.go('full'); showTip(e, '');
      if (typeof view !== 'undefined' && view === 'off') return;   // a deck that is off is switched on by the same click
      e.stopPropagation(); e.preventDefault();
    }, true);
    addEventListener('pointermove', e => {
      if (volDrag) { setVol(volDrag.v - (e.clientY - volDrag.y) / 160); frame(); }
      const s = tipFor(e); showTip(e, s); if (rc) rc.style.cursor = s && e.target === rc ? 'pointer' : '';
    });
    rc.addEventListener('pointerdown', e => {
      if (!inRoom()) return;
      if (kidNow() && fullNow()) { e.preventDefault(); DeckKid.go('room'); showTip(e, ''); return; }   // fully zoomed in: a click in the dark round the screen zooms out
      const h2 = hit(e);
      if (!h2) { if (onMonitor(e)) { e.preventDefault(); DeckKid.go('full'); showTip(e, ''); } return; }
      e.preventDefault(); audio && audio(); const [c, sx, sy] = h2;
      if (c.id === 'chan') { const dx = sx - c.cx, dy = sy - c.cy; dialDir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down'); chanA = { up: 0, right: 1.2, down: Math.PI, left: -1.2 }[dialDir]; held.chan = true; press(dialDir, true); }
      else if (c.id === 'vol') { held.vol = true; volDrag = { y: e.clientY, v: volA, sy: sy, cy: c.cy, moved: false }; }
      else if (c.id === 'light') { held.light = true; DeckKid.toggleLight(); }
      else if (c.id === 'start') { held.start = true; pressStart(); }
      else if (c.id === 'select') { held.select = true; pressSelect(); }
      else if (c.id === 'view') { held.view = true; DeckKid.next(); }
      else { held[c.id] = true; press(c.id, true); }
      frame();
    });
    const up = e => {
      if (volDrag) { if (Math.abs(e.clientY - volDrag.y) < 4) setVol(volDrag.v + (volDrag.sy < volDrag.cy ? .1 : -.1)); volDrag = null; }   // a click without dragging: the top half louder, the bottom half softer
      if (dialDir) { press(dialDir, false); dialDir = null; } ['a', 'b', 'x', 'y'].forEach(n => { if (held[n]) press(n, false); }); held = {}; if (M) frame(); };
    addEventListener('pointerup', up); addEventListener('pointercancel', up);
    addEventListener('keydown', e => { if (window.deckTV === 'kidroom' && (e.key === 'v' || e.key === 'V') && typeof DeckKid !== 'undefined') DeckKid.next(); });   // V: the next camera view
    rc.addEventListener('wheel', e => {
      if (!window.deckTV || !['nerd', 'close', 'amigaroom', 'lwroom', 'kidroom'].includes(window.deckTV)) return; const h2 = hit(e); if (!h2) return; e.preventDefault(); const c = h2[0], s = e.deltaY < 0 ? 1 : -1;
      if (c.id === 'chan') { const d2 = s > 0 ? 'up' : 'down'; chanA += s * .4; press(d2, true); press(d2, false); }
      else if (c.id === 'vol') { setVol(volA + s * .05); showTip(e, tipFor(e)); }
      frame();
    }, { passive: false });
  }
  let kidIn = false;
  function start(canvas, m, style) { if (style === 'kid' && typeof DeckKid !== 'undefined') { const cs = consoleScreen(); DeckKid.fitRoom(innerWidth, innerHeight, Math.min(cs[0] / SCRV.w, cs[1] / SCRV.h)); } if (style === 'kid' && !kidIn && typeof DeckKid !== 'undefined') { kidIn = true; DeckKid.enter(); } if (style !== 'kid') kidIn = false;
    layout(canvas, m, style); if (!timer) timer = setInterval(() => { if (!window.deckTV || !['nerd', 'close', 'amigaroom', 'lwroom', 'kidroom'].includes(window.deckTV)) { clearInterval(timer); timer = null; kidIn = false; return; } if (STYLE === 'kid' && DeckKid.tick()) layout(rc, mode, STYLE); else frame(); }, STYLE === 'kid' ? 70 : 100); }
  return { start, layout, frame };
})();
