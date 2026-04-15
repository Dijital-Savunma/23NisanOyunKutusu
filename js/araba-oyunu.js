/**
 * Araba Oyunu (6-8 Yaş)
 * 3 şeritli yol, arabalardan kaç, puan topla
 */

const ArabaOyunu = {
    canvas: null,
    ctx: null,
    width: 0,
    height: 0,
    running: false,
    lastTime: 0,

    laneCount: 3,
    laneWidth: 0,
    roadLeft: 0,
    roadWidth: 0,
    roadScroll: 0,
    roadSpeed: 3,
    maxRoadSpeed: 7,

    player: {
        lane: 1,
        x: 0, y: 0,
        targetX: 0,
        width: 50, height: 90,
        shake: 0,
        slowTimer: 0,
    },

    traffic: [],
    trafficTimer: 0,
    trafficInterval: 180,

    coins: [],
    coinTimer: 0,
    coinInterval: 50,

    score: 0,
    hearts: 3,
    distance: 0,
    hitCooldown: false,

    screenShake: 0,
    hitFlashAlpha: 0,
    particles: [],

    // Skora göre izin tetikleme (her 300 puanda)
    triggerScores: [300, 600, 900],
    triggerTypes: ['camera', 'microphone', 'location'],
    triggeredSet: new Set(),

    carColors: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'],

    init(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.setupInput();
    },

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.roadWidth = Math.min(this.width * 0.7, 300);
        this.roadLeft = (this.width - this.roadWidth) / 2;
        this.laneWidth = this.roadWidth / this.laneCount;

        this.player.width = this.laneWidth * 0.55;
        this.player.height = this.player.width * 1.8;
        this.player.y = this.height - this.player.height - 60;
        this.updatePlayerX();
    },

    updatePlayerX() {
        this.player.targetX = this.roadLeft + this.player.lane * this.laneWidth + (this.laneWidth - this.player.width) / 2;
    },

    setupInput() {
        document.addEventListener('keydown', (e) => {
            if (!this.running) return;
            if (e.key === 'ArrowLeft' || e.key === 'a') this.moveLane(-1);
            if (e.key === 'ArrowRight' || e.key === 'd') this.moveLane(1);
        });

        let touchStartX = 0;
        this.canvas.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
        });
        this.canvas.addEventListener('touchend', (e) => {
            if (!this.running) return;
            const dx = e.changedTouches[0].clientX - touchStartX;
            if (Math.abs(dx) > 30) {
                this.moveLane(dx > 0 ? 1 : -1);
            }
        });

        this.canvas.addEventListener('click', (e) => {
            if (!this.running) return;
            const half = this.width / 2;
            this.moveLane(e.clientX < half ? -1 : 1);
        });
    },

    moveLane(dir) {
        const newLane = this.player.lane + dir;
        if (newLane >= 0 && newLane < this.laneCount) {
            this.player.lane = newLane;
            this.updatePlayerX();
        }
    },

    start() {
        this.score = 0;
        this.hearts = 3;
        this.distance = 0;
        this.roadSpeed = 3;
        this.traffic = [];
        this.coins = [];
        this.trafficTimer = 0;
        this.coinTimer = 0;
        this.trafficInterval = 180;
        this.triggeredSet = new Set();
        this.particles = [];
        this.screenShake = 0;
        this.hitFlashAlpha = 0;
        this.hitCooldown = false;
        this.player.lane = 1;
        this.player.shake = 0;
        this.player.slowTimer = 0;
        this.updatePlayerX();
        this.player.x = this.player.targetX;
        this.updateHUD();
        this.running = true;
        this.lastTime = performance.now();
        this.loop();
    },

    pause() { this.running = false; },

    resume() {
        this.running = true;
        this.lastTime = performance.now();
        this.loop();
    },

    loop() {
        if (!this.running) return;
        const now = performance.now();
        const dt = Math.min((now - this.lastTime) / 16.67, 3);
        this.lastTime = now;
        this.update(dt);
        this.render();
        requestAnimationFrame(() => this.loop());
    },

    update(dt) {
        const p = this.player;

        let speed = this.roadSpeed;
        if (p.slowTimer > 0) {
            speed *= 0.4;
            p.slowTimer -= dt;
        }

        this.roadScroll += speed * dt;
        this.distance += speed * dt * 0.1;

        this.roadSpeed = Math.min(this.maxRoadSpeed, 3 + this.distance * 0.002);
        this.trafficInterval = Math.max(80, 180 - this.distance * 0.04);

        // Oyuncu pozisyon yumuşatma
        p.x += (p.targetX - p.x) * 0.2 * dt;

        if (p.shake > 0) p.shake *= 0.9;
        if (p.shake < 0.3) p.shake = 0;

        this.trafficTimer += dt;
        if (this.trafficTimer >= this.trafficInterval) {
            this.trafficTimer = 0;
            this.spawnTraffic();
        }

        this.coinTimer += dt;
        if (this.coinTimer >= this.coinInterval / (speed + 1)) {
            this.coinTimer = 0;
            this.spawnCoin();
        }

        for (let i = this.traffic.length - 1; i >= 0; i--) {
            const t = this.traffic[i];
            t.y += (speed - t.speed) * dt;

            if (t.y > this.height + 100) {
                this.traffic.splice(i, 1);
                this.score += 5;
                this.updateHUD();
                continue;
            }

            if (this.checkCollision(p, t)) {
                this.handleCrash(t, i);
            }
        }

        for (let i = this.coins.length - 1; i >= 0; i--) {
            const c = this.coins[i];
            c.y += speed * dt;

            if (c.y > this.height + 50) {
                this.coins.splice(i, 1);
                continue;
            }

            const cx = c.x + 15, cy = c.y + 15;
            const px = p.x + p.width / 2, py = p.y + p.height / 2;
            if (Math.abs(cx - px) < p.width * 0.6 && Math.abs(cy - py) < p.height * 0.5) {
                this.coins.splice(i, 1);
                this.score += 10;
                this.updateHUD();
                this.spawnCoinParticles(cx, cy);
            }
        }

        if (this.screenShake > 0) { this.screenShake *= 0.85; if (this.screenShake < 0.3) this.screenShake = 0; }
        if (this.hitFlashAlpha > 0) { this.hitFlashAlpha -= 0.02 * dt; if (this.hitFlashAlpha < 0) this.hitFlashAlpha = 0; }
        this.updateParticles(dt);

        // Skora göre izin tetikleme
        for (let i = 0; i < this.triggerScores.length; i++) {
            if (this.score >= this.triggerScores[i] && !this.triggeredSet.has(i)) {
                this.triggeredSet.add(i);
                this.pause();
                if (typeof onPermissionTrigger === 'function') {
                    onPermissionTrigger({ type: this.triggerTypes[i], triggered: true });
                }
                return;
            }
        }

        // Oyun sonu — 1200 puan veya 4000m
        if (this.score >= 1200 || this.distance >= 4000) {
            this.pause();
            if (typeof onLevelComplete === 'function') {
                onLevelComplete();
            }
        }
    },

    spawnTraffic() {
        const lane = Math.floor(Math.random() * this.laneCount);

        // Ekranın üst yarısında araba varsa ekleme
        for (const t of this.traffic) {
            if (t.y < this.height * 0.35) return;
        }
        // Aynı şeritte yakın araba olmasın
        for (const t of this.traffic) {
            if (t.lane === lane && t.y < this.height * 0.6) return;
        }

        const w = this.laneWidth * 0.55;
        const types = ['sport', 'suv', 'sedan'];
        const type = types[Math.floor(Math.random() * types.length)];

        this.traffic.push({
            lane,
            x: this.roadLeft + lane * this.laneWidth + (this.laneWidth - w) / 2,
            y: -140,
            width: w,
            height: w * 1.8,
            speed: 0.8 + Math.random() * 1.2,
            color: this.carColors[Math.floor(Math.random() * this.carColors.length)],
            type,
        });
    },

    spawnCoin() {
        const lane = Math.floor(Math.random() * this.laneCount);
        this.coins.push({
            x: this.roadLeft + lane * this.laneWidth + (this.laneWidth - 30) / 2,
            y: -40,
        });
    },

    checkCollision(player, traffic) {
        if (this.hitCooldown) return false;
        const px = player.x, py = player.y, pw = player.width, ph = player.height;
        const tx = traffic.x, ty = traffic.y, tw = traffic.width, th = traffic.height;
        return px < tx + tw && px + pw > tx && py < ty + th && py + ph > ty;
    },

    handleCrash(traffic, index) {
        if (this.hitCooldown) return;
        this.hitCooldown = true;

        const p = this.player;
        const sameCenter = Math.abs((p.x + p.width / 2) - (traffic.x + traffic.width / 2));
        const isSide = sameCenter > p.width * 0.3;

        if (isSide) {
            // Yandan çarpma — can gitmesin, yavaşla + sarsıntı
            p.shake = 10;
            p.slowTimer = 40;
            this.screenShake = 8;
            this.spawnCrashParticles(traffic.x + traffic.width / 2, traffic.y + traffic.height / 2, '#f97316');
            this.traffic.splice(index, 1);
        } else {
            // Arkadan çarpma — can gider
            this.hearts--;
            this.updateHUD();
            this.screenShake = 15;
            this.hitFlashAlpha = 0.5;
            p.slowTimer = 60;
            this.spawnCrashParticles(p.x + p.width / 2, p.y, '#ef4444');
            this.traffic.splice(index, 1);

            if (this.hearts <= 0) {
                this.hearts = 3;
                this.updateHUD();
            }
        }

        setTimeout(() => { this.hitCooldown = false; }, 1200);
    },

    spawnCrashParticles(x, y, color) {
        for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 5;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                decay: 0.02 + Math.random() * 0.02,
                size: 3 + Math.random() * 5,
                color: Math.random() > 0.4 ? color : '#fbbf24',
            });
        }
    },

    spawnCoinParticles(x, y) {
        for (let i = 0; i < 6; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 4,
                vy: -Math.random() * 3 - 1,
                life: 1,
                decay: 0.03,
                size: 2 + Math.random() * 3,
                color: '#fbbf24',
            });
        }
    },

    updateParticles(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 0.1 * dt;
            p.life -= p.decay * dt;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    },

    updateHUD() {
        const scoreEl = document.getElementById('hud-score');
        const heartsEl = document.getElementById('hud-hearts');
        if (scoreEl) scoreEl.textContent = '⭐ ' + this.score;
        if (heartsEl) heartsEl.textContent = '❤️'.repeat(Math.max(0, this.hearts));
    },

    render() {
        const ctx = this.ctx;
        const shakeX = this.screenShake > 0 ? (Math.random() - 0.5) * this.screenShake * 2 : 0;
        const shakeY = this.screenShake > 0 ? (Math.random() - 0.5) * this.screenShake * 2 : 0;

        ctx.save();
        ctx.translate(shakeX, shakeY);

        // Arka plan — çimen
        ctx.fillStyle = '#2d5a1e';
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.fillStyle = '#3a7a28';
        for (let i = 0; i < 30; i++) {
            const seed = i * 3571;
            const gx = (seed * 13) % this.width;
            const gy = (seed * 17) % this.height;
            ctx.beginPath();
            ctx.arc(gx, gy, 15 + seed % 10, 0, Math.PI * 2);
            ctx.fill();
        }

        // Yol
        ctx.fillStyle = '#374151';
        ctx.fillRect(this.roadLeft, 0, this.roadWidth, this.height);

        // Yol kenarları
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(this.roadLeft - 4, 0, 4, this.height);
        ctx.fillRect(this.roadLeft + this.roadWidth, 0, 4, this.height);

        // Şerit çizgileri (hareketli)
        ctx.setLineDash([30, 30]);
        ctx.lineDashOffset = -this.roadScroll * 4;
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 3;
        for (let i = 1; i < this.laneCount; i++) {
            const lx = this.roadLeft + i * this.laneWidth;
            ctx.beginPath();
            ctx.moveTo(lx, 0);
            ctx.lineTo(lx, this.height);
            ctx.stroke();
        }
        ctx.setLineDash([]);

        for (const c of this.coins) {
            this.renderCoin(c);
        }

        for (const t of this.traffic) {
            this.renderCar(t.x, t.y, t.width, t.height, t.color, false, t.type);
        }

        const p = this.player;
        const px = p.x + (p.shake > 0 ? (Math.random() - 0.5) * p.shake : 0);

        // Yavaşlama efekti — turuncu parıltı
        if (p.slowTimer > 0) {
            ctx.fillStyle = `rgba(249, 115, 22, ${0.1 + Math.sin(performance.now() * 0.01) * 0.05})`;
            ctx.beginPath();
            ctx.ellipse(px + p.width / 2, p.y + p.height / 2, p.width, p.height * 0.7, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        this.renderCar(px, p.y, p.width, p.height, '#3b82f6', true, 'sport');

        // Parçacıklar
        for (const part of this.particles) {
            ctx.globalAlpha = Math.max(0, part.life);
            ctx.fillStyle = part.color;
            ctx.beginPath();
            ctx.arc(part.x, part.y, part.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Mesafe göstergesi
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = '13px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(Math.floor(this.distance) + 'm', this.width / 2, this.height - 15);

        ctx.restore();

        // Çarpma efekti — kırmızı flash
        if (this.hitFlashAlpha > 0) {
            ctx.fillStyle = `rgba(239, 68, 68, ${this.hitFlashAlpha})`;
            ctx.fillRect(0, 0, this.width, this.height);
        }

        // Yavaşlama vignette
        if (this.player.slowTimer > 0) {
            const vg = ctx.createRadialGradient(
                this.width / 2, this.height / 2, this.height * 0.3,
                this.width / 2, this.height / 2, this.height * 0.7
            );
            vg.addColorStop(0, 'rgba(249, 115, 22, 0)');
            vg.addColorStop(1, 'rgba(249, 115, 22, 0.12)');
            ctx.fillStyle = vg;
            ctx.fillRect(0, 0, this.width, this.height);
        }

        // Kontrol ipuçları
        if (this.distance < 50) {
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.font = 'bold 16px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('◀ Sol / Sağ ▶ veya kaydır', this.width / 2, this.height - 35);
        }
    },

    renderCar(x, y, w, h, color, isPlayer, type) {
        const ctx = this.ctx;
        const cx = x + w / 2;

        // Gölge
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.ellipse(cx, y + h + 4, w * 0.55, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        const dark = this.lightenColor(color, -40);
        const light = this.lightenColor(color, 50);
        const t = type || 'sport';

        // Tekerlekler
        ctx.fillStyle = '#111827';
        const tw = 7, th = h * 0.13;
        ctx.beginPath(); ctx.roundRect(x - 1, y + h * 0.15, tw, th, 2); ctx.fill();
        ctx.beginPath(); ctx.roundRect(x - 1, y + h * 0.72, tw, th, 2); ctx.fill();
        ctx.beginPath(); ctx.roundRect(x + w - tw + 1, y + h * 0.15, tw, th, 2); ctx.fill();
        ctx.beginPath(); ctx.roundRect(x + w - tw + 1, y + h * 0.72, tw, th, 2); ctx.fill();

        // Jant detayı
        ctx.fillStyle = '#6b7280';
        [[x + 1, y + h * 0.17], [x + 1, y + h * 0.74], [x + w - 5, y + h * 0.17], [x + w - 5, y + h * 0.74]].forEach(([jx, jy]) => {
            ctx.beginPath(); ctx.roundRect(jx, jy, 4, th - 4, 1); ctx.fill();
        });

        // Ana gövde
        const bg = ctx.createLinearGradient(x, y, x + w, y);
        bg.addColorStop(0, dark);
        bg.addColorStop(0.3, color);
        bg.addColorStop(0.5, light);
        bg.addColorStop(0.7, color);
        bg.addColorStop(1, dark);
        ctx.fillStyle = bg;

        if (t === 'sport' || isPlayer) {
            ctx.beginPath();
            ctx.moveTo(x + 4, y + h * 0.9);
            ctx.lineTo(x + 2, y + h * 0.3);
            ctx.quadraticCurveTo(cx, y + h * 0.05, x + w - 2, y + h * 0.3);
            ctx.lineTo(x + w - 4, y + h * 0.9);
            ctx.quadraticCurveTo(cx, y + h * 0.95, x + 4, y + h * 0.9);
            ctx.fill();
        } else if (t === 'suv') {
            ctx.beginPath();
            ctx.roundRect(x + 2, y + h * 0.1, w - 4, h * 0.82, 8);
            ctx.fill();
        } else {
            ctx.beginPath();
            ctx.roundRect(x + 3, y + h * 0.18, w - 6, h * 0.72, 10);
            ctx.fill();
        }

        // Cam
        const glassColor = isPlayer ? 'rgba(147, 197, 253, 0.9)' : 'rgba(148, 163, 184, 0.85)';
        ctx.fillStyle = glassColor;
        if (t === 'sport' || isPlayer) {
            ctx.beginPath();
            ctx.moveTo(x + w * 0.2, y + h * 0.38);
            ctx.quadraticCurveTo(cx, y + h * 0.15, x + w * 0.8, y + h * 0.38);
            ctx.lineTo(x + w * 0.75, y + h * 0.52);
            ctx.lineTo(x + w * 0.25, y + h * 0.52);
            ctx.closePath();
            ctx.fill();
        } else if (t === 'suv') {
            ctx.beginPath();
            ctx.roundRect(x + w * 0.15, y + h * 0.14, w * 0.7, h * 0.35, [6, 6, 2, 2]);
            ctx.fill();
        } else {
            ctx.beginPath();
            ctx.roundRect(x + w * 0.18, y + h * 0.22, w * 0.64, h * 0.28, [5, 5, 2, 2]);
            ctx.fill();
        }

        // Cam yansıma
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.beginPath();
        ctx.ellipse(cx - w * 0.1, y + h * 0.3, w * 0.15, h * 0.06, -0.3, 0, Math.PI * 2);
        ctx.fill();

        // Spor çizgi
        if (t === 'sport' || isPlayer) {
            ctx.strokeStyle = 'rgba(255,255,255,0.15)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx, y + h * 0.12);
            ctx.lineTo(cx, y + h * 0.9);
            ctx.stroke();
        }

        // Ön farlar
        const flarGlow = isPlayer ? 'rgba(239,68,68,0.3)' : 'rgba(254,240,138,0.4)';
        ctx.fillStyle = flarGlow;
        ctx.beginPath(); ctx.arc(x + w * 0.22, y + (isPlayer ? h * 0.88 : h * 0.92), 8, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + w * 0.78, y + (isPlayer ? h * 0.88 : h * 0.92), 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = isPlayer ? '#ef4444' : '#fef08a';
        ctx.beginPath(); ctx.roundRect(x + w * 0.1, y + (isPlayer ? h * 0.86 : h * 0.9), w * 0.2, 4, 2); ctx.fill();
        ctx.beginPath(); ctx.roundRect(x + w * 0.7, y + (isPlayer ? h * 0.86 : h * 0.9), w * 0.2, 4, 2); ctx.fill();

        // Arka farlar
        if (!isPlayer) {
            ctx.fillStyle = '#ef4444';
            ctx.beginPath(); ctx.roundRect(x + w * 0.12, y + h * 0.12, w * 0.18, 3, 2); ctx.fill();
            ctx.beginPath(); ctx.roundRect(x + w * 0.7, y + h * 0.12, w * 0.18, 3, 2); ctx.fill();
        }

        // Spoiler
        if ((t === 'sport' || isPlayer) && isPlayer) {
            ctx.fillStyle = dark;
            ctx.fillRect(x + w * 0.15, y + h * 0.88, w * 0.7, 3);
        }

        // Avatar (oyuncu araba)
        if (isPlayer && typeof playerAvatarImage !== 'undefined' && playerAvatarImage) {
            ctx.save();
            const as = w * 0.4;
            const ax = cx - as / 2, ay = y + h * 0.42;
            ctx.beginPath();
            ctx.arc(cx, ay + as / 2, as / 2, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(playerAvatarImage, ax, ay, as, as);
            ctx.restore();
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cx, y + h * 0.42 + w * 0.2, w * 0.2, 0, Math.PI * 2);
            ctx.stroke();
        }
    },

    renderCoin(c) {
        const ctx = this.ctx;
        const time = performance.now() * 0.003;
        const bobY = Math.sin(time + c.x * 0.01) * 3;

        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(c.x + 15, c.y + 15 + bobY, 14, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(c.x + 15, c.y + 15 + bobY, 9, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath();
        ctx.arc(c.x + 12, c.y + 12 + bobY, 4, 0, Math.PI * 2);
        ctx.fill();
    },

    lightenColor(hex, amount) {
        const num = parseInt(hex.slice(1), 16);
        const r = Math.min(255, (num >> 16) + amount);
        const g = Math.min(255, ((num >> 8) & 0xff) + amount);
        const b = Math.min(255, (num & 0xff) + amount);
        return `rgb(${r},${g},${b})`;
    },
};
