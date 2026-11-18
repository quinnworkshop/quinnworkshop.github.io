// DECK KID ROOM (version 84, Sam, 21 October 2026): "a full new kids room, more colour, all the toys and games he can
// think of, a bit dirty and nerdy, a gaming monitor instead of the TV, less lo-fi filter."
// Drawn in code (no outside pictures), our own names and designs only. deckroom.js calls base() once per window size
// and lights() every frame; the game shows in the monitor's glass at the same place as the TV's glass (SCRV).
'use strict';
const DeckKid = (() => {
  // the monitor's geometry: three-quarter view (Sam: not frontal, a little farther) and frontal, mixed by setTurn(0..1).
  // QUAD is the glass's corners in scene units, clockwise from the top left; deckroom.js warps the game onto them.
  const Q34 = [[572, 232], [978, 258], [978, 590], [572, 622]], QFR = [[574, 238], [976, 238], [976, 598], [574, 598]];
  const G34 = [[562, 222], [988, 249], [988, 599], [562, 632]], GFR = [[564, 228], [986, 228], [986, 608], [564, 608]];
  const F34 = [[528, 190], [1022, 222], [1022, 676], [528, 716]], FFR = [[530, 196], [1020, 196], [1020, 700], [530, 700]];
  const D34 = [-150, -36], DFR = [0, -24];
  const mixQ = (A, B, s) => A.map((p, i) => [p[0] + (B[i][0] - p[0]) * s, p[1] + (B[i][1] - p[1]) * s]);
  const lerp2 = (p, q, s) => [p[0] + (q[0] - p[0]) * s, p[1] + (q[1] - p[1]) * s];
  let QUAD = Q34, GLASSOUT = G34, FRONT = F34, DEPTH = D34, QC = [775, 425];
  const chinY = cx => { const F = FRONT, s = (cx - F[3][0]) / (F[2][0] - F[3][0]); return F[3][1] + (F[2][1] - F[3][1]) * s - 34; };
  const MON = { x: 528, y: 190, w: 494, h: 526 };
  const CTL = [
    { id: 'chan', kind: 'dial', cx: 1100, cy: 628, r: 17, label: 'MOVE' }, { id: 'vol', kind: 'dial', cx: 1100, cy: 676, r: 11, label: 'VOLUME' },
    { id: 'light', kind: 'switch', cx: 1300, cy: 440, r: 12, label: 'LIGHT' },   // version 110 (Sam): the room's main light, on the wall by the bookcase
    { id: 'select', kind: 'btn', cx: 590, cy: chinY(590), r: 7, label: 'SELECT' }, { id: 'view', kind: 'btn', cx: 1100, cy: 578, r: 8, label: 'VIEW', col: '#f0a030' }, { id: 'start', kind: 'btn', cx: 624, cy: chinY(624), r: 7, label: 'START' },
    { id: 'y', kind: 'btn', cx: 862, cy: chinY(862), r: 7, label: 'Y', col: '#3aa85a' }, { id: 'x', kind: 'btn', cx: 888, cy: chinY(888), r: 7, label: 'X', col: '#3a5fd0' },
    { id: 'b', kind: 'btn', cx: 914, cy: chinY(914), r: 7, label: 'B', col: '#e8c12e' }, { id: 'a', kind: 'btn', cx: 940, cy: chinY(940), r: 7, label: 'A', col: '#d23a3a' }];
  const CLOSE = { x: 500, y: 170, w: 680, h: 560 };
  let H = null;

  function tilt(k, cx, cy, a, fn) { k.save(); k.translate(cx, cy); k.rotate(a); fn(); k.restore(); }
  function tape(k, tx, ty, a) { tilt(k, tx, ty, a, () => { k.fillStyle = 'rgba(235,225,190,.55)'; k.fillRect(-9, -4, 18, 8); }); }
  function poster(k, px, py, w, h, a, t1, t2, cols) {
    tilt(k, px + w / 2, py + h / 2, a, () => { H.poster(k, -w / 2, -h / 2, w, h, t1, t2, cols); tape(k, -w / 2 + 4, -h / 2, -.5); tape(k, w / 2 - 4, -h / 2, .5); });
  }
  function can(k, cx, cy, col, down) {
    if (down) { tilt(k, cx, cy, 1.45, () => { H.rr(k, -9, -16, 18, 32, 3); k.fillStyle = col; k.fill(); k.fillStyle = 'rgba(255,255,255,.35)'; k.fillRect(-9, -16, 18, 4); k.fillStyle = '#ccc'; k.fillRect(-6, -18, 12, 3); }); return; }
    H.rr(k, cx - 9, cy - 32, 18, 32, 3); k.fillStyle = col; k.fill(); k.fillStyle = '#cfd0d8'; k.fillRect(cx - 8, cy - 34, 16, 3); k.fillStyle = 'rgba(255,255,255,.3)'; k.fillRect(cx - 6, cy - 28, 3, 24); k.fillStyle = 'rgba(0,0,0,.25)'; k.fillRect(cx - 9, cy - 18, 18, 6);
  }
  function figure(k, fx, fy, s, body, head) {   // a little action figure on a shelf
    k.fillStyle = body; k.fillRect(fx - 5 * s, fy - 16 * s, 10 * s, 12 * s); k.fillRect(fx - 5 * s, fy - 4 * s, 4 * s, 4 * s); k.fillRect(fx + 1 * s, fy - 4 * s, 4 * s, 4 * s);
    k.fillRect(fx - 8 * s, fy - 15 * s, 3 * s, 9 * s); k.fillRect(fx + 5 * s, fy - 15 * s, 3 * s, 9 * s);
    k.fillStyle = head; k.beginPath(); k.arc(fx, fy - 21 * s, 5 * s, 0, 6.283); k.fill(); k.fillStyle = '#0a0a10'; k.fillRect(fx - 3 * s, fy - 22 * s, 2 * s, 1.5 * s); k.fillRect(fx + 1 * s, fy - 22 * s, 2 * s, 1.5 * s);
  }
  function boxes(k, bx, by, maxX, cols) {   // game boxes standing on a shelf, spines out
    let xx = bx; while (xx < maxX) { const w2 = 9 + H.rnd() * 9, h2 = 40 + H.rnd() * 22, c = cols[Math.floor(H.rnd() * cols.length)]; k.fillStyle = c; k.fillRect(xx, by - h2, w2, h2);
      k.fillStyle = 'rgba(255,255,255,.3)'; k.fillRect(xx + 2, by - h2 + 5, w2 - 4, 3); k.fillStyle = 'rgba(0,0,0,.3)'; k.fillRect(xx + w2 - 1, by - h2, 1, h2); xx += w2 + 1; if (H.rnd() < .08) xx += 14; }
  }

  // ---------- the room, drawn once ----------
  function base(k, helpers) {
    H = helpers; const { rr, poly, glowAt, label, rnd } = H;
    // the back wall: deep blue-violet wallpaper with little rockets and stars, a few dirty marks
    const bw = k.createLinearGradient(0, -200, 0, 640); bw.addColorStop(0, '#2b2a5e'); bw.addColorStop(1, '#201c46'); k.fillStyle = bw; k.fillRect(-400, -200, 2400, 840);
    for (let xx = 270; xx < 2000; xx += 44) { k.fillStyle = 'rgba(255,255,255,.035)'; k.fillRect(xx, -200, 20, 840); }
    for (let i = 0; i < 90; i++) { const sx = 280 + rnd() * 1700, sy = -20 + rnd() * 640; k.fillStyle = rnd() < .5 ? 'rgba(255,220,120,.16)' : 'rgba(140,220,255,.14)'; if (rnd() < .5) H.star(k, sx, sy, 3 + rnd() * 2); else { k.fillRect(sx, sy, 3, 8); k.fillRect(sx - 2, sy + 6, 7, 3); } }
    for (let i = 0; i < 7; i++) { k.fillStyle = 'rgba(30,20,10,.18)'; k.beginPath(); k.ellipse(300 + rnd() * 1300, 300 + rnd() * 320, 10 + rnd() * 30, 6 + rnd() * 14, rnd(), 0, 6.283); k.fill(); }   // marks and stains
    // the left wall, going back into the corner, painted mint, with a cobweb up in the corner
    poly(k, [[-400, -200], [262, -200], [262, 640], [-400, 900]], '#1f4a50');
    for (let i = 0; i < 8; i++) { k.fillStyle = 'rgba(0,0,0,.05)'; poly(k, [[-400 + i * 84, -200], [-370 + i * 84, -200], [-370 + i * 84, 870 - i * 28], [-400 + i * 84, 880 - i * 28]], 'rgba(0,0,0,.05)'); }
    k.strokeStyle = 'rgba(0,0,0,.55)'; k.lineWidth = 3; k.beginPath(); k.moveTo(262, -200); k.lineTo(262, 640); k.stroke();
    k.strokeStyle = 'rgba(220,220,230,.22)'; k.lineWidth = 1; for (let i = 0; i < 6; i++) { k.beginPath(); k.moveTo(262, 0); k.lineTo(262 - 60 * Math.cos(i * .3), 60 * Math.sin(i * .3) + 4); k.stroke(); } for (let r = 12; r < 60; r += 12) { k.beginPath(); k.arc(262, 0, r, Math.PI * .5, Math.PI); k.stroke(); }
    // the window in the left wall: the rainy city at night (the rain moves in lights())
    poly(k, [[-240, 30], [170, 96], [170, 380], [-240, 420]], '#0a0a20');
    const sky = k.createLinearGradient(0, 30, 0, 420); sky.addColorStop(0, '#120c30'); sky.addColorStop(1, '#4a1a50'); k.save(); k.beginPath(); k.moveTo(-240, 30); k.lineTo(170, 96); k.lineTo(170, 380); k.lineTo(-240, 420); k.closePath(); k.clip();
    k.fillStyle = sky; k.fillRect(-260, 20, 450, 420);
    for (let i = 0; i < 16; i++) { const bx = -250 + i * 27, bh = 80 + rnd() * 200; k.fillStyle = i % 2 ? '#1a1238' : '#140e2c'; k.fillRect(bx, 420 - bh, 26, bh); for (let j = 0; j < 12; j++) if (rnd() < .35) { k.fillStyle = rnd() < .5 ? '#ffcf6a' : '#6ae8ff'; k.fillRect(bx + 4 + (j % 3) * 7, 430 - bh + Math.floor(j / 3) * 16, 3, 4); } }
    k.restore(); k.strokeStyle = '#d8d0c0'; k.lineWidth = 8; k.beginPath(); k.moveTo(-240, 30); k.lineTo(170, 96); k.lineTo(170, 380); k.lineTo(-240, 420); k.closePath(); k.stroke(); k.lineWidth = 5; k.beginPath(); k.moveTo(-35, 62); k.lineTo(-35, 400); k.moveTo(-240, 225); k.lineTo(170, 238); k.stroke();
    k.fillStyle = '#c84a6a'; poly(k, [[-280, 10], [-200, 22], [-210, 470], [-290, 480]], '#c84a6a'); poly(k, [[150, 82], [215, 92], [215, 410], [150, 400]], '#c84a6a');   // curtains
    // the ceiling's edge and the floor: worn wooden boards, a round rug in rainbow rings
    k.fillStyle = '#121026'; k.fillRect(262, -200, 2000, 14);
    poly(k, [[262, 640], [2000, 640], [2000, 1100], [-400, 1100], [-400, 900]], '#4a3026');
    for (let i = 0; i < 26; i++) { k.strokeStyle = 'rgba(0,0,0,.28)'; k.lineWidth = 2; k.beginPath(); k.moveTo(300 + i * 70, 640); k.lineTo(-900 + i * 150, 1100); k.stroke(); }
    for (let yy = 660; yy < 1100; yy += 28 + (yy - 640) * .1) { k.fillStyle = 'rgba(0,0,0,.12)'; k.fillRect(-400, yy, 2400, 2); }
    k.fillStyle = '#2e1e18'; k.fillRect(262, 630, 1800, 12);   // the skirting board
    [['#d23a5a', 330], ['#f0a030', 300], ['#e8d040', 270], ['#3ab060', 240], ['#3a80d8', 210], ['#7a4ad0', 180]].forEach(([c, r]) => { k.fillStyle = c; k.beginPath(); k.ellipse(760, 900, r * 1.5, r * .42, 0, 0, 6.283); k.fill(); });
    k.fillStyle = 'rgba(40,20,10,.25)'; k.beginPath(); k.ellipse(860, 930, 60, 16, .2, 0, 6.283); k.fill();   // a juice stain on the rug
    // the arcade cabinet in the back left corner (our own: NEON RUN)
    poly(k, [[270, 250], [300, 236], [300, 640], [270, 650]], '#140a26'); poly(k, [[300, 236], [430, 236], [430, 640], [300, 640]], '#2a1450');
    poly(k, [[300, 236], [430, 236], [430, 282], [300, 282]], '#3a0f38'); poly(k, [[310, 296], [420, 296], [416, 400], [314, 400]], '#05050a');
    poly(k, [[296, 414], [434, 414], [444, 446], [286, 446]], '#3a2a60'); k.fillStyle = '#d82848'; k.beginPath(); k.arc(318, 424, 7, 0, 6.283); k.fill();
    ['#3ff0ff', '#ffb84d', '#ff3fa8'].forEach((c, i) => { k.fillStyle = c; k.beginPath(); k.ellipse(356 + i * 22, 430, 7, 4, 0, 0, 6.283); k.fill(); });
    k.fillStyle = '#ff3fa8'; for (let yy = 460; yy < 630; yy += 40) k.fillRect(302, yy, 126, 3);
    // stickers on the arcade's side
    [['#f8d030', 280, 520], ['#3ff0ff', 284, 580]].forEach(([c, sx, sy]) => { k.fillStyle = c; H.star(k, sx, sy, 8); });
    // posters of our own games, crooked, taped
    poster(k, 1096, 64, 126, 176, .05, 'RAINLIGHT', '2091', ['#1a0f2e', '#ff3fa8', '#3ff0ff']);
    poster(k, 1244, 96, 104, 140, -.06, 'SPACE', 'KAT', ['#0e2a40', '#ffd040', '#ff6ad0']);
    poster(k, 450, 60, 92, 128, -.04, 'CRYSTAL', 'NINJA', ['#3a1430', '#d82800', '#f8d030']);
    poster(k, 1236, 270, 110, 84, .03, 'DECK', 'TRAX', ['#0f2030', '#3fd6c1', '#ffb84d']);
    // a pixel-art banner and a shelf above the monitor with figures, a robot, a brick spaceship, a cube puzzle
    k.fillStyle = '#e83a6a'; poly(k, [[610, 34], [960, 34], [944, 60], [960, 86], [610, 86], [626, 60]], '#e83a6a'); label(k, 'LEVEL UP!', 785, 61, 30, '#fff3c0', '900 ');
    H.wood(k, 556, 164, 470, 10, 2, false); k.fillStyle = 'rgba(0,0,0,.35)'; k.fillRect(560, 174, 462, 6);
    figure(k, 584, 164, 1.3, '#3a80d8', '#f0c8a0'); figure(k, 614, 164, 1.3, '#d23a3a', '#7a4ad0'); figure(k, 644, 164, 1.1, '#3ab060', '#f0c8a0');
    rr(k, 676, 120, 34, 44, 7); k.fillStyle = '#9aa0b4'; k.fill(); k.fillStyle = '#3ff0ff'; k.fillRect(684, 132, 7, 4); k.fillRect(696, 132, 7, 4); k.fillStyle = '#6a7084'; k.fillRect(684, 146, 18, 5); k.fillStyle = '#d23a3a'; k.fillRect(691, 112, 4, 8);
    poly(k, [[740, 160], [840, 160], [820, 140], [790, 128], [760, 140]], '#e8e8f0'); k.fillStyle = '#3a80d8'; k.fillRect(770, 140, 40, 8); k.fillStyle = '#f0a030'; k.fillRect(732, 148, 10, 10); k.fillRect(838, 148, 10, 10);   // the brick spaceship
    [['#d23a3a', '#3ab060', '#f8d030'], ['#3a80d8', '#ffffff', '#f0a030'], ['#f8d030', '#d23a3a', '#3a80d8']].forEach((row, r) => row.forEach((c, q) => { k.fillStyle = c; k.fillRect(870 + q * 9, 134 + r * 9, 8, 8); }));
    rr(k, 920, 124, 40, 40, 6); k.fillStyle = '#f0e0c0'; k.fill(); k.fillStyle = '#2a2030'; k.fillRect(928, 136, 6, 6); k.fillRect(946, 136, 6, 6); k.fillStyle = '#e88aa0'; k.fillRect(936, 148, 8, 4); k.fillStyle = '#f0e0c0'; poly(k, [[922, 128], [928, 110], [936, 126]], '#f0e0c0'); poly(k, [[944, 126], [952, 110], [958, 128]], '#f0e0c0');   // a cat plush
    k.fillStyle = '#ff6a3a'; rr(k, 980, 110, 18, 54, 8); k.fill();   // the lava lamp's glass (lit in lights())
    // the pegboard: controllers, a headset, cables
    k.fillStyle = '#7a5a3a'; k.fillRect(1100, 380, 120, 120); k.fillStyle = 'rgba(0,0,0,.4)'; for (let r = 0; r < 8; r++) for (let q = 0; q < 8; q++) k.fillRect(1106 + q * 15, 386 + r * 15, 3, 3);
    [[1124, 404, '#2a2a34'], [1176, 404, '#cfc6ad']].forEach(([cx, cy, c]) => { k.fillStyle = c; k.fillRect(cx - 20, cy, 40, 20); k.fillStyle = '#111'; k.fillRect(cx - 14, cy + 8, 9, 3); k.fillRect(cx - 11, cy + 5, 3, 9); k.fillStyle = '#d23a3a'; k.beginPath(); k.arc(cx + 10, cy + 10, 4, 0, 6.283); k.fill(); });   // old flat pads
    k.fillStyle = '#1c1c22'; k.fillRect(1108, 456, 32, 22); k.strokeStyle = '#111'; k.lineWidth = 5; k.beginPath(); k.moveTo(1124, 458); k.lineTo(1124, 436); k.stroke(); k.fillStyle = '#d23a3a'; k.beginPath(); k.arc(1124, 434, 6, 0, 6.283); k.fill();   // a joystick
    k.strokeStyle = '#111'; k.lineWidth = 5; k.beginPath(); k.arc(1180, 470, 18, Math.PI, 0); k.stroke(); k.fillStyle = '#111'; rr(k, 1158, 466, 10, 18, 3); k.fill(); rr(k, 1192, 466, 10, 18, 3); k.fill();
    // the tall bookcase on the right: games, comics, figures, a plush, a globe
    H.wood(k, 1380, 120, 220, 500, 3, true); k.fillStyle = '#140c08'; k.fillRect(1392, 130, 196, 480);
    const COLS = ['#d23a3a', '#3a80d8', '#3ab060', '#f0a030', '#7a4ad0', '#e8e8f0', '#e83a9a', '#2a2a34', '#f8d030'];
    for (const sy of [230, 340, 450, 560]) { H.wood(k, 1388, sy, 204, 8, 1, false); }
    boxes(k, 1396, 230, 1500, COLS); figure(k, 1520, 230, 1.4, '#e8d040', '#3a3a3a'); figure(k, 1556, 230, 1.4, '#7a4ad0', '#f0c8a0');
    for (let i = 0; i < 9; i++) { k.fillStyle = COLS[(i * 4) % 9]; k.fillRect(1400 + i * 2, 330 - i * 7, 70, 6); }   // a stack of comics lying flat
    k.fillStyle = '#2a6ac8'; k.beginPath(); k.arc(1530, 312, 22, 0, 6.283); k.fill(); k.fillStyle = '#3ab060'; k.beginPath(); k.ellipse(1524, 306, 10, 7, .4, 0, 6.283); k.fill(); k.beginPath(); k.ellipse(1540, 322, 6, 8, 0, 0, 6.283); k.fill(); k.fillStyle = '#8a6a3a'; k.fillRect(1526, 334, 8, 6);
    boxes(k, 1396, 450, 1588, COLS);
    k.fillStyle = '#e8a0c0'; k.beginPath(); k.arc(1430, 538, 22, 0, 6.283); k.fill(); k.beginPath(); k.arc(1414, 518, 8, 0, 6.283); k.arc(1446, 518, 8, 0, 6.283); k.fill(); k.fillStyle = '#2a2030'; k.fillRect(1422, 532, 4, 4); k.fillRect(1436, 532, 4, 4);   // a pink bunny plush
    for (let i = 0; i < 6; i++) { k.fillStyle = ['#3a3a44', '#5a2a2a', '#2a2a5a'][i % 3]; k.fillRect(1470 + i * 18, 532, 14, 28); k.fillStyle = '#c8c0a8'; k.fillRect(1472 + i * 18, 536, 10, 8); }   // cartridges
    // the fish tank on a low chest of drawers (lit in lights())
    H.wood(k, 1360, 640, 260, 130, 3, false); for (const dy of [664, 704, 744]) { k.fillStyle = 'rgba(0,0,0,.35)'; k.fillRect(1372, dy, 236, 2); k.fillStyle = '#d8b07a'; k.fillRect(1480, dy + 12, 20, 4); }
    k.fillStyle = '#0a2030'; k.fillRect(1384, 560, 212, 80); k.strokeStyle = '#1a1a22'; k.lineWidth = 5; k.strokeRect(1384, 560, 212, 80); k.fillStyle = '#c8a46a'; k.fillRect(1386, 626, 208, 12);
    k.fillStyle = '#3ab060'; for (let i = 0; i < 5; i++) poly(k, [[1400 + i * 44, 628], [1408 + i * 44, 580 + i % 2 * 10], [1414 + i * 44, 628]], '#2a9050');
    // the bed on the left: a rumpled rainbow duvet, a pillow, a plush robot, a manga stack, a sock
    poly(k, [[-400, 640], [240, 610], [270, 700], [270, 760], [-400, 860]], '#1a1430');
    poly(k, [[-400, 600], [230, 590], [262, 690], [-400, 770]], '#7a4ad0');
    for (let i = 0; i < 6; i++) { const c = ['#d23a5a', '#f0a030', '#e8d040', '#3ab060', '#3a80d8', '#7a4ad0'][i]; poly(k, [[-400 + i * 110, 610 - i * 4], [-330 + i * 110, 606 - i * 4], [-300 + i * 110, 760 - i * 12], [-370 + i * 110, 766 - i * 12]], c); }
    for (let i = 0; i < 5; i++) { k.strokeStyle = 'rgba(0,0,0,.25)'; k.lineWidth = 3; k.beginPath(); k.moveTo(-380 + i * 130, 640); k.quadraticCurveTo(-320 + i * 130, 690, -360 + i * 130, 740); k.stroke(); }   // the folds
    rr(k, 110, 560, 120, 50, 18); k.fillStyle = '#e8e4f0'; k.fill(); k.fillStyle = 'rgba(0,0,0,.12)'; k.fillRect(120, 596, 100, 6);
    rr(k, 40, 548, 42, 50, 8); k.fillStyle = '#b8bcc8'; k.fill(); k.fillStyle = '#ff3fa8'; k.fillRect(48, 562, 8, 5); k.fillRect(64, 562, 8, 5); k.fillStyle = '#8a8e9a'; k.fillRect(50, 578, 22, 6); k.fillStyle = '#f0a030'; k.fillRect(58, 538, 4, 10);   // the plush robot
    for (let i = 0; i < 6; i++) { k.fillStyle = COLS[i]; k.fillRect(-120 + i, 660 - i * 9, 64, 8); }   // manga on the bed
    // the desk: a wide top seen a little from above, metal legs, open underneath
    poly(k, [[460, 682], [1150, 682], [1170, 716], [440, 716]], '#2a2a36'); poly(k, [[440, 716], [1170, 716], [1170, 730], [440, 730]], '#1a1a24');
    k.fillStyle = '#14141c'; k.fillRect(456, 730, 14, 170); k.fillRect(1140, 730, 14, 170);
    // under the desk: a cassette deck for loading games, boxes of floppy disks, a bin full of cans and paper
    rr(k, 950, 836, 120, 50, 4); k.fillStyle = '#2a2a30'; k.fill(); rr(k, 966, 846, 60, 26, 3); k.fillStyle = '#14141a'; k.fill(); k.fillStyle = '#8a8a96'; [0, 1, 2, 3, 4].forEach(i => k.fillRect(1032, 846 + i * 6, 30, 3));
    [[900, 836, '#d23a3a'], [904, 800, '#3a80d8'], [898, 764, '#e8e8e0']].forEach(([bx, by, c]) => { k.fillStyle = c; k.fillRect(bx, by, 56, 36); k.fillStyle = 'rgba(0,0,0,.3)'; k.fillRect(bx, by, 56, 6); for (let i = 0; i < 5; i++) { k.fillStyle = ['#2a2a34', '#f0a030', '#3ab060'][i % 3]; k.fillRect(bx + 6 + i * 9, by - 10, 7, 12); } });    k.fillStyle = '#2a3a4a'; poly(k, [[500, 820], [570, 820], [562, 900], [508, 900]], '#3a4a5a');
    can(k, 520, 822, '#3ab060'); can(k, 544, 818, '#d23a3a'); k.fillStyle = '#e8e8e0'; k.beginPath(); k.arc(560, 810, 10, 0, 6.283); k.fill(); k.beginPath(); k.arc(506, 812, 8, 0, 6.283); k.fill();
    // the monitor (Sam: a CRT like the old home computers had, our own design, seen from the side a little, a bit farther
    // back): a deep beige box turned toward the bed; we see its front, its left side and its top
    const F = FRONT, Bk = F.map(p => [p[0] + DEPTH[0] + (787 - p[0]) * .16, p[1] + DEPTH[1] + (440 - p[1]) * .16]);
    k.fillStyle = 'rgba(0,0,0,.45)'; k.beginPath(); k.moveTo(F[3][0] - 10, F[3][1] + 4); k.lineTo(F[2][0] + 10, F[2][1] + 4); k.lineTo(Bk[2][0], Bk[2][1] + 14); k.lineTo(Bk[3][0] - 20, Bk[3][1] + 14); k.closePath(); k.fill();   // its shadow on the desk
    poly(k, [F[0], F[1], Bk[1], Bk[0]], '#c2b89c');   // the top
    for (let i = 0; i < 12; i++) { const u2 = .15 + i * .06, p1 = lerp2(lerp2(F[0], F[1], u2), lerp2(Bk[0], Bk[1], u2), .25), p2 = lerp2(lerp2(F[0], F[1], u2), lerp2(Bk[0], Bk[1], u2), .7); k.strokeStyle = 'rgba(80,70,52,.4)'; k.lineWidth = 3; k.beginPath(); k.moveTo(p1[0], p1[1]); k.lineTo(p2[0], p2[1]); k.stroke(); }   // the vents
    poly(k, [F[0], F[3], Bk[3], Bk[0]], '#988e74');   // the left side, in shadow
    for (let i = 0; i < 6; i++) { const v = .55 + i * .06, p1 = lerp2(lerp2(F[0], F[3], v), lerp2(Bk[0], Bk[3], v), .3), p2 = lerp2(lerp2(F[0], F[3], v), lerp2(Bk[0], Bk[3], v), .75); k.strokeStyle = 'rgba(60,52,40,.4)'; k.lineWidth = 3; k.beginPath(); k.moveTo(p1[0], p1[1]); k.lineTo(p2[0], p2[1]); k.stroke(); }
    const fg = k.createLinearGradient(F[0][0], 0, F[1][0], 0); fg.addColorStop(0, '#ddd4b9'); fg.addColorStop(1, '#bcb194'); poly(k, F, fg);   // the front
    k.strokeStyle = 'rgba(255,250,230,.45)'; k.lineWidth = 2; k.beginPath(); k.moveTo(F[0][0], F[0][1] + 1); k.lineTo(F[1][0], F[1][1] + 1); k.stroke();
    const inset = (q, s) => q.map((p, i) => [p[0] + (QC[0] - p[0]) * s, p[1] + (QC[1] - p[1]) * s]);
    poly(k, inset(GLASSOUT, 0), '#8f8878'); poly(k, inset(GLASSOUT, .01), '#5c574c'); poly(k, QUAD.map((p, i) => [p[0] + (QC[0] - p[0]) * -.012, p[1] + (QC[1] - p[1]) * -.012]), '#040404');   // the bezel stepping in, the glass
    // the front strip under the glass: speaker slots, the power switch and its light (lit in lights()), our buttons
    for (let i = 0; i < 9; i++) { const p = lerp2(F[3], F[2], .36 + i * .022); k.fillStyle = 'rgba(70,60,48,.45)'; k.fillRect(p[0], p[1] - 42, 5, 22); }
    const ps = lerp2(F[3], F[2], .9); rr(k, ps[0], ps[1] - 38, 20, 9, 2); k.fillStyle = '#3a3a34'; k.fill();
    CTL.filter(c => c.kind === 'btn').forEach(c => label(k, c.label, c.cx, c.cy + 12, 6, 'rgba(70,60,48,.85)', '700 '));
    for (let i = 0; i < 6; i++) { const p = lerp2(F[3], F[2], .08 + i * .16); k.fillStyle = 'rgba(150,120,60,.08)'; k.beginPath(); k.ellipse(p[0], p[1] - 18, 40, 14, 0, 0, 6.283); k.fill(); }   // yellowed, a bit grubby
    tilt(k, F[1][0] - 14, F[1][1] + 16, .3, () => { k.fillStyle = '#f8d030'; H.star(k, 0, 0, 10); });    // the little control box next to it (MOVE and SOUND dials)
    rr(k, 1072, 560, 56, 142, 8); k.fillStyle = '#1c1d26'; k.fill(); k.strokeStyle = 'rgba(160,170,200,.25)'; k.stroke();
    // on the desk: the Brain-Deck console, an RGB keyboard, mouse and pad, cans, cup noodles, crisps, a dice set
    tilt(k, 520, 700, -.04, () => { rr(k, -60, -14, 120, 26, 6); k.fillStyle = '#c9c5b8'; k.fill(); rr(k, -50, -10, 60, 14, 3); k.fillStyle = '#0a0a12'; k.fill(); k.fillStyle = '#a8275f'; k.beginPath(); k.arc(34, -1, 5, 0, 6.283); k.arc(48, 4, 5, 0, 6.283); k.fill(); });
    k.strokeStyle = '#111'; k.lineWidth = 3; k.beginPath(); k.moveTo(580, 700); k.bezierCurveTo(640, 690, 700, 690, 760, 680); k.stroke();
    // the home computer's beige keyboard (keys and all), a joystick with a red fire button (Sam: everything old-school)
    poly(k, [[632, 688], [906, 688], [922, 716], [616, 716]], '#cfc6ad'); poly(k, [[616, 716], [922, 716], [922, 724], [616, 724]], '#a69c82');
    for (let r = 0; r < 4; r++) for (let q = 0; q < 17; q++) { const kx = 640 + q * 15 - r * 3, ky = 691 + r * 6; k.fillStyle = (q > 13 && r < 2) ? '#8a8270' : r === 3 && q > 4 && q < 12 ? '#bcb39a' : '#e8e0c8'; k.fillRect(kx, ky, 12, 4); }
    k.fillStyle = '#d23a3a'; k.fillRect(890, 693, 8, 3);   // its little power light
    rr(k, 950, 694, 46, 20, 4); k.fillStyle = '#1c1c22'; k.fill(); k.fillStyle = '#d23a3a'; k.beginPath(); k.arc(960, 698, 5, 0, 6.283); k.fill();
    k.strokeStyle = '#111'; k.lineWidth = 6; k.lineCap = 'round'; k.beginPath(); k.moveTo(978, 700); k.lineTo(984, 668); k.stroke(); k.lineCap = 'butt'; k.fillStyle = '#d23a3a'; k.beginPath(); k.arc(984, 666, 7, 0, 6.283); k.fill();    can(k, 1060, 712, '#e8d040'); can(k, 1150, 712, '#3a80d8'); can(k, 600, 734, '#d23a3a', true);
    rr(k, 1172, 680, 34, 34, 4); k.fillStyle = '#f0f0e8'; k.fill(); k.fillStyle = '#d23a3a'; k.fillRect(1172, 690, 34, 8);   // cup noodles (on the drawers' edge)
    tilt(k, 470, 680, -.2, () => { k.fillStyle = '#f0a030'; k.fillRect(-14, -24, 28, 34); k.fillStyle = '#d23a3a'; k.fillRect(-14, -12, 28, 8); });   // a bag of crisps
    ['#d23a3a', '#3a80d8', '#e8e8f0'].forEach((c, i) => { tilt(k, 912 + i * 10, 726 - (i % 2) * 2, i, () => { k.fillStyle = c; k.fillRect(-4, -4, 8, 8); }); });
    // an old swivel chair with a worn brown seat, turned to the side, at the front left
    poly(k, [[250, 560], [380, 540], [410, 780], [290, 800]], '#1a1a24'); poly(k, [[268, 590], [370, 574], [392, 760], [298, 772]], '#8a5a34'); poly(k, [[300, 600], [350, 594], [366, 750], [314, 756]], '#1a1a24');
    poly(k, [[240, 780], [440, 760], [450, 800], [250, 820]], '#22222c'); k.fillStyle = '#111'; k.fillRect(340, 810, 14, 60); poly(k, [[260, 870], [440, 860], [430, 880], [270, 890]], '#111');
    k.fillStyle = '#e8e8f0'; poly(k, [[280, 740], [350, 728], [360, 770], [300, 784]], '#2a6ac8'); label(k, '8', 320, 755, 22, '#fff', '900 ');   // a T-shirt thrown over it
    // the floor clutter: a pizza box with a slice, socks, comics, a skateboard, a toy rocket, bricks, a controller, crumbs, a can
    tilt(k, 640, 840, -.12, () => { k.fillStyle = '#c8a46a'; k.fillRect(-80, -30, 160, 60); k.fillStyle = '#a8844a'; k.fillRect(-80, -30, 160, 6); poly(k, [[-30, -10], [40, -16], [10, 22]], '#f0c050'); k.fillStyle = '#c83a2a'; k.beginPath(); k.arc(8, -4, 5, 0, 6.283); k.arc(-6, 4, 4, 0, 6.283); k.fill(); label(k, 'PIZZA', 50, 18, 11, '#7a1f1f', '900 '); });
    [[880, 960, '#e8e8f0'], [1260, 900, '#3ab060']].forEach(([sx, sy, c]) => { tilt(k, sx, sy, .6, () => { k.fillStyle = c; k.fillRect(-20, -6, 30, 12); k.fillRect(4, -6, 12, 22); k.fillStyle = 'rgba(0,0,0,.2)'; k.fillRect(-20, 2, 30, 4); }); });
    for (let i = 0; i < 4; i++) tilt(k, 1080 + i * 28, 950 + i * 6, -.3 + i * .25, () => { k.fillStyle = COLS[i + 1]; k.fillRect(-30, -20, 60, 40); k.fillStyle = 'rgba(255,255,255,.6)'; k.fillRect(-26, -16, 30, 10); });   // comics
    tilt(k, 1300, 1010, -.08, () => { rr(k, -150, -18, 300, 36, 18); k.fillStyle = '#e83a9a'; k.fill(); k.fillStyle = '#f8d030'; k.fillRect(-90, -6, 180, 4); k.fillStyle = '#e8e8f0'; [-110, 110].forEach(q => { k.beginPath(); k.arc(q, 24, 12, 0, 6.283); k.fill(); }); });   // the skateboard
    tilt(k, 480, 980, -.9, () => { k.fillStyle = '#e8e8f0'; k.fillRect(-12, -40, 24, 64); poly(k, [[-12, -40], [12, -40], [0, -64]], '#d23a3a'); poly(k, [[-12, 14], [-24, 30], [-12, 30]], '#d23a3a'); poly(k, [[12, 14], [24, 30], [12, 30]], '#d23a3a'); k.fillStyle = '#3a80d8'; k.beginPath(); k.arc(0, -18, 6, 0, 6.283); k.fill(); });   // the toy rocket
    for (let i = 0; i < 14; i++) { const bx = 700 + rnd() * 400, by = 880 + rnd() * 160; k.fillStyle = COLS[Math.floor(rnd() * 9)]; k.fillRect(bx, by, 14, 9); k.fillStyle = 'rgba(255,255,255,.3)'; k.fillRect(bx + 2, by - 2, 4, 2); k.fillRect(bx + 8, by - 2, 4, 2); }   // bricks to step on
    tilt(k, 960, 1020, .3, () => { rr(k, -34, -14, 68, 28, 12); k.fillStyle = '#2a2a34'; k.fill(); k.fillStyle = '#d23a3a'; k.beginPath(); k.arc(18, -2, 4, 0, 6.283); k.fill(); k.fillStyle = '#3a80d8'; k.beginPath(); k.arc(26, 4, 4, 0, 6.283); k.fill(); k.fillStyle = '#111'; k.fillRect(-24, -2, 14, 4); k.fillRect(-19, -7, 4, 14); });
    can(k, 1200, 1000, '#e8d040', true); for (let i = 0; i < 40; i++) { k.fillStyle = 'rgba(240,200,120,.5)'; k.fillRect(560 + rnd() * 260, 860 + rnd() * 80, 2, 2); }   // crumbs
    // the hanging model spaceship from the ceiling
    k.strokeStyle = 'rgba(220,220,230,.4)'; k.lineWidth = 1; k.beginPath(); k.moveTo(1290, -200); k.lineTo(1290, 14); k.stroke();
    poly(k, [[1240, 30], [1340, 22], [1360, 30], [1340, 38], [1240, 36]], '#c8ccd8'); poly(k, [[1280, 22], [1310, 8], [1320, 24]], '#3a80d8'); k.fillStyle = '#d23a3a'; k.fillRect(1236, 30, 8, 6);
  }

  // ---------- every frame: the lights ----------
  function lights(k, tt, cl, lum) {
    // Sam: the room changes colour with the game: every light takes its hue from the screen, drifting a little round it
    const rgb = cl.split(',').map(Number), mx = Math.max(...rgb), mn = Math.min(...rgb), d = mx - mn || 1;
    let h0 = mx === rgb[0] ? ((rgb[1] - rgb[2]) / d) % 6 : mx === rgb[1] ? (rgb[2] - rgb[0]) / d + 2 : (rgb[0] - rgb[1]) / d + 4; h0 = (h0 * 60 + 360) % 360; if (mx - mn < 18) h0 = (tt * 20) % 360;   // a grey screen: a slow rainbow
    const { rr, glowAt, label } = H, HU = i => h0 + Math.sin(tt * 1.5 + i * .4) * 30, hue = i => 'hsla(' + ((HU(i) % 360 + 360) % 360) + ',100%,60%,';
    // the RGB strip along the ceiling, colours running along it
    for (let i = 0; i < 70; i++) { const xx = 262 + i * 26; k.fillStyle = hue(i) + '.95)'; k.fillRect(xx, -186, 18, 5); }
    for (let i = 0; i < 9; i++) glowAt(k, 360 + i * 160, -150, 170, hsl3(HU(i * 6)), .2);
    // the monitor's glow on the wall behind it, in the colour it shows, and the RGB strip under its chin
    glowAt(k, 787, 420, 420, cl, .25 + lum * .4);
    const pl = [FRONT[3][0] + (FRONT[2][0] - FRONT[3][0]) * .96, FRONT[3][1] + (FRONT[2][1] - FRONT[3][1]) * .96 - 34]; k.fillStyle = 'rgba(80,255,120,.95)'; k.fillRect(pl[0], pl[1], 6, 4); glowAt(k, pl[0] + 3, pl[1] + 2, 14, '80,255,120', .5);   // the power light
    k.fillStyle = 'rgba(255,60,60,.9)'; k.fillRect(1040, 876, 5, 3); glowAt(k, 1042, 877, 10, '255,60,60', .5);   // the cassette deck's light
    // the lava lamp
    for (let i = 0; i < 3; i++) { const by = 156 - ((tt * 7 + i * 15) % 42); k.fillStyle = 'rgba(255,220,120,.9)'; k.beginPath(); k.ellipse(989, by, 4 + i, 5 + i, 0, 0, 6.283); k.fill(); } glowAt(k, 989, 138, 70, '255,110,50', .35);
    // the arcade: marquee, screen, coin lights
    glowAt(k, 365, 259, 110, '255,63,168', .4); k.font = '900 20px system-ui'; k.textAlign = 'center'; k.textBaseline = 'middle'; k.fillStyle = 'rgba(255,210,240,.95)'; k.fillText('NEON RUN', 365, 260);
    k.save(); k.beginPath(); k.rect(312, 297, 106, 102); k.clip(); for (let i = 0; i < 10; i++) { k.fillStyle = 'rgba(' + ['255,63,168', '63,240,255', '255,184,77'][i % 3] + ',.6)'; k.fillRect(316 + (i * 23 + tt * 40) % 100, 297 + ((i * 13 + tt * 50) % 100), 8, 4); } k.fillStyle = 'rgba(184,248,24,.9)'; k.fillRect(356 + Math.sin(tt * 2) * 30, 388, 12, 7); k.restore();
    glowAt(k, 365, 350, 120, '63,240,255', .18);
    // the fish tank: blue light, two fish swimming, bubbles
    glowAt(k, 1490, 600, 170, '60,180,255', .3); k.fillStyle = 'rgba(80,200,255,.18)'; k.fillRect(1386, 562, 208, 64);
    [[0, '#ff8a2a'], [2.4, '#ffe04a']].forEach(([o, c]) => { const fx = 1490 + Math.sin(tt * .5 + o) * 80, fy = 590 + Math.sin(tt * .9 + o) * 14, dir = Math.cos(tt * .5 + o) > 0 ? 1 : -1; k.fillStyle = c; k.beginPath(); k.ellipse(fx, fy, 9, 5, 0, 0, 6.283); k.fill(); k.beginPath(); k.moveTo(fx - dir * 8, fy); k.lineTo(fx - dir * 15, fy - 5); k.lineTo(fx - dir * 15, fy + 5); k.fill(); });
    for (let i = 0; i < 6; i++) { const by = 624 - ((tt * 20 + i * 11) % 60); k.strokeStyle = 'rgba(220,250,255,.7)'; k.lineWidth = 1; k.beginPath(); k.arc(1560 + (i % 2) * 6, by, 2, 0, 6.283); k.stroke(); }
    // fairy lights hanging along the bookcase top and across the wall
    for (let i = 0; i < 26; i++) { const lx = 1060 + i * 22, ly = 20 + Math.sin(i * .5) * 10 + 10, on = Math.sin(tt * 2 + i * 1.7) > -.3; k.fillStyle = on ? ['rgba(255,220,120,.95)', 'rgba(255,120,200,.95)', 'rgba(120,240,255,.95)'][i % 3] : 'rgba(80,70,60,.6)'; k.beginPath(); k.arc(lx, ly, 3, 0, 6.283); k.fill(); if (on) glowAt(k, lx, ly, 16, ['255,220,120', '255,120,200', '120,240,255'][i % 3], .35); }
    // a neon sign of our own: GG, flickering now and then
    const fl = Math.sin(tt * 9) * Math.sin(tt * 1.7) > -.92 ? 1 : .3; glowAt(k, 1490, 82, 90, '120,255,140', .3 * fl); k.font = 'italic 900 44px system-ui'; k.fillStyle = 'rgba(160,255,170,' + fl + ')'; k.fillText('GG', 1490, 84);
    // rain on the window, a flash of lightning now and then
    k.save(); k.beginPath(); k.moveTo(-240, 30); k.lineTo(170, 96); k.lineTo(170, 380); k.lineTo(-240, 420); k.closePath(); k.clip();
    k.strokeStyle = 'rgba(170,190,255,.35)'; k.lineWidth = 1; k.beginPath(); for (let i = 0; i < 60; i++) { const rx = -240 + (i * 53) % 410, ry = 30 + ((i * 71 + tt * 300) % 400); k.moveTo(rx, ry); k.lineTo(rx - 3, ry + 14); } k.stroke();
    if ((tt % 11) < .12) { k.fillStyle = 'rgba(220,220,255,.5)'; k.fillRect(-260, 20, 450, 420); } k.restore();
    // a soft lamp glow on the bed so it isn't lost in the dark
    glowAt(k, 0, 640, 300, hsl3(h0 + 40), .12);
    // and the whole room washed in the game's colour (fades as the game changes)
    k.globalCompositeOperation = 'soft-light'; k.fillStyle = 'hsla(' + h0 + ',80%,55%,.3)'; k.fillRect(-400, -200, 2400, 1300); k.globalCompositeOperation = 'lighter';
  }
  function hsl3(h) { h = ((h % 360) + 360) % 360 / 60; const c = 255, xx = Math.round(c * (1 - Math.abs(h % 2 - 1))), m = [[c, xx, 0], [xx, c, 0], [0, c, xx], [0, xx, c], [xx, 0, c], [c, 0, xx]][Math.floor(h) % 6]; return m.join(','); }
  // ---------- the camera (Sam: come into the room wide, the three-quarter view to play, a frontal one, a full frame) ----------
  function setTurn(s) { QUAD = mixQ(Q34, QFR, s); GLASSOUT = mixQ(G34, GFR, s); FRONT = mixQ(F34, FFR, s); DEPTH = [D34[0] + (DFR[0] - D34[0]) * s, D34[1] + (DFR[1] - D34[1]) * s];
    QC = [(QUAD[0][0] + QUAD[2][0]) / 2, (QUAD[0][1] + QUAD[2][1]) / 2]; CTL.forEach(c => { if (c.kind === 'btn' && c.id !== 'view') c.cy = chinY(c.cx); }); }
  let fullFar = 2, roomFar = .58;
  const VIEWS = { wide: { far: .4, cx: 800, cy: 470, turn: 0 }, room: { get far() { return roomFar; }, cx: 795, cy: 390, turn: 0 }, front: { far: .85, cx: 775, cy: 430, turn: 1 }, full: { get far() { return fullFar; }, cx: 775, cy: 418, turn: 1 } };
  const ORDER = ['room', 'front', 'full', 'wide'];
  let cam = { far: .58, cx: 775, cy: 440, turn: 0 }, from = null, to = null, step = 0, N = 14, view = 'room';
  const ease = s => s < .5 ? 2 * s * s : 1 - (-2 * s + 2) ** 2 / 2;
  function go(name, steps) { from = { ...cam }; to = { ...VIEWS[name] }; view = name; step = 0; N = steps || 14; }
  function next() { go(ORDER[(ORDER.indexOf(view) + 1) % ORDER.length]); }
  function enter() { cam = { ...VIEWS.wide }; view = 'wide'; setTurn(0); go('room', 28); }   // walking in: wide, then gliding to the desk
  function tick() { if (!to) return false; step++; const e = ease(Math.min(1, step / N)); cam = { far: from.far + (to.far - from.far) * e, cx: from.cx + (to.cx - from.cx) * e, cy: from.cy + (to.cy - from.cy) * e, turn: from.turn + (to.turn - from.turn) * e }; setTurn(cam.turn); if (step >= N) to = null; return true; }
  function setFull(v) { fullFar = v; }
  function fitRoom(w, h, baseS) { roomFar = Math.max(.34, Math.min(.95, Math.min(w / 1075, h / 740) / Math.max(baseS, .01))); if (view === 'room') { if (to) to.far = roomFar; else cam.far = roomFar; } }
  function fullness() { return Math.max(0, Math.min(1, (cam.far - .85) / Math.max(.01, fullFar - .85))); }   // 0 in the room, 1 in the full frame
  // version 110 (Sam): the main light can be switched off; the arcade, the fish tank, the lava lamp, the fairy lights,
  // the neon sign and the monitor stay lit (they are drawn as lights on top). Kept on this computer.
  let dark = false; try { dark = localStorage.getItem('deck-room-dark') === '1'; } catch (e) {}
  function toggleLight() { dark = !dark; try { localStorage.setItem('deck-room-dark', dark ? '1' : '0'); } catch (e) {} }
  return { base, lights, CTL, CLOSE, MON, get QUAD() { return QUAD; }, get view() { return view; }, get dark() { return dark; }, toggleLight, cam: () => cam, fullness, tick, next, enter, go, setFull, fitRoom };
})();
window.DeckKid = DeckKid;
