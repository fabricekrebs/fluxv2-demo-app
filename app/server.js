const http = require("http");
const os = require("os");

const PORT = process.env.PORT || 8080;
const APP_VERSION = process.env.APP_VERSION || "1.0.0";
const HOSTNAME = os.hostname();

const GAME_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Whack-a-Pod! - Flux v2 Demo</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', system-ui, sans-serif;
    background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
    color: #fff;
    min-height: 100vh;
    overflow-x: hidden;
  }
  .header {
    text-align: center;
    padding: 20px 10px 10px;
  }
  .header h1 {
    font-size: 2.2em;
    background: linear-gradient(90deg, #326CE5, #67dafb, #f7df1e);
    -webkit-background-clip: text; background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .header .sub {
    color: #aaa; font-size: 0.9em; margin-top: 4px;
  }
  .header .sub span { color: #67dafb; font-family: monospace; }
  .stats {
    display: flex; justify-content: center; gap: 30px;
    margin: 12px 0;
    font-size: 1.1em;
  }
  .stats div { background: rgba(255,255,255,0.08); padding: 8px 20px; border-radius: 10px; }
  .stats .label { color: #999; font-size: 0.75em; text-transform: uppercase; letter-spacing: 1px; }
  .stats .value { font-size: 1.6em; font-weight: bold; }
  #score-val { color: #4caf50; }
  #timer-val { color: #ff9800; }
  #combo-val { color: #e040fb; }
  .board {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    max-width: 480px;
    margin: 16px auto;
    padding: 0 16px;
  }
  .hole {
    position: relative;
    aspect-ratio: 1;
    background: radial-gradient(ellipse at center bottom, #1a1a3e 60%, transparent 61%);
    border-radius: 16px;
    overflow: hidden;
    cursor: pointer;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
  }
  .hole::after {
    content: '';
    position: absolute;
    bottom: 0; left: 10%; right: 10%; height: 24%;
    background: radial-gradient(ellipse, #11112a, transparent);
    border-radius: 50%;
    z-index: 2;
  }
  .pod {
    position: absolute;
    bottom: -80%; left: 50%;
    transform: translateX(-50%);
    font-size: 3.5em;
    transition: bottom 0.2s ease-out;
    z-index: 1;
    pointer-events: none;
  }
  .hole.active .pod { bottom: 15%; }
  .hole.bonk .pod { bottom: 15%; }
  .bonk-txt {
    position: absolute;
    top: 10%; left: 50%;
    transform: translateX(-50%);
    font-weight: 900; font-size: 1.4em;
    color: #4caf50;
    animation: floatUp 0.6s forwards;
    z-index: 3;
    pointer-events: none;
  }
  .miss-txt {
    position: absolute;
    top: 30%; left: 50%;
    transform: translateX(-50%);
    font-weight: 900; font-size: 1.1em;
    color: #f44336;
    animation: floatUp 0.6s forwards;
    z-index: 3;
    pointer-events: none;
  }
  @keyframes floatUp {
    0% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
    100% { opacity: 0; transform: translateX(-50%) translateY(-40px) scale(1.4); }
  }
  .start-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.75);
    display: flex; justify-content: center; align-items: center;
    z-index: 100;
  }
  .start-overlay.hidden { display: none; }
  .start-box {
    background: #1e1e3f;
    border: 2px solid #326CE5;
    border-radius: 20px;
    padding: 40px 50px;
    text-align: center;
  }
  .start-box h2 { font-size: 2em; margin-bottom: 8px; }
  .start-box p { color: #aaa; margin-bottom: 20px; max-width: 320px; }
  .start-box .flavor { font-size: 0.85em; color: #666; margin-bottom: 14px; font-style: italic; }
  .btn {
    background: linear-gradient(135deg, #326CE5, #67dafb);
    color: #000;
    border: none;
    padding: 14px 40px;
    font-size: 1.1em;
    font-weight: 700;
    border-radius: 12px;
    cursor: pointer;
    transition: transform 0.15s;
  }
  .btn:hover { transform: scale(1.06); }
  .game-over-box .final { font-size: 3em; color: #4caf50; margin: 10px 0; }
  .game-over-box .rank { font-size: 1.2em; margin-bottom: 16px; }
  .legend {
    display: flex; justify-content: center; gap: 16px; flex-wrap: wrap;
    margin: 6px auto; max-width: 480px; font-size: 0.85em; color: #999;
  }
  .legend div { display: flex; align-items: center; gap: 4px; }
  .legend .emoji { font-size: 1.3em; }
</style>
</head>
<body>

<div class="header">
  <h1>Whack-a-Pod!</h1>
  <div class="sub">Deployed via Flux v2 on AKS &middot; v${APP_VERSION} &middot; pod: <span>${HOSTNAME}</span></div>
</div>

<div class="stats">
  <div><div class="label">Score</div><div class="value" id="score-val">0</div></div>
  <div><div class="label">Time</div><div class="value" id="timer-val">30</div></div>
  <div><div class="label">Combo</div><div class="value" id="combo-val">x1</div></div>
</div>

<div class="legend">
  <div><span class="emoji">🐳</span> Pod (+10)</div>
  <div><span class="emoji">☸️</span> Golden K8s (+50)</div>
  <div><span class="emoji">💀</span> CrashLoop (-30!)</div>
  <div><span class="emoji">🐛</span> Bug (-15)</div>
</div>

<div class="board" id="board"></div>

<div class="start-overlay" id="overlay">
  <div class="start-box" id="start-screen">
    <h2>Whack-a-Pod!</h2>
    <p>Smash the pods popping out of your AKS nodes! Hit golden K8s wheels for bonus points. 
       Avoid the CrashLoopBackOff skulls and bugs!</p>
    <div class="flavor">"kubectl delete pod --force --grace-period=0"</div>
    <button class="btn" onclick="startGame()">Deploy Game</button>
  </div>
</div>

<script>
const GAME_DURATION = 30;
const MOLE_TYPES = [
  { emoji: '🐳', points: 10,  weight: 50, label: '+10' },
  { emoji: '☸️', points: 50,  weight: 10, label: '+50!' },
  { emoji: '💀', points: -30, weight: 18, label: '-30' },
  { emoji: '🐛', points: -15, weight: 22, label: '-15' },
];

let score = 0, timeLeft = GAME_DURATION, combo = 0, gameInterval, timerInterval, running = false;

const board = document.getElementById('board');
const overlay = document.getElementById('overlay');
const scoreEl = document.getElementById('score-val');
const timerEl = document.getElementById('timer-val');
const comboEl = document.getElementById('combo-val');

// Create 9 holes
for (let i = 0; i < 9; i++) {
  const hole = document.createElement('div');
  hole.className = 'hole';
  hole.innerHTML = '<div class="pod">🐳</div>';
  hole.dataset.index = i;
  hole.addEventListener('click', whack);
  board.appendChild(hole);
}

function pickType() {
  const total = MOLE_TYPES.reduce((s, t) => s + t.weight, 0);
  let r = Math.random() * total;
  for (const t of MOLE_TYPES) { r -= t.weight; if (r <= 0) return t; }
  return MOLE_TYPES[0];
}

function popUp() {
  const holes = [...document.querySelectorAll('.hole')].filter(h => !h.classList.contains('active'));
  if (!holes.length) return;
  const hole = holes[Math.floor(Math.random() * holes.length)];
  const type = pickType();
  hole.dataset.points = type.points;
  hole.dataset.label = type.label;
  hole.querySelector('.pod').textContent = type.emoji;
  hole.classList.add('active');
  const dur = 600 + Math.random() * 900 - Math.min(timeLeft < 10 ? 300 : 0, 300);
  setTimeout(() => { hole.classList.remove('active'); }, dur);
}

function whack(e) {
  if (!running) return;
  const hole = e.currentTarget;
  if (!hole.classList.contains('active')) return;
  hole.classList.remove('active');
  hole.classList.add('bonk');
  const pts = parseInt(hole.dataset.points);
  const lbl = hole.dataset.label;
  if (pts > 0) {
    combo++;
    const mult = Math.min(combo, 5);
    const gained = pts * mult;
    score += gained;
    comboEl.textContent = 'x' + mult;
    showFloat(hole, '+' + gained, false);
  } else {
    combo = 0;
    score += pts;
    comboEl.textContent = 'x1';
    showFloat(hole, lbl, true);
  }
  if (score < 0) score = 0;
  scoreEl.textContent = score;
  setTimeout(() => { hole.classList.remove('bonk'); }, 300);
}

function showFloat(hole, text, isMiss) {
  const el = document.createElement('div');
  el.className = isMiss ? 'miss-txt' : 'bonk-txt';
  el.textContent = text;
  hole.appendChild(el);
  setTimeout(() => el.remove(), 600);
}

function startGame() {
  score = 0; timeLeft = GAME_DURATION; combo = 0; running = true;
  scoreEl.textContent = '0';
  timerEl.textContent = timeLeft;
  comboEl.textContent = 'x1';
  overlay.classList.add('hidden');

  gameInterval = setInterval(() => {
    popUp();
    if (Math.random() > 0.55) popUp(); // sometimes 2 at once
  }, 650);

  timerInterval = setInterval(() => {
    timeLeft--;
    timerEl.textContent = timeLeft;
    if (timeLeft <= 0) endGame();
  }, 1000);
}

function endGame() {
  running = false;
  clearInterval(gameInterval);
  clearInterval(timerInterval);
  document.querySelectorAll('.hole').forEach(h => h.classList.remove('active'));

  let rank, comment;
  if (score >= 800)      { rank = '🏆 Cluster Admin';   comment = 'You mass-evicted those pods like a pro.'; }
  else if (score >= 500) { rank = '⭐ SRE';              comment = 'Solid incident response skills!'; }
  else if (score >= 250) { rank = '🔧 DevOps Engineer'; comment = 'kubectl skills are decent.'; }
  else if (score >= 100) { rank = '📦 Junior Dev';       comment = 'Maybe stick to YAML editing.'; }
  else                   { rank = '🫠 Intern';           comment = 'Have you tried turning it off and on again?'; }

  overlay.innerHTML = \`
    <div class="start-box game-over-box">
      <h2>Game Over!</h2>
      <div class="final">\${score}</div>
      <div class="rank">\${rank}</div>
      <p style="color:#aaa">\${comment}</p>
      <button class="btn" onclick="location.reload()">kubectl rollout restart</button>
    </div>\`;
  overlay.classList.remove('hidden');
}
</script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  if (req.url === "/healthz") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }

  if (req.url === "/version") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ version: APP_VERSION, hostname: HOSTNAME }));
    return;
  }

  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(GAME_HTML);
});

server.listen(PORT, () => {
  console.log(`Whack-a-Pod server running on port ${PORT} (v${APP_VERSION})`);
});
