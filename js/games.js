(function () {
const W = 214, H = 180, cv = document.getElementById('c'), g = cv.getContext('2d');
// ---------- colours and little pictures ----------
const PAL = { k: '#101018', w: '#fcfcfc', r: '#d82800', o: '#fc9838', y: '#f8d030', g: '#00a800', G: '#005800',
  b: '#0058f8', B: '#3cbcfc', p: '#d800cc', n: '#7c4000', s: '#bcbcbc', d: '#747474', t: '#fcbcb0', c: '#00e8d8',
  l: '#b8f818', v: '#6844fc', m: '#940084', e: '#fce0a8', q: '#503000' };
function mk(rows, pal) {
  const c = document.createElement('canvas'); c.width = Math.max.apply(null, rows.map(r => r.length)); c.height = rows.length;
  const x = c.getContext('2d');
  rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) { const col = (pal && pal[r[i]]) || PAL[r[i]]; if (col) { x.fillStyle = col; x.fillRect(i, j, 1, 1); } } });
  return c;
}
function flip(c) { const f = document.createElement('canvas'); f.width = c.width; f.height = c.height; const x = f.getContext('2d'); x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(c, 0, 0); return f; }
function big(c, k) { const f = document.createElement('canvas'); f.width = c.width * k; f.height = c.height * k; const x = f.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(c, 0, 0, f.width, f.height); return f; }
function rect(x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
function mix(a, b, t) { const p = h => [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)], x = p(a), y = p(b); return 'rgb(' + x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(',') + ')'; }

// ---------- letters: 3 x 5 dots each ----------
const FONT = { A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
  F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010',
  K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010',
  P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010',
  Z: '111001010100111', 0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
  4: '101101111001001', 5: '111100110001110', 6: '111100111101111', 7: '111001010010010', 8: '111101111101111',
  9: '111101111001111', '!': '010010010000010', '-': '000000111000000', '.': '000000000000010', ':': '000010000010000',
  '?': '110001010000010', "'": '010010000000000', '+': '000010111010000', '/': '001001010100100', ',': '000000000010100', '<': '001010100010001', '>': '100010001010100' };
function text(s, x, y, col, sc, shadow) {
  sc = sc || 1; s = String(s).toUpperCase();
  if (shadow !== false) drawText(s, x + sc, y + sc, '#101018', sc);
  drawText(s, x, y, col || '#fcfcfc', sc);
}
function drawText(s, x, y, col, sc) {
  g.fillStyle = col;
  for (let i = 0; i < s.length; i++) {
    const f = FONT[s[i]];
    if (f) for (let k = 0; k < 15; k++) if (f[k] === '1') g.fillRect(x + (i * 4 + k % 3) * sc, y + Math.floor(k / 3) * sc, sc, sc);
  }
}
const tw = (s, sc) => String(s).length * 4 * (sc || 1) - (sc || 1);
const ctext = (s, y, col, sc) => text(s, Math.round((W - tw(s, sc)) / 2), y, col, sc);

// ---------- sound: three chip voices and noise ----------
let AC = null, out = null, crush = null, retro = false, soundOn = true, songTimer = null, song = null, step = 0, nextAt = 0, noiseBuf = null;
function audio() {
  if (!AC) {
    try { const K = window.AudioContext || window.webkitAudioContext; const o = { latencyHint: window.deckLatency || 'interactive' }; if (window.deckRate) o.sampleRate = window.deckRate; try { AC = new K(o); } catch (e) { AC = new K(); } window.deckLatencyNow = (window.deckLatency || 'interactive') + '|' + (window.deckRate || 0); } catch (e) { return; }   // deckLatency: DECK TRAX can ask for a bigger buffer
    out = AC.createGain(); out.gain.value = .5; out.connect(AC.destination);
    // The old-handheld sound (a game switches it on with retro = true): every sound is pushed through sixteen steps
    // of loudness, which is 4 bits, as on a sound chip of 1989, and smooth waves become square ones.
    const pre = AC.createGain(), steps = AC.createWaveShaper(), post = AC.createGain(), curve = new Float32Array(4096);
    for (let i = 0; i < 4096; i++) curve[i] = Math.max(-1, Math.min(1, Math.round((i / 4095 * 2 - 1) * 7.5) / 7.5));
    steps.curve = curve; pre.gain.value = 4; post.gain.value = .11; pre.connect(steps); steps.connect(post); post.connect(AC.destination); crush = pre;
    noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (AC.state === 'suspended') AC.resume();
}
function tone(type, f, t, d, v, to) {
  if (!AC || !soundOn) return;
  const o = AC.createOscillator(), a = AC.createGain();
  o.type = retro && type !== 'triangle' ? 'square' : type; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + d);
  a.gain.setValueAtTime(v, t); a.gain.exponentialRampToValueAtTime(.001, t + d);
  o.connect(a); a.connect(retro ? crush : out); o.start(t); o.stop(t + d + .03);
}
function hiss(t, d, v, high) {
  if (!AC || !soundOn) return;
  const s = AC.createBufferSource(), a = AC.createGain(), f = AC.createBiquadFilter();
  s.buffer = noiseBuf; f.type = high ? 'highpass' : 'lowpass'; f.frequency.value = high ? 6000 : 1800;
  a.gain.setValueAtTime(v, t); a.gain.exponentialRampToValueAtTime(.001, t + d);
  s.connect(f); f.connect(a); a.connect(retro ? crush : out); s.start(t, Math.random() * .5, d + .05);
}
const hz = n => 440 * Math.pow(2, (n - 69) / 12);
function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
// A tune is made from a seed: four chords, a bass, the fast broken chords that chip music is known for,
// and a melody picked from the scale. Every game and stage gives its own seed, so each has its own tune.
function makeSong(seed, bpm, minor) {
  const r = rng(seed), scale = minor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11];
  const progs = minor ? [[0, 5, 3, 4], [0, 3, 5, 4], [0, 6, 5, 4]] : [[0, 3, 4, 0], [0, 5, 3, 4], [0, 4, 5, 3]];
  const prog = progs[Math.floor(r() * progs.length)], root = 45 + Math.floor(r() * 5), lead = [];
  let at = 4;
  for (let i = 0; i < 64; i++) { if (r() < .62) { at = Math.max(0, Math.min(13, at + Math.floor(r() * 5) - 2)); lead.push(at); } else lead.push(-1); }
  return { bpm: bpm, scale: scale, prog: prog, root: root, lead: lead };
}
const deg = (s, d) => s.root + s.scale[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);
function tick() {
  if (!AC || !song) return;
  const len = 60 / song.bpm / 4;
  while (nextAt < AC.currentTime + .15) {
    const t = nextAt, bar = Math.floor(step / 16) % 4, s16 = step % 16, chord = song.prog[bar];
    if (s16 % 4 === 0) tone('triangle', hz(deg(song, chord) - 12), t, len * 3.4, .22);
    if (s16 % 8 === 6) tone('triangle', hz(deg(song, chord + 4) - 12), t, len * 1.6, .16);
    tone('square', hz(deg(song, chord + [0, 2, 4, 7][step % 4]) + 12), t, len * .9, .035);
    const n = song.lead[step % 64];
    if (n >= 0) tone('square', hz(deg(song, n) + 12), t, len * 1.8, .075);
    if (s16 % 8 === 0) tone('sine', 150, t, .1, .30, 45);
    if (s16 % 8 === 4) hiss(t, .09, .13);
    if (s16 % 2 === 0) hiss(t, .025, .045, true);
    step++; nextAt += len;
  }
}
function play(seed, bpm, minor) {
  song = makeSong(seed, bpm, minor); step = 0; if (AC) nextAt = AC.currentTime + .08;
  if (!songTimer) songTimer = setInterval(tick, 50);
}
function quiet() { song = null; }
const blip = ok => { if (AC && soundOn) tone('square', ok ? 880 : 620, AC.currentTime, .04, .06); };

// ---------- what the deck is doing ----------
// view: 'off' (waiting for the first press), 'boot' (intro and chime), 'deck' (the start menu), 'game'.
let view = 'off', clock = 0, bootAt = 0, cur = null, paused = false, menu = null, touch = false, deckI = 0;
// version 115: touchfull, TOUCH FULL SCREEN for the games with a touch panel; on at the start on a touch screen
const coarse = (() => { try { return matchMedia('(pointer: coarse)').matches; } catch (e) { return false; } })();
// version 117 (Sam): the CONSOLE window: ROOM, SCREEN SIZE, CONSOLE LOOK, COLOURS, TV FILTER, ... for every game.
// SET.screen stays the one the deck works with (0 FRAMED, 1 WIDE, 2-8 the rooms); room and size are its two halves
// (applySet keeps them in step). fx: the TV FILTER (DeckFX, deckfx.js) over every game; GAME DEFAULT = the game's own
// (cur.fxDefault, RAINLIGHT: AMIGA CRT or SATURN TV), or sharp.
const SET = { sound: 1, screen: 1, look: 0, mono: 0, touchfull: coarse || window.DECK_ANDROID ? 1 : 0, room: 0, size: 1, fx: 0 };
const ROOMS = ['CONSOLE', 'TV ROOM', 'TV CLOSE', 'TV ROOM 16-BIT', 'TV FULL WOOD', 'TV ROOM AMIGA', 'TV ROOM LIGHTWAVE', 'GAMER ROOM'];
const FXNAMES = ['GAME DEFAULT', 'SHARP', 'AMIGA CRT', 'BOLD CRT', 'VHS', 'TUBE TV', 'OLD DIGITAL TV', 'ARCADE', 'SATURN TV'];
const FXKEYS = [null, 'SHARP', 'AMIGA', 'BOLD', 'VHS', 'TUBE', 'DIGI', 'ARCADE', 'SATURN'];
const SHELLSET = [['ROOM', 'room', ROOMS], ['SCREEN SIZE', 'size', ['FRAMED', 'WIDE']], ['CONSOLE LOOK', 'look', ['BRAIN LAB', 'CLASSIC']], ['COLOURS', 'mono', ['COLOUR', 'BLACK+WHITE']],
  ['TV FILTER', 'fx', FXNAMES], ['TOUCH FULL SCREEN', 'touchfull', ['OFF', 'ON']], ['SOUND', 'sound', ['OFF', 'ON']]];
