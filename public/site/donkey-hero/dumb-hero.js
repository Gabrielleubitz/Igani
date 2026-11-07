/* IGANI donkey hero.
   Desktop (mouse + screen wider than 1024px): the donkey follows the cursor.
   Phones and tablets: the hero pins to the screen and the donkey turns from left to right as you scroll;
   when he has turned, the buttons appear and the page carries on. They use a smaller, cropped set of frames.
   Reduced motion or data saver: one still image, nothing else loads. */
(() => {
  const hero = document.querySelector('.dh');
  const canvas = document.getElementById('dh-donkey');
  const still = document.getElementById('dh-donkey-still');
  if (!hero || !canvas || !still) return;

  // Make the hero fill the screen below the site's own header and top bar.
  const fitBelowHeader = () => {
    const top = hero.getBoundingClientRect().top + window.scrollY;
    hero.style.setProperty('--dh-top', Math.max(0, Math.round(top)) + 'px');
  };
  fitBelowHeader();
  // The header can change height (fonts, resize), which resizes the donkey too.
  const refit = () => {
    fitBelowHeader();
    if (active) { fitCanvas(); schedule(); }
  };
  window.addEventListener('load', refit);
  window.addEventListener('resize', refit, { passive: true });

  // Where the frames live, relative to the page. Change this if you move the folder.
  const FRAME_DIR = (hero.dataset.frames || 'img/donkey-frames/').replace(/\/?$/, '/');
  // Desktop frames (1280x720, 229) and the phone set (cropped around the donkey, every second frame, 115).
  const DESKTOP_SET = { dir: FRAME_DIR, count: 229, fps: 24, right: 217 };
  const SCRUB_SET = { dir: FRAME_DIR.replace(/donkey-frames\/$/, 'donkey-frames-m/'), count: 115, fps: 12, right: 108 };
  let activeDir = FRAME_DIR;
  const frameSrc = (i) => activeDir + String(i + 1).padStart(4, '0') + '.webp';

  let FRAME_COUNT = DESKTOP_SET.count;
  let FPS = DESKTOP_SET.fps;
  const DURATION = 229 / 24;   // seconds of video, the same for both sets
  const SPAN = 0.8 * DURATION;   // full screen width covers 80% of the video
  const START = 1.4;             // left edge: turned left
  const SMOOTH = 0.18;           // easing per frame
  const RIGHT_FRAME = DESKTOP_SET.right;       // file 0218: looking right (same pose as cursor at far right)

  const desktopQuery = window.matchMedia('(min-width: 1025px) and (hover: hover) and (pointer: fine)');

  const ctx = canvas.getContext('2d');

  // Draw at the screen's real pixel size, so the frames are scaled once with
  // high-quality smoothing instead of twice (into the canvas, then by the browser).
  function fitCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(canvas.clientWidth * dpr) || 1280;
    const h = Math.round(canvas.clientHeight * dpr) || 720;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      shownPos = -1;
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
  }

  let frames = new Array(FRAME_COUNT);
  let current = Math.round((START + SPAN / 2) * FPS) / FPS;  // start facing forward
  let target = current;
  let shownPos = -1;
  let raf = 0;
  let active = false;
  let last = 0;

  // Position in frames (fractional), so we can blend between two neighbours.
  const posFor = (t) => Math.min(FRAME_COUNT - 1, Math.max(0, t * FPS));
  const ready = (im) => im && im.complete && im.naturalWidth > 0;

  function getFrame(i) {
    if (!frames[i]) {
      const im = new Image();
      im.decoding = 'async';
      im.onload = schedule;
      im.onerror = () => console.warn('Donkey frame missing:', frameSrc(i));
      im.src = frameSrc(i);
      frames[i] = im;
    }
    return frames[i];
  }

  // Crossfade frame i0 into i0 + 1 by f. 'lighter' adds the two premultiplied
  // images, so the cut-out edges blend cleanly instead of leaving a ghost.
  function draw(pos) {
    const i0 = Math.floor(pos);
    const f = pos - i0;
    const a = getFrame(i0);
    const b = f > 0.02 && i0 + 1 < FRAME_COUNT ? getFrame(i0 + 1) : null;
    if (!ready(a)) return false;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (ready(b)) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 1 - f;
      ctx.drawImage(a, 0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = f;
      ctx.drawImage(b, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.drawImage(a, 0, 0, canvas.width, canvas.height);
    }
    return !b || ready(b);
  }

  function schedule() { if (active && !raf) raf = requestAnimationFrame(tick); }

  function tick(now) {
    raf = 0;
    // Same feel as SMOOTH at 60fps, but steady on 120Hz screens and slow frames.
    const dt = last ? Math.min(100, now - last) : 16.7;
    last = now;
    current += (target - current) * (1 - Math.pow(1 - SMOOTH, dt / 16.7));
    if (Math.abs(target - current) < 0.02 / FPS) current = target;
    const pos = posFor(current);
    if (Math.abs(pos - shownPos) > 0.01 && draw(pos)) shownPos = pos;
    // A frame still loading redraws from its onload.
    if (current !== target) schedule(); else last = 0;
  }

  function onMove(e) {
    const t = START + Math.min(1, Math.max(0, e.clientX / window.innerWidth)) * SPAN;
    // Aim at a whole frame: the turn still blends smoothly on the way,
    // but he comes to rest on one sharp frame instead of a mix of two.
    target = Math.round(t * FPS) / FPS;
    schedule();
  }

  // Warm the cache in the background so cursor moves never wait on the network.
  let preloaded = false;
  function preloadAll() {
    if (preloaded) return;
    preloaded = true;
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 200));
    let i = 0;
    const step = () => { for (let n = 0; n < 12 && i < FRAME_COUNT; n++, i++) getFrame(i); if (i < FRAME_COUNT) idle(step); };
    idle(step);
  }

  // Switch which set of frames is in use (and forget the ones already loaded).
  function useSet(set) {
    activeDir = set.dir;
    FRAME_COUNT = set.count;
    FPS = set.fps;
    frames = new Array(FRAME_COUNT);
    current = target = Math.round((START + SPAN / 2) * FPS) / FPS;
    shownPos = -1;
    preloaded = false;
  }

  // ---- Phones and tablets: scroll turns the donkey ----
  const track = hero.parentElement && hero.parentElement.classList.contains('dh-track') ? hero.parentElement : null;
  const bar = hero.querySelector('[data-dh-bar]');
  const SCROLL_SCREENS = 1.6;   // how far you scroll while he turns, in screens
  let scrubbing = false;
  let done = false;

  function layoutScrub() {
    if (!track) return;
    const header = document.querySelector('.hd');
    const stick = header ? Math.round(header.getBoundingClientRect().height) : 0;
    hero.style.setProperty('--dh-stick', stick + 'px');
    const heroH = window.innerHeight - stick;
    track.style.height = Math.round(heroH + window.innerHeight * SCROLL_SCREENS) + 'px';
  }

  function progress() {
    const stick = parseFloat(hero.style.getPropertyValue('--dh-stick')) || 0;
    const r = track.getBoundingClientRect();
    const span = r.height - hero.offsetHeight;
    return span > 0 ? Math.min(1, Math.max(0, (stick - r.top) / span)) : 0;
  }

  function onScroll() {
    const p = progress();
    target = Math.round((START + p * SPAN) * FPS) / FPS;
    if (bar) bar.style.transform = 'scaleX(' + p.toFixed(3) + ')';
    const isDone = p >= 0.97;
    if (isDone !== done) { done = isDone; hero.classList.toggle('dh--done', done); }
    schedule();
  }

  function enableScrub() {
    if (!track) { enableStatic(); return; }
    disableAll();
    scrubbing = true;
    useSet(SCRUB_SET);
    active = true;
    done = false;
    still.hidden = true;
    canvas.hidden = false;
    hero.classList.add('dh--scrub');
    track.classList.add('is-scrub');
    layoutScrub();
    fitCanvas();
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResizeScrub, { passive: true });
    schedule();
    preloadAll();
  }

  function onResizeScrub() { layoutScrub(); fitCanvas(); onScroll(); }

  function disableAll() {
    active = false;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResizeScrub);
    if (scrubbing) {
      scrubbing = false;
      hero.classList.remove('dh--scrub', 'dh--done');
      if (track) { track.classList.remove('is-scrub'); track.style.height = ''; }
      useSet(DESKTOP_SET);
    }
  }

  function enableDesktop() {
    disableAll();
    active = true;
    still.hidden = true;
    canvas.hidden = false;
    shownPos = -1;
    fitCanvas();
    window.addEventListener('mousemove', onMove, { passive: true });
    schedule();
    preloadAll();
  }

  function enableStatic() {
    disableAll();
    canvas.hidden = true;
    still.src = frameSrc(RIGHT_FRAME);
    still.hidden = false;
  }

  // Scroll-driven only when motion is welcome and the visitor hasn't asked to save data.
  const motionOk = () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches && !(navigator.connection && navigator.connection.saveData);
  const apply = () => (desktopQuery.matches ? enableDesktop() : motionOk() ? enableScrub() : enableStatic());
  apply();
  desktopQuery.addEventListener ? desktopQuery.addEventListener('change', apply) : desktopQuery.addListener(apply);
})();
