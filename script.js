const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const hpEl = document.getElementById('hp');
const scoreEl = document.getElementById('score');
const highEl = document.getElementById('high');

let gameActive = false, score = 0, hp = 100;
let player = { x: 0, y: 0 };
let enemies = [], bullets = [];
const keys = {};
let lastShot = 0;
const FIRE_RATE = 150; 

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// --- LÓGICA DE ÁUDIO (REVÓLVER) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playRevolverSound() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    // Onda Sawtooth dá o estalo metálico do revólver
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
    
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.12);
}

function startGame() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    hp = 100; score = 0; enemies = []; bullets = [];
    player.x = canvas.width / 2;
    player.y = canvas.height / 2;
    highEl.innerText = localStorage.getItem('voxelHigh') || 0;
    gameActive = true;
    document.querySelectorAll('.overlay').forEach(el => el.classList.add('hidden'));
    loop();
    spawnEnemy();
}

function spawnEnemy() {
    if (!gameActive) return;
    if (enemies.length < 40) {
        const side = Math.floor(Math.random() * 4);
        let x, y;
        if(side === 0) { x = Math.random() * canvas.width; y = -30; }
        else if(side === 1) { x = canvas.width + 30; y = Math.random() * canvas.height; }
        else if(side === 2) { x = Math.random() * canvas.width; y = canvas.height + 30; }
        else { x = -30; y = Math.random() * canvas.height; }
        enemies.push({ x, y, speed: 1.6 + (score / 4000) });
    }
    setTimeout(spawnEnemy, 1000);
}

function update() {
    if (!gameActive) return;
    const s = 6;
    if (keys['w']) player.y -= s; if (keys['s']) player.y += s;
    if (keys['a']) player.x -= s; if (keys['d']) player.x += s;

    bullets = bullets.filter(b => {
        b.x += b.vx; b.y += b.vy;
        return !(b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height);
    });

    enemies.forEach((e, i) => {
        const ang = Math.atan2(player.y - e.y, player.x - e.x);
        e.x += Math.cos(ang) * e.speed;
        e.y += Math.sin(ang) * e.speed;

        if (Math.hypot(player.x - e.x, player.y - e.y) < 25) {
            hp -= 10; enemies.splice(i, 1);
            document.body.classList.add('damage-flash');
            setTimeout(() => document.body.classList.remove('damage-flash'), 100);
            if (hp <= 0) endGame();
        }

        bullets.forEach((b, j) => {
            if (Math.hypot(b.x - e.x, b.y - e.y) < 22) {
                enemies.splice(i, 1); bullets.splice(j, 1);
                score += 100;
            }
        });
    });
    hpEl.innerText = hp; scoreEl.innerText = score;
}

function draw() {
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.shadowBlur = 15; ctx.shadowColor = '#ffd700';
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(player.x - 15, player.y - 15, 30, 30);
    
    ctx.shadowBlur = 10; ctx.shadowColor = '#ff0044';
    ctx.fillStyle = '#ff0044';
    enemies.forEach(e => ctx.fillRect(e.x - 12, e.y - 12, 24, 24));
    
    ctx.shadowBlur = 0; ctx.fillStyle = '#00f2ff';
    bullets.forEach(b => ctx.fillRect(b.x - 2, b.y - 2, 4, 4));
}

function loop() {
    if (!gameActive) return;
    update(); draw();
    requestAnimationFrame(loop);
}

function endGame() {
    gameActive = false;
    const h = localStorage.getItem('voxelHigh') || 0;
    if (score > h) localStorage.setItem('voxelHigh', score);
    document.getElementById('final-stats').innerText = `CONEXÃO ENCERRADA - SCORE: ${score}`;
    document.getElementById('game-over').classList.remove('hidden');
}

window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

canvas.addEventListener('mousedown', e => {
    if (!gameActive) return;
    const now = Date.now();
    if (now - lastShot < FIRE_RATE) return;
    lastShot = now;
    
    const rect = canvas.getBoundingClientRect();
    const ang = Math.atan2(e.clientY - rect.top - player.y, e.clientX - rect.left - player.x);
    bullets.push({ x: player.x, y: player.y, vx: Math.cos(ang) * 14, vy: Math.sin(ang) * 14 });
    
    playRevolverSound(); // Som do tiro
});