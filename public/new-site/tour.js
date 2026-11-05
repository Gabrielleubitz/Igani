(() => {
  const root = document.querySelector("[data-tour]");
  if (!root) return;
  const $ = s => root.querySelector(s), $$ = s => [...root.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const SAY = {
    1: "Avi's form came in 2 minutes ago. Press <b>Call</b> to dial him from the browser. No apps, no new phones.",
    2: "The call is recorded and transcribed as it happens. Watch for the tip when Avi pushes back on the price.",
    3: "Seconds after the call, Dana gets her review. Tap the dots on the line and the checklist to see the proof.",
    4: "The manager sees every rep's week, and is told which calls need attention. Tap a rep."
  };
  const URL = { 1: "leads", 2: "calls/live", 3: "calls/1042/review", 4: "team" };
  let step = 1;

  function go(n) {
    step = Math.max(1, Math.min(4, n));
    $$("[data-pane]").forEach(p => p.classList.toggle("is-on", +p.dataset.pane === step));
    $$(".tour__step").forEach(b => { if (+b.dataset.go === step) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current"); });
    $$(".app__nav").forEach(b => { if (+b.dataset.go === step) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
    $("[data-say]").innerHTML = SAY[step];
    $("[data-url]").textContent = "crm.yourcompany.com/" + URL[step];
    $("[data-prev]").disabled = step === 1;
    $("[data-next]").innerHTML = step === 4 ? "Book a demo" : "Next <svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M5 12h14M13 6l6 6-6 6\"/></svg>"; const tn = $("[data-tc-n]"); if (tn) tn.textContent = step;
    if (step === 3) countScore();
    if (step !== 2) stopCall(false);
  }
  $$("[data-go]").forEach(b => b.addEventListener("click", () => go(+b.dataset.go)));
  $("[data-prev]").addEventListener("click", () => go(step - 1));
  $("[data-next]").addEventListener("click", () => {
    if (step === 4) { document.getElementById("demo").scrollIntoView({ behavior: reduce ? "auto" : "smooth" }); return; }
    if (step === 1) { go(2); startCall(); return; }
    go(step + 1);
  });

  /* ---- the sample call ---- */
  const LINES = [
    [4, "Dana", "Hi Avi, it's Dana from Sample Realty. You left your details about the 4-room in Netanya?"],
    [11, "Avi", "Yes, but I'm just looking for now."],
    [15, "Dana", "That's completely fine. What made you start looking?"],
    [20, "Avi", "We need more space. The baby's coming in the spring."],
    [27, "Dana", "Congratulations! So the apartment is ₪2.4M and it's a great deal…"],
    [35, "Avi", "Honestly, that's more than we planned."],
    [39, "Dana", "Understood. What range were you hoping for?"],
    [44, "Avi", "Around 2.1, maybe 2.2."],
    [50, "Dana", "There's one at 2.15, two streets away. Can I show you both on Thursday at 5?"],
    [57, "Avi", "Thursday at 5 works."]
  ];
  const HINT_AT = 5;
  const tx = $("[data-tx]"), wave = $("[data-wave]"), timer = $("[data-timer] span");
  for (let i = 0; i < 40; i++) wave.appendChild(document.createElement("i"));
  const bars = [...wave.children];
  let timers = [], waveTick = null, clock = null, running = false;
  const fmt = s => Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");

  function resetCall() {
    tx.innerHTML = '<p class="tx__empty">Press <b>Call</b> to start the sample call.</p>';
    timer.textContent = "0:00";
    const h = $("[data-hint]"); h.classList.add("is-wait"); h.classList.remove("flash");
    $("[data-hinttext]").textContent = "Tips show up here, only for the rep, while the call is on.";
    $("[data-writing]").hidden = true; $("[data-callwrap]").hidden = false;
    setBtn(false);
  }
  function setBtn(on) {
    const b = $("[data-start2]"); b.classList.toggle("btn-end", on); b.querySelector("span").textContent = on ? "End call" : "Call";
  }
  function stopCall(finish) {
    timers.forEach(clearTimeout); timers = []; clearInterval(waveTick); clearInterval(clock);
    wave.classList.add("is-idle"); running = false; setBtn(false);
    if (finish) writeReview();
  }
  function startCall() {
    stopCall(false); resetCall(); running = true; setBtn(true);
    tx.innerHTML = ""; wave.classList.remove("is-idle");
    const speed = reduce ? 250 : 1500;
    let t = 0;
    clock = setInterval(() => { t = Math.min(t + 1, 62); timer.textContent = fmt(t); }, speed / 4.2);
    waveTick = setInterval(() => bars.forEach(b => b.style.height = (12 + Math.random() * 88) + "%"), 160);
    LINES.forEach(([s, who, text], i) => {
      timers.push(setTimeout(() => {
        const row = document.createElement("div"); row.className = "tx__line";
        row.innerHTML = `<time>${fmt(s)}</time><b class="${who === "Dana" ? "rep" : "cli"}">${who}</b><span></span>`;
        row.querySelector("span").textContent = text;
        tx.appendChild(row); tx.scrollTop = tx.scrollHeight;
        if (i === HINT_AT) {
          const h = $("[data-hint]"); h.classList.remove("is-wait"); void h.offsetWidth; h.classList.add("flash");
          $("[data-hinttext]").textContent = "Price objection. Ask before you answer: “What range were you hoping for?”";
        }
      }, (i + 1) * speed));
    });
    timers.push(setTimeout(() => stopCall(true), (LINES.length + 1) * speed));
  }
  function writeReview() {
    $("[data-callwrap]").hidden = true; const w = $("[data-writing]"); w.hidden = false;
    const bar = $("[data-bar]"); bar.style.width = "0"; void bar.offsetWidth; bar.style.width = "100%";
    timers.push(setTimeout(() => { go(3); resetCall(); }, reduce ? 300 : 2000));
  }
  $("[data-start]").addEventListener("click", () => { go(2); startCall(); });
  $("[data-start2]").addEventListener("click", () => running ? stopCall(true) : startCall());
  $("[data-skip]").addEventListener("click", () => { stopCall(false); go(3); });

  /* ---- review ---- */
  function countScore() {
    const el = $("[data-score]"), end = 74;
    if (reduce) { el.firstChild.textContent = end; return; }
    let n = 0; const id = setInterval(() => { n += 2; el.firstChild.textContent = Math.min(n, end); if (n >= end) clearInterval(id); }, 18);
  }
  const PTS = [
    { x: 40, y: 55, k: "on", t: "0:04", q: "“You left your details about the 4-room in Netanya?”", n: "Clear reason for the call. On the line." },
    { x: 150, y: 55, k: "on", t: "0:15", q: "“What made you start looking?”", n: "Found the real reason: more space for the baby." },
    { x: 270, y: 88, k: "off", t: "0:27", q: "“The apartment is ₪2.4M and it's a great deal…”", n: "Off the line: price before budget." },
    { x: 350, y: 76, k: "mid", t: "0:35", q: "“That's more than we planned.”", n: "Price objection. Readiness dropped." },
    { x: 390, y: 55, k: "on", t: "0:39", q: "“What range were you hoping for?”", n: "Back on the line with a question." },
    { x: 500, y: 55, k: "on", t: "0:50", q: "“Can I show you both on Thursday at 5?”", n: "Specific, dated next step. Readiness 8/10." }
  ];
  const svg = $("[data-line]"), NS = "http://www.w3.org/2000/svg";
  PTS.forEach((p, i) => {
    const g = document.createElementNS(NS, "g"); g.setAttribute("class", "pt pt--" + p.k); g.setAttribute("tabindex", "0");
    g.setAttribute("role", "button"); g.setAttribute("aria-label", p.t + " " + p.n);
    const c = document.createElementNS(NS, "circle"); c.setAttribute("cx", p.x); c.setAttribute("cy", p.y); c.setAttribute("r", 7);
    g.appendChild(c); svg.appendChild(g);
    const show = () => {
      svg.querySelectorAll(".pt").forEach(x => x.classList.remove("is-on")); g.classList.add("is-on");
      $("[data-moment]").innerHTML = `<span>${p.t} · ${p.n}</span><q></q>`; $("[data-moment] q").textContent = p.q;
    };
    g.addEventListener("click", show); g.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); show(); } });
  });
  $$(".checks button").forEach(b => b.addEventListener("click", () => b.setAttribute("aria-expanded", b.getAttribute("aria-expanded") !== "true")));

  /* ---- manager ---- */
  const REPS = {
    dana: ["Dana: budget before price", "Pitch, 4 of 12 calls"],
    omer: ["Omer: keep doing what works", "Close, 1 of 9 calls"],
    maya: ["Maya: ask for the next step", "Close, 6 of 14 calls"]
  };
  function rep(k) {
    $$(".team tr[data-rep]").forEach(r => r.classList.toggle("is-on", r.dataset.rep === k));
    $("[data-habit]").textContent = REPS[k][0]; $("[data-slip]").textContent = REPS[k][1];
  }
  $$("[data-rep]").forEach(r => {
    r.addEventListener("click", () => rep(r.dataset.rep));
    r.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); rep(r.dataset.rep); } });
  });

  go(1);
})();