function screenParts() { SET.room = SET.screen >= 2 ? SET.screen - 1 : 0; if (SET.screen < 2) SET.size = SET.screen; else if (SET.size !== 0 && SET.size !== 1) SET.size = 1; }
function deckFX() {   // version 117: the TV FILTER over the game's finished picture
  if (typeof DeckFX === 'undefined') return;
  const k = FXKEYS[SET.fx | 0] || (view === 'game' && cur && cur.fxDefault) || 'SHARP';
  if (k === 'SHARP' || !DeckFX.LOOKS[k]) return;
  DeckFX.frame(g, cv, DeckFX.LOOKS[k]); g.setTransform(3, 0, 0, 3, 0, 0); g.imageSmoothingEnabled = false;
}
const LOOKS = ['BRAIN LAB', 'CLASSIC'];
let GAMES = [];
let ended = false, endedAt = 0, place = 0, slot = 0, runId = Date.now().toString(36);
const selfPlaying = () => !!(cur && cur.auto && cur.auto());
function watchGame() { if (selfPlaying()) return; const end = cur.over() || (cur.won && cur.won()); if (end && !ended) { ended = true; endedAt = clock; place = 0; } if (!end) ended = false; }
function press(n, d) { if (cur && cur.keys) cur.keys[n] = d; if (typeof window.ARCADE_KEY === 'function') window.ARCADE_KEY(n, d); }
function pressStart() { if (typeof window.ARCADE_BUTTON === 'function') window.ARCADE_BUTTON('start'); }
function pressSelect() { if (typeof window.ARCADE_BUTTON === 'function') window.ARCADE_BUTTON('select'); }
function restart() { if (cur && cur.start) cur.start(); }
const tap = () => {}, drag = () => {}, lift = () => {}, settings = {}, keymap = {};
// ---------- PARA-FRUIT: fly a paramotor home through ten skies ----------
// Keep clear of geese, doves, wind curls and the ground, and throw fruit at the paragliders and delta trikes in your way.
//   D-pad: up climbs, down dives, left and right slide along.   A: throw.   B: boost.   O = let the game play itself.
function ParaFruit() {
  let PX = 3;   // how many real dots one dot of a character takes: 2 small, 3 normal, 4 big (Settings, SIZE)
  const WING = [
    '......WWWWWWWWWWWWWW......',
    '...WWWSSWWWWWWWWWWSSWWW...',
    '.WWWWWWWWWWWWWWWWWWWWWWWW.',
    'WWW....................WWW',
    '.k......................k.',
    '..k....................k..',
    '...k..................k...',
    '....k................k....',
    '.....k..............k.....',
    '......k............k......'];
  const PILOT = [
    '.......k....tt....k.......',
    '........k..tttt..k........',
    '.........k.HHHH.k.........',
    '......ddd.JJJJJJ..........',
    '.....d.d.dJJJJJJ..........',
    '.....dd.ddJJJJJ...........',
    '.....d.d.d.nn.nn..........',
    '......ddd..nn..nn.........'];
  const FOEPILOT = [
    '.......k....tt....k.......',
    '........k..tttt..k........',
    '.........k.HHHH.k.........',
    '..........JJJJJJ..........',
    '..........JJJJJJ..........',
    '..........JJJJJ...........',
    '...........nn.nn..........',
    '...........nn..nn.........'];
  const SPR = {
    me: mk(WING.concat(PILOT), { W: '#fc9838', S: '#fcfcfc', H: '#d82800', J: '#0058f8' }),
    meHurt: mk(WING.concat(PILOT), { W: '#fcfcfc', S: '#fcfcfc', H: '#fcfcfc', J: '#fcfcfc', t: '#fcfcfc', d: '#fcfcfc', n: '#fcfcfc', k: '#fcfcfc' }),
    foe: [flip(mk(WING.concat(FOEPILOT), { W: '#d800cc', S: '#f8d030', H: '#101018', J: '#940084' })),
          flip(mk(WING.concat(FOEPILOT), { W: '#00a800', S: '#fcfcfc', H: '#101018', J: '#005800' })),
          flip(mk(WING.concat(FOEPILOT), { W: '#d82800', S: '#101018', H: '#fcfcfc', J: '#7c4000' }))],
    ulm: flip(mk([
      '..........rrrrrrrrrrrrrr',
      '.....rrrryyrrrrrrrrrr...',
      'rrrrrrrrrrrrrrr.........',
      '.........k..k...........',
      '........k....k..........',
      '.......ddtt...k.........',
      '......dddbbbbbbk........',
      '.....d.ddbbbbbbb........',
      '......dd.kk..kk.........'])),
    goose: [mk(['......dd......', '.....ddd......', 'okk.dddd......', '.kwwwwwwwww...', '...wwwwwwww...', '.....ww.......']),
            mk(['..............', 'okk...........', '.kwwwwwwwww...', '...wwwwwwww...', '....dddd......', '.....dd.......'])],
    dove: [mk(['...ss...', '..sss...', 'osssss..', '.sssss..', '..ss....']), mk(['........', 'osssss..', '.sssss..', '..sss...', '...ss...'])],
    heart: mk(['.rr.rr.', 'rrrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...']),
    fruit: [
      mk(['......nn', '.....yy.', '....yyy.', '...yyy..', '..yyyy..', '.yyyy...', 'yyyy....', '.yy.....']),            // banana
      mk(['...n....', '..rrgr..', '.rrrrrr.', 'rrrrrrrr', 'rrrrwrrr', 'rrrrrrrr', '.rrrrrr.', '..rrrr..']),            // apple
      mk(['...g....', '..oooo..', '.oooooo.', 'oooowooo', 'oooooooo', 'oooooooo', '.oooooo.', '..oooo..']),            // orange
      mk(['...n....', '...ll...', '..llll..', '..llll..', '.llllll.', '.llwlll.', '.llllll.', '..llll..']),            // pear
      mk(['....g...', '...g.g..', '..g...g.', '.rr...rr', 'rrrr.rrr', 'rwrr.rwr', '.rr...rr', '........']),            // cherry
      mk(['........', '..yyyy..', '.yyyyyy.', 'yyywyyyy', 'yyyyyyyy', '.yyyyyy.', '..yyyy..', '........']),            // lemon
      mk(['........', 'gggggggg', 'gwwwwwwg', '.rrkrrr.', '.rrrrkr.', '..rkrr..', '...rr...', '........']),            // melon
      mk(['...g....', '..vv.v..', '.vvvvvv.', '.vwvvvv.', '..vvvv..', '..vvvv..', '...vv...', '...v....']),            // grapes
      mk(['.g.g.g..', '..ggg...', '.yoyoy..', '.oyoyo..', '.yoyoy..', '.oyoyo..', '.yoyoy..', '..ooo...']),            // pineapple
      mk(['........', '..nnnn..', '.nqnnnn.', 'nnnnnqnn', 'nnqnnnnn', 'nnnnnnqn', '.nnqnnn.', '..nnnn..'])]            // coconut
  };
  const FRUITNAME = ['BANANA', 'APPLE', 'ORANGE', 'PEAR', 'CHERRY', 'LEMON', 'MELON', 'GRAPES', 'PINEAPPLE', 'COCONUT'];

  // ---------- the ten skies ----------
  // sky: top and bottom colour. land: ground and its shade. thing: what stands on the ground.
  // rates are "how many per screen width flown" for geese, doves, gliders, trikes and wind curls.
  const STAGES = [
    { name: 'MORNING MEADOW', sky: ['#3cbcfc', '#a4e4fc'], land: ['#00a800', '#005800'], thing: 'tree', hill: 6, geese: .10, doves: .35, foes: 0, ulm: 0, curls: 0, things: .5, speed: 1.15 },
    { name: 'SEASIDE CLIFFS', sky: ['#0078f8', '#a4e4fc'], land: ['#f8d878', '#ac7c00'], thing: 'rock', hill: 14, geese: .40, doves: .15, foes: 0, ulm: 0, curls: .10, things: .5, speed: 1.2, sea: true },
    { name: 'PINE FOREST', sky: ['#58d854', '#d8f878'], land: ['#005800', '#003000'], thing: 'pine', hill: 8, geese: .15, doves: .40, foes: .22, ulm: 0, curls: .08, things: .9, speed: 1.25 },
    { name: 'WINDY HILLS', sky: ['#6888fc', '#f8d8f8'], land: ['#58d854', '#00a800'], thing: 'mill', hill: 22, geese: .20, doves: .20, foes: .20, ulm: 0, curls: .45, things: .45, speed: 1.3 },
    { name: 'POWER LINES', sky: ['#fc9838', '#f8d878'], land: ['#ac7c00', '#503000'], thing: 'pylon', hill: 5, geese: .40, doves: .15, foes: .20, ulm: .16, curls: .12, things: .55, speed: 1.35 },
    { name: 'DESERT THERMALS', sky: ['#fca044', '#fce0a8'], land: ['#f0d0b0', '#c84c0c'], thing: 'cactus', hill: 10, geese: .12, doves: .25, foes: .28, ulm: .16, curls: .55, things: .6, speed: 1.4 },
    { name: 'SNOW PEAKS', sky: ['#0058f8', '#bcbcfc'], land: ['#fcfcfc', '#a4e4fc'], thing: 'peak', hill: 26, geese: .30, doves: .10, foes: .40, ulm: .14, curls: .30, things: .5, speed: 1.45 },
    { name: 'CITY SUNSET', sky: ['#940084', '#fc7460'], land: ['#503000', '#101018'], thing: 'tower', hill: 2, geese: .25, doves: .40, foes: .30, ulm: .30, curls: .12, things: .95, speed: 1.5 },
    { name: 'NIGHT FLIGHT', sky: ['#000058', '#0000bc'], land: ['#002800', '#101018'], thing: 'pine', hill: 12, geese: .35, doves: .25, foes: .35, ulm: .28, curls: .30, things: .7, speed: 1.55, night: true },
    { name: 'STORM FRONT', sky: ['#404058', '#747474'], land: ['#005800', '#003000'], thing: 'tree', hill: 16, geese: .45, doves: .30, foes: .40, ulm: .32, curls: .60, things: .6, speed: 1.6, storm: true }
  ];
  const LEN = 2050;                      // how far one stage is, in dots flown

  const sfx = {
    throw: () => AC && tone('square', 500, AC.currentTime, .09, .10, 1100),
    hit: () => { if (AC) { hiss(AC.currentTime, .16, .30); tone('square', 300, AC.currentTime, .12, .10, 80); } },
    pick: () => { if (AC) [72, 76, 79, 84].forEach((n, i) => tone('square', hz(n), AC.currentTime + i * .045, .07, .09)); },
    hurt: () => { if (AC) { tone('sawtooth', 400, AC.currentTime, .35, .16, 60); hiss(AC.currentTime, .25, .2); } },
    clear: () => { if (AC) [60, 64, 67, 72, 76, 79, 84].forEach((n, i) => tone('square', hz(n), AC.currentTime + i * .09, .16, .10)); },
    boss: () => { if (AC) tone('sawtooth', 110, AC.currentTime, .2, .2, 220); },
    bolt: () => { if (AC) { hiss(AC.currentTime, .5, .4); tone('sawtooth', 900, AC.currentTime, .4, .12, 50); } },
    cough: () => { if (AC) [0, .12, .3].forEach(d => hiss(AC.currentTime + d, .08, .3)); }
  };

  // ---------- the game ----------
  const urlDemo = /[?&]demo/.test(location.search);
  let state = 'title', frame = 0, stage = 0, dist = 0, score = 0, best = 0, hearts = 3, ammo = 5, speed = 1.2, banner = 0, flash = 0;
  let me, birds, foes, fruits, shots, curls, things, bits, clouds, boss, bolts, thermals, R = Math.random, demo = urlDemo;
  let storyAt = 0, hurtFor = 0, throwWait = 0, glideLeft = 0, shake = 0, endAt = 0;
  const keys = { fly: false, throw: false, auto: false, up: false, down: false, left: false, right: false, boost: false };
  let boost = 100, boosting = false;
  function reset(n) {
    stage = n; dist = 0; me = { x: 40, y: 64, vy: 0 }; birds = []; foes = []; fruits = []; shots = []; curls = []; things = []; bits = [];
    bolts = []; thermals = []; boss = null; hurtFor = 0; throwWait = 0; banner = 150; R = rng(1000 + n * 77);
    clouds = []; for (let i = 0; i < 7; i++) clouds.push({ x: R() * W, y: 10 + R() * 68, w: 18 + R() * 30, s: .15 + R() * .3 });
  }
  function startStage(n) {
    reset(n); state = 'play'; speed = STAGES[n].speed * .92; ammo = Math.max(ammo, 5);
    play(40 + n * 13, 118 + n * 5, !!(STAGES[n].night || STAGES[n].storm || n === 7));
  }
  function startGlide() { reset(4); state = 'glide'; speed = 1.3; glideLeft = 1500; banner = 190; quiet(); sfx.cough(); for (let i = 0; i < 13; i++) thermals.push({ x: 120 + i * 135 + R() * 30, w: 62 }); }
  function startBoss() { reset(9); state = 'boss'; speed = 1.1; hearts = 3; boss = { x: W + 44, y: 56, hp: 24, hurt: 0, t: 0 }; ammo = Math.max(ammo, 8); play(999, 150, true); }
  function newGame() { score = 0; hearts = 3; ammo = 5; glideLeft = 0; boost = 100; startStage(0); }
  const SKY = () => STAGES[stage];
  function ground(wx) { const s = SKY(), a = s.hill; return H - 22 - a * (.5 + .5 * Math.sin(wx / 83)) - a * .35 * Math.sin(wx / 31 + 2); }

  function spawn(dt) {
    const s = SKY(), per = speed / W, hard = state === 'boss' ? .5 : 1;
    if (state === 'glide') { if (R() < .03) fruits.push({ x: W + 8, y: 26 + R() * 84, k: Math.floor(R() * 10) }); if (R() < .012) flock('dove'); return; }
    if (R() < s.geese * per * hard) flock('goose');
    if (R() < s.doves * per * hard) flock('dove');
    if (state === 'play' && R() < s.foes * per) foes.push({ k: 'glider', x: W + 20, y: 24 + R() * 72, hp: 1, t: R() * 9, c: Math.floor(R() * 3) });
    if (state === 'play' && R() < s.ulm * per) foes.push({ k: 'ulm', x: W + 260, y: 22 + R() * 84, hp: 2, t: 0, warn: 70 });
    if (R() < s.curls * per * hard) curls.push({ x: W + 20, y: 32 + R() * 72, r: 15 + R() * 9, t: R() * 6 });
    if (state === 'play' && R() < s.things * per) { const last = things[things.length - 1]; if (!last || last.x < W - 34) things.push({ x: W + 12, k: s.thing, h: 22 + R() * (s.thing === 'tower' ? 62 : s.thing === 'peak' ? 54 : 34), w: s.thing === 'tower' ? 18 + Math.floor(R() * 10) : 14, seed: R() }); }
    if (R() < .34 * per || (state === 'boss' && R() < .9 * per)) fruits.push({ x: W + 8, y: 22 + R() * 86, k: state === 'boss' ? Math.floor(R() * 10) : stage });
  }
  function flock(kind) {
    const y = 22 + R() * 76, n = kind === 'goose' ? 5 + Math.floor(R() * 3) : 3 + Math.floor(R() * 3);
    for (let i = 0; i < n; i++) {
      const row = Math.ceil(i / 2), side = i % 2 ? 1 : -1;
      birds.push(kind === 'goose' ? { k: 'goose', x: W + 14 + row * 11, y: y + side * row * 7, vx: .75, t: i }
        : { k: 'dove', x: W + 10 + i * 13 + R() * 6, y: y + (R() - .5) * 26, vx: 1.15 + R() * .4, t: R() * 9 });
    }
  }
  function puff(x, y, col, n) { for (let i = 0; i < (n || 6); i++) bits.push({ x: x, y: y, vx: (Math.random() - .5) * 2.4, vy: (Math.random() - .7) * 2.4, c: col, l: 20 + Math.random() * 14 }); }
  const why = [];
  function hurt(cause) {
    if (hurtFor > 0 || state === 'win') return;
    why.push((cause || '?') + '@' + state + (stage + 1));
    hearts--; hurtFor = 100; shake = 10; sfx.hurt(); me.vy = -1.6;
    if (hearts <= 0) { state = 'over'; endAt = frame; best = Math.max(best, score); quiet(); }
  }
  const hits = (ax, ay, aw, ah, bx, by, bw, bh) => ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  // characters are drawn around their middle at the chosen size, and what counts as a touch grows and shrinks with them
  function spr(img, x, y) { const k = PX / 3, w = img.width * k, h = img.height * k; g.drawImage(img, Math.round((x + img.width / 2 - w / 2) * 3) / 3, Math.round((y + img.height / 2 - h / 2) * 3) / 3, w, h); }
  function touchesMe(x, y, w, h) {
    const k = PX / 3, cx = me.x + 13, cy = me.y + 9, bx = x + w / 2 - w * k / 2, by = y + h / 2 - h * k / 2;
    return hits(cx - 4 * k, cy + k, 9 * k, 8 * k, bx, by, w * k, h * k) || hits(cx - 9 * k, cy - 8 * k, 18 * k, 3 * k, bx, by, w * k, h * k);
  }

  // The game playing itself: look a little ahead, find the height with the most room, and steer there.
  function pilot() {
    let bestY = me.y, bestScore = -1e9;
    for (let y = 16; y < H - 44; y += 8) {
      let room = 60;
      const near = (x, yy, r) => { const dx = x - me.x; if (dx > -14 && dx < 78) room = Math.min(room, Math.abs(yy - (y + 9)) - r + Math.max(0, dx - 30) * .3); };
      birds.forEach(b => near(b.x, b.y + 3, 9)); foes.forEach(f => near(f.x, f.y + 9, 14)); curls.forEach(c => near(c.x, c.y, c.r + 6));
      bolts.forEach(b => near(me.x + 20, b.y, 13)); if (boss) near(boss.x - 20, boss.y, 30);
      for (let dx = 0; dx < 70; dx += 10) room = Math.min(room, ground(dist + me.x + dx) - (y + 30));
      things.forEach(t => { const dx = t.x - me.x; if (dx > -16 && dx < 70) room = Math.min(room, ground(dist + t.x) - t.h - (y + 26)); });
      if (state === 'glide') thermals.forEach(t => { const dx = t.x - dist - me.x; if (Math.abs(dx) < 30 && me.y > 70) room += 6; });
      const sc = Math.min(room, 34) * 3 - Math.abs(y - me.y) * .25 - Math.abs(y - 62) * .12;
      if (sc > bestScore) { bestScore = sc; bestY = y; }
    }
    keys.fly = me.y > bestY + 2 || me.vy > 1.1;
    const aim = foes.concat(birds).some(o => o.x > me.x + 20 && o.x < me.x + 130 && Math.abs(o.y - me.y - 2) < 26) || (boss && boss.x < W - 6);
    keys.throw = aim && ammo > 0 && frame % 14 === 0;
  }

  function update() {
    frame++;
    if (state === 'title') { if (demo && frame > 150) { storyAt = frame; state = 'story'; } return; }
    if (state === 'story') { if (frame - storyAt > 540 || (demo && frame - storyAt > 300)) newGame(); return; }
    if (state === 'over') { if (demo && frame - endAt > 200) { state = 'title'; frame = 0; } return; }
    if (state === 'win') { me.y += (98 - me.y) * .02; if (demo && frame - endAt > 520) { state = 'title'; frame = 0; } return; }
    if (state === 'clear') {
      me.y += (56 - me.y) * .05; banner--;
      if (banner <= 0) { if (stage === 4 && !glideLeft) startGlide(); else if (stage === 9) startBoss(); else startStage(stage + 1); }
      return;
    }
    if (demo) pilot();
    const s = SKY(), engine = state !== 'glide';
    // flying: the engine lifts while you hold, the wing sinks gently when you let go
    const up = keys.fly || keys.up;
    // a fresh stage holds you level until you first take the controls, so nobody drops out of the sky while reading
    if (state === 'play' && banner > 30 && !up && !keys.down && dist < 260) { me.vy *= .8; me.y += (62 - me.y) * .03; }
    else if (up && engine) me.vy -= .21; else me.vy += (engine ? .105 : .035) + (keys.down ? .17 : 0);
    me.x = Math.max(8, Math.min(124, me.x + ((keys.right ? 1 : 0) - (keys.left ? 1 : 0)) * 1.7));
    // B: a burst of forward speed for as long as there is boost left; it fills up again by itself
    boosting = keys.boost && engine && boost > (boosting ? 0 : 12);
    if (boosting) { boost = Math.max(0, boost - 1.15); if (frame % 2 === 0) bits.push({ x: me.x + 1, y: me.y + 14, vx: -3, vy: (Math.random() - .5), c: frame % 4 ? '#fc9838' : '#f8d030', l: 10 }); if (frame % 15 === 0) score += 2; }
    else boost = Math.min(100, boost + .3);
    const cruise = speed; if (boosting) speed = cruise * 1.9;  if (state === 'glide') thermals.forEach(t => { if (Math.abs(t.x - dist - me.x - 13) < t.w / 2) me.vy -= .13; });
    if (!engine) me.vy = Math.max(-1.5, Math.min(.75, me.vy));
    curls.forEach(c => { const dx = me.x + 13 - c.x, dy = me.y + 10 - c.y, d = Math.hypot(dx, dy); if (d < c.r + 8 && !boosting) { me.vy += Math.sin(frame * .22 + c.t) * .34 + .05; if (frame % 6 === 0) shake = Math.max(shake, 2); } });
    me.vy = Math.max(-2.3, Math.min(keys.down ? 2.8 : 2.1, me.vy)); me.y += me.vy;
    if (me.y < 2) { me.y = 2; me.vy = .3; }
    const gy = ground(dist + me.x + 13);
    if (me.y + 18 > gy) { me.y = gy - 18; hurt('ground'); me.vy = -2.2; }
    if (hurtFor > 0) hurtFor--; if (throwWait > 0) throwWait--; if (shake > 0) shake--; if (banner > 0) banner--; if (flash > 0) flash--;
    if ((keys.throw || keys.auto) && throwWait <= 0 && ammo > 0) { ammo--; throwWait = 16; keys.throw = false; shots.push({ x: me.x + 20, y: me.y + 12, vx: 3.1, vy: -1.15 + me.vy * .3, k: state === 'boss' || state === 'glide' ? frame % 10 : stage, a: 0 }); sfx.throw(); }
    dist += speed; spawn();
    clouds.forEach(c => { c.x -= c.s * speed; if (c.x < -c.w) c.x = W + c.w; });
    birds.forEach(b => { b.x -= b.vx + speed; b.t += .2; b.y += b.k === 'dove' ? Math.sin(b.t) * 1.1 : Math.sin(b.t * .4) * .25; if (b.flee) b.y -= 1.6; });
    foes.forEach(f => {
      f.t += .05;
      if (f.k === 'glider') { f.x -= .45 + speed * .55; f.y += Math.sin(f.t) * .5 + (me.y - f.y > 8 ? .12 : me.y - f.y < -8 ? -.12 : 0); }
      else if (f.warn > 0) { f.warn--; f.x = W + 30; } else f.x -= 3.4 + speed;
      if (f.dead) { f.y += 2.2; f.x -= 1; f.spin = (f.spin || 0) + .3; }
    });
    things.forEach(t => { t.x -= speed; }); curls.forEach(c => { c.x -= speed * .9; c.t += .15; }); fruits.forEach(f => { f.x -= speed * .8; });
    shots.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += .075; p.a += .4; });
    bits.forEach(b => { b.x += b.vx; b.y += b.vy; b.vy += .08; b.l--; });
    // what the fruit hits
    shots.forEach(p => {
      birds.forEach(b => { if (!p.gone && !b.flee && hits(p.x - 3, p.y - 3, 7, 7, b.x, b.y, 12, 6)) { p.gone = true; b.flee = true; score += b.k === 'goose' ? 30 : 20; puff(b.x + 5, b.y + 3, '#fcfcfc', 5); sfx.hit(); } });
      foes.forEach(f => { if (!p.gone && !f.dead && !(f.warn > 0) && hits(p.x - 3, p.y - 3, 7, 7, f.x + 2, f.y, 22, 18)) { p.gone = true; f.hp--; puff(p.x, p.y, '#f8d030', 5); sfx.hit(); if (f.hp <= 0) { f.dead = true; score += f.k === 'ulm' ? 300 : 150; puff(f.x + 12, f.y + 6, '#fc9838', 12); } } });
      if (boss && !p.gone && hits(p.x - 3, p.y - 3, 7, 7, boss.x - 34, boss.y - 24, 68, 48)) { p.gone = true; boss.hp--; boss.hurt = 10; score += 50; puff(p.x, p.y, '#fcfcfc', 6); sfx.boss(); }
      if (p.y > ground(dist + p.x)) p.gone = true;
    });
    // what hits you
    birds.forEach(b => { if (!b.flee && touchesMe(b.x + 1, b.y + 1, 10, 4)) { b.flee = true; puff(b.x + 5, b.y + 3, '#fcfcfc', 6); if (boosting) { score += 15; sfx.hit(); } else hurt(b.k); } });
    foes.forEach(f => {
      if (f.bumped > 0) f.bumped--;
      if (f.dead || f.warn > 0 || !touchesMe(f.x + 4, f.y + 2, 18, 15)) return;
      if (!boosting) { hurt(f.k); return; }
      if (f.bumped > 0) return;   // ramming: it costs boost, not a heart, and it hits them
      f.bumped = 30; f.hp--; boost = Math.max(0, boost - 30); shake = 6; sfx.hit(); puff(f.x + 8, f.y + 8, '#f8d030', 8);
      if (f.hp <= 0) { f.dead = true; score += f.k === 'ulm' ? 400 : 200; puff(f.x + 12, f.y + 6, '#fc9838', 12); }
    });
    things.forEach(t => { const top = ground(dist + t.x) - t.h; if (touchesMe(t.x - t.w / 2 + 2, top + 3, t.w - 4, t.h)) hurt(t.k); });
    fruits.forEach(f => { if (!f.gone && touchesMe(f.x - 2, f.y - 2, 12, 12)) { f.gone = true; ammo = Math.min(99, ammo + 3); score += 50; sfx.pick(); puff(f.x + 4, f.y + 4, '#b8f818', 5); } });
    // the storm cloud at the end
    if (boss) {
      boss.t += .03; boss.x += (W - 50 - boss.x) * .02; boss.y = 62 + Math.sin(boss.t) * 34; if (boss.hurt > 0) boss.hurt--;
      if (frame % 150 === 60) bolts.push({ y: me.y + 10, t: 60 });
      if (frame % 210 === 0) for (let i = 0; i < 4; i++) birds.push({ k: 'goose', x: boss.x - 20 + i * 12, y: boss.y - 18 + i * 12, vx: 1.2, t: i });
      if (frame % 260 === 130) curls.push({ x: boss.x - 30, y: me.y + 10 + (frame % 520 < 260 ? 34 : -34), r: 16, t: 0 });
      if (touchesMe(boss.x - 30, boss.y - 20, 60, 40)) hurt('boss');
      if (boss.hp <= 0) { state = 'win'; endAt = frame; score += 5000; best = Math.max(best, score); for (let i = 0; i < 40; i++) puff(boss.x + (Math.random() - .5) * 60, boss.y + (Math.random() - .5) * 40, ['#fcfcfc', '#f8d030', '#3cbcfc'][i % 3], 2); boss = null; birds = []; curls = []; bolts = []; sfx.clear(); play(7, 124, false); }
    }
    bolts.forEach(b => { b.t--; if (b.t === 0) { flash = 6; sfx.bolt(); if (Math.abs(me.y + 10 - b.y) < 9) hurt('bolt'); } });
    if (SKY().storm && state === 'play' && frame % 240 === 100) bolts.push({ y: Math.max(22, Math.min(122, me.y + 10 + (R() - .5) * 46)), t: 60 });
    const gone = o => o.x < -40 || o.y > H + 20 || o.y < -40 || o.gone;
    birds = birds.filter(b => !gone(b)); foes = foes.filter(f => !gone(f)); things = things.filter(t => t.x > -30); curls = curls.filter(c => c.x > -40);
    fruits = fruits.filter(f => !gone(f)); shots = shots.filter(p => !gone(p) && p.x < W + 10); bits = bits.filter(b => b.l > 0); bolts = bolts.filter(b => b.t > -8);
    if (frame % 30 === 0 && state !== 'win') score += 1;
    if (state === 'play' && dist > LEN) { state = 'clear'; banner = 170; score += 500 + hearts * 100; sfx.clear(); quiet(); foes.forEach(f => f.dead = true); birds.forEach(b => b.flee = true); if (hearts < 3) hearts++; }
    if (state === 'glide') { glideLeft -= speed; if (glideLeft <= 0) { glideLeft = -1; state = 'clear'; stage = 4; banner = 170; score += 800; sfx.clear(); } }
    speed = cruise;
  }

  // ---------- drawing ----------
  function sky() {
    const s = SKY(), bands = 14;
    for (let i = 0; i < bands; i++) { g.fillStyle = mix(s.sky[0], s.sky[1], i / (bands - 1)); g.fillRect(0, Math.floor(i * H / bands), W, Math.ceil(H / bands)); }
    if (s.night) { for (let i = 0; i < 40; i++) rect((i * 61 + 13) % W, (i * 37) % 120, 1, 1, (i + (frame >> 4)) % 5 ? '#fcfcfc' : '#3cbcfc'); rect(W - 48, 20, 14, 14, '#fce0a8'); rect(W - 44, 20, 10, 10, s.sky[0]); }
    else if (!s.storm) { rect(W - 44, 20, 16, 16, stage === 7 ? '#fc7460' : '#fce0a8'); rect(W - 42, 18, 12, 20, stage === 7 ? '#fc7460' : '#fce0a8'); }
    clouds.forEach(c => { const col = s.storm ? '#585870' : s.night ? '#2038a0' : '#fcfcfc'; rect(c.x, c.y, c.w, 6, col); rect(c.x + 4, c.y - 4, c.w - 10, 5, col); rect(c.x + 8, c.y + 5, c.w - 14, 3, col); });
    if (s.storm && frame % 3 === 0) for (let i = 0; i < 14; i++) rect((i * 47 + frame * 3) % W, (i * 71 + frame * 6) % H, 1, 4, '#a4e4fc');
  }
  function land() {
    const s = SKY();
    for (let x = 0; x < W; x += 2) { const y = Math.round(ground(dist + x)); rect(x, y, 2, H - y, s.land[0]); rect(x, y + 5, 2, H - y, s.land[1]); if (s.sea && (x + Math.floor(dist)) % 64 < 22) { rect(x, H - 12, 2, 12, '#0058f8'); rect(x, H - 12, 2, 1, '#fcfcfc'); } }
  }
  function thing(t) {
    const base = ground(dist + t.x), top = base - t.h, x = t.x, lit = SKY().night || stage === 7;
    if (t.k === 'tree') { rect(x - 2, top + 10, 4, t.h - 10, '#7c4000'); rect(x - 8, top + 4, 16, 10, '#005800'); rect(x - 6, top, 12, 8, '#00a800'); rect(x - 4, top + 1, 4, 3, '#58d854'); }
    else if (t.k === 'pine') { rect(x - 1, top + 6, 3, t.h - 6, '#503000'); for (let i = 0; i < 4; i++) rect(x - 3 - i * 2, top + i * (t.h / 6), 7 + i * 4, t.h / 6 + 1, lit ? '#003000' : '#005800'); }
    else if (t.k === 'rock') { rect(x - 7, top + 6, 14, t.h - 6, '#747474'); rect(x - 5, top, 9, 8, '#bcbcbc'); rect(x - 7, top + 10, 4, t.h - 10, '#503000'); }
    else if (t.k === 'mill') { rect(x - 2, top, 4, t.h, '#fcfcfc'); rect(x - 3, base - 6, 6, 6, '#bcbcbc'); const a = frame * .09 + t.seed * 6; for (let i = 0; i < 3; i++) { const b = a + i * 2.094; for (let k = 2; k < 15; k += 2) rect(x + Math.cos(b) * k - 1, top + Math.sin(b) * k - 1, 2, 2, '#fcfcfc'); } rect(x - 1, top - 1, 3, 3, '#d82800'); }
    else if (t.k === 'pylon') { for (let y = top; y < base; y += 4) { rect(x - 1 - (y - top) / 8, y, 1, 4, '#747474'); rect(x + 1 + (y - top) / 8, y, 1, 4, '#747474'); if ((y - top) % 8 < 4) rect(x - 2 - (y - top) / 8, y, 5 + (y - top) / 4, 1, '#747474'); } rect(x - 8, top + 2, 17, 1, '#747474'); rect(x - 60, top + 4, 120, 1, '#101018'); }
    else if (t.k === 'cactus') { rect(x - 2, top, 5, t.h, '#00a800'); rect(x - 7, top + 8, 5, 3, '#00a800'); rect(x - 7, top + 4, 3, 6, '#00a800'); rect(x + 3, top + 12, 5, 3, '#00a800'); rect(x + 6, top + 7, 3, 7, '#00a800'); rect(x - 1, top + 1, 1, t.h - 2, '#58d854'); }
    else if (t.k === 'peak') { for (let i = 0; i < t.h; i += 2) rect(x - i / 3, top + i, i / 1.5 + 2, 2, i < t.h * .34 ? '#fcfcfc' : '#7c7cbc'); }
    else if (t.k === 'tower') { rect(x - t.w / 2, top, t.w, t.h, '#101018'); rect(x - t.w / 2, top, t.w, 2, '#503000'); for (let yy = top + 5; yy < base - 4; yy += 6) for (let xx = x - t.w / 2 + 3; xx < x + t.w / 2 - 3; xx += 5) rect(xx, yy, 2, 3, (Math.floor(xx * 7 + yy * 3 + t.seed * 99) % 3) ? '#f8d030' : '#503000'); rect(x, top - 6, 1, 6, '#bcbcbc'); if (frame % 40 < 20) rect(x - 1, top - 7, 3, 2, '#d82800'); }
  }
  function curl(c) {
    for (let i = 0; i < 26; i++) { const a = c.t + i * .5, r = c.r * i / 26; rect(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r * .8, 2, 2, i % 3 ? '#fcfcfc' : '#a4e4fc'); }
  }
  function drawBoss() {
    const b = boss, x = b.x, y = b.y, col = b.hurt ? '#fcfcfc' : '#404058', col2 = b.hurt ? '#fcfcfc' : '#585870';
    rect(x - 34, y - 12, 68, 26, col); rect(x - 26, y - 22, 34, 14, col2); rect(x - 2, y - 26, 26, 16, col); rect(x - 28, y + 12, 50, 8, col2); rect(x - 40, y - 2, 12, 12, col2);
    rect(x - 22, y - 6, 12, 8, '#fcfcfc'); rect(x + 2, y - 6, 12, 8, '#fcfcfc'); rect(x - 18 + Math.sign(me.x - x) * 2, y - 4 + Math.sign(me.y - y) * 1, 5, 5, '#d82800'); rect(x + 6 + Math.sign(me.x - x) * 2, y - 4 + Math.sign(me.y - y) * 1, 5, 5, '#d82800');
    rect(x - 26, y - 10, 16, 2, '#101018'); rect(x, y - 10, 16, 2, '#101018'); rect(x - 16, y + 6, 26, 5, '#101018'); for (let i = 0; i < 5; i++) rect(x - 14 + i * 5, y + 6, 3, 3, '#fcfcfc');
    rect(27, 28, 160, 5, '#101018'); rect(28, 29, Math.max(0, 158 * b.hp / 24), 3, '#d82800'); text('CUMULO-REX', 28, 20, '#fcfcfc');
  }
  function hud() {
    rect(0, 0, W, 15, 'rgba(16,16,24,.55)');
    rect(4, 11, 26, 2, '#101018'); rect(4, 11, 26 * boost / 100, 2, boosting ? '#fcfcfc' : boost < 14 ? '#d82800' : '#3cbcfc');   // boost left
    for (let i = 0; i < 3; i++) if (i < hearts) g.drawImage(SPR.heart, 4 + i * 9, 3); else rect(6 + i * 9, 6, 3, 3, '#747474');
    g.drawImage(SPR.fruit[state === 'play' ? stage : frame >> 4 & 7], 36, 2); text('x' + ammo, 46, 4, ammo ? '#fcfcfc' : '#d82800');
    text(String(score).padStart(6, '0'), W - 28, 4, '#f8d030');
    if (state === 'play') { text((stage + 1) + '/10', 70, 4, '#3cbcfc'); rect(100, 5, 74, 3, '#101018'); rect(100, 5, Math.min(74, dist / LEN * 74), 3, '#b8f818'); }
    if (state === 'glide') { text('GLIDE!', 70, 4, '#fc9838'); rect(100, 5, 74, 3, '#101018'); rect(100, 5, Math.max(0, 74 - glideLeft / 20.3), 3, '#fc9838'); }
    if (!soundOn) text('SOUND OFF', 90, 18, '#bcbcbc');
    if (demo && frame % 60 < 40) text('DEMO', 4, H - 10, '#fcfcfc');
  }
  function drawMe(x, y) {
    if (hurtFor > 0 && frame % 6 < 3) return;
    spr(hurtFor > 80 ? SPR.meHurt : SPR.me, x, y);
    if (state !== 'glide' && frame % 4 < 2) rect(x + 3, y + 13 + (frame % 8 < 4 ? 0 : 2), 2, 2, '#bcbcbc');   // the propeller
    if ((keys.fly || keys.up) && state !== 'glide' && frame % 3 === 0) bits.push({ x: x + 2, y: y + 15, vx: -1.2, vy: (Math.random() - .5) * .6, c: '#bcbcbc', l: 9 });
  }
  function world() {
    sky();
    if (state === 'glide') thermals.forEach(t => { const x = t.x - dist; if (x > -40 && x < W + 40) for (let y = 30; y < H - 26; y += 12) rect(x - 6 + Math.sin((y + frame * 2) / 14) * 8, y - (frame * 1.5 % 12), 2, 5, '#fce0a8'); });
    curls.forEach(curl); things.forEach(thing); land();
    fruits.forEach(f => spr(SPR.fruit[f.k], f.x, f.y + Math.sin(frame * .12 + f.x * .1) * 2));
    birds.forEach(b => spr(SPR[b.k][Math.floor(b.t) & 1], b.x, b.y));
    foes.forEach(f => {
      if (f.warn > 0) { if (frame % 10 < 6) { rect(W - 12, f.y + 2, 8, 9, '#d82800'); text('!', W - 10, f.y + 4, '#fcfcfc', 1, false); } return; }
      spr(f.k === 'ulm' ? SPR.ulm : SPR.foe[f.c], f.x, f.y);
    });
    bolts.forEach(b => { if (b.t > 0) { if (frame % 6 < 3) rect(0, b.y - 1, W, 2, 'rgba(252,252,252,.4)'); text('!', 3, b.y - 3, '#f8d030'); } else { for (let x = 0; x < W; x += 8) rect(x, b.y - 4 + ((x * 7) % 7), 8, 4, '#fcfcfc'); } });
    if (boss) drawBoss();
    shots.forEach(p => { g.save(); g.translate(Math.round(p.x), Math.round(p.y)); g.rotate(Math.floor(p.a) * Math.PI / 2); g.scale(PX / 3, PX / 3); g.drawImage(SPR.fruit[p.k], -4, -4); g.restore(); });
    drawMe(me.x, me.y);
    bits.forEach(b => rect(b.x, b.y, 2, 2, b.c));
    if (flash > 0) rect(0, 0, W, H, 'rgba(252,252,252,.7)');
  }
  function draw() {
    g.setTransform(3, 0, 0, 3, 0, 0);
    if (state === 'title') {
      const o = stage; stage = (frame >> 8) % 10; if (!clouds) reset(stage); sky(); land(); stage = o;
      g.drawImage(SPR.me, 94, 50 + Math.sin(frame * .05) * 5);
      for (let i = 0; i < 10; i++) g.drawImage(SPR.fruit[i], 14 + i * 19, 82 + Math.sin(frame * .08 + i) * 3);
      ctext('PARA-FRUIT', 20, '#101018', 4); text('PARA-FRUIT', Math.round((W - tw('PARA-FRUIT', 4)) / 2) - 1, 19, '#f8d030', 4, false);
      ctext('FLY HOME. DODGE THE GEESE. THROW THE FRUIT.', 100, '#fcfcfc');
      if (frame % 50 < 34) ctext('PRESS START', 116, '#b8f818', 2);
      ctext('D-PAD: FLY AND STEER   A: THROW   B: BOOST', 138, '#fcfcfc'); ctext('SELECT: CONSOLE   START: PAUSE MENU', 148, '#bcbcbc'); if (!touch) ctext('KEYS: ARROWS  X: A  Z: B  ENTER: START  TAB: SELECT', 158, '#bcbcbc');
      if (best) ctext('BEST ' + best, 170, '#f8d030');
      return;
    }
    if (state === 'story') {
      const t = frame - storyAt, o = stage; stage = 0; sky(); land(); stage = o;
      g.drawImage(SPR.me, Math.min(92, -20 + t * .5), 44 + Math.sin(t * .06) * 5);
      const lines = ['THE DAY IS DONE.', 'HOME IS TEN SKIES AWAY.', 'THE GEESE ARE HEADING SOUTH.', 'THE OTHER PILOTS WANT YOUR AIR.', 'YOU PACKED LUNCH. USE IT.'];
      lines.forEach((l, i) => { if (t > 40 + i * 70) ctext(l, 84 + i * 13, i === 4 ? '#f8d030' : '#fcfcfc'); });
      if (t > 120) g.drawImage(SPR.goose[t >> 3 & 1], W - (t - 120) * .7, 28); if (t > 150) g.drawImage(SPR.goose[t >> 3 & 1], W + 14 - (t - 150) * .7, 38);
      return;
    }
    if (shake > 0) g.translate((Math.random() - .5) * 3, (Math.random() - .5) * 3);
    world(); g.setTransform(3, 0, 0, 3, 0, 0); hud();
    if (state === 'play' && banner > 0) { ctext('STAGE ' + (stage + 1), 56, '#fcfcfc', 2); ctext(SKY().name, 74, '#f8d030', 2); ctext('FRUIT: ' + FRUITNAME[stage], 94, '#b8f818'); }
    if (state === 'glide' && banner > 0) { ctext('SURPRISE!', 46, '#d82800', 3); ctext('ENGINE OUT', 70, '#fcfcfc', 2); ctext('RIDE THE WARM AIR TO STAY UP', 90, '#fce0a8'); }
    if (state === 'boss' && banner > 0) { ctext('THE STORM HAS A FACE', 84, '#fcfcfc', 2); ctext('THROW EVERYTHING', 104, '#f8d030'); }
    if (state === 'clear') { ctext(glideLeft === -1 && stage === 4 ? 'ENGINE RESTARTED!' : 'STAGE CLEAR!', 66, '#b8f818', 2); ctext('SCORE ' + score, 88, '#fcfcfc'); }
    if (state === 'over') { rect(0, 0, W, H, 'rgba(16,16,24,.6)'); ctext('GAME OVER', 60, '#d82800', 3); ctext('SCORE ' + score, 90, '#fcfcfc', 2); if (frame % 50 < 34) ctext('PRESS START TO FLY AGAIN', 116, '#b8f818'); }
    if (state === 'win') {
      const t = frame - endAt;
      if (t > 60) { ctext('YOU MADE IT HOME!', 36, '#f8d030', 2); ctext('TEN SKIES, ONE STORM, ONE LUNCHBOX', 56, '#fcfcfc'); }
      if (t > 160) { ctext('SCORE ' + score, 72, '#b8f818', 2); for (let i = 0; i < 10; i++) g.drawImage(SPR.fruit[i], 14 + i * 19, 94 + Math.sin(frame * .1 + i) * 3); }
      if (t > 260) { ctext('PARA-FRUIT', 116, '#fcfcfc', 2); ctext('MADE IN BRAIN-LAB CREATIONS', 134, '#3cbcfc'); }
      if (t > 340 && frame % 50 < 34) ctext('PRESS START TO FLY AGAIN', 154, '#b8f818');
    }
  }

  // ---------- controls ----------
  const inPlay = () => state === 'play' || state === 'glide' || state === 'boss';
  function go() {
    if (state === 'title') { storyAt = frame; state = 'story'; play(3, 110, false); }
    else if (state === 'story') newGame();
    else if ((state === 'over' || state === 'win') && frame - endAt > 60) { state = 'title'; frame = 0; }
  }
  const fingers = {};
  window.PARAFRUIT = { get state() { return state; }, get stage() { return stage; }, get score() { return score; }, get hearts() { return hearts; }, why: why,
    skip: n => { if (n === 'glide') startGlide(); else if (n === 'boss') { hearts = 3; startBoss(); } else { hearts = 3; startStage(n); } }, demo: on => { demo = on; } };
  return {
    id: 'parafruit', name: 'PARA-FRUIT', tag: 'FLY HOME THROUGH TEN SKIES', icon: SPR.me, aLabel: 'THROW', bLabel: 'BOOST', restartLabel: 'RESTART STAGE',
    settings: [['SIZE', 'pf_size', ['SMALL', 'NORMAL', 'BIG'], 1], ['SELF-PLAY', 'pf_auto', ['OFF', 'ON'], 0]],
    keymap: { ' ': 'up' },
    atTitle: () => state === 'title', levelNow: () => stage, over: () => state === 'over' ? { score: score } : null, won: () => state === 'win' ? { score: score } : null,
    resume(k, s) { score = s || 0; hearts = 3; ammo = 5; boost = 100; glideLeft = k > 4 ? -1 : 0; startStage(k); }, fresh() { newGame(); }, scoreNow: () => score,
    apply() { PX = 2 + SET.pf_size; demo = urlDemo || !!SET.pf_auto; if (!demo) keys.fly = false; },
    start() { for (const k in keys) keys[k] = false; reset(0); state = 'title'; frame = 0; },
    stop() { for (const k in keys) keys[k] = false; },
    update: update, draw: draw, inPlay: inPlay, go: go, auto: () => demo,
    btn(n, down) {
      if (!down) { if (n === 'a') keys.auto = false; else if (n === 'b') keys.boost = false; else keys[n] = false; return; }
      if (!inPlay()) { go(); return; }
      if (n === 'a') { keys.throw = true; keys.auto = true; } else if (n === 'b') keys.boost = true; else keys[n] = true;
    },
    // a finger on the picture: hold the left part to fly, tap the right part to throw
    tap(fx, fy, id) { if (!inPlay()) { go(); return; } if (fx > .62) keys.throw = true; else { fingers[id] = 1; keys.fly = true; } },
    lift(id) { delete fingers[id]; if (!Object.keys(fingers).length && !demo) keys.fly = false; },
    key(k) { if (k === 'o') { demo = !demo; keys.fly = keys.throw = false; } },
    restart() { hearts = 3; if (state === 'boss') startBoss(); else if (state === 'glide') startGlide(); else startStage(stage); },
    title() { quiet(); state = 'title'; frame = 0; }
  };
}
// ---------- SPEED TRAIN: ten trains from two hundred years, each on a track of its own time ----------
// Get up speed for the loops, hop over the holes and the crates, fly off the ramps, and reach the station.
//   D-pad: right goes, left brakes (and backs up).   A (or up): hop.
//   B: full power for up to three seconds. It costs fuel (coal, electric power or diesel); pick-ups on the way fill it up.
// The trains are our own drawings of kinds of train (an early engine, a tram, a diesel ...), not copies of one real train.
// The same engine runs two games: SPEED TRAIN in colour, and QUINN'S TRAIN, which plays Quinn's own ten levels in
// black, white and four greys. cfg says which: its name, its levels, and whether everything is drawn in greys.
const DRAW = { rect: rect, text: text }, GREYS = {};
function grey(c) {   // any colour as one of six greys, from black to white
  if (typeof c !== 'string' || c[0] !== '#' || c.length !== 7) return c;
  if (!GREYS[c]) { const l = parseInt(c.substr(1, 2), 16) * .3 + parseInt(c.substr(3, 2), 16) * .59 + parseInt(c.substr(5, 2), 16) * .11, h = (Math.round(l / 51) * 51).toString(16).padStart(2, '0'); GREYS[c] = '#' + h + h + h; }
  return GREYS[c];
}
function TrainGame(cfg) {
  const MONO = !!cfg.mono;
  let SZ = 1.3;   // how big the train is drawn: 1 small, 1.3 normal, 1.6 big (Settings, SIZE). The track and the rules stay the same.
  const rect = MONO ? (x, y, w, h, c) => DRAW.rect(x, y, w, h, grey(c)) : DRAW.rect;
  const text = MONO ? (s, x, y, c, sc, sh) => DRAW.text(s, x, y, grey(c || '#fcfcfc'), sc, sh) : DRAW.text;
  const ctext = (s, y, c, sc) => text(s, Math.round((W - tw(s, sc)) / 2), y, c, sc);
  const AMBER = '#ffb84d', WHITE = '#eef3ff', DEEP = '#0b1326';
  // an engine is 13 dots long and 8 high; a wagon 11 by 6. A = body, T = trim, W = windows, K = wheels.
  const SHAPES = {
    early:  ['.........TT..', '.........TT..', '..WW.....TT..', '.AAAAAAAATT..', '.AAAAAAAAAAA.', 'TTTTTTTTTTTTT', '.KK..KKK..KK.', '.KK..KKK..KK.'],
    steam:  ['.WWWW....TT..', '.AAAA....TT..', '.AWWA...ATTA.', '.AWWAAAAAAAAA', '.AAAAAAAAAAAA', 'TTTTTTTTTTTTT', '.KK..KK..KK..', '.KK..KK..KK..'],
    stream: ['.............', '..AAAAAAAA...', '.AAWWAAAAAAA.', '.AAWWAAAAAAAA', 'TTTTTTTTTTTTT', 'AAAAAAAAAAAAA', '.KK..KK..KK..', '.KK..KK..KK..'],
    tram:   ['....T...T....', '.....TTT.....', '.AAAAAAAAAAA.', '.AWWAWWAWWAA.', '.AWWAWWAWWAA.', '.TTTTTTTTTTT.', '.AAAAAAAAAAA.', '..KK.....KK..'],
    metro:  ['.............', '.............', '.AAAAAAAAAAA.', '.AWWAWWAWWAA.', '.AWWAWWAWWAA.', '.TTTTTTTTTTT.', '.AAAAAAAAAAA.', '..KK.....KK..'],
    bullet: ['.............', '.............', '.AAAAAAAAA...', '.AWWAWWAAWWA.', '.AAAAAAAAAAAA', 'TTTTTTTTTTTTT', '.AAAAAAAAAAA.', '..KK.....KK..'],
    diesel: ['.............', '.AAAA........', '.AWWA..TT....', '.AWWAAAAAAAAA', '.AAAAAAAAAAAA', 'TTTTTTTTTTTTT', '.KK.KK..KK.KK', '.KK.KK..KK.KK'],
    coach:  ['.AAAAAAAAA.', '.AWWAWWAWA.', '.AAAAAAAAA.', 'TTTTTTTTTTT', '.KK.....KK.', '.KK.....KK.'],
    cargo:  ['...........', '.TAAATAAAT.', '.TAAATAAAT.', 'TTTTTTTTTTT', '.KK.....KK.', '.KK.....KK.']
  };
  // A track is written as pieces, left to right:
  //   f60 flat, 60 long      u70:24 up 24 over 70      d80:30 down      h70:14 a hump      l22 a loop, 22 across half
  //   o34 a hole to hop      r60 a ramp and a wide gap (the train flies)      b a crate      s4 four pick-ups
  // Rule (found by testing): after a hole or a crate leave f150 before the next one, and f120 before a ramp.
  // Each level: the year, the kind of train, how the land behind looks (hills, city, yard, tunnel) and its colours.
  const OWN_LEVELS = [
    { year: '1829', name: 'THE FIRST ENGINE', kind: 'steam', eng: 'early', wag: 'cargo', style: 'hills',
      sky: ['#e9c58c', '#f7e8c4'], far: '#b99a6a', far2: '#8f7a4e', ground: '#6b5a3a', top: '#8a7a4a', rail: '#3a2c1c', tie: '#5a4026',
      pal: { A: '#f2c230', T: '#2f6b3a', W: '#f4ead0', K: '#2a2018' },
      map: 'f80 s4 f60 h70:14 f50 o30 f60 s3 f40 l20 f70 b f80 r56 s3 f40 h60:12 f40 l20 f60 o30 f60 s4 f60 d60:20 f20 l22 f70 b f120 r56 f40 h70:14 f60' },
    { year: '1869', name: 'PRAIRIE STEAMER', kind: 'steam', eng: 'steam', wag: 'coach', style: 'hills',
      sky: ['#f2a65a', '#fbe3b0'], far: '#c0703a', far2: '#9a5226', ground: '#8a5a2c', top: '#b07a3c', rail: '#3a2416', tie: '#5c3a1e',
      pal: { A: '#b3261e', T: '#1c1c1c', W: '#f4ead0', K: '#2a1a12' },
      map: 'f70 h90:18 f40 s4 f50 o32 f70 u70:22 f50 d90:34 f20 l22 f70 b f120 r56 s3 f50 h70:16 f40 o34 f150 b f70 d60:20 f20 l24 f60' },
    { year: '1890', name: 'THE FIRST TUBE', kind: 'electric', eng: 'metro', wag: 'coach', style: 'tunnel',
      sky: ['#1a1410', '#2a2018'], far: '#4a3424', far2: '#120d0a', light: '#f2c230', ground: '#120d0a', top: '#3a2a1e', rail: '#c8b890', tie: '#6a5438',
      pal: { A: '#7a2a1e', T: '#d8b25a', W: '#f6e6a0', K: '#c8b890' },
      map: 'f60 u70:24 f50 o34 f150 b f60 d80:30 f20 l24 f60 o36 f150 o36 f60 r60 b f60 h80:20 f30 l22 f20 l22 f60 o36 f50 u60:20 f60 b f120 r60 d80:30 f20 l24 f20 l20 f50 o36 f60' },
    { year: '1905', name: 'CITY TRAM', kind: 'electric', eng: 'tram', wag: 'coach', style: 'city',
      sky: ['#9cc4d8', '#e6eef0'], far: '#8fa2b4', far2: '#6d7f92', ground: '#6a6a6a', top: '#8a8a88', rail: '#2c2c30', tie: '#4a4a4e',
      pal: { A: '#2f7a4a', T: '#efe6c8', W: '#fdf6d0', K: '#222226' },
      map: 'f60 o30 f150 o32 f60 h60:12 f40 l20 f20 l20 f60 b f120 r56 f40 u60:20 f50 o34 f60 d80:30 f20 l24 f60 b f150 o36 f60 h70:16 f60' },
    { year: '1938', name: 'THE STREAMLINER', kind: 'steam', eng: 'stream', wag: 'coach', style: 'hills',
      sky: ['#5aa0e0', '#cfe8f8'], far: '#6aa868', far2: '#4a8a4c', ground: '#3f7a3a', top: '#5a9a50', rail: '#2a2a2e', tie: '#5a4630',
      pal: { A: '#1f5fbf', T: '#c0c8d0', W: '#f4f4f4', K: '#1a1a20' },
      map: 'f60 d90:40 f20 l26 f50 o40 f50 u60:20 f20 b f120 r60 f30 d70:30 f20 l24 f20 l20 f60 b f150 b f150 o40 f150 o40 f60 u70:24 f40 o40 f50 d100:44 f10 l28 f40 b f120 r64 h80:20 f40 o40 f150 o40 f60' },
    { year: '1955', name: 'DIESEL FREIGHT', kind: 'diesel', eng: 'diesel', wag: 'cargo', style: 'yard',
      sky: ['#c8d0d8', '#f0f0ea'], far: '#9aa0a8', far2: '#7c828c', ground: '#70685c', top: '#8c8474', rail: '#26262a', tie: '#4c4438',
      pal: { A: '#e07820', T: '#2a2a30', W: '#f0f0f0', K: '#1c1c20' },
      map: 'f60 d80:30 f20 l24 f50 b f150 b f120 r60 s3 f40 u80:28 f40 o38 f70 d100:44 f10 l28 f20 l22 f60 o40 f150 b f120 r60 h80:20 f60' },
    { year: '1964', name: 'THE BULLET LINE', kind: 'electric', eng: 'bullet', wag: 'coach', style: 'hills',
      sky: ['#78b8f0', '#e8f4fc'], far: '#9ab0d0', far2: '#5a8a5a', ground: '#4a7a4a', top: '#c8c8c0', rail: '#30343c', tie: '#8a8a84',
      pal: { A: '#f4f4f4', T: '#1f4fbf', W: '#3a5a8a', K: '#22262e' },
      map: 'f60 d100:44 f10 l28 f40 r64 l24 f20 l22 f60 o40 f70 u70:24 f40 b f120 r64 d90:40 f10 l28 f50 o40 f150 o40 f60 h90:22 f40 l22 f60' },
    { year: '1975', name: 'NIGHT METRO', kind: 'electric', eng: 'metro', wag: 'coach', style: 'tunnel',
      sky: ['#0c1016', '#18202c'], far: '#2c3848', far2: '#080b10', light: '#bfe8ff', ground: '#080b10', top: '#2c3848', rail: '#aab4c4', tie: '#4a5464',
      pal: { A: '#c8ccd4', T: '#e04828', W: '#fff4b0', K: '#aab4c4' },
      map: 'f60 l22 f40 o36 f40 l26 f40 u80:28 f20 b f120 r64 d100:44 f10 l28 f50 b f150 o40 f150 o40 f50 r64 l22 f20 l22 f20 l22 f60 d80:30 f20 l26 f20 l22 f50 o40 f150 b f120 r64 u70:24 f40 o40 f40 d90:40 f10 l28 f20 l24 f60' },
    { year: '2005', name: 'HEAVY CARGO', kind: 'diesel', eng: 'diesel', wag: 'cargo', style: 'yard',
      sky: ['#f0b070', '#f8e0b8'], far: '#8a7262', far2: '#6a5448', ground: '#5a5048', top: '#7a6e62', rail: '#241e1c', tie: '#463a32',
      pal: { A: '#c02828', T: '#f0c020', W: '#e8e8e8', K: '#1c1614' },
      map: 'f60 u70:24 f40 o40 f60 d100:44 f10 l28 f20 l26 f50 b f150 b f150 o40 f60 r64 u60:20 f40 d90:40 f10 l28 f40 o40 f150 b f120 r64 l22 f20 l22 f60 o40 f70 h80:20 f60' },
    { year: 'TODAY', name: 'FULL SPEED TODAY', kind: 'electric', eng: 'bullet', wag: 'coach', style: 'city',
      sky: ['#0b1326', '#22335c'], far: '#1b2b50', far2: '#24365e', lit: true, ground: '#152240', top: '#24365e', rail: '#eef3ff', tie: '#3fd6c1',
      pal: { A: '#3fd6c1', T: '#ffb84d', W: '#eef3ff', K: '#eef3ff' },
      map: 'f60 d90:40 f10 l28 f20 l24 f20 l22 f50 o40 f60 r64 d80:30 f10 l28 f40 b f120 r64 u80:28 f40 o40 f150 o40 f60 d100:44 f10 l30 f20 l26 f50 b f150 o40 f60 r64 l24 f20 l22 f20 l22 f70 h90:22 f60' }
  ];
  const LEVELS = cfg.levels ? cfg.levels(OWN_LEVELS) : OWN_LEVELS;
  const FUEL = { steam: 'COAL', electric: 'POWER', diesel: 'DIESEL' };
  const ACC = .06, GRAV = .12, AIRG = .16, HOP = 2.3, TOP = 4.2, BTOP = 5.6;
  // the picture is drawn a third bigger than the other games, so the train and the track are easier to see
  const VW = W * 3 / 4, VH = H * 3 / 4, AHEAD = 38;
  let ENGINE, WAG1, WAG2;
  const TH = () => LEVELS[level];

  const sfx = {
    hop: () => AC && tone('square', 420, AC.currentTime, .1, .07, 760),
    pick: () => { if (AC) [84, 88].forEach((n, i) => tone('square', hz(n), AC.currentTime + i * .04, .06, .07)); },
    crash: () => { if (AC) { tone('sawtooth', 300, AC.currentTime, .3, .15, 60); hiss(AC.currentTime, .22, .22); } },
    smash: () => { if (AC) { hiss(AC.currentTime, .12, .25); tone('square', 200, AC.currentTime, .1, .1, 90); } },
    land: () => AC && tone('triangle', 120, AC.currentTime, .07, .16),
    // full power sounds different on each kind of train: a steam whistle, an electric bell, a diesel horn
    horn: k => { if (!AC) return; const t = AC.currentTime;
      if (k === 'steam') { tone('square', 587, t, .28, .05); tone('square', 740, t, .28, .05); }
      else if (k === 'electric') { tone('triangle', 1320, t, .12, .1); tone('triangle', 1320, t + .16, .16, .1); }
      else { tone('sawtooth', 220, t, .32, .07); tone('sawtooth', 277, t, .32, .07); } },
    run: (k, v) => { if (!AC) return; const t = AC.currentTime;
      if (k === 'steam') hiss(t, .05, .05); else if (k === 'diesel') tone('sawtooth', 52 + v * 4, t, .09, .05); else tone('sine', 260 + v * 70, t, .06, .02); },
    clear: () => { if (AC) [60, 64, 67, 72, 76, 79, 84].forEach((n, i) => tone('square', hz(n), AC.currentTime + i * .09, .16, .10)); }
  };

  // ---------- building a track ----------
  // P: the points of the track, about 4 dots apart. P[i].f tells what the piece ending at point i is ('l' loop, 'r' ramp).
  // P[i].brk means: after point i the track stops, and starts again at the next point. L[i]: how far point i is along the track.
  let P = [], L = [], blocks = [], picks = [], signs = [], back = [], finishS = 0, level = 0;
  function build(n) {
    level = n; P = []; L = [0]; blocks = []; picks = []; signs = [];
    const th = TH();
    ENGINE = mk(SHAPES[th.eng], th.pal); WAG1 = mk(SHAPES[th.wag], th.pal); WAG2 = mk(SHAPES[th.wag], { A: th.pal.T, T: th.pal.A, W: th.pal.W, K: th.pal.K });
    let x = 0, y = 0;
    const put = f => P.push({ x: x, y: y, f: f || '' });
    const run = (len, fy, f) => { const x0 = x, y0 = y, m = Math.max(1, Math.round(len / 4)); for (let i = 1; i <= m; i++) { x = x0 + len * i / m; y = y0 + fy(i / m); put(f); } };
    const ease = t => .5 - .5 * Math.cos(Math.PI * t);
    put(); run(70, () => 0);
    th.map.split(' ').forEach(tok => {
      const k = tok[0], a = tok.slice(1).split(':').map(Number);
      if (k === 'f') run(a[0], () => 0);
      else if (k === 'u') run(a[0], t => -a[1] * ease(t));
      else if (k === 'd') run(a[0], t => a[1] * ease(t));
      else if (k === 'h') run(a[0], t => -a[1] * Math.pow(Math.sin(Math.PI * t), 2));
      else if (k === 'l') {
        const r = a[0], cx = x, cy = y - r, m = Math.round(2 * Math.PI * r / 4);
        for (let i = 1; i <= m; i++) { const q = 2 * Math.PI * i / m; x = cx + r * Math.sin(q); y = cy + r * Math.cos(q); put('l'); }
        x = cx; y = cy + r; P[P.length - 1].x = x; P[P.length - 1].y = y;
        for (let i = 0; i < 4; i++) picks.push({ x: cx + (r - 8) * Math.sin(1 + i * 1.4), y: cy + (r - 8) * Math.cos(1 + i * 1.4) });
      }
      else if (k === 'o') {
        signs.push({ x: x - 34, y: y }); P[P.length - 1].brk = true;
        for (let i = 0; i < 3; i++) picks.push({ x: x + a[0] * (i + 1) / 4, y: y - 14 - (i === 1 ? 5 : 0) });
        x += a[0]; put();
      }
      else if (k === 'r') {
        run(40, t => -16 * t, 'r'); P[P.length - 1].brk = true;
        for (let i = 0; i < 4; i++) picks.push({ x: x + 10 + a[0] * i / 3, y: y - 12 - (i === 1 || i === 2 ? 6 : 0) });
        x += a[0]; y += 16; put(); run(150, () => 0);
      }
      else if (k === 'b') blocks.push({ i: P.length - 1, x: x, y: y });
      else if (k === 's') for (let i = 0; i < a[0]; i++) picks.push({ x: x + 14 + i * 12, y: y - 14 });
    });
    run(110, () => 0);
    for (let i = 1; i < P.length; i++) L[i] = L[i - 1] + (P[i - 1].brk ? 0 : Math.hypot(P[i].x - P[i - 1].x, P[i].y - P[i - 1].y));
    blocks.forEach(b => { b.s = L[b.i]; });
    finishS = L[P.length - 1] - 50;
    const r = rng(77 + n * 31); back = [];
    for (let i = 0; i < 16; i++) back.push({ x: r() * 640, w: 14 + r() * 26, h: 16 + r() * 60 });
  }
  const segAng = i => Math.atan2(P[i + 1].y - P[i].y, P[i + 1].x - P[i].x);
  const segKind = i => P[i + 1].f;
  // where a place along the track is: its x, y, the slope there, and which piece it is on
  function at(s, i) {
    i = Math.max(0, Math.min(P.length - 2, i));
    while (i < P.length - 2 && s > L[i + 1]) i++;
    while (i > 0 && s < L[i]) i--;
    while (i < P.length - 2 && P[i].brk) i++;   // never rest inside a gap
    const d = L[i + 1] - L[i] || 1, t = Math.max(0, Math.min(1, (s - L[i]) / d));
    return { x: P[i].x + (P[i + 1].x - P[i].x) * t, y: P[i].y + (P[i + 1].y - P[i].y) * t, ang: segAng(i), i: i };
  }

  // ---------- the game ----------
  let state = 'title', frame = 0, score = 0, best = 0, hearts = 3, time = 0, banner = 0, endAt = 0, bonus = 0;
  let tr = { on: true, i: 0, s: 0, v: 0, x: 0, y: 0, vx: 0, vy: 0, ang: 0 }, cam = { x: 0, y: 0 };
  let fuel = 100, boosting = false, burst = 0, spent = false, hurtT = 0, respawnS = 0, deathY = 0, jump = false, bits = [], demo = false, shake = 0;
  const keys = { left: false, right: false, b: false };
  function startLevel(n) {
    build(n); tr = { on: true, i: 0, s: 20, v: 0, x: 0, y: 0, vx: 0, vy: 0, ang: 0 };
    const p = at(tr.s, 0); tr.x = p.x; tr.y = p.y; cam = { x: p.x - AHEAD, y: p.y - 96 };
    fuel = 100; boosting = false; burst = 0; spent = false; hurtT = 0; jump = false; bits = []; time = 0; banner = 170; state = 'play';
    play(500 + n * 17, 132 + n * 4, TH().style === 'tunnel');
  }
  function newGame() { score = 0; hearts = 3; startLevel(0); }
  function puff(x, y, col, n, up) { for (let i = 0; i < n; i++) bits.push({ x: x, y: y, vx: (Math.random() - .5) * 2, vy: (Math.random() - (up ? 1 : .6)) * 1.8, c: col, l: 16 + Math.random() * 12 }); }
  const why = [];
  function loseHeart(cause) {
    why.push(cause + '@' + (level + 1) + ':' + Math.round(tr.s)); hearts--; hurtT = 90; shake = 10; sfx.crash();
    if (hearts <= 0) { state = 'over'; endAt = frame; best = Math.max(best, score); quiet(); }
  }
  // leaving the track: off the end of a ramp, into a hole, or a hop
  function launch(x, y, ang, extra) {
    let i = at(Math.max(0, tr.s - 170), tr.i).i;
    while (i > 0 && (segKind(i) === 'l' || segKind(i) === 'r' || P[i].brk)) i--;
    respawnS = L[i]; deathY = y + 150;
    tr.on = false; tr.vx = Math.cos(ang) * tr.v; tr.vy = Math.sin(ang) * tr.v - (extra || 0);
    tr.x = x + Math.sign(tr.v || 1) * 1.5; tr.y = y;
  }
  function ride() {
    tr.s += tr.v;
    for (;;) {
      if (tr.s > L[tr.i + 1]) {
        if (tr.i + 1 >= P.length - 1) { tr.s = L[P.length - 1]; tr.v = 0; break; }
        if (P[tr.i + 1].brk) { launch(P[tr.i + 1].x, P[tr.i + 1].y, segAng(tr.i)); break; }
        tr.i++;
      } else if (tr.s < L[tr.i]) {
        if (tr.i === 0) { tr.s = 0; tr.v = Math.max(0, tr.v); break; }
        if (P[tr.i - 1].brk) { launch(P[tr.i].x, P[tr.i].y, segAng(tr.i)); break; }
        tr.i--;
      } else break;
    }
  }
  // The game playing itself: keep going, full power before loops and ramps, hop over holes and crates.
  function pilot() {
    keys.right = true; keys.left = false; keys.b = false;
    if (!tr.on) return;
    if (segKind(tr.i) === 'l' && tr.v < 3) keys.b = true;
    for (let i = tr.i + 1; i < Math.min(P.length - 1, tr.i + 40); i++) {
      const d = L[i] - tr.s;
      if (P[i].brk) { if (P[i].f === 'r') { if (tr.v < 4.1) keys.b = true; } else if (d < tr.v * 3 + 4) jump = true; break; }
      if (P[i + 1].f === 'l') { if (d < 70 && tr.v < 3.7) keys.b = true; break; }
    }
    blocks.forEach(b => { const d = b.s - tr.s; if (!b.gone && d > 0 && d < tr.v * 4 + 12) jump = true; });
  }
  function update() {
    frame++;
    if (state === 'title') { if (demo && frame > 150) newGame(); return; }
    if (state === 'over' || state === 'win') { if (demo && frame - endAt > 300) { state = 'title'; frame = 0; } return; }
    if (state === 'clear') { if (--banner <= 0) { if (level + 1 < LEVELS.length) startLevel(level + 1); else { state = 'win'; endAt = frame; best = Math.max(best, score); play(7, 124, false); } } return; }
    time++; if (banner > 0) banner--; if (hurtT > 0) hurtT--; if (shake > 0) shake--;
    if (demo) pilot();
    const kindOfTrain = TH().kind;
    // B: full power for up to three seconds at a time, for as long as there is fuel. Let go and press again for the next burst.
    if (!keys.b) { spent = false; burst = 0; }
    const was = boosting; boosting = keys.b && !spent && tr.on && fuel > (was ? 0 : 6);
    if (boosting) { if (!was) sfx.horn(kindOfTrain); fuel = Math.max(0, fuel - .45); if (++burst >= 180) spent = true; }
    else fuel = Math.min(100, fuel + .04);
    if (tr.on) {
      const kind = segKind(tr.i), ang = segAng(tr.i), cap = boosting ? BTOP : TOP;
      let a = GRAV * Math.sin(ang);                                   // downhill pulls the train along, uphill holds it back
      if (keys.right && tr.v < cap) a += ACC + (boosting ? .09 : 0);
      else if (boosting && tr.v < cap) a += .09;
      if (keys.left) a -= tr.v > .2 ? .1 : (tr.v > -2.2 ? .05 : 0);
      tr.v = Math.max(-2.6, Math.min(6.5, (tr.v + a) * .996));
      if (jump && kind !== 'l' && kind !== 'r') { const p = at(tr.s, tr.i); launch(p.x - Math.sign(tr.v || 1) * 1.5, p.y, ang, HOP); sfx.hop(); }
      else {
        ride();
        if (tr.on) {
          const p = at(tr.s, tr.i); tr.x = p.x; tr.y = p.y; tr.ang = p.ang; tr.i = p.i;
          blocks.forEach(b => {
            if (b.gone || tr.v <= 0 || tr.s < b.s - 8 || tr.s > b.s + 2) return;
            b.gone = true; puff(b.x, b.y - 4, '#c8a060', 8);
            if (boosting) { score += 50; sfx.smash(); shake = 4; }
            else if (hurtT <= 0) { tr.v = -1.8; loseHeart('crate'); }
          });
          if (Math.abs(tr.v) > .4 && frame % Math.max(5, Math.round(26 - Math.abs(tr.v) * 4)) === 0) {
            sfx.run(kindOfTrain, Math.abs(tr.v));
            if (kindOfTrain !== 'electric') bits.push({ x: tr.x + 3, y: tr.y - 9, vx: -tr.v * .2, vy: -.7, c: kindOfTrain === 'steam' ? '#f4f4f4' : '#6a6a6a', l: 16 });
          }
          if (tr.s >= finishS && state === 'play') { state = 'clear'; banner = 190; bonus = 300 + hearts * 100 + Math.max(0, 90 - Math.floor(time / 60)) * 5; score += bonus; sfx.clear(); quiet(); if (hearts < 3) hearts++; }
        }
      }
    } else {
      tr.vy += AIRG; tr.x += tr.vx; tr.y += tr.vy; tr.ang = Math.atan2(tr.vy, Math.abs(tr.vx) + 1.5) * .6;
      for (let i = Math.max(0, tr.i - 60); i < Math.min(P.length - 1, tr.i + 150); i++) {
        const p = P[i], q = P[i + 1];
        if (p.brk || q.f === 'l' || q.x <= p.x || tr.x < p.x || tr.x > q.x) continue;
        const t = (tr.x - p.x) / (q.x - p.x), gy = p.y + (q.y - p.y) * t;
        if (tr.vy >= 0 && tr.y >= gy && tr.y <= gy + 2 + tr.vy) {      // down on the track again (a small hole can be flown over at full power, not at a crawl)
          const ang = segAng(i);
          tr.on = true; tr.i = i; tr.s = L[i] + (L[i + 1] - L[i]) * t; tr.y = gy; tr.ang = ang;
          tr.v = Math.max(-2.6, Math.min(6.5, tr.vx * Math.cos(ang) + tr.vy * Math.sin(ang)));
          sfx.land(); puff(tr.x, gy, TH().top, 4, true);
        }
        break;
      }
      if (!tr.on && tr.y > deathY) {                                    // fell off: back on the track a little earlier
        loseHeart('fell');
        if (state === 'play') { const p = at(respawnS, tr.i); tr.on = true; tr.i = p.i; tr.s = respawnS; tr.v = 0; tr.x = p.x; tr.y = p.y; tr.ang = p.ang; fuel = Math.max(fuel, 50); }
      }
    }
    jump = false;
    picks.forEach(s => { if (!s.got && Math.hypot(s.x - tr.x, s.y - (tr.y - 5)) < 11) { s.got = true; score += 10; fuel = Math.min(100, fuel + 10); sfx.pick(); } });
    bits.forEach(b => { b.x += b.vx; b.y += b.vy; b.vy += .03; b.l--; }); bits = bits.filter(b => b.l > 0);
    cam.x = tr.x - AHEAD - (SZ - 1) * 34; cam.y += (tr.y - 96 - cam.y) * .09;
  }

  // ---------- drawing ----------
  // what lies behind the track: hills, a city, a goods yard, or the wall and roof of a tunnel
  function backdrop(vw, vh) {
    const th = TH();
    for (let i = 0; i < 14; i++) { g.fillStyle = mix(th.sky[0], th.sky[1], i / 13); g.fillRect(0, Math.floor(i * vh / 14), vw, Math.ceil(vh / 14) + 1); }
    if (th.style === 'tunnel') {
      for (let y = 12; y < vh; y += 9) rect(0, y, vw, 1, th.far);                                                 // rows of bricks
      for (let k = 0; k < 26; k++) rect(((k * 37 - cam.x * .7) % (vw + 40) + vw + 40) % (vw + 40) - 20, 12 + (k * 5 % 14) * 9, 1, 9, th.far);
      for (let k = 0; k < 4; k++) { const x = ((k * 80 - cam.x * .85) % 320 + 320) % 320 - 30; rect(x, 0, 7, vh, th.far2); rect(x + 7, 0, 1, vh, th.far); }   // pillars
      rect(0, 0, vw, 9, th.far2); rect(0, 9, vw, 1, th.far);                                                       // the roof
      for (let k = 0; k < 3; k++) { const x = ((k * 110 - cam.x) % 330 + 330) % 330 - 20; rect(x, 9, 8, 2, th.light); g.globalAlpha = .12; rect(x - 8, 11, 24, 40, th.light); g.globalAlpha = 1; }
    } else if (th.style === 'hills') {
      for (let x = 0; x < vw; x += 2) { const wx = x + cam.x * .2, h = 30 + 16 * Math.sin(wx / 37) + 8 * Math.sin(wx / 13 + 2); rect(x, vh - 34 - h - cam.y * .08, 2, vh, th.far); }
      for (let x = 0; x < vw; x += 2) { const wx = x + cam.x * .45, h = 14 + 9 * Math.sin(wx / 23 + 1) + 4 * Math.sin(wx / 7); rect(x, vh - 16 - h - cam.y * .16, 2, vh, th.far2); }
    } else {
      back.forEach((b, i) => {
        const x = ((b.x - cam.x * .3) % 640 + 640) % 640 - 60, y = vh - 14 - cam.y * .14 - b.h * (th.style === 'yard' ? .45 : 1);
        rect(x, y, b.w, vh, i % 2 ? th.far : th.far2);
        if (th.style === 'city') for (let wy = y + 4; wy < vh; wy += 7) for (let wx = x + 3; wx < x + b.w - 3; wx += 5) { if ((Math.floor(wx - x) * 7 + Math.floor(wy - y) * 3 + i) % 3) rect(wx, wy, 2, 3, th.lit ? AMBER : th.sky[1]); }
        else { rect(x, y, b.w, 2, th.sky[1]); rect(x + 2, y + 6, b.w - 4, 1, th.sky[0]); }                          // stacked boxes in the yard
      });
    }
  }
  function track() {
    const th = TH(), x0 = cam.x - 8, x1 = cam.x + VW + 8;
    P.forEach(p => { if (p.x < x0 || p.x > x1 || p.f === 'l') return; rect(p.x - cam.x - 2, p.y - cam.y + 2, 5, VH, th.ground); rect(p.x - cam.x - 2, p.y - cam.y + 2, 5, 2, th.top); });   // the ground the track lies on
    P.forEach((p, i) => {
      if (p.x < x0 || p.x > x1) return;
      const x = p.x - cam.x, y = p.y - cam.y;
      if (p.f === 'l') { rect(x - 1, y - 1, 3, 3, i % 2 ? th.rail : th.tie); return; }
      if (i % 2 === 0) rect(x - 1, y + 2, 2, 2, th.tie);                 // a sleeper
      rect(x - 2, y, 5, 2, p.f === 'r' ? AMBER : th.rail);               // the rail
    });
    signs.forEach(s => { const x = s.x - cam.x, y = s.y - cam.y; if (x < -8 || x > VW + 8) return; rect(x, y - 14, 1, 14, th.rail); rect(x - 3, y - 20, 7, 7, AMBER); rect(x, y - 19, 1, 3, DEEP); rect(x, y - 15, 1, 1, DEEP); });
    // the station at the end
    const e = at(finishS + 12, P.length - 2), sx = e.x - cam.x, sy = e.y - cam.y;
    if (sx > -40 && sx < VW + 40) { rect(sx - 14, sy - 26, 2, 26, th.pal.W); rect(sx + 14, sy - 26, 2, 26, th.pal.W); rect(sx - 18, sy - 30, 38, 5, th.pal.A); rect(sx - 18, sy - 25, 38, 1, th.pal.T); rect(sx + 22, sy - 40, 1, 40, th.pal.W); for (let i = 0; i < 8; i++) rect(sx + 23 + i % 2 * 3, sy - 40 + (i >> 1) * 3, 3, 3, (i + (i >> 1)) % 2 ? th.pal.W : th.pal.T); }
  }
  function car(img, x, y, ang) { g.save(); g.translate(Math.round(x - cam.x), Math.round(y - cam.y)); g.rotate(ang); g.scale(SZ, SZ); g.drawImage(img, -Math.floor(img.width / 2), -img.height); g.restore(); }
  function train() {
    if (hurtT > 0 && frame % 6 < 3) return;
    [[WAG2, 27], [WAG1, 14], [ENGINE, 0]].forEach(c => {
      const back = c[1] * SZ;
      if (tr.on) { const p = at(Math.max(0, tr.s - back), tr.i); car(c[0], p.x, p.y, p.ang); }
      else car(c[0], tr.x - Math.cos(tr.ang) * back, tr.y - Math.sin(tr.ang) * back, tr.ang);
    });
    if (boosting && frame % 2 === 0) bits.push({ x: tr.x - 8, y: tr.y - 4, vx: -2 - Math.random(), vy: (Math.random() - .5), c: TH().kind === 'electric' ? (frame % 4 ? '#bfe8ff' : '#ffffff') : (frame % 4 ? AMBER : '#ffffff'), l: 9 });
  }
  // fuel to pick up: a lump of coal, a spark of electric power, or a can of diesel
  function pickup(x, y) {
    const k = TH().kind;
    if (k === 'steam') { rect(x - 3, y - 2, 6, 5, '#1a1410'); rect(x - 2, y - 3, 4, 1, '#1a1410'); rect(x - 2, y - 2, 2, 1, '#8a8478'); rect(x - 3, y + 3, 6, 1, AMBER); }
    else if (k === 'electric') { rect(x, y - 4, 3, 3, '#20242c'); rect(x - 2, y - 1, 5, 2, '#20242c'); rect(x - 2, y + 1, 3, 3, '#20242c'); rect(x + 1, y - 4, 2, 3, '#ffd820'); rect(x - 1, y - 1, 4, 1, '#ffd820'); rect(x - 1, y, 2, 3, '#ffd820'); }
    else { rect(x - 3, y - 3, 6, 7, '#b02020'); rect(x - 1, y - 5, 3, 2, '#303030'); rect(x - 2, y - 1, 4, 2, '#f0f0f0'); }
  }
  function world() {
    backdrop(VW, VH); track();
    picks.forEach(s => { if (s.got) return; const x = s.x - cam.x, y = s.y - cam.y + Math.sin(frame * .1 + s.x) * 1.5; if (x > -6 && x < VW + 6) pickup(Math.round(x), Math.round(y)); });
    blocks.forEach(b => { if (b.gone) return; const x = b.x - cam.x, y = b.y - cam.y; if (x < -10 || x > VW + 10) return; rect(x - 4, y - 8, 8, 8, '#5a3c1e'); rect(x - 3, y - 7, 6, 6, '#c8a060'); rect(x - 3, y - 4, 6, 1, '#5a3c1e'); rect(x - 1, y - 7, 1, 6, '#5a3c1e'); });
    train();
    bits.forEach(b => rect(b.x - cam.x, b.y - cam.y, 2, 2, b.c));
  }
  const timeText = () => { const s = Math.floor(time / 60); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  function hud() {
    const TEAL = '#3fd6c1', MID = '#24365e';
    rect(0, 0, W, 13, 'rgba(11,19,38,.78)'); rect(0, H - 22, 76, 22, 'rgba(11,19,38,.78)');
    for (let i = 0; i < 3; i++) rect(4 + i * 8, 4, 6, 5, i < hearts ? AMBER : MID);
    text((level + 1) + '/' + LEVELS.length, 30, 4, TEAL); text(timeText(), 54, 4, WHITE);
    rect(76, 5, 100, 3, MID); rect(76, 5, Math.max(0, Math.min(100, 100 * tr.s / finishS)), 3, TEAL); rect(76 + Math.min(99, 100 * tr.s / finishS), 4, 2, 5, AMBER);
    text(String(score).padStart(5, '0'), W - 24, 4, AMBER);
    text('SPEED', 4, H - 19, WHITE); rect(30, H - 18, 42, 3, MID); rect(30, H - 18, Math.min(42, 42 * Math.abs(tr.v) / BTOP), 3, TEAL);
    text(FUEL[TH().kind], 4, H - 10, WHITE); rect(30, H - 9, 42, 3, MID); rect(30, H - 9, 42 * fuel / 100, 3, boosting ? WHITE : fuel < 12 ? '#d82800' : AMBER);
    if (demo && frame % 60 < 40) text('DEMO', W - 22, H - 10, WHITE);
  }
  function draw() {
    g.setTransform(3, 0, 0, 3, 0, 0);
    if (state === 'title') {
      const n = (frame >> 8) % LEVELS.length; if (n !== level || !P.length) build(n);                  // the title shows each train in turn
      cam = { x: frame * .5, y: 0 }; backdrop(W, H); cam.x = 0;
      const th = TH(), ty = x => 140 - 10 * Math.sin(x / 34), ta = x => Math.atan(-10 / 34 * Math.cos(x / 34));
      for (let x = 0; x < W; x += 4) { rect(x - 2, ty(x) + 2, 5, 60, th.ground); rect(x - 2, ty(x) + 2, 5, 2, th.top); }
      for (let x = 0; x < W; x += 4) { rect(x - 2, ty(x), 5, 2, th.rail); if (x % 8 === 0) rect(x - 1, ty(x) + 2, 2, 2, th.tie); }
      const hx = (frame * 1.6) % (W + 80) - 20;
      [[WAG2, 27], [WAG1, 14], [ENGINE, 0]].forEach(c => { const x = hx - c[1] * SZ; car(c[0], x, ty(x), ta(x)); });
      rect(0, 12, W, 100, 'rgba(11,19,38,.72)');
      ctext(cfg.name, 18, DEEP, 4); text(cfg.name, Math.round((W - tw(cfg.name, 4)) / 2) - 1, 17, AMBER, 4, false);
      ctext(cfg.line, 46, WHITE);
      if (frame % 50 < 34) ctext('PRESS START', 58, '#3fd6c1', 2);
      ctext('RIGHT: GO   LEFT: BRAKE   A: HOP   B: FULL POWER', 78, WHITE); ctext('FULL POWER LASTS 3 SECONDS AND COSTS FUEL', 88, '#9fb0d4'); ctext('GET UP SPEED FOR THE LOOPS. HOP THE HOLES.', 98, '#9fb0d4');
      ctext(th.year + '  ' + th.name, 118, WHITE);
      if (best) ctext('BEST ' + best, 128, AMBER);
      return;
    }
    g.setTransform(4, 0, 0, 4, shake > 0 ? (Math.random() - .5) * 9 : 0, shake > 0 ? (Math.random() - .5) * 9 : 0);
    world(); g.setTransform(3, 0, 0, 3, 0, 0); hud();
    const th = TH();
    if (state === 'play' && banner > 0) { rect(0, 30, W, 52, 'rgba(11,19,38,.72)'); ctext('LEVEL ' + (level + 1) + ' - ' + th.year, 36, WHITE, 2); ctext(th.name, 52, AMBER, 2); ctext(th.kind + (th.style === 'tunnel' ? ', UNDERGROUND' : '') + '   FUEL: ' + FUEL[th.kind], 70, WHITE); }
    if (state === 'clear') { rect(0, 36, W, 56, 'rgba(11,19,38,.72)'); ctext('STATION REACHED!', 42, '#3fd6c1', 2); ctext('TIME ' + timeText() + '   BONUS ' + bonus, 62, WHITE); ctext('SCORE ' + score, 74, AMBER, 2); }
    if (state === 'over') { rect(0, 0, W, H, 'rgba(11,19,38,.7)'); ctext('OFF THE RAILS', 56, '#d82800', 3); ctext('SCORE ' + score, 86, WHITE, 2); if (frame % 50 < 34) ctext('PRESS START TO RIDE AGAIN', 112, '#3fd6c1'); }
    if (state === 'win') { rect(0, 0, W, H, 'rgba(11,19,38,.7)'); ctext('END OF THE LINE!', 36, AMBER, 2); ctext('TEN TRAINS, TWO HUNDRED YEARS', 56, WHITE); ctext('SCORE ' + score, 72, '#3fd6c1', 2); ctext(cfg.name, 100, WHITE, 2); ctext('MADE IN BRAIN-LAB CREATIONS', 118, '#3fd6c1'); if (frame - endAt > 120 && frame % 50 < 34) ctext('PRESS START TO RIDE AGAIN', 142, AMBER); }
  }

  const inPlay = () => state === 'play';
  function go() { if (state === 'title') newGame(); else if ((state === 'over' || state === 'win') && frame - endAt > 60) { state = 'title'; frame = 0; } }
  build(0);
  window[cfg.hook] = { get state() { return state; }, get level() { return level; }, levels: LEVELS.length, get score() { return score; }, get hearts() { return hearts; }, get fuel() { return fuel; },
    get speed() { return tr.v; }, get at() { return Math.round(tr.s) + '/' + Math.round(finishS); }, why: why, skip: n => { hearts = 3; startLevel(n); }, demo: on => { demo = on; if (!on) keys.left = keys.right = keys.b = false; } };
  return {
    id: cfg.id, name: cfg.name, tag: cfg.tag, icon: big(mk(SHAPES.steam, cfg.iconPal), 2), aLabel: 'HOP', bLabel: 'POWER', restartLabel: 'RESTART LEVEL',
    settings: [['SIZE', cfg.size, ['SMALL', 'NORMAL', 'BIG'], 1], ['SELF-PLAY', cfg.auto, ['OFF', 'ON'], 0]],
    atTitle: () => state === 'title', levelNow: () => level, over: () => state === 'over' ? { score: score } : null, won: () => state === 'win' ? { score: score } : null,
    resume(k, s) { score = s || 0; hearts = 3; startLevel(k); }, fresh() { newGame(); }, scoreNow: () => score,
    keymap: { ' ': 'a' },
    apply() { SZ = [1, 1.3, 1.6][SET[cfg.size]] || 1.3; demo = !!SET[cfg.auto]; if (!demo) keys.left = keys.right = keys.b = false; },
    start() { keys.left = keys.right = keys.b = false; state = 'title'; frame = 0; retro = !!cfg.retro; },
    stop() { keys.left = keys.right = keys.b = false; },
    update: update, draw: draw, inPlay: inPlay, go: go, auto: () => demo,
    btn(n, down) {
      if (n in keys) keys[n] = down;
      if (!down) return;
      if (!inPlay()) { if (n === 'a') go(); return; }
      if (n === 'a' || n === 'up') jump = true;
    },
    // a finger on the picture: a tap is a hop
    tap() { if (!inPlay()) go(); else jump = true; },
    restart() { hearts = 3; startLevel(level); },
    title() { quiet(); state = 'title'; frame = 0; }
  };
}

// ---------- QUINN'S TRAIN: Quinn's own ten levels, played on the train engine above, in black, white and greys ----------
// Sam asked Quinn (the lab's small local model) for her own version of the train game. She wrote it in four pieces
// (console version 7 holds all four, as she wrote them). Sam then asked for her game to be rebuilt to look better, as
// an old-style black-and-white version of SPEED TRAIN. So: the list below is still hers, word for word (her years, her
// names, her kinds of train, her greys, her underground levels). The drawing and the driving are now the engine's.
// The whole story is in claude-work\creations\quinn-train-game\LOG.md.
// ===== QUINN wrote this: the ten levels =====
const QUINN_LEVELS = [
  {
    year: 1800,
    name: 'FIRST STEAM',
    type: 'steam',
    sky: '#888888',
    ground: '#333333',
    train: '#000000',
    underground: false
  },
  {
    year: 1840,
    name: 'NEW LINES',
    type: 'steam',
    sky: '#666666',
    ground: '#444444',
    train: '#000000',
    underground: false
  },
  {
    year: 1870,
    name: 'STATION ARMS',
    type: 'steam',
    sky: '#444444',
    ground: '#333333',
    train: '#000000',
    underground: false
  },
  {
    year: 1900,
    name: 'METRO',
    type: 'electric',
    sky: '#888888',
    ground: '#000000',
    train: '#FFFFFF',
    underground: true
  },
  {
    year: 1920,
    name: 'DIESEL CARGO',
    type: 'diesel',
    sky: '#666666',
    ground: '#333333',
    train: '#000000',
    underground: false
  },
  {
    year: 1950,
    name: 'RAILWAYS',
    type: 'steam',
    sky: '#444444',
    ground: '#333333',
    train: '#000000',
    underground: false
  },
  {
    year: 1980,
    name: 'SUBWAY',
    type: 'electric',
    sky: '#222222',
    ground: '#000000',
    train: '#FFFFFF',
    underground: true
  },
  {
    year: 2000,
    name: 'CARGO TRAFFIC',
    type: 'diesel',
    sky: '#666666',
    ground: '#333333',
    train: '#000000',
    underground: false
  },
  {
    year: 2020,
    name: 'HIGH FREQUENCY',
    type: 'electric',
    sky: '#222222',
    ground: '#000000',
    train: '#FFFFFF',
    underground: true
  },
  {
    year: 2050,
    name: 'MIXED MODELS',
    type: 'steam',
    sky: '#444444',
    ground: '#333333',
    train: '#000000',
    underground: false
  }
];
// ===== from here on: Claude Code. Her levels, turned into what the engine needs. =====
function quinnLevels(own) {
  const shade = (hex, to, k) => '#' + [1, 3, 5].map(i => Math.round(parseInt(hex.substr(i, 2), 16) * (1 - k) + to * k).toString(16).padStart(2, '0')).join('');
  return QUINN_LEVELS.map((q, i) => {
    const sky = q.sky.toLowerCase(), ground = q.ground.toLowerCase(), train = q.train.toLowerCase(), dark = train === '#000000';
    const eng = q.type === 'steam' ? (i === 0 ? 'early' : i % 2 ? 'steam' : 'stream') : q.type === 'electric' ? (q.underground ? 'metro' : 'tram') : 'diesel';
    const level = { year: String(q.year), name: q.name, kind: q.type, eng: eng, wag: q.type === 'diesel' ? 'cargo' : 'coach', map: own[i % own.length].map,
      pal: { A: train, T: '#8a8a8a', W: dark ? '#f0f0f0' : '#202020', K: q.underground ? '#c8c8c8' : '#101010' } };
    if (q.underground) return Object.assign(level, { style: 'tunnel', sky: ['#0c0c0c', '#242424'], far: '#3c3c3c', far2: '#060606', light: '#f0f0f0', ground: '#060606', top: '#3c3c3c', rail: '#c8c8c8', tie: '#6a6a6a' });
    return Object.assign(level, { style: q.type === 'steam' ? 'hills' : q.type === 'diesel' ? 'yard' : 'city',
      sky: [sky, shade(sky, 255, .45)], far: shade(sky, 0, .22), far2: shade(sky, 0, .42), ground: ground, top: shade(ground, 255, .3), rail: '#101010', tie: '#5a5a5a' });
  });
}
// ---------- QUINN'S PADDLE (Sam's name for it): Quinn's bat-and-wall game, in her black, white and greys, with the old-handheld sound ----------
// Sam's idea (12 October 2026): a bat-and-ball game against a wall. Each level the wall is on another side, later
// there are two walls, and the player can bump the bat forward to SMASH. Quinn (the lab's small local model) wrote the
// six pieces between the QUINN marks, each from a short, exact description. Claude Code wrote the rest: it starts the
// levels, turns the field so the wall is on the right side, calls her pieces sixty times a second, listens to the
// buttons and draws the words. The whole story is in claude-work\creations\quinn-wall-smash\LOG.md.
function QuinnPaddle() {
  // ===== QUINN wrote this: the eight levels =====
  const LEVELS = [
    { side: 'top', walls: 1, wallWidth: 70, wallSpeed: 0.4, ballSpeed: 1.6, hits: 5 },
    { side: 'right', walls: 1, wallWidth: 65, wallSpeed: 0.5, ballSpeed: 1.7, hits: 6 },
    { side: 'bottom', walls: 1, wallWidth: 60, wallSpeed: 0.6, ballSpeed: 1.8, hits: 7 },
    { side: 'left', walls: 1, wallWidth: 55, wallSpeed: 0.7, ballSpeed: 1.9, hits: 8 },
    { side: 'top', walls: 2, wallWidth: 70, wallSpeed: 0.4, ballSpeed: 2.0, hits: 5 },
    { side: 'left', walls: 2, wallWidth: 65, wallSpeed: 0.5, ballSpeed: 2.1, hits: 6 },
    { side: 'bottom', walls: 2, wallWidth: 60, wallSpeed: 0.6, ballSpeed: 2.2, hits: 7 },
    { side: 'right', walls: 2, wallWidth: 55, wallSpeed: 0.7, ballSpeed: 2.3, hits: 8 }
  ];
  // ===== QUINN wrote this: how the ball moves and bounces off the sides =====
  function moveBall(ball, size) {
    // Update ball position based on velocity
    ball.x += ball.vx;
    ball.y += ball.vy;
  
    // Check and adjust x position
    if (ball.x < ball.r) {
      ball.x = ball.r;
      ball.vx = Math.abs(ball.vx); // Ensure vx is positive
    } else if (ball.x > size - ball.r) {
      ball.x = size - ball.r;
      ball.vx = -Math.abs(ball.vx); // Ensure vx is negative
    }
  
    // Check and adjust y position
    if (ball.y < ball.r) {
      ball.y = ball.r;
      ball.vy = Math.abs(ball.vy); // Ensure vy is positive
    } else if (ball.y > size + ball.r) {
      return 'out'; // Ball has left the field
    }
  
    // If ball hasn't left the field, return an empty string
    return '';
  }
  // ===== QUINN wrote this: how a wall slides to and fro =====
  function moveWall(wall, size) {
      // Move the wall by its speed in its direction
      wall.x += wall.dir * wall.speed;
      
      // Check if the wall has moved off the left side of the field
      if (wall.x < 0) {
          wall.x = 0;
          wall.dir = 1; // Reverse direction
      }
      
      // Check if the wall has moved off the right side of the field
      if (wall.x + wall.w > size) {
          wall.x = size - wall.w;
          wall.dir = -1; // Reverse direction
      }
  }
  // ===== QUINN wrote this: the ball against the bat, and the smash =====
  function hitPaddle(ball, paddle) {
    if (
      ball.vy > 0 && // The ball is moving down
      ball.x + ball.r > paddle.x && // The ball is to the right of the paddle's left edge
      ball.x - ball.r < paddle.x + paddle.w && // The ball is to the left of the paddle's right edge
      ball.y + ball.r > paddle.y && // The ball is above the paddle's top edge
      ball.y - ball.r < paddle.y + paddle.h // The ball is below the paddle's bottom edge
    ) {
      // Hit detected, apply effects
      ball.vy = -Math.abs(ball.vy); // Reverse the ball's vertical direction
      ball.y = paddle.y - ball.r; // Reset the ball's y position to the top of the paddle
      ball.vx += (ball.x - (paddle.x + paddle.w / 2)) * 0.06; // Adjust the ball's horizontal velocity based on its position relative to the paddle
      if (paddle.bump > 0) {
        // If the paddle is being pushed forward, increase the ball's velocity and set smash
        ball.vx *= 1.5;
        ball.vy *= 1.5;
        ball.smash = true;
      }
      return true;
    }
    return false;
  }
  // ===== QUINN wrote this: the ball against the wall, and the points =====
  function hitWall(ball, wall) {
    // Check if the ball hits the wall
    if (ball.vy < 0 && ball.y - ball.r < wall.y + wall.h && ball.x > wall.x && ball.x < wall.x + wall.w) {
      // Set the ball's vertical velocity to its absolute value
      ball.vy = Math.abs(ball.vy);
      // Set the ball's y position to the top of the wall + the ball's radius
      ball.y = wall.y + wall.h + ball.r;
      // Check if the ball should be "smashed"
      if (ball.smash) {
        // Set ball.smash to false
        ball.smash = false;
        // Multiply ball.vx and ball.vy by 0.67
        ball.vx *= 0.67;
        ball.vy *= 0.67;
        // Return 3 points
        return 3;
      } else {
        // Return 1 point
        return 1;
      }
    }
    // If the ball does not hit the wall, return 0 points
    return 0;
  }
  // ===== QUINN wrote this: drawing a brick wall =====
  function drawWall(ctx, x, y, w, h, color) {
      // Fill the rectangle with the specified color
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
  
      // Draw the dark horizontal line in the middle of the height
      ctx.strokeStyle = '#000000';
      ctx.beginPath();
      ctx.moveTo(x, y + h / 2);
      ctx.lineTo(x + w, y + h / 2);
      ctx.stroke();
  
      // Draw the vertical lines in the top and bottom halves
      for (let i = x + 4; i < x + w; i += 8) {
          ctx.beginPath();
          ctx.moveTo(i, y);
          ctx.lineTo(i, y + h);
          ctx.stroke();
      }
  }
  // ===== QUINN wrote this: chipping the wall away to half, and the smash that then breaks it =====
  function chipWall(wall, points, hits) {
      // If the wall is already broken, return 'gone'
      if (wall.broken) {
          return 'gone';
      }
  
      // If the wall is more than half full, chip it
      if (wall.w > wall.full / 2) {
          // Calculate the piece to take off
          const pieceToTakeOff = wall.full / 2 / hits;
  
          // Subtract the piece from the wall's width
          wall.w -= pieceToTakeOff;
  
          // Add half of the piece to the wall's left end
          wall.x += pieceToTakeOff / 2;
  
          // If the wall's width is now less than half full, set it to half full
          if (wall.w < wall.full / 2) {
              wall.w = wall.full / 2;
          }
  
          // Return 'chipped'
          return 'chipped';
      }
  
      // If half of the wall is left
      if (points === 3) {
          // Set the wall as broken
          wall.broken = true;
          // Return 'smashed'
          return 'smashed';
      }
  
      // Return 'half'
      return 'half';
  }
  // ===== QUINN wrote this: the computer player, so that she can play her own game (Settings, QUINN PLAYS) =====
  function playBat(ball, bat) {
      const middleOfBat = bat.x + bat.w / 2;
  
      let move = 0;
      if (ball.x < middleOfBat - 4) {
          move = -1;
      } else if (ball.x > middleOfBat + 4) {
          move = 1;
      }
  
      const smash = (ball.vy > 0) && (ball.y > bat.y - 12) && (ball.y < bat.y) && (move === 0);
  
      return { move, smash };
  }
  // ===== from here on: Claude Code =====
  // Her pieces all think the wall is at the top and the bat at the bottom of a square field. For a wall on another
  // side the whole field is simply drawn turned, and the D-pad is turned with it.
  const S = 160, OX = 27, OY = 24, TURN = { top: 0, right: 1, bottom: 2, left: 3 };
  let state = 'title', frame = 0, level = 0, score = 0, best = 0, lives = 3, hits = 0, ball = null, bat = null, walls = [], banner = 0, flash = 0, wait = 0, endAt = 0, oops = '', demo = false;
  const keys = { left: false, right: false, up: false, down: false };
  const beep = (f, d, v, to) => { if (AC) tone('square', f, AC.currentTime, d, v, to); };
  const turnOf = () => TURN[LEVELS[level].side] || 0;
  function serve() { const sp = LEVELS[level].ballSpeed; ball = { x: S / 2, y: S * .55, vx: (Math.random() < .5 ? -1 : 1) * sp * .6, vy: -sp * .8, r: 3, smash: false }; wait = 50; }
  function startLevel(k) {
    level = k; hits = 0; const L = LEVELS[k];
    bat = { x: S / 2 - 16, y: S - 10, w: 32, h: 5, bump: 0, rest: 0 }; walls = [];
    for (let i = 0; i < L.walls; i++) walls.push({ x: i ? S - L.wallWidth : 0, w: L.wallWidth, dir: i ? -1 : 1, speed: L.wallSpeed, y: 0, h: 7, full: L.wallWidth, broken: false });
    serve(); banner = 130; state = 'play'; play(1200 + k * 9, 124 + k * 4, k % 2 === 1);
  }
  function newGame() { score = 0; lives = 3; startLevel(0); }
  function update() {
    frame++;
    if (demo && state === 'title' && frame > 150) newGame();
    if (demo && (state === 'over' || state === 'win') && frame - endAt > 240) { state = 'title'; frame = 0; }
    if (state === 'clear') { if (--banner <= 0) { if (level + 1 < LEVELS.length) startLevel(level + 1); else { state = 'win'; endAt = frame; best = Math.max(best, score); play(7, 124, false); } } return; }
    if (state !== 'play') return;
    if (banner > 0) banner--; if (flash > 0) flash--;
    const L = LEVELS[level], x = (keys.right ? 1 : 0) - (keys.left ? 1 : 0), y = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
    let along = [x, y, -x, -y][turnOf()];
    if (demo && ball) { try { const q = playBat(ball, bat); along = q.move; if (q.smash) smash(); } catch (e) { oops = String(e); } }   // QUINN PLAYS: her own player decides where the bat goes and when to smash
    bat.x = Math.max(0, Math.min(S - bat.w, bat.x + along * 3.2));
    if (bat.bump > 0) bat.bump--; if (bat.rest > 0) bat.rest--;
    bat.y = S - 10 - (bat.bump > 0 ? 5 : 0);                       // the bump: the bat jumps forward for a moment
    try {
      walls.forEach(w => { if (!w.broken && w.w > w.full / 2 + .01) moveWall(w, S); });   // a wall chipped down to half stands still and waits for the smash
      if (wait > 0) { wait--; return; }
      if (hitPaddle(ball, bat)) { if (ball.smash) { beep(180, .12, .12, 900); flash = 4; } else beep(330, .05, .08); }
      // Fairness, added by Claude after testing: a smashed ball breaks a half wall when it lands anywhere the whole wall
      // used to stand. Without this even Quinn's own player could hardly ever finish a level.
      let got = 0, struck = null;
      walls.forEach(w => {
        if (got || w.broken) return;
        const half = w.w <= w.full / 2 + .01, aim = half && ball.smash ? { x: w.x - w.full / 4, w: w.full, y: w.y, h: w.h } : w;
        got = hitWall(ball, aim) || 0; if (got) struck = w;
      });
      if (got) {
        const what = chipWall(struck, got, L.hits);   // every hit chips the wall, down to half; then only a smash breaks it
        score += got * 10 + (what === 'smashed' ? 100 : 0); hits++; flash = what === 'smashed' ? 16 : 6; beep(what === 'smashed' ? 110 : got > 1 ? 880 : 660, what === 'smashed' ? .3 : .07, .1, what === 'smashed' ? 40 : 0);
        if (what === 'smashed' && AC) hiss(AC.currentTime, .3, .3);
        if (walls.every(w => w.broken)) { state = 'clear'; banner = 110; score += 100 + lives * 20; if (lives < 3) lives++; quiet(); [72, 76, 79, 84].forEach((n, i) => { if (AC) tone('square', hz(n), AC.currentTime + i * .08, .12, .09); }); return; }
      }
      // two safety rails of Claude's, so a ball can never get stuck or shoot through things: not too fast, never flat
      ball.vx = Math.max(-4.5, Math.min(4.5, ball.vx)); ball.vy = Math.max(-5.5, Math.min(5.5, ball.vy));
      if (Math.abs(ball.vy) < .9) ball.vy = ball.vy < 0 ? -.9 : .9;
      const out = moveBall(ball, S);
      if (ball.smash && ball.vy > 0) { ball.smash = false; ball.vx *= .67; ball.vy *= .67; }   // a smash that missed the wall calms down on the way back
      if (out === 'out') {
        lives--; beep(200, .3, .12, 60);
        if (lives <= 0) { state = 'over'; endAt = frame; best = Math.max(best, score); quiet(); } else serve();
      }
    } catch (e) { oops = String(e); }
  }
  function field() {   // everything inside the square, drawn as if the wall were at the top; the caller has turned the paper
    rect(0, 0, S, S, '#1c1c1c');
    for (let i = 0; i < S; i += 8) rect(i, S - 2, 4, 1, '#5a5a5a');                                  // the open side: past this line the ball is lost
    rect(-2, -2, 2, S + 2, '#8a8a8a'); rect(S, -2, 2, S + 2, '#8a8a8a'); rect(-2, -2, S + 4, 2, '#8a8a8a');   // the three closed sides
    // a wall chipped down to half blinks: it is ready to be smashed
    try { walls.forEach(w => { if (!w.broken) drawWall(g, Math.round(w.x), w.y, w.w, w.h, flash > 0 || (w.w <= w.full / 2 + .01 && frame % 24 < 12) ? '#ffffff' : '#c8c8c8'); }); } catch (e) { oops = String(e); }
    if (bat.bump > 0) rect(bat.x, bat.y + bat.h, bat.w, 4, '#5a5a5a');
    rect(bat.x, bat.y, bat.w, bat.h, bat.rest > 0 && bat.bump <= 0 ? '#9a9a9a' : '#ffffff');
    if (ball && (wait <= 0 || frame % 8 < 5)) { if (ball.smash) rect(ball.x - ball.r - 1, ball.y - ball.r - 1, ball.r * 2 + 2, ball.r * 2 + 2, '#8a8a8a'); rect(ball.x - ball.r, ball.y - ball.r, ball.r * 2, ball.r * 2, '#ffffff'); }
  }
  function draw() {
    g.setTransform(3, 0, 0, 3, 0, 0);
    rect(0, 0, W, H, '#0a0a0a');
    if (state === 'title') {
      ctext("QUINN'S PADDLE", 24, '#ffffff', 3);
      ctext("QUINN'S OWN GAME: SHE WROTE THE PIECES", 52, '#c8c8c8'); ctext('CLAUDE JOINED THEM', 62, '#8a8a8a');
      if (frame % 50 < 34) ctext('PRESS START', 82, '#ffffff', 2);
      ctext('CHIP THE WALL DOWN TO HALF. THEN SMASH IT TO BITS.', 106, '#c8c8c8');
      ctext('D-PAD: MOVE THE BAT   A: SMASH (BUMP THE BAT FORWARD)', 118, '#c8c8c8');
      ctext('A SMASHED BALL IS FASTER AND SCORES 3 FOR 1', 130, '#8a8a8a');
      ctext('EVERY LEVEL THE WALL IS ON ANOTHER SIDE. LATER: TWO WALLS.', 142, '#8a8a8a');
      if (best) ctext('BEST ' + best, 158, '#ffffff');
    } else {
      const L = LEVELS[level];
      g.save(); g.translate(OX + S / 2, OY + S / 2); g.rotate(turnOf() * Math.PI / 2); g.translate(-S / 2, -S / 2); field(); g.restore();
      g.setTransform(3, 0, 0, 3, 0, 0);
      text('LEVEL ' + (level + 1) + '/' + LEVELS.length, 4, 4, '#c8c8c8'); const ready = walls.some(w => !w.broken && w.w <= w.full / 2 + .01); text(ready ? (frame % 30 < 20 ? 'NOW SMASH IT!' : '') : 'CHIP THE WALL', 58, 4, '#ffffff');
      for (let i = 0; i < 3; i++) rect(118 + i * 8, 4, 6, 5, i < lives ? '#ffffff' : '#3a3a3a');
      text(String(score).padStart(5, '0'), W - 24, 4, '#ffffff');
      text('WALL: ' + L.side + (L.walls > 1 ? ' X2' : ''), 4, 13, '#8a8a8a'); if (bat.rest <= 0) text('A: SMASH', W - 36, 13, '#8a8a8a'); if (demo && frame % 60 < 40) text('QUINN IS PLAYING', 76, 13, '#ffffff');
      if (state === 'play' && banner > 0) { rect(0, 70, W, 44, 'rgba(0,0,0,.8)'); ctext('LEVEL ' + (level + 1), 76, '#ffffff', 2); ctext('THE WALL IS ' + (L.walls > 1 ? 'TWO WALLS ' : '') + 'ON THE ' + L.side, 94, '#c8c8c8'); ctext('CHIP IT DOWN TO HALF, THEN SMASH IT WITH A', 104, '#8a8a8a'); }
      if (state === 'clear') { rect(0, 76, W, 34, 'rgba(0,0,0,.8)'); ctext('WALL SMASHED!', 82, '#ffffff', 2); ctext('SCORE ' + score, 98, '#c8c8c8'); }
      if (state === 'over') { rect(0, 70, W, 44, 'rgba(0,0,0,.8)'); ctext('GAME OVER', 76, '#ffffff', 3); ctext('SCORE ' + score, 98, '#c8c8c8'); }
      if (state === 'win') { rect(0, 60, W, 64, 'rgba(0,0,0,.85)'); ctext('ALL EIGHT WALLS SMASHED!', 68, '#ffffff', 1); ctext('SCORE ' + score, 82, '#ffffff', 2); ctext("QUINN'S PADDLE - A GAME BY QUINN", 102, '#c8c8c8'); if (frame % 50 < 34) ctext('PRESS START', 112, '#8a8a8a'); }
    }
    if (oops) text(oops.slice(0, 52), 2, H - 8, '#ffffff');   // if one of her pieces fails while running, say so on the screen
  }
  const inPlay = () => state === 'play' || state === 'clear';
  function go() { if (state === 'title') newGame(); else if ((state === 'over' || state === 'win') && frame - endAt > 60) { state = 'title'; frame = 0; } }
  function smash() { if (state === 'play' && bat.rest <= 0) { bat.bump = 10; bat.rest = 28; } }
  // a finger on the picture: where it is along the bat's side, that is where the bat goes; a tap is also a smash
  function finger(fx, fy) { const px = fx * W - (OX + S / 2), py = fy * H - (OY + S / 2), along = [px, py, -px, -py][turnOf()]; bat.x = Math.max(0, Math.min(S - bat.w, along + S / 2 - bat.w / 2)); }
  let icon = document.createElement('canvas'); icon.width = 30; icon.height = 22;
  try { const c = icon.getContext('2d'); drawWall(c, 3, 1, 24, 7, '#c8c8c8'); c.fillStyle = '#ffffff'; c.fillRect(13, 11, 4, 4); c.fillRect(7, 18, 16, 3); } catch (e) { oops = String(e); }
  window.QUINNPADDLE = { get state() { return state; }, get level() { return level; }, get score() { return score; }, get lives() { return lives; }, get hits() { return hits; }, get ball() { return ball; }, get bat() { return bat; }, get walls() { return walls; },
    get oops() { return oops; }, LEVELS: LEVELS, moveBall: moveBall, moveWall: moveWall, hitPaddle: hitPaddle, hitWall: hitWall, drawWall: drawWall, skip: k => { lives = 3; startLevel(k); }, playBat: playBat, chipWall: chipWall, demo: on => { demo = on; } };
  return {
    id: 'quinnpaddle', name: "QUINN'S PADDLE", tag: 'HER OWN GAME: BAT, BALL, WALL', icon: icon, aLabel: 'SMASH', bLabel: 'SMASH', restartLabel: 'RESTART LEVEL',
    settings: [['QUINN PLAYS', 'qp_auto', ['OFF', 'ON'], 0]],
    apply() { demo = !!SET.qp_auto; }, auto: () => demo,
    atTitle: () => state === 'title', levelNow: () => level, over: () => state === 'over' ? { score: score } : null, won: () => state === 'win' ? { score: score } : null,
    resume(k, s) { score = s || 0; lives = 3; startLevel(k); }, fresh() { newGame(); }, scoreNow: () => score,
    start() { for (const k in keys) keys[k] = false; state = 'title'; frame = 0; oops = ''; retro = true; },
    stop() { for (const k in keys) keys[k] = false; },
    update: update, draw: draw, inPlay: inPlay, go: go,
    btn(n, down) {
      if (n in keys) keys[n] = down;
      if (!down) return;
      if (state !== 'play' && state !== 'clear') { if (n === 'a') go(); return; }
      if (n === 'a' || n === 'b') smash();
    },
    tap(fx, fy) { if (state === 'play') { finger(fx, fy); smash(); } else if (state !== 'clear') go(); },
    drag(fx, fy) { if (state === 'play') finger(fx, fy); },
    restart() { lives = 3; startLevel(level); },
    title() { quiet(); state = 'title'; frame = 0; }
  };
}
// ---------- CRYSTAL NINJA: four worlds, five stages and a lord each, to take back the ancient crystals ----------
// Sam's idea of 16 October 2026. The old king is dying; four invading warlords stole the crystals that keep him alive.
// Princess Mira sends the ninja (Shadow) after them: the Ash Khan (steppe riders), the Jade General (an imperial army),
// the Iron Capitan (conquistadors) and the Red Moon Lord (a warlord's castle). Each world has five stages; in each
// stage the captains must be killed before the gate opens; the sixth stage is the lord. Soldiers may be passed unseen;
// the people who live there are left alone. In a lord fight you start with full health, 20 stars and 5 smoke bombs,
// and things to pick up keep falling in. First a 2D version for the deck; later perhaps a top-down one.
//   D-pad: run; DOWN sneaks (and drops through a plank with A); UP throws the hook rope (or pulls a thing out of reach).
//   A: jump (and lets go of the rope).   B: the weapon in hand.   DOWN + B (or Q, or a tap on the weapon box): next weapon.
//   SWORD kills, NUNCHUCKS knock out, STARS fly, SMOKE hides you and stuns. Three white flowers make a smoke bomb.
// Every stage was checked by a search that tries the real moves (window.NINJA.reach): see claude-work\creations\crystal-ninja.
function CrystalNinja() {
  const T = 8, MH = 42, G = .25, MAXF = 4.6, RUN = 1.3, RUN2 = 1.85, SNEAK = .55, JV = 3.65, JV2 = 4.45, HOOKR = 84;
  const WORLDS = [
    { name: 'THE ASH STEPPE', lord: 'THE ASH KHAN', army: 'THE STEPPE RIDERS', gem: '#ff6a3c', seed: 11, bpm: 132, back: 'steppe',
      sky: ['#2a1e3a', '#a0485a', '#f0a060'], far: '#4a2e44', mid: '#6a3c3e', ground: '#5a4430', top: '#8a9a40', speck: '#463424',
      wall: '#e8e0d0', line: '#a89880', roof: '#c04a30', plank: '#7a4a28', plankTop: '#b07838', spike: '#c8b090', gate: '#c04a30',
      foes: ['sabre', 'sabre', 'archer', 'lancer'] },
    { name: 'THE JADE WALL', lord: 'THE JADE GENERAL', army: 'THE IMPERIAL ARMY', gem: '#3cd878', seed: 23, bpm: 126, back: 'wall',
      sky: ['#1e2e3e', '#4a7a8a', '#c8d8c0'], far: '#3a5a5a', mid: '#4a6a62', ground: '#6a6a6e', top: '#8a8a8e', speck: '#505056',
      wall: '#b03028', line: '#701c18', roof: '#2a4a3e', plank: '#5a3a24', plankTop: '#a06a3a', spike: '#c8c8d0', gate: '#b03028',
      foes: ['halberd', 'halberd', 'crossbow', 'shield'] },
    { name: 'THE TEMPLE JUNGLE', lord: 'THE IRON CAPITAN', army: 'THE CONQUISTADORS', gem: '#3cb8ff', seed: 37, bpm: 120, back: 'jungle',
      sky: ['#10261c', '#2a5a3a', '#9ac080'], far: '#1e3e2a', mid: '#2a4e30', ground: '#5a5a48', top: '#4a8a34', speck: '#44443a',
      wall: '#8a8a70', line: '#5e5e4a', roof: '#4a7a30', plank: '#6a4a2a', plankTop: '#9a7040', spike: '#b0a890', gate: '#8a7a50',
      foes: ['buckler', 'buckler', 'pike', 'musket'] },
    { name: 'THE RED MOON CASTLE', lord: 'THE RED MOON LORD', army: "THE WARLORD'S ARMY", gem: '#f0e8ff', seed: 53, bpm: 138, back: 'castle',
      sky: ['#080a1a', '#1e1a3a', '#4a2a4a'], far: '#14142a', mid: '#20203a', ground: '#4a4a52', top: '#6a6a72', speck: '#3a3a42',
      wall: '#e8e4dc', line: '#2a2228', roof: '#2a3040', plank: '#4a3020', plankTop: '#7a5030', spike: '#b8b8c8', gate: '#c02828',
      foes: ['samurai', 'ashigaru', 'ashigaru', 'yumi'] }
  ];
  // the soldiers: how each kind fights (reach in dots; wind = the warning before a blow, in ticks) and how it looks
  const FOE = {
    sabre:    { hp: 3, spd: .85, reach: 13, wind: 18, cool: 46, dmg: 1, hat: 'fur', coats: ['#3a5a8a', '#7a3a34', '#4a6a3a'], wpn: 'sabre', long: true },
    archer:   { hp: 2, spd: .6, ranged: 'arrow', wind: 30, cool: 96, dmg: 1, hat: 'fur', coats: ['#8a6a2a', '#5a4a6a', '#3a4a3a'], wpn: 'bow', long: true },
    lancer:   { hp: 4, spd: .6, reach: 21, wind: 26, cool: 54, dmg: 1, hat: 'spike', coats: ['#6a2a2a', '#2a3a5a'], wpn: 'lance', long: true },
    halberd:  { hp: 4, spd: .6, reach: 22, wind: 26, cool: 56, dmg: 1, hat: 'round', coats: ['#8a2a2a', '#2a4a6a', '#5a5a2a'], wpn: 'halberd', scales: true },
    crossbow: { hp: 2, spd: .55, ranged: 'bolt', wind: 36, cool: 110, dmg: 1, hat: 'cap', coats: ['#2a5a5a', '#6a4a2a'], wpn: 'xbow' },
    shield:   { hp: 4, spd: .7, reach: 13, wind: 20, cool: 50, dmg: 1, hat: 'round', coats: ['#3a3a5a', '#7a2a2a'], wpn: 'dao', shield: 'big', scales: true },
    buckler:  { hp: 4, spd: .8, reach: 14, wind: 18, cool: 44, dmg: 1, hat: 'morion', coats: ['#802040', '#204080', '#605020'], wpn: 'rapier', shield: 'small', plate: true, beard: true },
    pike:     { hp: 4, spd: .5, reach: 25, wind: 30, cool: 60, dmg: 1, hat: 'morion', coats: ['#a02828', '#c8a020', '#3a5a2a'], wpn: 'pike', plate: true, beard: true },
    musket:   { hp: 3, spd: .5, ranged: 'ball', wind: 50, cool: 170, dmg: 2, hat: 'brim', coats: ['#5a3a2a', '#2a2a4a'], wpn: 'musket', beard: true },
    ashigaru: { hp: 3, spd: .7, reach: 20, wind: 24, cool: 50, dmg: 1, hat: 'jingasa', coats: ['#3a3a4a', '#5a2a2a', '#2a3a2a'], wpn: 'yari' },
    yumi:     { hp: 2, spd: .55, ranged: 'longarrow', wind: 34, cool: 100, dmg: 1, hat: 'jingasa', coats: ['#2a4a3a', '#4a3a2a'], wpn: 'bow' },
    samurai:  { hp: 5, spd: .95, reach: 15, wind: 16, cool: 40, dmg: 1, hat: 'kabuto', coats: ['#8a1a1a', '#1a1a3a', '#2a2a2a'], wpn: 'katana', parry: true }
  };
  // a captain is a soldier with his own look and his own trick; he must be killed (he cannot be knocked out)
  const CAPS = [
    { name: 'RIDER CAPTAIN', base: 'sabre', coat: '#20202a', trim: '#e8b830', plume: '#d82800', act: 'charge' },
    { name: 'BANNER CAPTAIN', base: 'halberd', coat: '#c89a30', trim: '#b02020', plume: '#d82800', act: 'spin' },
    { name: 'CAPTAIN', base: 'buckler', coat: '#1a1a1a', trim: '#c8c8d0', plume: '#d82800', act: 'pistol' },
    { name: 'HATAMOTO', base: 'samurai', coat: '#4a0a14', trim: '#e8b830', banner: '#f0f0f0', act: 'iai' }
  ];
  const LORDS = [
    { hat: 'fur', coat: '#1e2e6a', trim: '#e8b830', crown: true, wpn: 'sabre', moves: ['rush', 'volley', 'sweep'], more: 'rain', shot: 'arrow', long: true },
    { hat: 'round', coat: '#c89a30', trim: '#b02020', plume: '#d82800', wpn: 'halberd', moves: ['sweep', 'leap', 'volley'], more: 'bombs', shot: 'bolt', scales: true },
    { hat: 'morion', coat: '#7a7e88', trim: '#e8b830', plume: '#d82800', wpn: 'rapier', shield: 'big', plate: true, beard: true, moves: ['blast', 'sweep', 'bombs'], more: 'rush', shot: 'ball' },
    { hat: 'kabuto', coat: '#6a0a14', trim: '#e8b830', moon: true, wpn: 'katana', moves: ['teleport', 'sweep', 'rain'], more: 'volley', shot: 'longarrow' }
  ];
  const CIVS = [{ hat: 'fur', coats: ['#a07a50', '#6a8a9a', '#8a5a6a'] }, { hat: 'cap', coats: ['#4a6a9a', '#9a7a4a', '#6a8a6a'] },
    { hat: 'brim', coats: ['#c8b890', '#8a6a4a', '#b07a5a'] }, { hat: 'jingasa', coats: ['#6a7a5a', '#9a8a6a', '#7a6a8a'] }];
  const SKINS = ['#e8b890', '#d09a70', '#b07a50', '#f0c8a0'];
  const WEAPONS = ['SWORD', 'NUNCHUCKS', 'STARS', 'SMOKE'];
  const STORY = [
    ['THE STEPPE CRYSTAL IS HOME. THE KING OPENS HIS EYES.', 'NEXT: THE JADE WALL, WHERE THE JADE GENERAL WAITS.'],
    ['TWO CRYSTALS HOME. THE KING CAN SPEAK AGAIN.', 'NEXT: THE TEMPLE JUNGLE AND THE IRON CAPITAN.'],
    ['THREE CRYSTALS. THE KING STANDS UP.', 'LAST: THE RED MOON CASTLE. ITS LORD HOLDS THE FOURTH.']
  ];

  // SIZE (Settings): the world is drawn at VS screen dots per dot (3 small, 4 normal, 5 big), so VW x VH dots of it are in view
  let VS = 4, VW = W * 3 / 4, VH = H * 3 / 4;
  let state = 'title', frame = 0, lvl = 0, world = 0, stage = 0, score = 0, lives = 3, hpMax = 6, endAt = 0, banner = 0, msgT = 0, msgS = '';
  let MW = 40, grid = new Uint8Array(40 * MH), rings = [], items = [], foes = [], civs = [], jars = [], cps = [], shots = [], smokes = [], bits = [], floats = [];
  let exit = null, boss = null, P = null, cam = { x: 0, y: 0 }, cp = null, spawn = { x: 24, y: 100 }, clearInfo = null, simulating = false;
  // the secret scrolls (three per stage) and the easter eggs (one per stage); self-play (Settings) and its planner
  const EGGS = ['cat', 'deck', 'train', 'para', 'paddle'];
  const EGG_SAY = { cat: 'A SLEEPING CAT', deck: 'A TINY BRAIN-DECK!', train: 'A TOY SPEED TRAIN', para: 'A PARA-FRUIT PILOT', paddle: "QUINN'S PADDLE" };
  let scrollsHere = 0, scrollsGot = 0, eggGot = false, scrollsAll = 0, eggsAll = 0, demo = false, bot = null;
  let seen = 0, harmed = 0, kills = 0, silent = 0, weapon = 0, stars = 8, smoke = 1, flowers = 0, crystals = 0, diff = 1, shake = 0, bestScore = 0;
  const keys = { up: false, down: false, left: false, right: false, a: false, b: false }, hit = { up: false, down: false, a: false, b: false };

  // ---------- sounds ----------
  const sfx = {
    jump: t => tone('square', 300, t, .08, .05, 560), jump2: t => { tone('square', 420, t, .08, .05, 820); hiss(t, .05, .05, true); }, land: t => tone('triangle', 110, t, .06, .14), grab: t => tone('triangle', 520, t, .04, .08),
    climb: t => tone('triangle', 380, t, .08, .08, 620), hook: t => { tone('square', 900, t, .05, .05, 1400); hiss(t, .05, .06, true); },
    swing: t => hiss(t, .07, .12, true), nun: t => tone('square', 700, t, .04, .04, 500), throw: t => tone('square', 1200, t, .05, .04, 2000),
    hit: t => { tone('square', 180, t, .08, .12, 90); hiss(t, .06, .14); }, clang: t => tone('square', 1600, t, .06, .06, 1300),
    kill: t => tone('sawtooth', 220, t, .2, .1, 60), silent: t => tone('triangle', 660, t, .14, .09, 330),
    coin: t => [88, 93].forEach((n, i) => tone('square', hz(n), t + i * .05, .06, .05)), item: t => [76, 81, 88].forEach((n, i) => tone('square', hz(n), t + i * .05, .07, .06)),
    hurt: t => tone('sawtooth', 260, t, .25, .14, 70), alert: t => [84, 84].forEach((n, i) => tone('square', hz(n), t + i * .08, .05, .06)),
    smoke: t => hiss(t, .5, .2), bad: t => tone('square', 160, t, .3, .08), shot: t => { hiss(t, .18, .25); tone('square', 120, t, .12, .1, 50); },
    boom: t => { hiss(t, .35, .3); tone('sawtooth', 90, t, .3, .14, 40); }, die: t => [64, 60, 55, 48].forEach((n, i) => tone('square', hz(n), t + i * .14, .14, .07)),
    clear: t => [72, 76, 79, 84].forEach((n, i) => tone('square', hz(n), t + i * .1, .14, .07)),
    crystal: t => [72, 79, 84, 88, 91, 96].forEach((n, i) => { tone('triangle', hz(n), t + i * .08, .5, .09); tone('square', hz(n), t + i * .08, .08, .04); })
  };
  function ev(name) { if (!simulating && AC && sfx[name]) sfx[name](AC.currentTime); }

  // ---------- the map: tiles of 8 dots. 0 air, 1 ground, 2 plank (stand on it from above), 3 spikes, 4 building ----------
  const tile = (c, r) => c < 0 || c >= MW ? 1 : r < 0 || r >= MH ? 0 : grid[r * MW + c];
  const solid = (c, r) => { const t = tile(c, r); return t === 1 || t === 4; };
  function boxSolid(x, y, w, h) {
    for (let r = Math.floor(y / T); r <= Math.floor((y + h - .01) / T); r++)
      for (let c = Math.floor(x / T); c <= Math.floor((x + w - .01) / T); c++) if (solid(c, r)) return true;
    return false;
  }
  function moveX(o, dx) {
    o.x += dx;
    const r0 = Math.floor(o.y / T), r1 = Math.floor((o.y + o.h - .01) / T);
    if (dx > 0) { const c = Math.floor((o.x + o.w - .01) / T); for (let r = r0; r <= r1; r++) if (solid(c, r)) { o.x = c * T - o.w; return true; } }
    else if (dx < 0) { const c = Math.floor(o.x / T); for (let r = r0; r <= r1; r++) if (solid(c, r)) { o.x = (c + 1) * T; return true; } }
    return false;
  }
  function moveY(o, dy, drop) {
    const bottom = o.y + o.h; o.y += dy;
    const c0 = Math.floor(o.x / T), c1 = Math.floor((o.x + o.w - .01) / T);
    if (dy > 0) { const r = Math.floor((o.y + o.h - .01) / T); for (let c = c0; c <= c1; c++) { const t = tile(c, r); if (t === 1 || t === 4 || (t === 2 && !drop && bottom <= r * T + .01)) { o.y = r * T - o.h; return 1; } } }
    else if (dy < 0) { const r = Math.floor(o.y / T); for (let c = c0; c <= c1; c++) if (solid(c, r)) { o.y = (r + 1) * T; return -1; } }
    return 0;
  }
  const onPlank = p => { const r = Math.floor((p.y + p.h + .5) / T); return tile(Math.floor(p.x / T), r) === 2 || tile(Math.floor((p.x + p.w - .01) / T), r) === 2; };
  const spiked = p => { const r = Math.floor((p.y + p.h - 2) / T); return tile(Math.floor((p.x + 1) / T), r) === 3 || tile(Math.floor((p.x + p.w - 1) / T), r) === 3; };
  function clearLine(x0, y0, x1, y1) {
    const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 4);
    for (let i = 1; i < n; i++) if (solid(Math.floor((x0 + (x1 - x0) * i / n) / T), Math.floor((y0 + (y1 - y0) * i / n) / T))) return false;
    return true;
  }
  const ov = (ax, ay, aw, ah, bx, by, bw, bh) => ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;

  // ---------- the ninja's moves (the same code runs in the reach check) ----------
  function newPlayer(x, y) { return { x: x, y: y, w: 6, h: 11, vx: 0, vy: 0, on: false, face: 1, st: 'free', crouch: false, coy: 0, buf: 0, nograb: 0, drop: 0, ct: 0, lx: 0, ly: 0,
    ring: null, L: 0, a: 0, av: 0, fast: 0, high: 0, inv: 0, atk: 0, atkW: '', atkId: 0, cool: 0, jumping: false, dj: true, spin: 0, slide: 0, sdir: 1, kick: 0, bash: false, aim: null, hp: hpMax, throwT: 0, downT: 0, run: 0, safe: { x: x, y: y } }; }
  function nearRing(p) {
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    let best = null, bd = HOOKR;
    rings.forEach(rg => { const dx = rg.x - cx, dy = rg.y - cy, d = Math.hypot(dx, dy); if (dy < -6 && d < bd && dx * p.face > -14 && clearLine(cx, cy, rg.x, rg.y)) { best = rg; bd = d; } });
    return best;
  }
  function physics(p, k) {   // one tick; k holds the buttons held (l r u d a) and just pressed (aP uP dP)
    const dir = (k.r ? 1 : 0) - (k.l ? 1 : 0);
    if (p.fast > 0) p.fast--; if (p.high > 0) p.high--; if (p.nograb > 0) p.nograb--; if (p.drop > 0) p.drop--;
    if (p.st === 'climb') {
      if (--p.ct <= 0) { p.st = 'free'; p.y = p.ly * T - p.h; p.x = p.face > 0 ? p.lx * T + 1 : p.lx * T + T - p.w - 1; p.vx = p.vy = 0; p.on = true; }
      return;
    }
    if (p.st === 'hang') {
      p.vx = p.vy = 0;
      if (k.aP && dir === -p.face) { p.st = 'free'; p.face = -p.face; p.vx = p.face * 1.7; p.vy = -3.3; p.nograb = 10; p.jumping = false; ev('jump'); }
      else if (k.uP || k.aP) { p.st = 'climb'; p.ct = 14; ev('climb'); }
      else if (k.dP) { p.st = 'free'; p.nograb = 16; }
      return;
    }
    if (p.st === 'rope') {
      const rg = p.ring;
      p.av += -(G / p.L) * Math.sin(p.a) + dir * .0009; p.av *= .997;
      let L = p.L; if (k.u) L = Math.max(12, L - 1.1); if (k.d) L = Math.min(90, L + 1.1);
      const na = p.a + p.av, nx = rg.x + L * Math.sin(na) - p.w / 2, ny = rg.y + L * Math.cos(na) - p.h / 2;
      if (!boxSolid(nx, ny, p.w, p.h)) { p.a = na; p.L = L; p.x = nx; p.y = ny; }
      else {
        const ox = rg.x + p.L * Math.sin(na) - p.w / 2, oy = rg.y + p.L * Math.cos(na) - p.h / 2;
        if (L !== p.L && !boxSolid(ox, oy, p.w, p.h)) { p.a = na; p.x = ox; p.y = oy; } else p.av *= -.3;
      }
      if (dir) p.face = dir;
      if (k.aP) { p.st = 'free'; p.vx = Math.max(-4, Math.min(4, p.L * p.av * Math.cos(p.a))); p.vy = Math.max(-5, -p.L * p.av * Math.sin(p.a) - 1.2); p.coy = 0; p.jumping = false; ev('jump'); }
      return;
    }
    if (k.uP && !p.crouch) {
      const rg = nearRing(p);
      if (rg) {
        const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
        p.st = 'rope'; p.ring = rg; p.L = Math.hypot(cx - rg.x, cy - rg.y); p.a = Math.atan2(cx - rg.x, cy - rg.y);
        p.av = (p.vx * Math.cos(p.a) - p.vy * Math.sin(p.a)) / p.L; p.on = false; p.jumping = false; p.dj = true; ev('hook');
        return;
      }
    }
    const low = k.d && p.on;
    if (p.slide > 0 && !p.on) p.slide = 0;
    if (low && !p.crouch && Math.abs(p.vx) > 1) { p.slide = 22; p.sdir = Math.sign(p.vx); p.face = p.sdir; p.atkId++; p.crouch = true; p.y += 4; p.h = 7; ev('swing'); }   // running + DOWN: a slide kick
    else if (p.slide > 0) { }
    else if (low && !p.crouch) { p.crouch = true; p.y += 4; p.h = 7; }
    else if (!low && p.crouch && !boxSolid(p.x, p.y - 4, p.w, 11)) { p.crouch = false; p.y -= 4; p.h = 11; }
    if (dir && !p.atk && !p.kick && !p.slide) p.face = dir;
    const want = p.crouch ? SNEAK : p.fast > 0 ? RUN2 : RUN;
    if (p.on) p.vx += (dir * want - p.vx) * .3;
    else if (dir && dir * p.vx < want) p.vx += dir * .16;
    else if (!dir) p.vx *= .97;
    if (p.slide > 0) { p.vx = p.sdir * (1.2 + p.slide * .07); p.slide--; }
    if (p.on) p.coy = 6; else if (p.coy > 0) p.coy--;
    if (k.aP) p.buf = 6; else if (p.buf > 0) p.buf--;
    if (p.buf > 0 && p.on && k.d && onPlank(p)) { p.buf = 0; p.drop = 10; p.on = false; }
    else if (p.buf > 0 && p.coy > 0) {
      if (p.crouch && !boxSolid(p.x, p.y - 4, p.w, 11)) { p.crouch = false; p.y -= 4; p.h = 11; }
      p.vy = -(p.high > 0 ? JV2 : JV); p.on = false; p.coy = 0; p.buf = 0; p.jumping = true; ev('jump');
    }
    else if (k.aP && !p.on && p.coy <= 0 && p.dj) { p.dj = false; p.buf = 0; p.vy = -(p.high > 0 ? JV2 : JV) * .9; p.jumping = true; p.spin = 12; ev('jump2'); }   // the double jump: once in the air
    if (p.spin > 0) p.spin--;
    if (p.jumping && !k.a && p.vy < -1.5) p.vy = -1.5;
    p.vy = Math.min(MAXF, p.vy + G);
    const wasOn = p.on;
    if (moveX(p, p.vx)) p.vx = 0;
    const r = moveY(p, p.vy, p.drop > 0);
    if (r === 1) { if (!wasOn && p.vy > 2.6) ev('land'); p.vy = 0; p.on = true; p.jumping = false; p.dj = true; }
    else { if (r === -1) p.vy = 0; p.on = false; }
    // a ledge in front of the hands: hang on it (Prince of Persia style), then UP or A climbs
    if (!p.on && p.nograb <= 0 && p.vy > -1.2 && dir === p.face && !p.crouch) {
      const fc = p.face > 0 ? Math.floor((p.x + p.w + 1.5) / T) : Math.floor((p.x - 1.5) / T), lr = Math.floor((p.y + 3) / T), cy = lr * T;
      if (solid(fc, lr) && !solid(fc, lr - 1) && !solid(fc, lr - 2) && p.y >= cy - 3 && p.y <= cy + 4) {
        const nx = p.face > 0 ? fc * T - p.w : (fc + 1) * T;
        if (!boxSolid(nx, cy, p.w, p.h)) { p.st = 'hang'; p.x = nx; p.y = cy; p.lx = fc; p.ly = lr; p.vx = p.vy = 0; p.jumping = false; p.dj = true; ev('grab'); }
      }
    }
  }

  // ---------- building a stage from its seed ----------
  const item = (x, y, k, fixed) => ({ x: x, y: y, k: k, fixed: !!fixed, vx: 0, vy: 0, pull: false, got: false, t: 0 });
  function pickW(ws, r) { let s = 0; for (const k in ws) s += ws[k]; let v = r() * s; for (const k in ws) { v -= ws[k]; if (v <= 0) return k; } return 'flat'; }
  function newFoe(x, y, type, cap, r) {
    const d = FOE[type];
    const hp = Math.max(1, d.hp + (r() < .3 ? 1 : 0) + (cap ? 6 : 0) + (diff - 1));
    return { type: type, d: d, cap: cap || null, x: x, y: y, face: r() < .5 ? -1 : 1, hp: hp, max: hp, spd: d.spd * (.85 + r() * .3) * (cap ? 1.2 : 1), wind: d.wind + Math.floor(r() * 9) - 4,
      coat: cap ? cap.coat : d.coats[Math.floor(r() * d.coats.length)], skin: SKINS[Math.floor(r() * SKINS.length)], tall: r() < .3, guard: r() < .4, turnT: 60 + r() * 120,
      st: 'live', alert: false, aw: 0, lost: 0, ph: '', sp: '', t: 0, cool: 0, stun: 0, smoked: false, hurt: 0, kx: 0, hitId: -1, looted: false, minX: x, maxX: x, walk: 0, flash: 0 };
  }
  function bounds(o) {
    const c = Math.floor(o.x / T), r = Math.floor(o.y / T);
    const ok = cc => { const t = tile(cc, r); return (t === 1 || t === 4 || t === 2) && !solid(cc, r - 1) && !solid(cc, r - 2) && tile(cc, r - 1) !== 3; };
    let a = c, b = c;
    while (a > 1 && ok(a - 1)) a--;
    while (b < MW - 2 && ok(b + 1)) b++;
    o.minX = a * T + 4; o.maxX = b * T + 4;
  }
  function build(n) {
    const w = Math.floor(n / 6), s = n % 6, Wd = WORLDS[w];
    rings = []; items = []; foes = []; civs = []; jars = []; cps = []; shots = []; smokes = []; bits = []; floats = []; exit = null; boss = null;
    if (s === 5) { arena(w); return; }
    const r = rng(Wd.seed * 131 + s * 977 + 5), d = w * .2 + s * .09;
    MW = 120 + s * 14 + w * 8; grid = new Uint8Array(MW * MH);
    const set = (c, y, v) => { if (c >= 0 && c < MW && y >= 0 && y < MH) grid[y * MW + c] = v; };
    const gh = new Int8Array(MW + 8);   // the height of the ground road in each column (0 = a pit)
    const col = (c, hh) => { for (let y = MH - hh; y < MH; y++) set(c, y, 1); if (c >= 0 && c < MW) gh[c] = hh; };
    const surf = hh => (MH - hh) * T;
    let x = 0, h = 4, last = '';
    const foeType = () => { let k = Wd.foes[Math.floor(r() * Wd.foes.length)]; if (k === 'crossbow' && (r() < .4 || foes.filter(e => e.type === 'crossbow').length >= Math.max(1, Math.floor(foes.length / 7)))) { const rest = Wd.foes.filter(x => x !== 'crossbow'); k = rest[Math.floor(r() * rest.length)]; } return k; };   // 40% fewer crossbowmen (Sam, version 21)
    const foeAt = (c, hh, type, cap) => foes.push(newFoe(c * T + 4, surf(hh), type, cap, r));
    function populate(c0, len) {
      if (len >= 6 && c0 > 16 && r() < .38 + d * .35) foeAt(c0 + Math.floor(len / 2), h, foeType());
      if (len >= 5 && r() < .22) civs.push({ x: (c0 + 1 + Math.floor(r() * (len - 2))) * T + 4, y: surf(h), face: r() < .5 ? -1 : 1, coat: CIVS[w].coats[Math.floor(r() * 3)], hat: CIVS[w].hat,
        skin: SKINS[Math.floor(r() * SKINS.length)], cower: 0, pause: 0, walk: 0, minX: 0, maxX: 0, basket: r() < .5 });
      if (r() < .28) jars.push({ x: (c0 + 1) * T + 4, y: surf(h), broken: false });
      if (r() < .25) items.push(item((c0 + len - 2) * T + 4, surf(h) - 4, 'flower', true));
      if (r() < .25) for (let i = 0; i < 3; i++) items.push(item((c0 + 1 + i) * T + 4, surf(h) - 14, 'coin', true));
    }
    const flat = (len, pop) => { for (let i = 0; i < len; i++) col(x + i, h); if (pop) populate(x, len); x += len; };
    flat(12, false); spawn = { x: 3 * T + 1, y: surf(4) - 11 };
    const caps = s < 2 ? 1 : 2, capAt = caps === 1 ? [.55] : [.38, .8];
    let capN = 0, cpDone = false;
    const WT = { flat: 3, up: 2, down: 2, gap: 2, spikes: 1 + d, wide: 1 + d, wall: 1.1, plats: 1 + d, house: 1.4, loot: .6 };
    while (x < MW - 24) {
      const f = x / MW;
      // a captain not yet placed gets his place before the end (x > MW - 60)
      if (capN < caps && (f > capAt[capN] || x > MW - 60)) { const c0 = x; flat(18, false); foeAt(c0 + 12, h, CAPS[w].base, CAPS[w]); if (r() < .6) foeAt(c0 + 5, h, foeType()); capN++; last = 'cap'; continue; }
      if (!cpDone && f > .5) { const c0 = x; flat(5, false); cps.push({ x: (c0 + 2) * T + 4, y: surf(h), lit: false }); cpDone = true; continue; }
      let t = pickW(WT, r);
      if (t === last && t !== 'flat') t = 'flat';
      if ((t === 'wall' && h > 7) || (t === 'house' && h > 9) || (t === 'up' && h > 11)) t = 'down';
      last = t;
      if (t === 'flat') flat(6 + Math.floor(r() * 7), true);
      else if (t === 'up') { let dh = 1 + Math.floor(r() * 3); if (d > .25 && r() < .3) dh = 4; h = Math.min(13, h + dh); flat(4 + Math.floor(r() * 4), true); }
      else if (t === 'down') { h = Math.max(2, h - 1 - Math.floor(r() * 4)); flat(4 + Math.floor(r() * 4), true); }
      else if (t === 'gap') {
        let gw = 2 + (r() < .4 + d * .3 ? 1 : 0), nh = Math.max(2, Math.min(13, h + Math.floor(r() * 4) - 2));
        if (nh > h) { gw = 2; nh = Math.min(nh, h + 2); }
        x += gw; h = nh; flat(5, true);
      }
      else if (t === 'spikes') { flat(3, false); const nS = 2 + Math.floor(r() * 2); for (let i = 0; i < nS; i++) { col(x + i, h); set(x + i, MH - h - 1, 3); } x += nS; flat(4, false); }
      else if (t === 'wide') {
        const gw = 6 + Math.floor(r() * 3);
        rings.push({ x: (x + Math.floor(gw / 2)) * T + 4, y: (MH - h - 6) * T + 4 });
        for (let i = 1; i < gw - 1; i++) items.push(item((x + i) * T + 4, surf(h) - 18 - Math.round(Math.sin(i / (gw - 1) * Math.PI) * 10), 'coin', true));
        x += gw; flat(5, true);
      }
      else if (t === 'wall') {
        const dh = 5 + Math.floor(r() * 2);
        if (r() < .5) { flat(4, false); for (let i = 1; i < 4; i++) set(x - i, MH - h - 2, 2); }
        else { flat(4, false); rings.push({ x: (x - 1) * T + 4, y: (MH - h - dh - 3) * T + 4 }); }
        h += dh; flat(5, true);
      }
      else if (t === 'plats') {
        const cnt = 2 + Math.floor(r() * 2); let ph = h;
        for (let i = 0; i < cnt; i++) {
          const gw = 2 + Math.floor(r() * 2), rise = Math.floor(r() * (gw === 2 ? 4 : 3)) - 1;
          ph = Math.max(3, Math.min(12, ph + rise)); x += gw;
          const pw = 3 + Math.floor(r() * 2);
          for (let j = 0; j < pw; j++) set(x + j, MH - ph, 2);
          if (r() < .5) items.push(item((x + 1) * T + 4, surf(ph) - 6, r() < .6 ? 'coin' : 'flower', true));
          x += pw;
        }
        x += 2; h = Math.max(2, Math.min(13, ph - Math.floor(r() * 2))); flat(5, true);
      }
      else if (t === 'house') {
        flat(2, false);
        const hw = 6 + Math.floor(r() * 3), c0 = x;
        for (let i = 0; i < hw; i++) { col(x + i, h); for (let y = MH - h - 4; y < MH - h; y++) set(x + i, y, 4); }
        x += hw;
        if (hw >= 7 && r() < .55 + d * .3) foeAt(c0 + Math.floor(hw / 2), h + 4, foeType());
        if (r() < .45) jars.push({ x: (c0 + 1) * T + 4, y: surf(h + 4), broken: false });
        flat(3, false);
      }
      else if (t === 'loot') {
        const c0 = x; flat(8, true);
        if (h <= 6) { set(c0 + 3, MH - h - 7, 1); set(c0 + 4, MH - h - 7, 1); items.push(item((c0 + 4) * T, surf(h + 7) - 5, r() < .5 ? 'gem' : r() < .5 ? 'high' : 'fast', true)); }
      }
    }
    flat(MW - x, false);
    exit = { x: (MW - 8) * T, y: surf(h) };
    // ---- the upper layers (version 19): plank walkways high over the road, and here and there a top walk above
    // them, reached by plank stairs (three tiles a step). Up there: coins, jars, flowers, a soldier now and then,
    // the three secret scrolls and the stage's easter egg.
    const topOf = c => { for (let y = 0; y < MH; y++) if (grid[y * MW + c]) return MH - y; return 0; };
    const plank = (c0, len, hh) => { for (let j = 0; j < len; j++) set(c0 + j, MH - hh, 2); };
    const stairs = (c, fromH, toH) => { const n = Math.ceil((toH - fromH) / 3) - 1; for (let i = 1; i <= n; i++) plank(c + (i % 2 ? 0 : 2), 3, fromH + Math.round(i * (toH - fromH) / (n + 1))); };
    const spot = (c, hh) => ({ x: c * T + 4, y: (MH - hh) * T - 6 });
    const mids = [], tops = [];
    let c = 16, prev = null;
    while (c < MW - 34) {
      const len = 12 + Math.floor(r() * 14);
      if (c + len > MW - 22) break;
      let mh = 0;
      for (let k = c - 3; k <= c + len + 2; k++) mh = Math.max(mh, gh[k] + 9, topOf(k) + 4);
      mh = Math.min(mh, MH - 20);
      if (!(prev && c - prev.end <= 4 && Math.abs(mh - prev.h) <= 2)) {
        let s = c - 3; while (s > c - 8 && !(gh[s] && gh[s + 1] && gh[s + 2])) s--;
        if (gh[s] && gh[s + 1] && gh[s + 2]) { stairs(s, gh[s], mh); if (s + 4 < c) plank(s + 2, c - s - 2, mh); }
        else if (!prev) { c += 6; continue; }
      }
      plank(c, len, mh);
      mids.push(spot(c + Math.floor(len / 2), mh), spot(c + len - 2, mh));
      for (let i = 0; i < 4; i++) if (r() < .7) items.push(item((c + 2 + i) * T + 4, surf(mh) - 12, 'coin', true));
      if (r() < .3) jars.push({ x: (c + len - 3) * T + 4, y: surf(mh), broken: false });
      if (len >= 10 && r() < .3 + d * .3) foeAt(c + Math.floor(len * .6), mh, foeType());
      if (r() < .3) items.push(item((c + 1) * T + 4, surf(mh) - 4, 'flower', true));
      if (r() < .15) items.push(item((c + len - 5) * T + 4, surf(mh) - 6, ['fast', 'high', 'heal'][Math.floor(r() * 3)], true));
      if (len >= 14 && (r() < .5 || (!tops.length && c > MW * .4))) {
        const tlen = 6 + Math.floor(r() * 5), tc = c + 4 + Math.floor(r() * (len - tlen - 4)), th = Math.min(mh + 8, MH - 6);
        stairs(tc - 3, mh, th); plank(tc, tlen, th);
        tops.push(spot(tc + Math.floor(tlen / 2), th), spot(tc + tlen - 1, th));
        for (let i = 0; i < 3; i++) items.push(item((tc + 1 + i) * T + 4, surf(th) - 12, r() < .3 ? 'gem' : 'coin', true));
      }
      prev = { end: c + len, h: mh };
      c += len + 3 + Math.floor(r() * 5);
    }
    const take = list => list.splice(Math.floor(r() * list.length), 1)[0];
    const eggAt = tops.length ? tops.pop() : mids.length ? mids.pop() : null;
    if (eggAt) { const e = item(eggAt.x, eggAt.y, 'egg', true); e.egg = EGGS[n % EGGS.length]; items.push(e); }
    scrollsHere = 0;
    for (let i = 0; i < 3; i++) {
      const list = i === 0 && tops.length ? tops : mids.length ? mids : tops;
      if (!list.length) break;
      const s = take(list); items.push(item(s.x, s.y, 'scroll', true)); scrollsHere++;
    }
    foes.forEach(bounds); civs.forEach(bounds);
  }
  function arena(w) {
    MW = 32; grid = new Uint8Array(MW * MH);
    for (let c = 0; c < MW; c++) for (let y = MH - 3; y < MH; y++) grid[y * MW + c] = 1;
    for (let y = 0; y < MH; y++) [0, 1, MW - 2, MW - 1].forEach(c => { grid[y * MW + c] = 1; });
    [[3, 8, MH - 6], [23, 28, MH - 6], [10, 21, MH - 9]].forEach(p => { for (let c = p[0]; c <= p[1]; c++) grid[p[2] * MW + c] = 2; });
    rings.push({ x: 7 * T + 4, y: (MH - 16) * T + 4 }, { x: 24 * T + 4, y: (MH - 16) * T + 4 });
    const L = LORDS[w], hp = Math.round((22 + diff * 6) * (1 + w * .15));
    boss = { lord: L, x: 24 * T, y: (MH - 3) * T, vx: 0, vy: 0, face: -1, hp: hp, max: hp, mv: '', st: 0, t: -60, inv: 0, stun: 0, alpha: 1, moves: L.moves.slice(),
      ph2: false, last: '', powT: 300, marks: [], dead: false, walk: 0, hitId: -1, flash: 0 };
    spawn = { x: 5 * T, y: (MH - 3) * T - 11 };
  }

  // ---------- playing ----------
  const capsLeft = () => foes.filter(e => e.cap && e.st !== 'dead').length;
  function say(s, t) { msgS = s; msgT = t || 130; }
  function float(x, y, s, c) { floats.push({ x: x, y: y, s: s, c: c || '#f8d030', t: 50 }); }
  function burst(x, y, c, n) { for (let i = 0; i < (n || 8); i++) bits.push({ x: x, y: y, vx: (Math.random() - .5) * 3, vy: -Math.random() * 2.5, c: c, l: 20 + Math.random() * 12 }); }
  function startStage(n) {
    lvl = n; world = Math.floor(n / 6); stage = n % 6; crystals = world;
    build(n);
    P = newPlayer(spawn.x, spawn.y); P.hp = hpMax; cp = { x: spawn.x, y: spawn.y };
    if (stage === 5) { stars = 20; smoke = 5; }   // a lord fight: full health and every weapon full
    seen = harmed = kills = silent = 0; scrollsGot = 0; eggGot = false; bot = null; state = 'play'; banner = 160; msgT = 0;
    cam.x = Math.max(0, Math.min(MW * T - VW, P.x - VW / 2)); cam.y = Math.max(0, MH * T - VH + 33 / VS);
    play(WORLDS[world].seed * 7 + stage, stage === 5 ? WORLDS[world].bpm + 18 : WORLDS[world].bpm, true);
  }
  function newGame() { score = 0; lives = 3; stars = 8; smoke = 1; flowers = 0; weapon = 0; scrollsAll = eggsAll = 0; startStage(0); }
  function hurtP(dmg, fromX) {
    if (P.inv > 0 || state !== 'play') return;
    P.hp -= dmg; P.inv = 70; shake = 8; ev('hurt');
    if (P.st !== 'free') { P.st = 'free'; P.nograb = 20; }
    if (P.crouch) { P.crouch = false; P.y -= 4; P.h = 11; if (boxSolid(P.x, P.y, P.w, P.h)) { P.y += 4; P.h = 7; P.crouch = true; } }
    P.vx = (P.x + 3 < fromX ? -1 : 1) * 1.8; P.vy = -2.2; P.on = false; P.jumping = false;
    if (P.hp <= 0) { P.hp = 0; state = 'down'; P.downT = 110; lives--; quiet(); ev('die'); }
  }
  function respawn() {
    if (lives <= 0) { state = 'over'; endAt = frame; bestScore = Math.max(bestScore, score); return; }
    const old = P; P = newPlayer(cp.x, cp.y); P.hp = hpMax; P.inv = 90; P.face = old.face;
    if (stage === 5) { stars = Math.max(stars, 20); smoke = Math.max(smoke, 5); }
    shots = []; state = 'play';
    foes.forEach(e => { if (e.st === 'live') { e.alert = false; e.aw = 0; e.ph = ''; } });
    play(WORLDS[world].seed * 7 + stage, stage === 5 ? WORLDS[world].bpm + 18 : WORLDS[world].bpm, true);
  }
  function stageClear(isBoss) {
    state = 'clear'; endAt = frame; quiet(); ev(isBoss ? 'crystal' : 'clear');
    const ghost = !isBoss && seen === 0, kind = harmed === 0, allScrolls = !isBoss && scrollsHere > 0 && scrollsGot >= scrollsHere;
    const bonus = (isBoss ? 2000 : 500) + (ghost ? 1000 : 0) + (kind ? 300 : 0) + (allScrolls ? 1000 : 0);
    score += bonus; bestScore = Math.max(bestScore, score);
    clearInfo = { boss: isBoss, ghost: ghost, kind: kind, kills: kills, silent: silent, bonus: bonus, all: allScrolls };
  }
  function next() {
    if (lvl + 1 >= 24) { state = 'win'; endAt = frame; bestScore = Math.max(bestScore, score); play(999, 100, false); return; }
    if ((lvl + 1) % 6 === 0) { state = 'story'; endAt = frame; return; }
    startStage(lvl + 1);
  }
  function go() {
    if (state === 'title') newGame();
    else if (state === 'clear' && frame - endAt > 40) next();
    else if (state === 'story' && frame - endAt > 40) startStage(lvl + 1);
    else if ((state === 'over' || state === 'win') && frame - endAt > 60) { state = 'title'; frame = 0; quiet(); }
  }
  function cycleWeapon() { weapon = (weapon + 1) % WEAPONS.length; ev('grab'); }
  function attack() {
    if (P.st === 'hang' || P.st === 'climb' || P.atk > 0 || P.cool > 0) return;
    const w = WEAPONS[weapon];
    if (w === 'STARS') {
      if (stars <= 0) { say('NO STARS LEFT'); return; }
      stars--; P.cool = 14; P.throwT = 8; ev('throw');
      shots.push({ x: P.x + 3 + P.face * 4, y: P.y + (P.crouch ? 2 : 4), vx: P.face * 4.2, vy: 0, g: 0, k: 'star', mine: true, life: 70, dmg: 1 });
      return;
    }
    if (w === 'SMOKE') {
      if (smoke <= 0) { say('NO SMOKE BOMBS. THREE WHITE FLOWERS MAKE ONE'); return; }
      smoke--; P.cool = 30; puffAt(P.x + 3, P.y + P.h - 5);
      return;
    }
    P.atk = w === 'SWORD' ? 16 : 12; P.atkW = w; P.atkId++; ev(w === 'SWORD' ? 'swing' : 'nun');
  }
  // version 21 (Sam): smoke bombs can be thrown (hold B to aim, UP for higher), a flying kick after a double jump,
  // a bash straight down (DOWN + B in the air), a slide kick (DOWN while running)
  function puffAt(x, y) {
    ev('smoke');
    const s = { x: x, y: y, r: 4, t: 330 }; smokes.push(s);
    foes.forEach(e => { if (e.st === 'live' && Math.hypot(e.x - s.x, e.y - 7 - s.y) < 34) { e.stun = 150; e.smoked = true; e.alert = false; e.aw = 30; e.ph = ''; } });
    if (boss && !boss.dead && Math.hypot(boss.x - s.x, boss.y - 14 - s.y) < 40) boss.stun = 60;
  }
  const aimOf = t => { const a = keys.up ? 1.2 : .7, pow = 2.4 + Math.min(t, 50) / 50 * 2.4; return { vx: P.face * pow * Math.cos(a), vy: -pow * Math.sin(a) }; };
  function throwSmoke(t) {
    if (smoke <= 0 || P.cool > 0) return;
    smoke--; P.cool = 30; P.throwT = 8; ev('throw');
    const v = aimOf(t);
    shots.push({ x: P.x + 3 + P.face * 3, y: P.y + 3, vx: v.vx, vy: v.vy, g: .2, k: 'smokebomb', mine: true, life: 240, dmg: 0 });
  }
  function kick() { P.kick = 18; P.vx = P.face * 3.2; P.vy = Math.max(P.vy, .4); P.atkId++; ev('swing'); }
  function bash() { P.bash = true; P.kick = 0; P.vx = 0; P.vy = 4.6; P.atkId++; ev('swing'); }
  function bashLand() {   // the landing of a bash: a shock along the ground
    P.bash = false; shake = 7; ev('boom'); burst(P.x + 3, P.y + P.h, WORLDS[world].top, 10);
    const fx = P.x + 3, fy = P.y + P.h;
    foes.forEach(e => { if (e.st === 'live' && Math.abs(e.x - fx) < 22 && Math.abs(e.y - fy) < 4) { e.hitId = P.atkId; hitFoe(e, 1, 'BASH', fx); } });
    jars.forEach(j => { if (!j.broken && Math.abs(j.x - fx) < 16 && Math.abs(j.y - fy) < 4) breakJar(j); });
    if (boss && !boss.dead && Math.abs(boss.x - fx) < 26 && Math.abs(boss.y - fy) < 4) hitBoss(2, 'BASH', fx);
  }
  // hit everything in one box with one blow (once per blow)
  function strike(bx, by, bw, bh, dmg, kind) {
    foes.forEach(e => { if (e.st === 'live' && e.hitId !== P.atkId && ov(bx, by, bw, bh, e.x - 3, e.y - 13, 6, 13)) { e.hitId = P.atkId; hitFoe(e, dmg, kind, P.x + 3); } });
    civs.forEach(c => { if (ov(bx, by, bw, bh, c.x - 3, c.y - 13, 6, 13)) hitCiv(c); });
    jars.forEach(j => { if (!j.broken && ov(bx, by, bw, bh, j.x - 4, j.y - 9, 8, 9)) breakJar(j); });
    if (boss && !boss.dead && boss.hitId !== P.atkId && ov(bx, by, bw, bh, boss.x - 7, boss.y - 26, 14, 26)) { boss.hitId = P.atkId; hitBoss(dmg, kind, P.x + 3); }
  }
  const KNOCK = { NUNCHUCKS: 1, KICK: 1, BASH: 1, SLIDE: 1 };   // these knock a soldier out instead of killing him (a captain still dies)
  function hitFoe(e, dmg, kind, fromX) {
    if (e.st !== 'live') return false;
    const behind = Math.sign(fromX - e.x) === -e.face, unaware = !e.alert || e.smoked, above = kind !== 'star' && P.vy > 1.5 && P.y + P.h < e.y - 8;
    if (unaware && kind !== 'star' && (behind || e.smoked || above)) {   // a silent takedown
      silent++; kills++;
      if (KNOCK[kind] && !e.cap) { e.st = 'ko'; score += 220; float(e.x, e.y - 18, 'KNOCKED OUT', '#bfe8ff'); }
      else { e.st = 'dead'; score += e.cap ? 800 : 250; float(e.x, e.y - 18, 'SILENT', '#bfe8ff'); }
      ev('silent'); burst(e.x, e.y - 7, '#fcfcfc', 6); afterDown(e);
      return true;
    }
    if (e.d.shield && !behind && e.ph !== 'wind' && e.ph !== 'strike' && !KNOCK[kind]) { ev('clang'); burst(e.x + e.face * 5, e.y - 8, '#fcfcfc', 3); e.alert = true; e.aw = 60; return 'block'; }
    if (e.d.parry && !behind && kind === 'SWORD' && Math.random() < .35) { ev('clang'); burst(e.x + e.face * 5, e.y - 9, '#f8f0a0', 4); e.alert = true; e.aw = 60; P.vx = -P.face * 2; return 'block'; }
    e.hp -= unaware && kind === 'star' ? dmg * 2 : dmg; e.flash = 8; e.hurt = 12; e.kx = Math.sign(e.x - fromX) * 1.6; ev('hit');
    if (KNOCK[kind]) { e.stun = Math.max(e.stun, kind === 'SLIDE' || kind === 'BASH' ? 44 : 34); e.smoked = false; }
    if (!e.alert) { e.alert = true; e.aw = 60; seen++; }
    e.face = Math.sign(fromX - e.x) || e.face; e.ph = '';
    if (e.hp <= 0) {
      kills++;
      if (KNOCK[kind] && !e.cap) { e.st = 'ko'; score += 120; float(e.x, e.y - 18, 'KNOCKED OUT', '#bfe8ff'); }
      else { e.st = 'dead'; score += e.cap ? 500 : 100; ev('kill'); }
      burst(e.x, e.y - 7, '#fcfcfc', 6); afterDown(e);
    }
    return true;
  }
  function afterDown(e) {
    e.ph = ''; e.stun = 0;
    if (e.cap) { const n = capsLeft(); say(n ? CAPS[world].name + ' DOWN. ' + n + ' MORE' : 'ALL CAPTAINS DOWN. THE GATE IS OPEN'); }
  }
  function hitCiv(c) {
    if (c.cower > 0) return;
    c.cower = 150; harmed++; score = Math.max(0, score - 300); ev('bad'); say('LEAVE THE PEOPLE ALONE!  -300'); float(c.x, c.y - 18, '-300', '#ff6040');
  }
  function hitBoss(dmg, kind, fromX) {
    const b = boss;
    if (!b || b.dead || b.inv > 0 || b.alpha < .5) return false;
    if (b.lord.shield && kind === 'star' && Math.sign(fromX - b.x) === b.face && b.st !== 0) { ev('clang'); burst(b.x + b.face * 10, b.y - 14, '#fcfcfc', 3); return 'block'; }
    b.hp -= dmg; b.inv = 10; b.flash = 8; ev('hit'); burst(b.x, b.y - 16, '#fcfcfc', 4);
    if (b.hp <= 0) {
      b.dead = true; b.hp = 0; score += 3000; kills++; quiet(); ev('kill'); say(WORLDS[world].lord + ' IS BEATEN. TAKE THE CRYSTAL', 200);
      const c = item(b.x, b.y - 20, 'crystal', false); c.vy = -3; items.push(c); burst(b.x, b.y - 14, WORLDS[world].gem, 20);
    }
    return true;
  }
  function loot(e) {
    e.looted = true;
    const coins = 20 + Math.floor(Math.random() * 40); score += coins; float(e.x, e.y - 16, '+' + coins); ev('coin');
    const v = Math.random();
    if (v < .35) items.push(Object.assign(item(e.x, e.y - 8, 'stars', false), { vy: -2 }));
    else if (v < .55) items.push(Object.assign(item(e.x, e.y - 8, 'flower', false), { vy: -2 }));
    else if (v < .7) items.push(Object.assign(item(e.x, e.y - 8, 'food', false), { vy: -2 }));
    else if (v < .78) items.push(Object.assign(item(e.x, e.y - 8, Math.random() < .5 ? 'fast' : 'high', false), { vy: -2 }));
  }
  function collect(it) {
    it.got = true;
    const k = it.k;
    if (k === 'coin') { score += 25; ev('coin'); }
    else if (k === 'gem') { score += 150; ev('item'); float(it.x, it.y - 8, '+150'); }
    else if (k === 'stars') { stars = Math.min(20, stars + 4); ev('item'); float(it.x, it.y - 8, 'STARS +4', '#fcfcfc'); }
    else if (k === 'flower') { flowers++; ev('item'); if (flowers >= 3) { flowers -= 3; smoke = Math.min(5, smoke + 1); say('THREE WHITE FLOWERS: A SMOKE BOMB'); } else float(it.x, it.y - 8, 'FLOWER ' + flowers + '/3', '#fcfcfc'); }
    else if (k === 'food') { P.hp = Math.min(hpMax, P.hp + 2); ev('item'); float(it.x, it.y - 8, 'HEALTH +2', '#7cf070'); }
    else if (k === 'heal') { P.hp = hpMax; ev('item'); float(it.x, it.y - 8, 'FULL HEALTH', '#7cf070'); }
    else if (k === 'fast') { P.fast = 600; ev('item'); say('SPEED POTION: FASTER FOR TEN SECONDS'); }
    else if (k === 'high') { P.high = 600; ev('item'); say('JUMP POTION: HIGHER FOR TEN SECONDS'); }
    else if (k === 'scroll') { scrollsGot++; scrollsAll++; score += 300; ev('item'); say('SECRET SCROLL ' + scrollsGot + ' OF ' + scrollsHere + (scrollsGot >= scrollsHere ? '. ALL FOUND!' : '')); }
    else if (k === 'egg') { eggGot = true; eggsAll++; score += 500; ev('crystal'); say('EASTER EGG: ' + EGG_SAY[it.egg] + '  +500', 180); }
    else if (k === 'crystal') { crystals = world + 1; score += 1000; stageClear(true); }
  }
  function breakJar(j) {
    if (j.broken) return; j.broken = true; ev('hit'); burst(j.x, j.y - 4, WORLDS[world].plankTop, 8);
    const n = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) { const it = item(j.x, j.y - 6, 'coin', false); it.vx = (Math.random() - .5) * 2; it.vy = -2 - Math.random() * 2; items.push(it); }
    const v = Math.random(), pick = v < .25 ? 'stars' : v < .45 ? 'flower' : v < .6 ? 'food' : v < .68 ? 'heal' : null;
    if (pick) { const it = item(j.x, j.y - 6, pick, false); it.vy = -3; items.push(it); }
  }
  const hidden = () => smokes.some(s => Math.hypot(P.x + 3 - s.x, P.y + P.h / 2 - s.y) < s.r);
  const smokedAt = (x, y) => smokes.some(s => Math.hypot(x - s.x, y - s.y) < s.r);
  const moveFoe = (e, v) => { const nx = Math.max(e.minX, Math.min(e.maxX, e.x + v)); e.walk += Math.abs(nx - e.x); e.x = nx; };
  function foeShot(x, y, k, tx, ty, dmg) {
    const dx = tx - x, dist = Math.max(20, Math.abs(dx)), dir = Math.sign(dx) || 1;
    const sp = k === 'bolt' ? 4 : k === 'ball' ? 3.4 : k === 'longarrow' ? 2.6 : 3, g = k === 'arrow' ? .06 : k === 'longarrow' ? .08 : 0, time = dist / sp;
    const vy = Math.max(-4, Math.min(3, (ty - y) / time - .5 * g * time));
    shots.push({ x: x, y: y, vx: dir * sp, vy: vy, g: g, k: k, mine: false, life: 160, dmg: dmg });
    ev(k === 'ball' ? 'shot' : 'throw');
    if (k === 'ball') burst(x + dir * 3, y, '#d8d8d8', 5);
  }
  function foeTick(e) {
    if (e.flash > 0) e.flash--;
    if (e.st !== 'live') { if (!e.looted && ov(P.x, P.y, P.w, P.h, e.x - 7, e.y - 5, 14, 5)) loot(e); return; }
    const pc = P.x + 3, py = P.y + P.h / 2, dx = pc - e.x, adx = Math.abs(dx), dy = py - (e.y - 7);
    if (e.hurt > 0) { e.hurt--; moveFoe(e, e.kx); e.kx *= .8; }
    if (e.cool > 0) e.cool--;
    if (e.stun > 0) { if (--e.stun === 0) e.smoked = false; return; }
    let sees = false;
    if (state === 'play' && !hidden() && !smokedAt(e.x, e.y - 7) && !(P.crouch && !P.slide && !e.alert)) {
      const range = e.alert ? 150 : P.crouch ? 46 : 96, vr = e.alert ? 60 : 26;
      if (adx < range && Math.abs(dy) < vr && (e.alert || Math.sign(dx) === e.face || adx < 5) && clearLine(e.x, e.y - 10, pc, py)) sees = true;
      else if (!e.alert && P.on && !P.crouch && Math.abs(P.vx) > .9 && adx < 30 && Math.abs(dy) < 18) { e.face = Math.sign(dx) || e.face; e.aw = Math.max(e.aw, 24); }   // heard running feet
    }
    if (sees) {
      e.lost = 0;
      if (!e.alert) { e.aw += P.crouch ? 1.4 : 3.2; if (e.aw >= 60) { e.alert = true; seen++; ev('alert'); foes.forEach(o => { if (o !== e && o.st === 'live' && Math.abs(o.x - e.x) < 70 && Math.abs(o.y - e.y) < 30) o.aw = Math.max(o.aw, 40); }); } }
    } else {
      if (!e.alert && e.aw > 0) e.aw -= .35;
      if (e.alert && ++e.lost > 260) { e.alert = false; e.aw = 30; e.ph = ''; }
    }
    if (!e.alert) {
      e.ph = '';
      if (e.guard) { if (--e.turnT <= 0) { e.face = -e.face; e.turnT = 90 + Math.random() * 150; } }
      else { const v = e.face * e.spd * .45; if (e.x + v < e.minX || e.x + v > e.maxX) e.face = -e.face; else moveFoe(e, v); }
      return;
    }
    const reach = e.d.reach || 14, act = e.cap ? e.cap.act : '';
    if (e.ph === 'wind') {
      if (--e.t > 0) return;
      if (e.sp === 'charge') { e.ph = 'dash'; e.t = 40; return; }
      if (e.sp === 'spin') { e.ph = 'spin'; e.t = 28; return; }
      if (e.sp === 'iai') {
        const to = Math.max(e.minX, Math.min(e.maxX, e.x + e.face * (adx + 24)));
        if (Math.abs(py - (e.y - 7)) < 16 && (pc - e.x) * (pc - to) <= 0) hurtP(2, e.x);
        burst(e.x, e.y - 8, '#fcfcfc', 5); e.x = to; e.face = -e.face; e.ph = 'rec'; e.t = 40; e.sp = ''; return;
      }
      if (e.sp === 'pistol') { foeShot(e.x + e.face * 5, e.y - 8, 'ball', pc, py, 2); e.ph = 'rec'; e.t = 24; e.sp = ''; return; }
      if (e.d.ranged) { foeShot(e.x + e.face * 5, e.y - 8, e.d.ranged, pc, py, e.d.dmg); e.ph = 'rec'; e.t = 22; return; }
      e.ph = 'strike'; e.t = 7; return;
    }
    if (e.ph === 'strike') {
      if (ov(P.x, P.y, P.w, P.h, e.face > 0 ? e.x + 2 : e.x - 2 - reach, e.y - 13, reach, 12)) hurtP(e.d.dmg, e.x);
      if (--e.t <= 0) { e.ph = 'rec'; e.t = 20; }
      return;
    }
    if (e.ph === 'dash') {
      moveFoe(e, e.face * 3); if (ov(P.x, P.y, P.w, P.h, e.x - 4, e.y - 13, 8, 13)) hurtP(2, e.x);
      if (--e.t <= 0 || e.x <= e.minX || e.x >= e.maxX) { e.ph = 'rec'; e.t = 30; }
      return;
    }
    if (e.ph === 'spin') {
      if (ov(P.x, P.y, P.w, P.h, e.x - 20, e.y - 13, 40, 12)) hurtP(1, e.x);
      if (--e.t <= 0) { e.ph = 'rec'; e.t = 30; }
      return;
    }
    if (e.ph === 'rec') { if (--e.t <= 0) e.ph = ''; return; }
    e.face = Math.sign(dx) || e.face;
    if (e.cool <= 0 && act === 'charge' && adx > 24 && adx < 100 && Math.abs(dy) < 16) { e.ph = 'wind'; e.sp = 'charge'; e.t = 22; e.cool = 110; return; }
    if (e.cool <= 0 && act === 'spin' && adx < 30 && Math.abs(dy) < 18) { e.ph = 'wind'; e.sp = 'spin'; e.t = 18; e.cool = 90; return; }
    if (e.cool <= 0 && act === 'pistol' && adx > 40 && adx < 150 && clearLine(e.x, e.y - 8, pc, py)) { e.ph = 'wind'; e.sp = 'pistol'; e.t = 28; e.cool = 120; return; }
    if (e.cool <= 0 && act === 'iai' && adx < 90 && adx > 16 && Math.abs(dy) < 16) { e.ph = 'wind'; e.sp = 'iai'; e.t = 32; e.cool = 120; return; }
    if (e.d.ranged) {
      if (adx < 36) moveFoe(e, -e.face * e.spd); else if (adx > 120) moveFoe(e, e.face * e.spd);
      if (e.cool <= 0 && adx < 160 && clearLine(e.x, e.y - 8, pc, py)) { e.ph = 'wind'; e.sp = ''; e.t = e.wind; e.cool = e.d.cool; }
    } else {
      if (adx > reach - 2) moveFoe(e, e.face * e.spd);
      else if (e.cool <= 0 && Math.abs(dy) < 18) { e.ph = 'wind'; e.sp = ''; e.t = e.wind; e.cool = e.d.cool; }
    }
  }
  function civTick(c) {
    if (c.cower > 0) { c.cower--; return; }
    const danger = foes.some(e => e.st === 'live' && e.alert && Math.abs(e.x - c.x) < 90 && Math.abs(e.y - c.y) < 30);
    if (danger) { const away = Math.sign(c.x - (P.x + 3)) || 1; c.face = away; const nx = Math.max(c.minX, Math.min(c.maxX, c.x + away * 1.1)); c.walk += Math.abs(nx - c.x); c.x = nx; return; }
    if (c.pause > 0) { c.pause--; return; }
    if (Math.random() < .006) { c.pause = 60 + Math.random() * 120; return; }
    const v = c.face * .3; if (c.x + v < c.minX || c.x + v > c.maxX) c.face = -c.face; else { c.x += v; c.walk += .3; }
  }
  function bossTick() {
    const b = boss; if (!b) return;
    if (b.flash > 0) b.flash--;
    if (b.dead) { b.vx = 0; return; }
    const pc = P.x + 3, py = P.y + P.h / 2, dx = pc - b.x, adx = Math.abs(dx), L = b.lord, fl = (MH - 3) * T;
    if (b.inv > 0) b.inv--;
    if (!b.ph2 && b.hp <= b.max / 2) { b.ph2 = true; b.moves.push(L.more); say(WORLDS[world].lord + ' GROWS ANGRY'); }
    const sp = b.ph2 ? 1.3 : 1;
    if (--b.powT <= 0) { b.powT = b.ph2 ? 330 : 420; const pool = ['food', 'fast', 'high', 'stars', 'flower', 'food', 'heal', 'stars']; items.push(item((4 + Math.random() * 24) * T, 3 * T, pool[Math.floor(Math.random() * pool.length)], false)); }
    b.vy = Math.min(5, b.vy + G); b.y += b.vy;
    let landed = false;
    if (b.y >= fl) { landed = b.vy > 2; b.y = fl; b.vy = 0; }
    const nx = Math.max(3 * T, Math.min((MW - 3) * T, b.x + b.vx)), wall = nx !== b.x + b.vx; b.walk += Math.abs(nx - b.x); b.x = nx;
    if (b.stun > 0) { b.stun--; b.vx = 0; return; }
    if (ov(P.x, P.y, P.w, P.h, b.x - 7, b.y - 26, 14, 26) && b.alpha > .5) hurtP(1, b.x);
    b.t++;
    const front = (reach) => ov(P.x, P.y, P.w, P.h, b.face > 0 ? b.x : b.x - reach, b.y - 26, reach, 26);
    const done = () => { b.mv = ''; b.st = 0; b.t = 0; b.vx = 0; b.alpha = 1; };
    switch (b.mv) {
      case '':
        b.face = Math.sign(dx) || b.face; b.vx = adx > 34 ? b.face * .7 * sp : 0;
        if (b.t > (b.ph2 ? 40 : 70)) { let m; do { m = b.moves[Math.floor(Math.random() * b.moves.length)]; } while (m === b.last && b.moves.length > 1); b.mv = b.last = m; b.st = 0; b.t = 0; b.vx = 0; }
        break;
      case 'rush':
        if (b.st === 0) { b.face = Math.sign(dx) || b.face; if (b.t > 30 / sp) { b.st = 1; b.t = 0; } }
        else if (b.st === 1) { b.vx = b.face * 3.4 * sp; if (wall || b.t > 70) { b.st = 2; b.t = 0; b.vx = 0; shake = 6; } }
        else if (b.t > 40) done();
        break;
      case 'volley':
        if (b.st === 0) { b.face = Math.sign(dx) || b.face; if (b.t > 26 / sp) { const n = b.ph2 ? 5 : 3; for (let i = 0; i < n; i++) foeShot(b.x + b.face * 10, b.y - 18, L.shot, pc, py + (i - (n - 1) / 2) * 14, L.shot === 'ball' ? 2 : 1); b.st = 2; b.t = 0; } }
        else if (b.t > 30) done();
        break;
      case 'leap':
        if (b.st === 0) { if (b.t > 14) { b.vy = -5.4; b.vx = Math.max(-3, Math.min(3, dx / 44)); b.face = Math.sign(dx) || b.face; b.st = 1; b.t = 0; } }
        else if (b.st === 1) { if (b.t > 4 && b.vy === 0) { b.vx = 0; shake = 8; ev('boom'); [-1, 1].forEach(d => shots.push({ x: b.x + d * 8, y: fl - 4, vx: d * 2.4, vy: 0, g: 0, k: 'wave', mine: false, life: 120, dmg: 1 })); b.st = 2; b.t = 0; } }
        else if (b.t > 36) done();
        break;
      case 'sweep':
        if (b.st === 0) { b.face = Math.sign(dx) || b.face; if (adx > 26 && b.t < 60) b.vx = b.face * .95 * sp; else { b.vx = 0; b.st = 1; b.t = 0; } }
        else if (b.st === 1) { if (b.t > 18 / sp) { b.st = 2; b.t = 0; ev('swing'); } }
        else if (b.st === 2) { if (front(32)) hurtP(2, b.x); if (b.t > 8) { b.st = 3; b.t = 0; } }
        else if (b.t > 30) done();
        break;
      case 'blast':
        if (b.st === 0) { b.face = Math.sign(dx) || b.face; if (b.t > 36 / sp) { foeShot(b.x + b.face * 12, b.y - 16, 'ball', pc, py, 2); b.st = 2; b.t = 0; } }
        else if (b.t > 30) done();
        break;
      case 'bombs':
        if (b.st === 0) { if (b.t > 24) { for (let i = -1; i <= 1; i++) { const tx = pc + i * 22, time = 50; shots.push({ x: b.x, y: b.y - 24, vx: (tx - b.x) / time, vy: -4.5, g: .18, k: 'bomb', mine: false, life: 200, dmg: 2, fuse: -1 }); } ev('throw'); b.st = 2; b.t = 0; } }
        else if (b.t > 40) done();
        break;
      case 'teleport':
        if (b.st === 0) { b.alpha = Math.max(0, 1 - b.t / 24); if (b.t > 24) { const side = P.face > 0 ? -1 : 1; b.x = Math.max(3 * T, Math.min((MW - 3) * T, pc + side * 28)); b.face = -side; b.st = 1; b.t = 0; } }
        else if (b.st === 1) { b.alpha = Math.min(1, b.t / 8); if (b.t > 14 / sp) { b.st = 2; b.t = 0; ev('swing'); } }
        else if (b.st === 2) { if (front(28)) hurtP(2, b.x); if (b.t > 8) { b.st = 3; b.t = 0; } }
        else if (b.t > 30) done();
        break;
      case 'rain':
        if (b.st === 0) { if (b.t > 20) { b.marks = []; for (let i = 0; i < 6; i++) b.marks.push(Math.max(3 * T, Math.min((MW - 3) * T, pc + (i - 2.5) * 22 + (Math.random() - .5) * 8))); b.st = 1; b.t = 0; } }
        else if (b.st === 1) { if (b.t > 50) { b.marks.forEach(x => shots.push({ x: x, y: cam.y + 4, vx: 0, vy: 4, g: 0, k: 'down', mine: false, life: 80, dmg: 1 })); b.marks = []; b.st = 2; b.t = 0; } }
        else if (b.t > 30) done();
        break;
    }
    if (landed && b.mv !== 'leap') shake = 3;
  }
  function shotTick(s) {
    s.vy += s.g; s.x += s.vx; s.y += s.vy; s.life--;
    if (s.k === 'smokebomb') {   // a thrown smoke bomb bursts where it lands, or on the first one it hits
      const c = Math.floor(s.x / T), r = Math.floor((s.y + 2) / T), t = tile(c, r);
      const onFoe = foes.some(e => e.st === 'live' && ov(s.x - 2, s.y - 2, 4, 4, e.x - 3, e.y - 13, 6, 13)) || (boss && !boss.dead && ov(s.x - 2, s.y - 2, 4, 4, boss.x - 7, boss.y - 26, 14, 26));
      if (solid(c, r) || (t === 2 && s.vy > 0) || onFoe || s.life <= 0 || s.y > MH * T) { s.life = 0; puffAt(s.x, Math.min(s.y, MH * T) - 4); }
      return;
    }
    if (s.k === 'bomb') {
      if (s.fuse < 0 && (solid(Math.floor(s.x / T), Math.floor((s.y + 2) / T)) || tile(Math.floor(s.x / T), Math.floor((s.y + 2) / T)) === 2)) { s.vx = s.vy = s.g = 0; s.fuse = 24; }
      if (s.fuse > 0 && --s.fuse === 0) { s.life = 0; ev('boom'); burst(s.x, s.y, '#f8a030', 12); if (Math.hypot(P.x + 3 - s.x, P.y + P.h / 2 - s.y) < 20) hurtP(s.dmg, s.x); }
      return;
    }
    if (s.k !== 'wave' && solid(Math.floor(s.x / T), Math.floor(s.y / T))) { s.life = 0; burst(s.x, s.y, '#bcbcbc', 3); return; }
    if (s.k === 'wave' && (s.x < 2 * T || s.x > (MW - 2) * T)) { s.life = 0; return; }
    if (s.mine) {
      for (const e of foes) if (e.st === 'live' && ov(s.x - 1, s.y - 1, 3, 3, e.x - 3, e.y - 13, 6, 13)) { const r = hitFoe(e, s.dmg, 'star', s.x - s.vx * 3); s.life = 0; if (r === 'block') { s.vx = -s.vx * .5; s.vy = -2; s.g = .2; s.life = 20; s.mine = false; s.dmg = 0; } return; }
      for (const c of civs) if (ov(s.x - 1, s.y - 1, 3, 3, c.x - 3, c.y - 13, 6, 13)) { hitCiv(c); s.life = 0; return; }
      for (const j of jars) if (!j.broken && ov(s.x - 1, s.y - 1, 3, 3, j.x - 4, j.y - 9, 8, 9)) { breakJar(j); s.life = 0; return; }
      if (boss && !boss.dead && ov(s.x - 1, s.y - 1, 3, 3, boss.x - 7, boss.y - 26, 14, 26)) { const r = hitBoss(1, 'star', s.x - s.vx * 3); s.life = 0; if (r === 'block') { s.vx = -s.vx * .5; s.vy = -2; s.g = .2; s.life = 20; s.mine = false; s.dmg = 0; } return; }
    } else if (s.dmg > 0 && ov(s.x - 1, s.y - (s.k === 'wave' ? 3 : 1), 3, s.k === 'wave' ? 6 : 3, P.x, P.y, P.w, P.h)) { hurtP(s.dmg, s.x - s.vx * 3); s.life = 0; }
  }
  function itemTick(it) {
    it.t++;
    if (it.pull) { const dx = P.x + 3 - it.x, dy = P.y + 5 - it.y, d = Math.hypot(dx, dy); if (d < 5) { collect(it); return; } it.x += dx / d * 4; it.y += dy / d * 4; return; }
    if (!it.fixed) {
      it.vy = Math.min(4, it.vy + .2); it.x += it.vx; it.vx *= .96;
      const r = Math.floor((it.y + it.vy + 3) / T), c = Math.floor(it.x / T), t = tile(c, r);
      if (it.vy > 0 && (t === 1 || t === 4 || (t === 2 && it.k !== 'crystal')) && it.y + 3 <= r * T + 1) { it.y = r * T - 3; it.vy = 0; it.vx *= .6; } else it.y += it.vy;
      if (it.y > MH * T + 20) it.got = true;
    }
    if (ov(P.x - 1, P.y - 1, P.w + 2, P.h + 2, it.x - 3, it.y - 3, 6, 6)) collect(it);
  }
  function pullItem() {   // the hook rope with no ring in reach: pull the nearest thing that is out of reach
    let best = null, bd = 76;
    const cx = P.x + 3, cy = P.y + P.h / 2;
    items.forEach(it => { if (it.got || it.pull) return; const d = Math.hypot(it.x - cx, it.y - cy); if (d < bd && d > 14 && (it.x - cx) * P.face > -10) { best = it; bd = d; } });
    if (best) { best.pull = true; ev('hook'); P.rope = { x: best.x, y: best.y, t: 8 }; }
    else P.rope = { x: cx + P.face * 40, y: cy - 30, t: 6, miss: true };
  }
  function update() {
    frame++;
    if (msgT > 0) msgT--; if (banner > 0) banner--; if (shake > 0) shake--;
    if (demo) {   // self-play moves on by itself between stages
      if (state === 'title' && frame > 90) newGame();
      else if ((state === 'clear' || state === 'story') && frame - endAt > 120) go();
      else if ((state === 'over' || state === 'win') && frame - endAt > 240) { state = 'title'; frame = 0; quiet(); }
    }
    if (state === 'title' || state === 'story' || state === 'over' || state === 'win') return;
    bits.forEach(b => { b.x += b.vx; b.y += b.vy; b.vy += .15; b.l--; }); bits = bits.filter(b => b.l > 0);
    floats.forEach(f => { f.y -= .4; f.t--; }); floats = floats.filter(f => f.t > 0);
    if (state === 'clear') return;
    if (state === 'down') { if (--P.downT <= 0) respawn(); return; }
    let k = { l: keys.left, r: keys.right, u: keys.up, d: keys.down, a: keys.a, aP: hit.a, uP: hit.up, dP: hit.down }, bP = hit.b;
    hit.a = hit.up = hit.down = hit.b = false;
    if (demo) { const o = botInput(); k = o.k; bP = !!o.b; }
    if (bP) {
      if (P.on && keys.down && !P.slide) cycleWeapon();
      else if (!P.on && P.st === 'free' && keys.down && !demo) bash();
      else if (!P.on && P.st === 'free' && !P.dj && weapon < 2 && !P.kick && !P.bash) kick();
      else if (WEAPONS[weapon] === 'SMOKE' && !demo && P.st === 'free' && smoke > 0 && P.cool <= 0) P.aim = { t: 0 };
      else attack();
    }
    if (P.aim) { if (keys.b && P.st === 'free') P.aim.t++; else { const t = P.aim.t; P.aim = null; if (t < 10) attack(); else throwSmoke(t); } }
    if (P.kick > 0) { P.kick--; P.vx = P.face * 3.2; if (P.on || P.st !== 'free') P.kick = 0; }
    if (P.bash) { if (P.st !== 'free') P.bash = false; else { P.vx = 0; P.vy = 4.6; } }
    physics(P, k);
    if (P.bash && P.on) bashLand();
    if (P.kick > 0) strike(P.face > 0 ? P.x + P.w - 2 : P.x - 8, P.y + 4, 10, 9, 2, 'KICK');
    if (P.bash) strike(P.x - 2, P.y + P.h - 4, P.w + 4, 10, 2, 'BASH');
    if (P.slide > 0) strike(P.face > 0 ? P.x + P.w - 1 : P.x - 7, P.y, 8, P.h, 1, 'SLIDE');
    if (k.uP && P.st === 'free' && !P.crouch) pullItem();
    if (P.rope && --P.rope.t <= 0) P.rope = null;
    if (P.cool > 0) P.cool--; if (P.throwT > 0) P.throwT--; if (P.inv > 0) P.inv--;
    if (P.atk > 0) {
      const e0 = (P.atkW === 'SWORD' ? 16 : 12) - P.atk, live = P.atkW === 'SWORD' ? e0 >= 4 && e0 <= 9 : e0 >= 3 && e0 <= 8;
      if (live) {
        const reach = P.atkW === 'SWORD' ? 15 : 12, bx = P.face > 0 ? P.x + P.w - 1 : P.x - reach + 1, by = P.y - (P.on ? 2 : 4), bh = P.h + (P.on ? 3 : 14);   // in the air the blow reaches further down
        foes.forEach(e => { if (e.st === 'live' && e.hitId !== P.atkId && ov(bx, by, reach, bh, e.x - 3, e.y - 13, 6, 13)) { e.hitId = P.atkId; hitFoe(e, P.atkW === 'SWORD' ? 2 : 1, P.atkW, P.x + 3); } });
        civs.forEach(c => { if (ov(bx, by, reach, bh, c.x - 3, c.y - 13, 6, 13)) hitCiv(c); });
        jars.forEach(j => { if (!j.broken && ov(bx, by, reach, bh, j.x - 4, j.y - 9, 8, 9)) breakJar(j); });
        if (boss && !boss.dead && boss.hitId !== P.atkId && ov(bx, by, reach, bh, boss.x - 7, boss.y - 26, 14, 26)) { boss.hitId = P.atkId; hitBoss(P.atkW === 'SWORD' ? 2 : 1, P.atkW, P.x + 3); }
      }
      P.atk--;
    }
    if (spiked(P)) { hurtP(1, P.x + 3 - P.face * 4); if (state === 'play') P.vy = -3.2; }
    if (P.y > MH * T + 10) {   // fell into a pit: back to the last safe ground, two hearts less
      P.x = P.safe.x; P.y = P.safe.y; P.vx = P.vy = 0; P.st = 'free'; P.inv = 0; hurtP(2, P.x + 3);
      if (state === 'play') { P.x = P.safe.x; P.y = P.safe.y; P.vx = P.vy = 0; }
    }
    if (P.on && P.st === 'free' && !P.crouch && solid(Math.floor(P.x / T), Math.floor((P.y + P.h + 1) / T)) && solid(Math.floor((P.x + P.w) / T), Math.floor((P.y + P.h + 1) / T)) && !spiked(P)) P.safe = { x: P.x, y: P.y };
    cps.forEach(c => { if (!c.lit && P.x + 3 > c.x - 2 && Math.abs(P.y + P.h - c.y) < 40) { c.lit = true; cp = { x: c.x - 3, y: c.y - 11 }; ev('item'); say('CHECKPOINT'); } });
    if (exit && ov(P.x, P.y, P.w, P.h, exit.x, exit.y - 24, 20, 24)) { if (capsLeft() === 0) { stageClear(false); return; } else if (msgT <= 0) say('THE GATE IS SHUT. ' + capsLeft() + ' CAPTAIN' + (capsLeft() > 1 ? 'S' : '') + ' LEFT'); }
    foes.forEach(foeTick); civs.forEach(civTick); bossTick();
    shots.forEach(shotTick); shots = shots.filter(s => s.life > 0);
    items.forEach(it => { if (!it.got) itemTick(it); }); items = items.filter(it => !it.got);
    smokes.forEach(s => { s.t--; s.r = s.t > 300 ? Math.min(26, s.r + 1.2) : Math.min(26, s.r); if (s.t < 40) s.r *= .97; }); smokes = smokes.filter(s => s.t > 0);
    const tx = P.x + 3 - VW / 2 + P.face * 18, ty = P.y + 5 - VH * .56;
    cam.x += (tx - cam.x) * .12; cam.y += (ty - cam.y) * .12;
    cam.x = Math.max(0, Math.min(MW * T - VW, cam.x)); cam.y = Math.max(0, Math.min(MH * T - VH + 33 / VS, cam.y));
  }

  // ---------- drawing ----------
  const STEEL = '#dfe4ec', WOOD = '#8a5a30', GOLD = '#e8b830';
  function disc(cx, cy, r, c) { for (let y = -r; y <= r; y++) { const w = Math.round(Math.sqrt(r * r - y * y)); rect(cx - w, cy + y, w * 2, 1, c); } }
  // a person, 8 dots wide and 13 high, standing on (x, y), facing f. L: hat, coat, trim, skin, wpn and the extras
  function person(x, y, f, L, pose, walk) {
    const ox = Math.round(x) - 4, oy = Math.round(y) - 13 - (L.tall ? 1 : 0);
    const R = (dx, dy, w, h, c) => rect(f > 0 ? ox + dx : ox + 8 - dx - w, oy + dy, w, h, c);
    const coat = L.coat, dark = L.dark || (L.dark = mix(coat, '#000000', .35)), skin = L.skin || '#e8b890', trim = L.trim || mix(coat, '#ffffff', .3), legs = L.legs || '#2a2420';
    if (L.banner) { R(0, -7, 1, 15, '#4a3020'); R(-3, -7, 3, 5, L.banner); R(-3, -7, 3, 1, '#d82800'); }
    R(0, 6, 1, 3, dark);
    const s = Math.floor((walk || 0) / 4) % 2;
    if (pose === 'cower') { R(1, 9, 6, 4, legs); }
    else if (s && pose === 'walk') { R(1, 10, 2, 3, legs); R(5, 10, 2, 3, legs); R(1, 12, 2, 1, '#1a1410'); R(5, 12, 2, 1, '#1a1410'); }
    else { R(2, 10, 2, 3, legs); R(4, 10, 2, 3, legs); R(2, 12, 2, 1, '#1a1410'); R(4, 12, 2, 1, '#1a1410'); }
    const by = pose === 'cower' ? 3 : 0;
    R(1, 6 + by, 6, 4, coat); R(1, 9 + by, 6, 1, trim);
    if (L.long) R(1, 10, 6, 1, coat);
    if (L.scales) { R(2, 7 + by, 4, 1, dark); }
    if (L.plate) R(2, 6 + by, 4, 3, '#b8bcc4');
    R(2, 2 + by, 4, 4, skin); R(5, 3 + by, 1, 1, '#101018');
    if (L.beard) R(3, 5 + by, 3, 1, '#3a2a1a');
    const hy = by;
    switch (L.hat) {
      case 'fur': R(2, 0 + hy, 4, 2, L.hatc || '#a02828'); R(3, -1 + hy, 2, 1, L.hatc || '#a02828'); R(1, 2 + hy, 6, 1, '#e8dcc0'); break;
      case 'spike': R(2, 0 + hy, 4, 2, '#8a8a92'); R(1, 2 + hy, 6, 1, '#5a5a62'); R(3, -2 + hy, 2, 2, '#c8c8d0'); break;
      case 'round': R(2, 0 + hy, 4, 1, '#5a5a64'); R(1, 1 + hy, 6, 2, '#6a6a74'); R(3, -2 + hy, 2, 2, '#d82800'); break;
      case 'cap': R(2, 1 + hy, 4, 2, L.hatc || '#2a2a2a'); break;
      case 'morion': R(2, 0 + hy, 4, 2, '#c8ccd4'); R(0, 2 + hy, 8, 1, '#a8acb4'); R(3, -2 + hy, 3, 2, '#c8ccd4'); break;
      case 'brim': R(2, 0 + hy, 4, 2, '#3a2a1a'); R(0, 2 + hy, 8, 1, '#3a2a1a'); break;
      case 'jingasa': R(3, 0 + hy, 2, 1, '#2a2a2a'); R(1, 1 + hy, 6, 1, '#3a3a3a'); R(0, 2 + hy, 8, 1, '#2a2a2a'); break;
      case 'kabuto': R(1, 0 + hy, 6, 3, '#1a1a1a'); R(0, 2 + hy, 1, 3, '#1a1a1a'); R(7, 2 + hy, 1, 2, '#1a1a1a'); if (!L.moon) { R(2, -2 + hy, 1, 2, GOLD); R(5, -2 + hy, 1, 2, GOLD); R(3, -1 + hy, 2, 1, GOLD); } break;
    }
    if (L.plume) R(4, -5 + hy, 2, 4, L.plume);
    if (L.crown) { R(2, -3 + hy, 4, 2, GOLD); R(3, -4 + hy, 1, 1, GOLD); R(5, -4 + hy, 1, 1, GOLD); }
    if (L.moon) { R(1, -3 + hy, 1, 2, '#d82800'); R(2, -4 + hy, 4, 1, '#d82800'); R(6, -3 + hy, 1, 2, '#d82800'); }
    if (pose === 'cower') { R(1, 1, 6, 1, skin); return; }
    let hx = 6, hyy = 9;
    if (pose === 'wind') { R(5, 4, 1, 2, coat); hx = 5; hyy = 3; }
    else if (pose === 'strike') { R(6, 7, 3, 1, coat); hx = 9; hyy = 7; }
    else if (pose === 'aim') { R(6, 7, 2, 1, coat); hx = 8; hyy = 7; }
    else R(6, 6, 1, 3, coat);
    R(hx, hyy, 1, 1, skin);
    const wp = L.wpn, pl = { lance: 16, pike: 20, yari: 15, halberd: 15 }[wp];
    if (wp === 'sabre' || wp === 'katana' || wp === 'dao' || wp === 'rapier') {
      const len = wp === 'rapier' ? 8 : 7;
      if (pose === 'wind') R(hx - 6, hyy - 1, 6, 1, STEEL);
      else if (pose === 'strike') { R(hx + 1, hyy, len, 1, STEEL); if (wp === 'sabre') R(hx + len, hyy - 1, 1, 1, STEEL); }
      else { R(hx, hyy - 6, 1, 6, STEEL); R(hx - 1, hyy, 3, 1, GOLD); }
    } else if (pl) {
      if (pose === 'wind') { R(hx - pl + 6, hyy + 1, pl, 1, WOOD); R(hx + 6, hyy + 1, 2, 1, STEEL); }
      else if (pose === 'strike') { R(hx - 4, hyy, pl, 1, WOOD); R(hx - 4 + pl, hyy, 3, 1, STEEL); if (wp === 'halberd') R(hx - 5 + pl, hyy - 2, 2, 2, STEEL); }
      else { R(hx, hyy - pl + 4, 1, pl, WOOD); R(hx, hyy - pl + 2, 1, 2, STEEL); if (wp === 'halberd') R(hx + 1, hyy - pl + 3, 2, 3, STEEL); }
    } else if (wp === 'bow') {
      const bx = hx + (pose === 'aim' || pose === 'wind' ? 1 : 0);
      R(bx, hyy - 5, 1, 9, '#6a4020'); R(bx - 1, hyy - 6, 1, 1, '#6a4020'); R(bx - 1, hyy + 4, 1, 1, '#6a4020');
      if (pose === 'aim' || pose === 'wind') R(bx - 3, hyy, 3, 1, '#e8e0c8');
    } else if (wp === 'xbow') { R(hx - 2, hyy, 6, 1, WOOD); R(hx + 3, hyy - 2, 1, 5, '#5a5a5a'); }
    else if (wp === 'musket') {
      if (pose === 'aim' || pose === 'wind' || pose === 'strike') { R(hx - 5, hyy, 4, 2, WOOD); R(hx - 1, hyy, 10, 1, '#3a3a3a'); }
      else R(hx, hyy - 10, 1, 11, '#3a3a3a');
    }
    if (L.shield === 'big') { R(5, 5, 3, 7, L.shieldc || '#7a2a2a'); R(6, 8, 1, 1, GOLD); }
    else if (L.shield === 'small') { R(6, 7, 2, 3, '#c8ccd4'); }
  }
  function lying(x, y, f, L, ko) {
    const X = Math.round(x), Y = Math.round(y);
    rect(X - 6, Y - 3, 12, 3, L.coat); rect(f > 0 ? X - 9 : X + 6, Y - 4, 3, 3, L.skin || '#e8b890');
    rect(f > 0 ? X - 10 : X + 9, Y - 5, 2, 3, '#3a3a3a');
    if (ko) for (let i = 0; i < 3; i++) { const a = frame * .08 + i * 2.1; rect(X + Math.cos(a) * 6, Y - 9 + Math.sin(a) * 2, 1, 1, '#f8d030'); }
  }
  const lookOf = e => e.look || (e.look = Object.assign({ coat: e.coat, skin: e.skin, tall: e.tall }, e.d, e.cap ? { trim: e.cap.trim, plume: e.cap.plume, banner: e.cap.banner, shieldc: '#202020' } : {}, { coat: e.coat }));
  // the ninja: 8 dots wide and 11 high, a dark suit, a red scarf, the eyes between the cloth
  function ninja() {
    const p = P, low = p.crouch && !p.slide, S = low ? '#232c44' : '#3e4c6e', S2 = low ? '#3a4868' : '#62739c', RED = low ? '#a01e00' : '#d82800', SKIN = '#f0c8a0';   // version 21 (Sam): light suit standing, dark when crouched: hidden from soldiers who have not seen him
    let x = p.x, y = p.y, pose = 'stand';
    if (p.st === 'climb') { const q = 1 - p.ct / 14, tx = p.face > 0 ? p.lx * T + 1 : p.lx * T + T - p.w - 1, ty = p.ly * T - 11; x = x + (tx - x) * q; y = y + (ty - y) * q; pose = 'jump'; }
    else if (p.st === 'hang') pose = 'hang'; else if (p.st === 'rope') pose = 'rope';
    else if (state === 'down') pose = 'down';
    else if (p.crouch) pose = 'crouch'; else if (!p.on) pose = 'jump'; else if (Math.abs(p.vx) > .3) pose = 'run';
    if (p.inv > 0 && state === 'play' && frame % 6 < 3) return;
    const ox = Math.round(x - cam.x) - 1, oy = Math.round(y - cam.y) - (pose === 'crouch' ? 4 : 0), f = p.face;
    const R = (dx, dy, w, h, c) => rect(f > 0 ? ox + dx : ox + 8 - dx - w, oy + dy, w, h, c);
    if (hidden()) g.globalAlpha = .55;
    if (pose === 'down') { rect(ox - 2, oy + 8, 12, 3, S); rect(ox + (f > 0 ? 8 : -3), oy + 7, 3, 3, S); rect(ox, oy + 7, 3, 1, RED); g.globalAlpha = 1; return; }
    if (p.st === 'rope') { const hxx = ox + 4, hyy = oy - 1, rx = p.ring.x - cam.x, ry = p.ring.y - cam.y, n = Math.ceil(Math.hypot(rx - hxx, ry - hyy) / 2); for (let i = 0; i <= n; i++) rect(hxx + (rx - hxx) * i / n, hyy + (ry - hyy) * i / n, 1, 1, '#c8b890'); }
    if (p.rope) { const hxx = ox + 4, hyy = oy + 3, rx = p.rope.x - cam.x, ry = p.rope.y - cam.y, n = Math.ceil(Math.hypot(rx - hxx, ry - hyy) / 2); for (let i = 0; i <= n; i++) rect(hxx + (rx - hxx) * i / n, hyy + (ry - hyy) * i / n, 1, 1, '#c8b890'); }
    const tail = 2 + Math.min(4, Math.abs(p.vx) * 2.2), wave = frame % 20 < 10 ? 0 : 1;
    if (pose === 'crouch' && p.slide > 0) {   // the slide kick: low, one leg out in front
      R(0, 6, 4, 3, S); R(1, 7, 3, 1, SKIN); R(2, 7, 1, 1, '#101018'); R(1, 9, 5, 2, S); R(5, 10, 6, 1, S); R(10, 10, 1, 1, '#2a2030'); R(-tail, 7, tail, 1, RED);
      if (frame % 3 === 0) bits.push({ x: p.x + 3 - p.face * 3, y: p.y + p.h - 1, vx: -p.face * .5, vy: -.4, c: WORLDS[world].top, l: 10 });
    } else if (pose === 'crouch') {
      R(2, 4, 4, 4, S); R(3, 6, 4, 1, SKIN); R(5, 6, 1, 1, '#101018'); R(1, 8, 6, 2, S); R(5, 8, 1, 2, S2); R(0, 10, 8, 1, S); R(-tail + 1, 7 + wave, tail, 1, RED);
    } else {
      R(2, 0, 4, 4, S); R(3, 2, 4, 1, SKIN); R(5, 2, 1, 1, '#101018'); R(1, 1, 1, 1, '#8a6a3a'); R(0, 0, 1, 1, '#8a6a3a');
      R(1, 4, 5, 4, S); R(5, 4, 1, 4, S2); R(1, 7, 5, 1, '#6a1a1a');
      R(-tail + 1, 3 + wave, tail, 1, RED); R(-tail + 2, 4, Math.max(1, tail - 2), 1, RED);
      const ph = Math.floor((p.run = (p.run || 0) + Math.abs(p.vx) * .25)) % 4;
      if (pose === 'run') { if (ph < 2) { R(0, 8, 2, 2, S); R(4, 8, 2, 3, S); } else { R(2, 8, 2, 3, S); R(3, 8, 3, 2, S); } }
      else if (p.kick > 0) { R(1, 8, 2, 2, S); R(5, 8, 5, 2, S); R(9, 9, 2, 1, '#2a2030'); for (let i = 0; i < 3; i++) R(-3 - i * 3, 5 + i * 2, 2, 1, 'rgba(255,255,255,.4)'); }   // the flying kick
      else if (p.bash) { R(2, 8, 3, 4, S); R(2, 12, 3, 1, '#2a2030'); for (let i = 0; i < 3; i++) R(1 + i * 2, -4 - i * 2, 1, 3, 'rgba(255,255,255,.4)'); }   // the bash down
      else if (pose === 'jump' || pose === 'rope') { R(1, 8, 5, 2, S); R(4, 10, 2, 1, S); }
      else if (pose === 'hang') { R(2, 8, 2, 3, S); R(4, 8, 2, 3, S); }
      else { R(1, 8, 2, 3, S); R(4, 8, 2, 3, S); }
      if (pose === 'hang') { R(5, -2, 1, 6, S2); R(5, -2, 2, 1, SKIN); }
      else if (pose === 'rope') { R(4, -2, 1, 6, S2); R(4, -2, 1, 1, SKIN); }
      else if (p.atk > 0) {
        const e0 = (p.atkW === 'SWORD' ? 16 : 12) - p.atk;
        if (p.atkW === 'SWORD') {
          if (e0 < 4) { R(1, -5, 1, 6, STEEL); R(5, 4, 1, 2, S2); }
          else if (e0 <= 9) { R(6, 5, 2, 1, S2); R(8, 5, 10, 1, STEEL); R(8, 4, 8, 1, 'rgba(255,255,255,.35)'); R(8, 6, 8, 1, 'rgba(255,255,255,.35)'); }
          else { R(6, 6, 2, 1, S2); R(8, 7, 6, 1, STEEL); }
        } else {
          const a = e0 * 1.1 - 1.2, ax = 7 + Math.cos(a) * 3, ay = 5 + Math.sin(a) * 3;
          R(6, 5, 1, 1, S2); R(Math.round(ax), Math.round(ay), 1, 1, '#c8a060');
          for (let i = 0; i < 4; i++) R(Math.round(7 + Math.cos(a) * (3 + i * 2)), Math.round(5 + Math.sin(a) * (3 + i * 2)), 1, 1, i < 2 ? '#bcbcbc' : '#a07040');
        }
      }
      else if (p.throwT > 0) R(6, 5, 3, 1, S2);
      else R(5, 5, 1, 2, S2);
    }
    g.globalAlpha = 1;
  }
  function itemPic(it) {
    const x = Math.round(it.x - cam.x), y = Math.round(it.y - cam.y + (it.fixed ? Math.sin(frame * .08 + it.x) : 0));
    switch (it.k) {
      case 'coin': rect(x - 1, y - 2, 3, 4, '#f8d030'); rect(x, y - 1, 1, 2, '#a07810'); break;
      case 'gem': rect(x - 1, y - 3, 3, 1, '#bfe8ff'); rect(x - 2, y - 2, 5, 2, '#3cbcfc'); rect(x - 1, y, 3, 1, '#0058f8'); rect(x, y + 1, 1, 1, '#0058f8'); break;
      case 'stars': [[-2, 0], [2, -1], [0, 2]].forEach(o => { rect(x + o[0] - 1, y + o[1], 3, 1, STEEL); rect(x + o[0], y + o[1] - 1, 1, 3, STEEL); }); break;
      case 'flower': rect(x, y, 1, 3, '#2a8a2a'); rect(x - 1, y - 3, 3, 3, '#fcfcfc'); rect(x - 2, y - 2, 5, 1, '#fcfcfc'); rect(x, y - 2, 1, 1, '#f8d030'); break;
      case 'food': rect(x - 2, y - 1, 5, 3, '#f4f0e0'); rect(x - 1, y - 2, 3, 1, '#f4f0e0'); rect(x - 1, y + 1, 3, 1, '#203020'); break;
      case 'fast': case 'high': case 'heal': {
        const c = it.k === 'fast' ? '#3c8cff' : it.k === 'high' ? '#40d040' : '#e83030';
        rect(x - 2, y - 1, 5, 4, c); rect(x - 1, y - 3, 3, 2, '#d8e0e8'); rect(x - 1, y - 4, 3, 1, '#8a5a30'); rect(x - 1, y, 1, 1, '#fcfcfc'); break;
      }
      case 'scroll': rect(x - 3, y - 1, 7, 3, '#f0e0b0'); rect(x - 3, y - 2, 1, 5, '#a07040'); rect(x + 3, y - 2, 1, 5, '#a07040'); rect(x, y, 1, 1, '#d82800'); if (frame % 30 < 15) rect(x + 4, y - 4, 1, 1, '#fcfcfc'); break;
      case 'egg': {
        if (frame % 40 < 20) disc(x, y, 7, 'rgba(255,255,255,.12)');
        const e = it.egg;
        if (e === 'cat') { rect(x - 4, y, 7, 3, '#e88a30'); rect(x + 2, y - 2, 3, 3, '#e88a30'); rect(x + 2, y - 3, 1, 1, '#e88a30'); rect(x + 4, y - 3, 1, 1, '#e88a30'); rect(x - 5, y + 1, 1, 2, '#e88a30'); if (frame % 60 < 30) text('Z', x + 5, y - 9, '#fcfcfc'); }
        else if (e === 'deck') { rect(x - 3, y - 4, 7, 9, '#cbc7ba'); rect(x - 2, y - 3, 5, 4, '#3fd6c1'); rect(x - 2, y + 2, 1, 1, '#2b2b33'); rect(x + 2, y + 2, 1, 1, '#a8275f'); }
        else if (e === 'train') { rect(x - 5, y - 1, 8, 3, '#b3261e'); rect(x + 1, y - 3, 2, 2, '#ffb84d'); rect(x - 4, y + 2, 2, 1, '#2a2a2a'); rect(x, y + 2, 2, 1, '#2a2a2a'); }
        else if (e === 'para') { rect(x - 5, y - 5, 11, 2, '#f8d030'); rect(x - 4, y - 3, 1, 4, '#fcfcfc'); rect(x + 4, y - 3, 1, 4, '#fcfcfc'); rect(x - 1, y, 3, 3, '#0058f8'); }
        else { rect(x - 4, y + 2, 8, 2, '#fcfcfc'); rect(x, y - 3, 2, 2, '#fcfcfc'); }
        break;
      }
      case 'crystal': {
        const c = WORLDS[world].gem; if (frame % 10 < 5) disc(x, y, 7, 'rgba(255,255,255,.18)');
        rect(x - 1, y - 6, 3, 2, c); rect(x - 3, y - 4, 7, 6, c); rect(x - 2, y + 2, 5, 2, c); rect(x - 1, y + 4, 3, 1, c); rect(x - 2, y - 3, 2, 3, '#fcfcfc'); break;
      }
    }
  }
  function backdrop() {
    const Wd = WORLDS[world], s = Wd.sky;
    for (let i = 0; i < 8; i++) { const t = i / 7; rect(0, i * 24, W, 24, t < .5 ? mix(s[0], s[1], t * 2) : mix(s[1], s[2], (t - .5) * 2)); }
    const b = Wd.back, px = cam.x * .12, mx = cam.x * .4, base = 150 + Math.max(0, MH * T - VH - cam.y) * .3;   // looking up the tall stages, the far land sinks a little
    if (b === 'steppe') disc(156, 104, 15, '#f8c860');
    else if (b === 'wall') disc(44, 40, 10, '#f0f0d8');
    else if (b === 'castle') { for (let i = 0; i < 24; i++) rect((i * 53 + 17) % W, (i * 31) % 90, 1, 1, '#8a8ab0'); disc(160, 44, 16, '#c83030'); disc(156, 40, 16, 'rgba(255,120,120,.12)'); }
    for (let x = 0; x < W; x += 2) {
      const hh = 34 + Math.sin((x + px) / 37) * 12 + Math.sin((x + px) / 13) * 4, top = base - 26 - hh;
      rect(x, top, 2, H - top, Wd.far);
      if (b === 'wall' && Math.floor((x + px) / 2) % 4 === 0) rect(x, top - 3, 2, 3, '#8a8a7a');
    }
    for (let i = -1; i < 4; i++) {
      const ox = Math.floor(mx / 150) * 150 + i * 150, X = Math.round(ox - mx + 40), Y = Math.round(base);
      if (b === 'steppe') { disc(X, Y - 2, 12, '#d8cfc0'); rect(X - 12, Y - 2, 24, 14, '#d8cfc0'); rect(X - 2, Y + 2, 4, 10, '#7a3a2a'); rect(X - 12, Y + 4, 24, 1, '#b04a30'); rect(X - 1, Y - 15, 2, 3, '#7a3a2a'); }
      else if (b === 'wall') { for (let k = 0; k < 4; k++) { rect(X - 12 + k * 2, Y - 10 - k * 12, 24 - k * 4, 3, '#2a4a3e'); rect(X - 8 + k * 2, Y - 7 - k * 12, 16 - k * 4, 9, '#8a2a24'); } rect(X - 9, Y + 2, 18, 12, '#8a2a24'); }
      else if (b === 'jungle') { rect(X - 2, Y - 40, 5, 54, '#2a3a20'); disc(X, Y - 42, 14, Wd.mid); disc(X + 10, Y - 34, 10, Wd.mid); if (i % 2 === 0) for (let k = 0; k < 4; k++) rect(X + 40 + k * 4, Y - 26 + k * 8, 40 - k * 8, 8, '#3e4e38'); }
      else { for (let k = 0; k < 3; k++) { rect(X - 16 + k * 4, Y - 14 - k * 13, 32 - k * 8, 3, '#1a1a2a'); rect(X - 12 + k * 4, Y - 11 - k * 13, 24 - k * 8, 10, '#d8d4cc'); } rect(X - 14, Y - 1, 28, 15, '#3a3a44'); disc(X + 60, Y - 6, 9, '#c88aa8'); rect(X + 59, Y + 2, 2, 12, '#3a2a2a'); }
    }
    if (b === 'castle') for (let i = 0; i < 10; i++) rect((i * 41 + frame * .6) % W, (i * 23 + frame * .4) % H, 1, 1, '#f0b0c8');
    if (b === 'steppe') for (let i = 0; i < 8; i++) rect((i * 61 - frame * .5 + 999 * W) % W, (i * 29 + frame * .2) % H, 1, 1, 'rgba(255,230,200,.5)');
  }
  function tiles() {
    const Wd = WORLDS[world], c0 = Math.max(0, Math.floor(cam.x / T)), c1 = Math.min(MW - 1, Math.floor((cam.x + VW) / T)), r0 = Math.max(0, Math.floor(cam.y / T)), r1 = Math.min(MH - 1, Math.floor((cam.y + VH) / T)), b = Wd.back;
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      const t = grid[r * MW + c]; if (!t) continue;
      const X = c * T - Math.round(cam.x), Y = r * T - Math.round(cam.y);
      if (t === 1) {
        rect(X, Y, T, T, Wd.ground);
        if (b === 'wall' || b === 'castle') { rect(X, Y + 7, T, 1, Wd.speck); rect(X + (r % 2 ? 0 : 4), Y + 3, 1, 4, Wd.speck); }
        else if ((c * 31 + r * 17) % 5 === 0) rect(X + 3, Y + 4, 2, 1, Wd.speck);
        if (!solid(c, r - 1) && tile(c, r - 1) !== 3) { rect(X, Y, T, 2, Wd.top); if (b !== 'wall' && b !== 'castle' && c % 3 === 0) rect(X + 2, Y - 1, 1, 1, Wd.top); }
      } else if (t === 4) {
        const roof = tile(c, r - 1) !== 4;
        rect(X, Y, T, T, Wd.wall);
        if (b === 'steppe') { if ((c + r) % 2 === 0) rect(X + 3, Y + 3, 2, 2, Wd.line); }
        else if (b === 'wall') { if (c % 3 === 0) rect(X + 3, Y, 2, T, Wd.line); }
        else if (b === 'jungle') { rect(X, Y + 3, T, 1, Wd.line); if ((c + r) % 3 === 0) rect(X + 2, Y + 5, 4, 1, Wd.line); }
        else { rect(X, Y + 5, T, 1, Wd.line); if (c % 3 === 0) rect(X + 3, Y, 1, T, Wd.line); }
        if (roof) { rect(X - 1, Y, T + 2, 3, Wd.roof); rect(X - 1, Y + 3, T + 2, 1, mix(Wd.roof, '#000000', .4)); }
      } else if (t === 2) { rect(X, Y, T, 2, Wd.plankTop); rect(X, Y + 2, T, 1, Wd.plank); if (c % 2 === 0) rect(X + 3, Y + 3, 1, 2, Wd.plank); }
      else if (t === 3) { for (let i = 0; i < 2; i++) { rect(X + 1 + i * 4, Y + 5, 3, 3, Wd.spike); rect(X + 2 + i * 4, Y + 2, 1, 3, Wd.spike); } }
    }
  }
  function drawWorld() {
    tiles();
    const Wd = WORLDS[world];
    rings.forEach(rg => { const x = Math.round(rg.x - cam.x), y = Math.round(rg.y - cam.y), near = P && Math.hypot(rg.x - P.x - 3, rg.y - P.y - 5) < HOOKR && rg.y < P.y; rect(x - 2, y - 3, 5, 1, GOLD); rect(x - 2, y + 2, 5, 1, GOLD); rect(x - 3, y - 2, 1, 4, GOLD); rect(x + 3, y - 2, 1, 4, GOLD); if (near && frame % 30 < 15) { rect(x - 4, y - 4, 1, 1, '#fcfcfc'); rect(x + 4, y + 3, 1, 1, '#fcfcfc'); } });
    cps.forEach(c => { const x = Math.round(c.x - cam.x), y = Math.round(c.y - cam.y); rect(x, y - 18, 1, 18, '#3a2a1a'); rect(x - 2, y - 22, 5, 5, c.lit ? '#f8a030' : '#5a4a3a'); if (c.lit) disc(x, y - 20, 6, 'rgba(248,160,48,.18)'); });
    if (exit) {
      const x = Math.round(exit.x - cam.x), y = Math.round(exit.y - cam.y), open = capsLeft() === 0;
      rect(x, y - 26, 3, 26, Wd.gate); rect(x + 17, y - 26, 3, 26, Wd.gate); rect(x - 3, y - 29, 26, 3, Wd.gate); rect(x - 1, y - 23, 22, 2, Wd.gate);
      if (!open) for (let i = 0; i < 4; i++) rect(x + 5 + i * 3, y - 21, 1, 21, '#3a3a3a');
      else if (frame % 40 < 20) disc(x + 10, y - 12, 6, 'rgba(255,240,180,.25)');
    }
    jars.forEach(j => { const x = Math.round(j.x - cam.x), y = Math.round(j.y - cam.y); if (j.broken) { rect(x - 4, y - 2, 3, 2, Wd.plank); rect(x + 1, y - 1, 3, 1, Wd.plank); } else { rect(x - 3, y - 8, 6, 8, Wd.plank); rect(x - 4, y - 6, 8, 4, Wd.plankTop); rect(x - 2, y - 9, 4, 1, Wd.plank); } });
    items.forEach(it => { if (!it.got) itemPic(it); });
    civs.forEach(c => person(c.x - cam.x, c.y - cam.y, c.face, c, c.cower > 0 ? 'cower' : c.walk && c.pause <= 0 ? 'walk' : 'stand', c.walk));
    foes.forEach(e => {
      const L = lookOf(e), x = e.x - cam.x, y = e.y - cam.y;
      if (e.st !== 'live') { lying(x, y, e.face, L, e.st === 'ko'); if (!e.looted && frame % 20 < 10) rect(Math.round(x), Math.round(y) - 8, 1, 1, '#f8d030'); return; }
      if (x < -30 || x > VW + 30) return;
      const pose = e.ph === 'wind' ? (e.d.ranged || e.sp === 'pistol' ? 'aim' : 'wind') : e.ph === 'strike' || e.ph === 'dash' || e.ph === 'spin' ? 'strike' : e.ph === 'rec' && e.d.ranged ? 'aim' : e.alert || !e.guard ? 'walk' : 'stand';
      if (e.flash > 0 && frame % 4 < 2) g.globalAlpha = .4;
      if (e.ph === 'spin' && frame % 8 < 4) person(x, y, -e.face, L, 'strike', e.walk); else person(x, y, e.face, L, pose, e.walk);
      g.globalAlpha = 1;
      if (e.ph === 'wind' && e.t < 10 && frame % 4 < 2) rect(Math.round(x) + e.face * 6, Math.round(y) - 15, 1, 1, '#fcfcfc');
      if (e.stun > 0 && e.smoked) for (let i = 0; i < 3; i++) { const a = frame * .1 + i * 2.1; rect(x + Math.cos(a) * 5, y - 17 + Math.sin(a) * 2, 1, 1, '#f8d030'); }
      if (e.alert) text('!', Math.round(x) - 1, Math.round(y) - 22, '#ff3020');
      else if (e.aw > 15) text('?', Math.round(x) - 1, Math.round(y) - 22, '#f8d030');
      if (e.cap && Math.abs(e.x - P.x) < 80) { const s = CAPS[world].name; text(s, Math.round(x - tw(s) / 2), Math.round(y) - 30, '#ff8060'); }
    });
    if (boss) {
      const b = boss, L = b.lord;
      if (b.marks.length) b.marks.forEach(x => { if (frame % 8 < 5) rect(Math.round(x - cam.x) - 2, Math.round((MH - 3) * T - cam.y) - 2, 5, 2, '#ff3020'); });
      if (!b.dead || frame % 2) {
        g.save(); g.translate(Math.round(b.x - cam.x), Math.round(b.y - cam.y)); g.scale(2, 2);
        g.globalAlpha = b.dead ? .35 : b.flash > 0 && frame % 4 < 2 ? .4 : b.alpha;
        const pose = b.dead ? 'cower' : (b.st === 0 && b.mv && b.mv !== 'sweep') || b.st === 1 ? (b.mv === 'volley' || b.mv === 'blast' ? 'aim' : 'wind') : b.st === 2 && (b.mv === 'sweep' || b.mv === 'teleport' || b.mv === 'rush') ? 'strike' : 'walk';
        person(0, 0, b.face, L, pose, b.walk / 2);
        g.restore(); g.globalAlpha = 1;
      }
    }
    if (P && state !== 'title') ninja();
    if (P && P.aim && P.aim.t >= 10) {   // the arc a smoke bomb will fly, while B is held
      const v = aimOf(P.aim.t); let x = P.x + 3 + P.face * 3, y = P.y + 3, vx = v.vx, vy = v.vy;
      for (let i = 0; i < 90; i++) { vy += .2; x += vx; y += vy; if (solid(Math.floor(x / T), Math.floor(y / T)) || y > MH * T) break; if (i % 3 === 0) rect(Math.round(x - cam.x), Math.round(y - cam.y), 1, 1, i % 6 ? '#fcfcfc' : '#bfe8ff'); }
      rect(Math.round(x - cam.x) - 2, Math.round(y - cam.y) - 2, 5, 1, '#fcfcfc'); rect(Math.round(x - cam.x) - 2, Math.round(y - cam.y) + 2, 5, 1, '#fcfcfc');
    }
    shots.forEach(s => {
      const x = Math.round(s.x - cam.x), y = Math.round(s.y - cam.y), d = Math.sign(s.vx) || 1;
      if (s.k === 'star') { const a = frame % 4 < 2; rect(x - 1, y, 3, 1, STEEL); rect(x, y - 1, 1, 3, STEEL); if (a) { rect(x - 1, y - 1, 1, 1, '#9aa0aa'); rect(x + 1, y + 1, 1, 1, '#9aa0aa'); } }
      else if (s.k === 'arrow' || s.k === 'longarrow') { rect(d > 0 ? x - 5 : x, y, 5, 1, '#c8a060'); rect(d > 0 ? x : x - 1, y, 1, 1, STEEL); rect(d > 0 ? x - 6 : x + 5, y - 1, 1, 3, '#fcfcfc'); }
      else if (s.k === 'bolt') rect(d > 0 ? x - 4 : x, y, 4, 1, '#a0a0a0');
      else if (s.k === 'ball') { rect(x - 1, y - 1, 3, 3, '#303030'); rect(x - 1, y - 1, 1, 1, '#909090'); }
      else if (s.k === 'wave') { rect(x - 3, y - 3, 6, 6, 'rgba(255,220,160,.7)'); rect(x - 2, y - 5, 4, 2, 'rgba(255,240,200,.6)'); }
      else if (s.k === 'down') { rect(x, y - 6, 1, 6, '#c8a060'); rect(x, y, 1, 1, STEEL); }
      else if (s.k === 'bomb') { rect(x - 2, y - 2, 4, 4, '#202020'); if (frame % 6 < 3) rect(x + 1, y - 4, 1, 2, '#f8a030'); }
      else if (s.k === 'smokebomb') { rect(x - 2, y - 2, 4, 4, '#e8ecf4'); rect(x - 1, y - 1, 2, 2, '#9aa4b8'); if (frame % 4 < 2) rect(x + 1, y - 4, 1, 2, '#fcfcfc'); }
    });
    smokes.forEach(s => { for (let i = 0; i < 7; i++) { const a = i * .9 + frame * .01; disc(Math.round(s.x - cam.x + Math.cos(a) * s.r * .5), Math.round(s.y - cam.y + Math.sin(a) * s.r * .3), Math.max(2, Math.round(s.r * .6)), 'rgba(220,224,232,.32)'); } });
    bits.forEach(b => rect(b.x - cam.x, b.y - cam.y, 1, 1, b.c));
    floats.forEach(f => text(f.s, Math.round(f.x - cam.x - tw(f.s) / 2), Math.round(f.y - cam.y), f.c));
  }
  function gemIcon(x, y, c) { rect(x + 1, y, 3, 1, c); rect(x, y + 1, 5, 3, c); rect(x + 1, y + 4, 3, 1, c); rect(x + 2, y + 5, 1, 1, c); }
  function hud() {
    rect(0, 0, W, 11, 'rgba(8,10,20,.82)');
    for (let i = 0; i < hpMax; i++) rect(3 + i * 6, 3, 5, 5, i < P.hp ? '#e83030' : '#40242c');
    let x = 6 + hpMax * 6;
    text('X' + lives, x, 3, '#fcfcfc'); x += 13;
    text(stage === 5 ? (world + 1) + '-LORD' : (world + 1) + '-' + (stage + 1), x, 3, '#f8d030'); x += 28;
    if (P.fast > 0) { text('FAST', x, 3, '#3c8cff'); x += 18; }
    if (P.high > 0) text('HIGH', x, 3, '#40d040');
    for (let i = 0; i < 4; i++) gemIcon(W - 58 + i * 7, 2, i < crystals ? WORLDS[i].gem : '#2a2a3a');
    for (let i = 0; i < scrollsHere; i++) rect(W - 80 + i * 6, 3, 4, 5, i < scrollsGot ? '#f0e0b0' : '#3a3428');
    if (eggGot) rect(W - 62, 4, 2, 3, '#fcfcfc');
    if (demo && frame % 60 < 40) text('SELF-PLAY', 112, 14, '#bfe8ff');
    text(String(score).padStart(6, '0'), W - 26, 3, '#fcfcfc');
    rect(0, H - 11, W, 11, 'rgba(8,10,20,.82)');
    rect(1, H - 10, 46, 9, '#24304a'); rect(1, H - 10, 46, 1, '#3a4868'); text(WEAPONS[weapon], 4, H - 8, '#f8d030');
    text('STARS ' + stars, 51, H - 8, weapon === 2 ? '#fcfcfc' : '#9aa0b8');
    text('SMOKE ' + smoke, 87, H - 8, weapon === 3 ? '#fcfcfc' : '#9aa0b8');
    rect(120, H - 8, 3, 3, '#fcfcfc'); rect(121, H - 5, 1, 2, '#2a8a2a'); text(flowers + '/3', 125, H - 8, '#9aa0b8');
    if (boss) { const w = 54; text('LORD', W - w - 20, H - 8, '#ff8060'); rect(W - w - 3, H - 8, w, 5, '#40242c'); rect(W - w - 3, H - 8, w * boss.hp / boss.max, 5, '#e83030'); }
    else { const n = capsLeft(); text(n ? 'CAPTAINS ' + n : 'GATE OPEN', W - (n ? 42 : 38), H - 8, n ? '#ff8060' : '#7cf070'); }
  }
  function draw() {
    g.setTransform(3, 0, 0, 3, 0, 0);
    if (state === 'title') return drawTitle();
    if (state === 'story') return drawStory();
    if (state === 'win') return drawWin();
    backdrop();   // the sky and the far land stay at the normal size; the world itself is drawn at SIZE (3, 4 or 5 screen dots per dot)
    g.setTransform(VS, 0, 0, VS, shake > 0 ? (Math.random() - .5) * 6 : 0, shake > 0 ? (Math.random() - .5) * 6 : 0);
    drawWorld(); g.setTransform(3, 0, 0, 3, 0, 0); hud();
    const Wd = WORLDS[world];
    if (msgT > 0) { rect(0, 13, W, 11, 'rgba(8,10,20,.7)'); ctext(msgS, 16, '#fcfcfc'); }
    if (state === 'play' && banner > 0) {
      rect(0, 34, W, 46, 'rgba(8,10,20,.72)');
      ctext(stage === 5 ? 'THE LORD' : 'WORLD ' + (world + 1) + ' - STAGE ' + (stage + 1), 39, '#f8d030');
      ctext(stage === 5 ? Wd.lord : Wd.name, 50, '#fcfcfc', 2);
      ctext(stage === 5 ? 'FULL HEALTH AND WEAPONS. TAKE BACK THE CRYSTAL' : 'KILL ' + capsLeft() + ' ' + CAPS[world].name + (capsLeft() > 1 ? 'S' : '') + ' TO OPEN THE GATE', 66, '#bfe8ff');
    }
    if (state === 'down') { rect(0, 70, W, 20, 'rgba(8,10,20,.7)'); ctext(lives > 0 ? 'DOWN!  ' + lives + (lives > 1 ? ' LIVES' : ' LIFE') + ' LEFT' : 'THE SHADOW HAS FALLEN', 77, '#ff6040'); }
    if (state === 'clear') {
      const c = clearInfo; rect(0, 28, W, 106, 'rgba(8,10,20,.82)');
      ctext(c.boss ? 'CRYSTAL TAKEN BACK!' : 'STAGE CLEAR', 34, c.boss ? Wd.gem : '#7cf070', 2);
      ctext(c.boss ? Wd.lord + ' IS BEATEN' : Wd.name + ' - STAGE ' + (stage + 1), 52, '#fcfcfc');
      ctext('DOWN: ' + c.kills + '   SILENT: ' + c.silent, 64, '#bfe8ff');
      ctext(c.ghost ? 'NEVER SEEN!  +1000' : c.boss ? '' : 'SEEN ' + seen + ' TIMES', 76, c.ghost ? '#f8d030' : '#9aa0b8');
      ctext(c.kind ? 'THE PEOPLE LEFT ALONE  +300' : 'PEOPLE HARMED: ' + harmed, 86, c.kind ? '#7cf070' : '#ff6040');
      if (!c.boss) ctext('SCROLLS ' + scrollsGot + '/' + scrollsHere + (c.all ? '  +1000' : '') + (eggGot ? '   EASTER EGG FOUND' : ''), 96, c.all ? '#f8d030' : '#f0e0b0');
      ctext('BONUS ' + c.bonus + '    SCORE ' + score, 106, '#f8d030');
      if (frame - endAt > 40 && frame % 50 < 34) ctext('PRESS START', 118, '#fcfcfc');
    }
    if (state === 'over') { rect(0, 0, W, H, 'rgba(8,10,20,.75)'); ctext('THE SHADOW HAS FALLEN', 60, '#ff6040', 2); ctext('SCORE ' + score, 84, '#fcfcfc', 2); if (frame - endAt > 60 && frame % 50 < 34) ctext('PRESS START', 112, '#bfe8ff'); }
  }
  function crystalsRow(y, n) { for (let i = 0; i < 4; i++) { const x = W / 2 - 42 + i * 28, c = i < n ? WORLDS[i].gem : '#2a2a3a', bob = i < n ? Math.sin(frame * .05 + i) * 2 : 0; if (i < n && frame % 40 < 20) disc(x + 3, y + 4 + bob, 7, 'rgba(255,255,255,.08)'); rect(x + 1, y + bob, 5, 2, c); rect(x, y + 2 + bob, 7, 5, c); rect(x + 1, y + 7 + bob, 5, 2, c); rect(x + 2, y + 9 + bob, 3, 1, c); } }
  function drawTitle() {
    for (let i = 0; i < 8; i++) rect(0, i * 24, W, 24, mix('#06081a', '#2a1a3a', i / 7));
    disc(194, 46, 11, '#c83030');
    for (let i = 0; i < 18; i++) rect((i * 53 + 11) % W, (i * 29) % 60, 1, 1, '#8a8ab0');
    rect(0, 50, W, 6, '#1a1a2a'); for (let x = 0; x < W; x += 12) rect(x, 48, 8, 2, '#1a1a2a');
    const s = 'CRYSTAL NINJA'; text(s, Math.round((W - tw(s, 3)) / 2) + 1, 15, '#101018', 3, false); text(s, Math.round((W - tw(s, 3)) / 2), 14, '#fcfcfc', 3, false);
    crystalsRow(64, 4);
    const lines = ['THE OLD KING IS DYING. FOUR INVADING WARLORDS', 'STOLE THE ANCIENT CRYSTALS THAT KEEP HIM ALIVE.', 'PRINCESS MIRA: BRING THEM HOME, SHADOW.',
      'KILL THEIR CAPTAINS AND THEIR LORDS. PASS THE', 'SOLDIERS UNSEEN IF YOU LIKE. LEAVE THE PEOPLE ALONE.'];
    lines.forEach((l, i) => ctext(l, 82 + i * 9, i === 2 ? '#f8d030' : '#d8dce8'));
    ctext('A: JUMP TWICE  B: WEAPON  UP: HOOK ROPE  DOWN: SNEAK', 134, '#9aa0b8'); ctext('DOWN+B OR Q: NEXT WEAPON. LEDGES: HOLD TOWARDS THEM', 143, '#9aa0b8');
    if (frame % 50 < 34) ctext('PRESS START', 158, '#bfe8ff', 2);
    if (bestScore) ctext('BEST ' + bestScore, 176, '#f8d030');
  }
  function drawStory() {
    for (let i = 0; i < 8; i++) rect(0, i * 24, W, 24, mix('#0a0c1e', '#1e2a40', i / 7));
    ctext('THE PALACE', 22, '#f8d030', 2); crystalsRow(46, world + 1);
    const l = STORY[world]; ctext(l[0], 76, '#fcfcfc'); ctext(l[1], 88, '#bfe8ff');
    ctext('PRINCESS MIRA: GO ON, SHADOW.', 108, '#f8d030');
    ctext('SCORE ' + score, 128, '#fcfcfc'); if (frame - endAt > 40 && frame % 50 < 34) ctext('PRESS START', 150, '#bfe8ff', 2);
  }
  function drawWin() {
    for (let i = 0; i < 8; i++) rect(0, i * 24, W, 24, mix('#1a2a4a', '#f0a868', i / 7));
    ctext('THE KING LIVES!', 20, '#fcfcfc', 2); crystalsRow(44, 4);
    ctext('ALL FOUR CRYSTALS ARE HOME.', 74, '#fcfcfc'); ctext('PRINCESS MIRA: THE VALLEY IS FREE. THANK YOU, SHADOW.', 86, '#f8d030');
    ctext('SCORE ' + score, 102, '#fcfcfc', 2); ctext('SECRET SCROLLS ' + scrollsAll + '   EASTER EGGS ' + eggsAll, 120, '#f0e0b0'); ctext('CRYSTAL NINJA - MADE IN BRAIN-LAB CREATIONS', 134, '#bfe8ff');
    if (frame - endAt > 120 && frame % 50 < 34) ctext('PRESS START', 156, '#fcfcfc');
  }

  // ---------- the route planner: from a place where the ninja stands, try the real moves (the same physics) ----------
  // A move is written down as a small recipe, so that self-play can replay it exactly: from standing still, the same
  // presses give the same flight. walk, jump (run-up, how long A is held, when the D-pad is let go, a second jump),
  // hook (when the rope is thrown, how long UP is held, when to let go).
  const NONE = { l: false, r: false, u: false, d: false, a: false, aP: false, uP: false, dP: false };
  function planFn(d) {
    const hold = { ...NONE, l: d.dir < 0, r: d.dir > 0 };
    if (d.t === 'stay') return () => ({ ...NONE, done: true });
    if (d.t === 'walk') return f => f < 7 ? hold : { ...NONE, done: true };
    if (d.t === 'jump') return (f, p) => {
      if (p.st === 'hang') return { ...hold, uP: true };
      const j = f - d.pre;
      return { ...NONE, l: d.dir < 0 && j < d.rel, r: d.dir > 0 && j < d.rel, a: (j >= 0 && j < d.ah) || (d.j2 > 0 && j >= d.j2 && j < d.j2 + 30), aP: j === 0 || (d.j2 > 0 && j === d.j2) };
    };
    return (f, p) => {
      if (p.st === 'hang') return { ...hold, uP: true };
      if (f < d.at) return { ...NONE, a: true, aP: f === 0 || (d.dbl && f === 12) };
      if (f === d.at) return { ...NONE, uP: true, a: d.at > 0 };
      const r = f - d.at;
      if (p.st === 'rope') return r === d.rel ? { ...hold, aP: true } : { ...hold, u: r < d.up };
      return r > d.rel ? hold : NONE;
    };
  }
  // the end of a move: standing still on ground or a plank (after a flight, or after walking)
  const landedNow = (p, k, f, flew) => p.st === 'free' && p.on && ((flew && f > 2) || (k.done && Math.abs(p.vx) < .05));
  function simRun(x, y, d, extra) {
    const p = newPlayer(x, y); p.on = true; if (extra) { p.fast = extra.fast; p.high = extra.high; }
    const fn = planFn(d); let flew = false, landed = false;
    for (let f = 0; f < 460; f++) {
      const k = landed ? NONE : fn(f, p);
      physics(p, k);
      if (p.y > MH * T + 10 || spiked(p)) return null;
      if (!p.on) flew = true;
      if (!landed && landedNow(p, k, f, flew)) landed = true;
      if (landed && p.st === 'free' && p.on && Math.abs(p.vx) < .05) return { x: p.x, y: p.y };
    }
    return null;
  }
  function movesFrom(nd, noRope) {
    const out = [];
    for (const dir of [-1, 1]) {
      out.push({ t: 'walk', dir: dir });
      for (const pre of [0, 10]) for (const ah of [4, 30]) for (const rel of [999, 8, 16]) for (const j2 of [0, 12, 22]) out.push({ t: 'jump', dir: dir, pre: pre, ah: ah, rel: rel, j2: j2 });
      if (!noRope && rings.some(rg => Math.hypot(rg.x - nd.x - 3, rg.y - nd.y - 5) < HOOKR + 40))
        for (const at of [0, 8, 14, 22]) for (const up of [0, 30, 60]) for (let rel = 12; rel <= 168; rel += 8) out.push({ t: 'hook', dir: dir, at: at, dbl: at === 22, up: up, rel: rel });
    }
    return out;
  }
  // breadth first: the nearest places first. goal(nd) may stop the search early. Each place remembers how it was reached.
  // It can work in slices (ms = time per slice), so self-play does not freeze the picture while it thinks.
  function startSearch(sx, sy, opt) {
    const st = { nodes: new Map(), queue: [], found: null, done: false, opt: opt };
    const s = addNode(st, sx, sy, null, null);
    if (opt.goal && opt.goal(s)) { st.found = s; st.done = true; }
    return st;
  }
  function addNode(st, x, y, par, d) { const kk = Math.round(x / 6) + ',' + Math.round(y); if (st.nodes.has(kk)) return null; const nd = { x: x, y: y, par: par, d: d }; st.nodes.set(kk, nd); st.queue.push(nd); return nd; }
  function stepSearch(st, ms) {
    const was = simulating, t0 = performance.now(), opt = st.opt; simulating = true;
    while (!st.done && performance.now() - t0 < ms) {
      if (!st.queue.length || st.nodes.size >= (opt.cap || 6000)) { st.done = true; break; }
      const nd = st.queue.shift();
      for (const d of movesFrom(nd, opt.noRope)) {
        const r = simRun(nd.x, nd.y, d, opt.extra); if (!r) continue;
        const nn = addNode(st, r.x, r.y, nd, d);
        if (nn && opt.goal && opt.goal(nn)) { st.found = nn; st.done = true; break; }
      }
    }
    simulating = was;
    return st;
  }
  const search = (sx, sy, opt) => stepSearch(startSearch(sx, sy, opt), Infinity);
  const nearItem = (nd, it) => Math.abs(nd.x + 3 - it.x) < 9 && nd.y + 11 - it.y >= 0 && nd.y + 11 - it.y < 14;
  const nearFoot = (nd, x, y, w) => Math.abs(nd.x + 3 - x) < w && Math.abs(nd.y + 11 - y) < 2;
  const atGate = nd => exit && nd.x >= exit.x - 6 && Math.abs(nd.y + 11 - exit.y) < 2;

  // ---------- the reach check: from the start, can the gate, every captain, every scroll and the egg be reached? ----------
  function reach(n, noRope) {   // noRope: the same search without the hook rope (to see that the check can say no)
    const t0 = performance.now(), keep = { P: P, state: state }; build(n);
    const s0 = simRun(spawn.x, spawn.y, { t: 'stay' });
    const list = s0 ? [...search(s0.x, s0.y, { noRope: noRope }).nodes.values()] : [];
    const capList = foes.filter(e => e.cap), capsOk = capList.filter(e => list.some(nd => nearFoot(nd, e.x, e.y, 20))).length;
    const scr = items.filter(i => i.k === 'scroll'), egg = items.find(i => i.k === 'egg');
    const res = { stage: n, width: MW, places: list.length, gate: exit ? list.some(atGate) : true, captains: capsOk + '/' + capList.length,
      scrolls: scr.filter(i => list.some(nd => nearItem(nd, i))).length + '/' + scr.length, egg: egg ? list.some(nd => nearItem(nd, egg)) : 'none', ms: Math.round(performance.now() - t0) };
    P = keep.P; state = keep.state;
    if (P && state !== 'title') build(lvl);
    return res;
  }

  // ---------- self-play (Settings, SELF-PLAY): plans a route with the planner above and presses the buttons itself ----------
  // Goals in turn: the nearest scroll, egg or captain it can reach, then the gate. Soldiers in its way it fights.
  // If the ninja ends up somewhere else than planned (a hit, a potion), it plans again from where it stands.
  // thinks a little each tick (6 ms); gives back the steps when a route is found, 'wait' while thinking, null if none
  function botPlan() {
    if (!bot.search) {
      const wanted = items.filter(i => !i.got && (i.k === 'scroll' || i.k === 'egg')), caps = foes.filter(e => e.cap && e.st === 'live');
      const goal = bot.toGate ? atGate : nd => wanted.some(i => nearItem(nd, i)) || caps.some(e => nearFoot(nd, e.x, e.y, 30));
      bot.search = startSearch(P.x, P.y, { goal: goal, cap: 2500, extra: { fast: P.fast, high: P.high } }); bot.caps = caps.length;
    }
    const st = stepSearch(bot.search, 6);
    if (!st.done) return 'wait';
    bot.search = null;
    if (!st.found) { if (!bot.toGate && !bot.caps) { bot.toGate = true; return 'wait'; } bot.toGate = false; return null; }
    bot.toGate = false;
    const steps = []; for (let nd = st.found; nd.par; nd = nd.par) steps.unshift(nd);
    return steps;
  }
  function botFoe() { return foes.find(e => e.st === 'live' && Math.abs(e.x - (P.x + 3)) < (e.d.ranged ? 80 : 30) && Math.abs(e.y - (P.y + P.h)) < 4 && clearLine(P.x + 3, P.y + 4, e.x, e.y - 8)); }
  function botBoss() {
    const b = boss, cx = P.x + 3, walk = dir => ({ k: { ...NONE, l: dir < 0, r: dir > 0 } }), jump = dir => ({ k: { ...NONE, l: dir < 0, r: dir > 0, a: true, aP: P.on || P.dj } });
    if (b.dead) { const c = items.find(i => i.k === 'crystal'); return c ? walk(Math.sign(c.x - cx)) : { k: NONE }; }
    const dx = b.x - cx, dir = Math.sign(dx) || 1, adx = Math.abs(dx);
    const danger = shots.find(s => !s.mine && s.dmg > 0 && Math.abs(s.x - cx) < 34 && Math.abs(s.y - P.y - 5) < 26 && (s.k === 'wave' || Math.sign(s.vx) === Math.sign(cx - s.x) || s.k === 'down' || s.k === 'bomb'));
    if (danger) return danger.k === 'down' || danger.k === 'bomb' ? walk(Math.sign(cx - danger.x) || 1) : jump(-dir);
    if (b.mv === 'rush' && b.st <= 1 && adx < 60) return jump(dir);
    if ((b.mv === 'sweep' || b.mv === 'teleport') && b.st >= 1 && b.st <= 2 && adx < 40) return walk(-dir);
    if (b.mv === 'rain' && b.st === 1) return walk(dir);
    if (adx > 15) return walk(dir);
    if (P.face !== dir) return walk(dir);
    return { k: NONE, b: P.atk === 0 && P.cool === 0 };
  }
  function botInput() {
    if (!bot) bot = { steps: null, i: 0, f: 0, flew: false, landed: false, lastK: NONE, fight: null, ft: 0, loot: 0, wait: 0 };
    if (weapon > 1) weapon = 0;
    if (P.st === 'rope' && !bot.steps) return { k: { ...NONE, aP: true } };
    if (P.st === 'hang' && !bot.steps) return { k: { ...NONE, uP: true } };
    if (boss) { bot.steps = null; return botBoss(); }
    // following a planned move
    if (bot.steps) {
      const nd = bot.steps[bot.i];
      if (bot.f > 0) {
        if (!P.on) bot.flew = true;
        if (!bot.landed && landedNow(P, bot.lastK, bot.f - 1, bot.flew)) bot.landed = true;
        if (bot.landed && P.st === 'free' && P.on && Math.abs(P.vx) < .05) {
          const ok = Math.abs(P.x - nd.x) < 1.5 && Math.abs(P.y - nd.y) < 1;
          bot.i++; bot.f = 0; bot.flew = bot.landed = false;
          if (!ok || bot.i >= bot.steps.length || botFoe()) bot.steps = null;
          if (!bot.steps) return { k: NONE };
        }
        if (bot.f > 470) { bot.steps = null; return { k: NONE }; }
      }
      const step = bot.steps[bot.i], k = bot.landed ? NONE : planFn(step.d)(bot.f, P);
      bot.f++; bot.lastK = k;
      return { k: k };
    }
    if (!P.on || P.st !== 'free' || Math.abs(P.vx) > .05) return { k: NONE };   // settle first
    // a soldier close by on the same level: fight him
    const e = bot.fight && bot.fight.st === 'live' ? bot.fight : botFoe();
    if (e && bot.ft < 400) {
      bot.fight = e; bot.ft++; bot.search = null;
      const dx = e.x - (P.x + 3), dir = Math.sign(dx) || 1;
      if (Math.abs(dx) > 12) {
        const t = tile(Math.floor((P.x + 3 + dir * 6) / T), Math.floor((P.y + P.h + 1) / T));
        if (t === 1 || t === 4 || t === 2) return { k: { ...NONE, l: dir < 0, r: dir > 0 } };
      } else if (P.face !== dir) return { k: { ...NONE, l: dir < 0, r: dir > 0 } };
      else return { k: NONE, b: P.atk === 0 && P.cool === 0 };
    }
    if (bot.fight && bot.fight.st !== 'live' && !bot.fight.looted && bot.loot < 30) { bot.loot++; const dir = Math.sign(bot.fight.x - P.x - 3) || 1; return { k: { ...NONE, l: dir < 0, r: dir > 0 } }; }
    bot.fight = null; bot.ft = 0; bot.loot = 0;
    if (bot.wait > 0) { bot.wait--; return { k: { ...NONE, r: true } }; }
    const steps = botPlan();
    if (steps === 'wait') return { k: NONE };
    if (!steps || !steps.length) { bot.wait = 40; return { k: NONE }; }
    bot.steps = steps; bot.i = 0; bot.f = 0; bot.flew = bot.landed = false;
    return { k: NONE };
  }

  const inPlay = () => state === 'play' || state === 'down';
  window.NINJA = { get state() { return state; }, get level() { return lvl; }, get hp() { return P && P.hp; }, get at() { return P && [Math.round(P.x), Math.round(P.y), P.st]; },
    get foes() { return foes.map(e => e.type + ':' + e.st + (e.cap ? ':CAPTAIN' : '') + '@' + Math.round(e.x) + ',' + e.y); }, get boss() { return boss && { hp: boss.hp, mv: boss.mv, dead: boss.dead, x: Math.round(boss.x) }; }, get items() { return items.map(i => i.k + '@' + Math.round(i.x) + ',' + Math.round(i.y)); }, get dbg() { return { aim: P && P.aim && P.aim.t, slide: P && P.slide, crouch: P && P.crouch, smokes: smokes.length, shots: shots.map(s => s.k), alert: foes.filter(e => e.st === 'live' && e.alert).length, aware: foes.filter(e => e.st === 'live' && e.aw > 15).length, weapon: WEAPONS[weapon], smoke: smoke }; }, get score() { return score; },
    reach: reach, skip: n => { lives = 3; startStage(n); }, put: (x, y) => { P.x = x; P.y = y; P.vx = P.vy = 0; P.st = 'free'; }, physics: physics, newPlayer: newPlayer,
    kill: () => { foes.forEach(e => { if (e.cap) e.st = 'dead'; }); if (boss) { boss.hp = 1; } } };
  return {
    id: 'crystalninja', name: 'CRYSTAL NINJA', tag: 'FOUR WARLORDS, FOUR CRYSTALS', aLabel: 'JUMP', bLabel: 'WEAPON', restartLabel: 'RESTART STAGE',
    icon: big(mk(['..kkkk...', '.kkkkkk..', '.ktttttr.', '.kkkkkkrr', '..kkkk..r', '.kkkkkk..', 'kkkkkkkk.', '..kk.kk..', '.kk...kk.'], { k: '#232c44', t: '#f0c8a0', r: '#d82800' }), 2),
    settings: [['SIZE', 'nj_size', ['SMALL', 'NORMAL', 'BIG'], 1], ['DIFFICULTY', 'nj_diff', ['EASY', 'NORMAL', 'HARD'], 1], ['SELF-PLAY', 'nj_auto', ['OFF', 'ON'], 0]],
    atTitle: () => state === 'title', levelNow: () => lvl, over: () => state === 'over' ? { score: score } : null, won: () => state === 'win' ? { score: score } : null,
    resume(n, s) { score = s || 0; lives = 3; stars = 8; smoke = 1; flowers = 0; scrollsAll = eggsAll = 0; startStage(n); }, fresh() { newGame(); }, scoreNow: () => score,
    auto: () => demo,
    apply() { const was = demo; demo = !!SET.nj_auto; if (was !== demo) { bot = null; for (const n in keys) keys[n] = false; } VS = [3, 4, 5][SET.nj_size] || 4; VW = W * 3 / VS; VH = H * 3 / VS; diff = SET.nj_diff === undefined ? 1 : SET.nj_diff; hpMax = [9, 6, 4][diff]; if (P) P.hp = Math.min(P.hp, hpMax); },
    start() { for (const n in keys) keys[n] = false; state = 'title'; frame = 0; retro = false; },
    stop() { for (const n in keys) keys[n] = false; },
    update: update, draw: draw, inPlay: inPlay, go: go,
    btn(n, down) {
      if (n in keys) keys[n] = down;
      if (!down) return;
      if (n in hit) hit[n] = true;
      if (!inPlay()) { if (n === 'a') go(); }
    },
    key(k) { if ((k === 'q' || k === 'Q') && inPlay()) cycleWeapon(); },
    tap(x, y) { if (!inPlay()) { go(); return; } if (y > (H - 12) / H && x < 48 / W) cycleWeapon(); },
    restart() { lives = Math.max(lives, 1); startStage(lvl); },
    title() { quiet(); state = 'title'; frame = 0; }
  };
}
GAMES.push(ParaFruit(), TrainGame({ id: 'quinntrain', levels: quinnLevels, auto: 0, size: 1 }), QuinnPaddle(), CrystalNinja());
GAMES.forEach(x => { x.atTitle = () => false; });
function urlDemo() { try { const id = new URLSearchParams(location.search).get('app'); if (id) { const g0 = GAMES.find(q => q.id === id); if (g0) return g0; } } catch (e) {} return null; }
function start(id) { const g0 = GAMES.find(q => q.id === id); if (!g0) return; cur = g0; view = 'game'; ended = false; paused = false; clock = 0; if (g0.apply) g0.apply(); if (g0.start) g0.start(); }
window.ARCADE = { games: GAMES, start, press, pressStart, pressSelect, get current() { return cur; }, tick() { if (!cur) return; clock++; if (!paused) cur.update(); if (cur.over) watchGame(); }, draw() { if (!cur) return; g.setTransform(3, 0, 0, 3, 0, 0); g.imageSmoothingEnabled = false; cur.draw(); } };
const demo = urlDemo(); if (demo) { const q = new URLSearchParams(location.search); if (q.get('auto')) demo.auto = () => true; start(demo.id); }
})();
