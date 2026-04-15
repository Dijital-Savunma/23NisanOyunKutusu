/*
 * Platformer Oyun Motoru
 * Canvas tabanlı 2D yan kaydırmalı oyun motoru
 */

const Engine = {
    canvas: null,
    ctx: null,
    width: 0,
    height: 0,
    running: false,
    lastTime: 0,

    // Kamera
    camera: { x: 0, y: 0 },

    // Oyuncu
    player: {
        x: 100, y: 0,
        vx: 0, vy: 0,
        width: 48, height: 55,
        onGround: false,
        facing: 1, // 1 = sağ, -1 = sol
        frame: 0,
        frameTimer: 0,
        color: '#64c8ff',
        eyeColor: '#fff',
        jumpsLeft: 0,     // Kalan zıplama hakkı
        maxJumps: 1,      // 1 = normal, 2 = çift zıplama
    },

    // Hasar efektleri
    screenShake: 0,
    hitFlashAlpha: 0,
    particles: [],

    // Fizik ayarları (yaş grubuna göre değişir)
    physics: {
        gravity: 0.6,
        jumpForce: -12,
        moveSpeed: 4,
        friction: 0.85,
        maxFallSpeed: 10,
    },

    // Giriş durumu
    input: {
        left: false,
        right: false,
        jump: false,
        jumpPressed: false,
    },

    // Seviye verileri
    platforms: [],
    coins: [],
    hazards: [],
    triggers: [],     // İzin tuzakları tetikleme noktaları
    decorations: [],
    levelWidth: 3000,
    groundY: 0,

    // Toplanan coinler
    collectedCoins: new Set(),
    score: 0,
    hearts: 3,

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
        this.groundY = this.height - 80;
    },

    setupInput() {
        // Klavye
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'a') this.input.left = true;
            if (e.key === 'ArrowRight' || e.key === 'd') this.input.right = true;
            if ((e.key === 'ArrowUp' || e.key === 'w' || e.key === ' ') && !this.input.jumpPressed) {
                this.input.jump = true;
                this.input.jumpPressed = true;
            }
        });
        document.addEventListener('keyup', (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'a') this.input.left = false;
            if (e.key === 'ArrowRight' || e.key === 'd') this.input.right = false;
            if (e.key === 'ArrowUp' || e.key === 'w' || e.key === ' ') {
                this.input.jump = false;
                this.input.jumpPressed = false;
            }
        });

        // Mobil butonlar
        const setupBtn = (id, key) => {
            const btn = document.getElementById(id);
            if (!btn) return;
            const start = () => {
                this.input[key] = true;
                if (key === 'jump') this.input.jumpPressed = true;
            };
            const end = () => {
                this.input[key] = false;
                if (key === 'jump') this.input.jumpPressed = false;
            };
            btn.addEventListener('touchstart', (e) => { e.preventDefault(); start(); });
            btn.addEventListener('touchend', (e) => { e.preventDefault(); end(); });
            btn.addEventListener('mousedown', start);
            btn.addEventListener('mouseup', end);
            btn.addEventListener('mouseleave', end);
        };
        setupBtn('btn-left', 'left');
        setupBtn('btn-right', 'right');
        setupBtn('btn-jump', 'jump');
    },

    loadLevel(levelData) {
        this.platforms = levelData.platforms || [];
        this.coins = levelData.coins || [];
        this.hazards = levelData.hazards || [];
        this.triggers = levelData.triggers || [];
        this.decorations = levelData.decorations || [];
        this.levelWidth = levelData.width || 5000;
        this.collectedCoins = new Set();
        this.score = 0;

        // Oyuncuyu başlangıç noktasına yerleştir
        this.player.x = levelData.startX || 100;
        this.player.y = levelData.startY || this.groundY - this.player.height;
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.onGround = false;
        this.player.jumpsLeft = this.player.maxJumps;

        this.screenShake = 0;
        this.hitFlashAlpha = 0;
        this.particles = [];

        this.camera.x = 0;
        this.camera.y = 0;

        this.updateHUD();
    },

    start() {
        this.running = true;
        this.lastTime = performance.now();
        this.loop();
    },

    pause() {
        this.running = false;
    },

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
        const ph = this.physics;

        // Yatay hareket
        if (this.input.left) {
            p.vx -= ph.moveSpeed * 0.3 * dt;
            p.facing = -1;
        }
        if (this.input.right) {
            p.vx += ph.moveSpeed * 0.3 * dt;
            p.facing = 1;
        }

        // Sürtünme
        p.vx *= ph.friction;
        if (Math.abs(p.vx) < 0.1) p.vx = 0;

        // Hız limiti
        p.vx = Math.max(-ph.moveSpeed, Math.min(ph.moveSpeed, p.vx));

        // Zıplama (çift zıplama destekli)
        if (this.input.jump && p.jumpsLeft > 0) {
            // İkinci zıplamada biraz daha zayıf
            const force = p.jumpsLeft < p.maxJumps ? ph.jumpForce * 0.85 : ph.jumpForce;
            p.vy = force;
            p.onGround = false;
            p.jumpsLeft--;
            this.input.jump = false;

            // Çift zıplama parçacık efekti
            if (p.jumpsLeft < p.maxJumps - 1) {
                this.spawnJumpParticles(p.x + p.width / 2, p.y + p.height);
            }
        }

        // Yerçekimi
        p.vy += ph.gravity * dt;
        p.vy = Math.min(p.vy, ph.maxFallSpeed);

        // Pozisyon güncelleme
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // Sınır kontrolü
        if (p.x < 0) p.x = 0;
        if (p.x > this.levelWidth - p.width) p.x = this.levelWidth - p.width;

        // Zemin çarpışması
        p.onGround = false;
        if (p.y + p.height >= this.groundY) {
            p.y = this.groundY - p.height;
            p.vy = 0;
            p.onGround = true;
            p.jumpsLeft = p.maxJumps;
        }

        // Platform çarpışması
        for (const plat of this.platforms) {
            if (this.collideRect(
                p.x, p.y, p.width, p.height,
                plat.x, plat.y, plat.w, plat.h
            )) {
                // Üstten çarpma
                const prevBottom = p.y + p.height - p.vy * dt;
                if (prevBottom <= plat.y + 5 && p.vy >= 0) {
                    p.y = plat.y - p.height;
                    p.vy = 0;
                    p.onGround = true;
                    p.jumpsLeft = p.maxJumps;
                }
                // Alttan çarpma
                else if (p.vy < 0 && p.y >= plat.y + plat.h - 5) {
                    p.y = plat.y + plat.h;
                    p.vy = 0;
                }
                // Yandan çarpma
                else {
                    if (p.vx > 0) p.x = plat.x - p.width;
                    else if (p.vx < 0) p.x = plat.x + plat.w;
                    p.vx = 0;
                }
            }
        }

        // Coin toplama
        for (let i = 0; i < this.coins.length; i++) {
            const c = this.coins[i];
            if (this.collectedCoins.has(i)) continue;
            if (this.collideRect(
                p.x, p.y, p.width, p.height,
                c.x, c.y, 25, 25
            )) {
                this.collectedCoins.add(i);
                this.score += 10;
                this.updateHUD();
            }
        }

        // Tehlike çarpışması
        for (const h of this.hazards) {
            if (this.collideRect(
                p.x + 5, p.y + 5, p.width - 10, p.height - 10,
                h.x, h.y, h.w, h.h
            )) {
                this.playerHit();
            }
        }

        // Tetikleme kontrolü (izin tuzakları)
        for (let i = 0; i < this.triggers.length; i++) {
            const t = this.triggers[i];
            if (t.triggered) continue;
            if (p.x + p.width > t.x && p.x < t.x + (t.w || 40)) {
                t.triggered = true;
                this.pause();
                if (typeof onPermissionTrigger === 'function') {
                    onPermissionTrigger(t);
                }
            }
        }

        // Seviye sonu kontrolü
        if (p.x >= this.levelWidth - 100) {
            this.pause();
            if (typeof onLevelComplete === 'function') {
                onLevelComplete();
            }
        }

        // Animasyon karesi
        p.frameTimer += dt;
        if (p.frameTimer > 8) {
            p.frame = (p.frame + 1) % 4;
            p.frameTimer = 0;
        }

        // Efektleri güncelle
        if (this.screenShake > 0) this.screenShake *= 0.85;
        if (this.screenShake < 0.3) this.screenShake = 0;
        if (this.hitFlashAlpha > 0) this.hitFlashAlpha -= 0.015 * dt;
        if (this.hitFlashAlpha < 0) this.hitFlashAlpha = 0;
        this.updateParticles(dt);

        // Kamera takibi
        const targetCamX = p.x - this.width / 3;
        this.camera.x += (targetCamX - this.camera.x) * 0.1;
        this.camera.x = Math.max(0, Math.min(this.camera.x, this.levelWidth - this.width));

        // Düşme kontrolü
        if (p.y > this.height + 100) {
            this.playerHit();
            p.x = 100;
            p.y = this.groundY - p.height - 50;
            p.vx = 0;
            p.vy = 0;
        }
    },

    playerHit() {
        if (this._hitCooldown) return;
        this._hitCooldown = true;
        this.hearts--;
        this.updateHUD();

        const p = this.player;

        // Geriye fırlat
        p.vy = -8;
        p.vx = -p.facing * 4;

        // Ekran sarsıntısı
        this.screenShake = 12;

        // Kırmızı parlama
        this.hitFlashAlpha = 0.5;

        // Hasar parçacıkları
        this.spawnHitParticles(p.x + p.width / 2, p.y + p.height / 2);

        setTimeout(() => { this._hitCooldown = false; }, 1500);

        if (this.hearts <= 0) {
            this.hearts = 3;
            this.updateHUD();
        }
    },

    spawnHitParticles(x, y) {
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const speed = 2 + Math.random() * 4;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2,
                life: 1,
                decay: 0.02 + Math.random() * 0.02,
                size: 3 + Math.random() * 4,
                color: Math.random() > 0.5 ? '#ef4444' : '#fbbf24',
                type: 'hit',
            });
        }
    },

    spawnJumpParticles(x, y) {
        for (let i = 0; i < 8; i++) {
            const angle = Math.PI * 0.3 + Math.random() * Math.PI * 0.4;
            const speed = 1 + Math.random() * 2;
            this.particles.push({
                x: x + (Math.random() - 0.5) * 20,
                y,
                vx: Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1),
                vy: Math.sin(angle) * speed,
                life: 1,
                decay: 0.03 + Math.random() * 0.02,
                size: 2 + Math.random() * 3,
                color: '#64c8ff',
                type: 'jump',
            });
        }
    },

    updateParticles(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 0.15 * dt; // Hafif yerçekimi
            p.life -= p.decay * dt;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    },

    collideRect(x1, y1, w1, h1, x2, y2, w2, h2) {
        return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
    },

    updateHUD() {
        const scoreEl = document.getElementById('hud-score');
        const heartsEl = document.getElementById('hud-hearts');
        if (scoreEl) scoreEl.textContent = '⭐ ' + this.score;
        if (heartsEl) heartsEl.textContent = '❤️'.repeat(Math.max(0, this.hearts));
    },

    render() {
        const ctx = this.ctx;
        const cam = this.camera;

        // Gökyüzü
        const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, '#1a1a4e');
        gradient.addColorStop(0.6, '#2d1b69');
        gradient.addColorStop(1, '#0a0a2e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.width, this.height);

        // Yıldızlar
        this.renderStars(cam.x * 0.2);

        // Arka plan dağlar
        this.renderMountains(cam.x * 0.3);

        // Ekran sarsıntısı
        const shakeX = this.screenShake > 0 ? (Math.random() - 0.5) * this.screenShake * 2 : 0;
        const shakeY = this.screenShake > 0 ? (Math.random() - 0.5) * this.screenShake * 2 : 0;

        ctx.save();
        ctx.translate(-cam.x + shakeX, -cam.y + shakeY);

        // Dekorasyonlar
        for (const d of this.decorations) {
            this.renderDecoration(d);
        }

        // Zemin
        this.renderGround();

        // Platformlar
        for (const plat of this.platforms) {
            this.renderPlatform(plat);
        }

        // Coinler
        for (let i = 0; i < this.coins.length; i++) {
            if (this.collectedCoins.has(i)) continue;
            this.renderCoin(this.coins[i]);
        }

        // Tehlikeler
        for (const h of this.hazards) {
            this.renderHazard(h);
        }

        // Tetikleme noktaları (görünür işaret)
        for (const t of this.triggers) {
            if (!t.triggered) {
                this.renderTriggerSign(t);
            }
        }

        // Bitiş noktası
        this.renderFinish();

        // Parçacıklar (dünya koordinatlarında)
        this.renderParticles();

        // Oyuncu
        this.renderPlayer();

        ctx.restore();

        // Kırmızı hasar katmanı (ekran koordinatlarında)
        if (this.hitFlashAlpha > 0) {
            ctx.fillStyle = `rgba(239, 68, 68, ${this.hitFlashAlpha})`;
            ctx.fillRect(0, 0, this.width, this.height);
        }

        // Kenar kızarması (hasar sırasında)
        if (this._hitCooldown) {
            const vg = ctx.createRadialGradient(
                this.width / 2, this.height / 2, this.height * 0.35,
                this.width / 2, this.height / 2, this.height * 0.75
            );
            vg.addColorStop(0, 'rgba(239, 68, 68, 0)');
            vg.addColorStop(1, 'rgba(239, 68, 68, 0.15)');
            ctx.fillStyle = vg;
            ctx.fillRect(0, 0, this.width, this.height);
        }
    },

    renderParticles() {
        const ctx = this.ctx;
        for (const p of this.particles) {
            ctx.globalAlpha = Math.max(0, p.life);
            ctx.fillStyle = p.color;
            if (p.type === 'hit') {
                // Kıvılcım şekli
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                // Parlak çekirdek
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * 0.4, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Zıplama parçacıkları
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;
    },

    renderStars(offset) {
        const ctx = this.ctx;
        // Sabit seed ile yıldız pozisyonları
        for (let i = 0; i < 80; i++) {
            const seed = i * 7919;
            const x = ((seed * 13) % this.width + this.width - (offset % this.width)) % this.width;
            const y = (seed * 17) % (this.height * 0.6);
            const size = (seed % 3) + 1;
            const alpha = 0.3 + (seed % 7) / 10;
            ctx.fillStyle = `rgba(255,255,255,${alpha})`;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
    },

    renderMountains(offset) {
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(30, 20, 60, 0.6)';
        ctx.beginPath();
        ctx.moveTo(0, this.height);
        for (let x = 0; x <= this.width; x += 60) {
            const h = Math.sin((x + offset) * 0.005) * 80 + Math.sin((x + offset) * 0.01) * 40;
            ctx.lineTo(x, this.height - 150 - h);
        }
        ctx.lineTo(this.width, this.height);
        ctx.fill();
    },

    renderGround() {
        const ctx = this.ctx;
        // Ana zemin
        ctx.fillStyle = '#2d5a1e';
        ctx.fillRect(0, this.groundY, this.levelWidth, this.height - this.groundY + 100);

        // Çimen detayı
        ctx.fillStyle = '#4a8c2a';
        ctx.fillRect(0, this.groundY, this.levelWidth, 8);

        // Çimen çizgileri
        ctx.strokeStyle = '#5ea835';
        ctx.lineWidth = 2;
        for (let x = 0; x < this.levelWidth; x += 20) {
            const h = 5 + Math.sin(x * 0.3) * 4;
            ctx.beginPath();
            ctx.moveTo(x, this.groundY);
            ctx.lineTo(x - 3, this.groundY - h);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x + 5, this.groundY);
            ctx.lineTo(x + 8, this.groundY - h - 2);
            ctx.stroke();
        }
    },

    renderPlatform(plat) {
        const ctx = this.ctx;
        const color = plat.color || '#5a3a1e';

        // Platform gövdesi
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(plat.x, plat.y, plat.w, plat.h, 6);
        ctx.fill();

        // Üst çimen
        ctx.fillStyle = '#4a8c2a';
        ctx.beginPath();
        ctx.roundRect(plat.x, plat.y, plat.w, 6, [6, 6, 0, 0]);
        ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(plat.x + 3, plat.y + 6, plat.w - 6, 3);
    },

    renderCoin(coin) {
        const ctx = this.ctx;
        const time = performance.now() * 0.003;
        const bobY = Math.sin(time + coin.x * 0.01) * 4;

        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(coin.x + 12, coin.y + 12 + bobY, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(coin.x + 12, coin.y + 12 + bobY, 8, 0, Math.PI * 2);
        ctx.fill();

        // Yıldız parlaması
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath();
        ctx.arc(coin.x + 9, coin.y + 9 + bobY, 3, 0, Math.PI * 2);
        ctx.fill();
    },

    renderHazard(h) {
        const ctx = this.ctx;
        const time = performance.now() * 0.003;
        const spikes = Math.floor(h.w / 15);
        const spikeW = h.w / spikes;

        // Tehlike tabanı
        ctx.fillStyle = '#7f1d1d';
        ctx.fillRect(h.x, h.y + h.h - 4, h.w, 6);

        for (let i = 0; i < spikes; i++) {
            const sx = h.x + i * spikeW;
            const wobble = Math.sin(time + i * 0.8) * 1.5;

            // Diken gövdesi
            const dg = ctx.createLinearGradient(sx + spikeW / 2, h.y, sx + spikeW / 2, h.y + h.h);
            dg.addColorStop(0, '#fca5a5');
            dg.addColorStop(0.4, '#ef4444');
            dg.addColorStop(1, '#991b1b');
            ctx.fillStyle = dg;

            ctx.beginPath();
            ctx.moveTo(sx + 2, h.y + h.h);
            ctx.lineTo(sx + spikeW / 2 + wobble, h.y - 2);
            ctx.lineTo(sx + spikeW - 2, h.y + h.h);
            ctx.fill();

            // Uç parlaklığı
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.beginPath();
            ctx.arc(sx + spikeW / 2 + wobble, h.y + 2, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Tehlike parıltısı (nabız efekti)
        const pulse = Math.sin(time * 2) * 0.15 + 0.1;
        ctx.fillStyle = `rgba(239, 68, 68, ${pulse})`;
        ctx.beginPath();
        ctx.ellipse(h.x + h.w / 2, h.y + h.h / 2, h.w / 2 + 8, h.h + 6, 0, 0, Math.PI * 2);
        ctx.fill();
    },

    renderTriggerSign(t) {
        const ctx = this.ctx;
        const time = performance.now() * 0.002;
        const bobY = Math.sin(time) * 5;

        // Uyarı tabelası
        const signX = t.x - 10;
        const signY = this.groundY - 100 + bobY;

        // Direk
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(signX + 18, signY + 35, 6, 65);

        // Tabela
        ctx.fillStyle = 'rgba(255, 100, 100, 0.9)';
        ctx.beginPath();
        ctx.roundRect(signX - 5, signY, 50, 35, 5);
        ctx.fill();

        ctx.font = '20px serif';
        ctx.textAlign = 'center';
        const icons = { camera: '📷', microphone: '🎤', location: '📍' };
        ctx.fillText(icons[t.type] || '⚠️', signX + 20, signY + 26);
    },

    renderFinish() {
        const ctx = this.ctx;
        const fx = this.levelWidth - 80;
        const fy = this.groundY - 120;
        const time = performance.now() * 0.003;

        // Bayrak direği
        ctx.fillStyle = '#ccc';
        ctx.fillRect(fx + 15, fy, 5, 120);

        // Bayrak (dalgalanan)
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.moveTo(fx + 20, fy);
        ctx.lineTo(fx + 60 + Math.sin(time) * 5, fy + 15);
        ctx.lineTo(fx + 20, fy + 30);
        ctx.fill();

        // Yıldız
        ctx.font = '25px serif';
        ctx.fillText('⭐', fx + 8, fy - 5);
    },

    renderDecoration(d) {
        const ctx = this.ctx;
        if (d.type === 'tree') {
            // Gövde
            ctx.fillStyle = '#5a3a1e';
            ctx.fillRect(d.x + 10, d.y - 40, 12, 40);
            // Yapraklar
            ctx.fillStyle = '#2d7a1e';
            ctx.beginPath();
            ctx.arc(d.x + 16, d.y - 55, 25, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#3a9a2a';
            ctx.beginPath();
            ctx.arc(d.x + 16, d.y - 65, 18, 0, Math.PI * 2);
            ctx.fill();
        } else if (d.type === 'bush') {
            ctx.fillStyle = '#2a6a15';
            ctx.beginPath();
            ctx.arc(d.x + 15, d.y, 18, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(d.x + 35, d.y + 2, 15, 0, Math.PI * 2);
            ctx.fill();
        } else if (d.type === 'flower') {
            // Sap
            ctx.strokeStyle = '#3a8a25';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(d.x + 5, d.y);
            ctx.lineTo(d.x + 5, d.y - 15);
            ctx.stroke();
            // Çiçek
            ctx.fillStyle = d.color || '#f472b6';
            ctx.beginPath();
            ctx.arc(d.x + 5, d.y - 18, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(d.x + 5, d.y - 18, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    },

    renderPlayer() {
        const ctx = this.ctx;
        const p = this.player;
        const time = performance.now() * 0.005;

        // Hasar yanıp sönme
        if (this._hitCooldown && Math.sin(time * 10) > 0.3) {
            return; // Yanıp sönme efekti — bazı frame'lerde çizme
        }

        ctx.save();
        ctx.translate(p.x + p.width / 2, p.y + p.height / 2);
        if (p.facing < 0) ctx.scale(-1, 1);

        // Bacak animasyonu (yürürken)
        if (Math.abs(p.vx) > 0.5 && p.onGround) {
            const legOffset = Math.sin(p.frame * 1.5) * 5;
            ctx.fillStyle = p.color;
            ctx.fillRect(-10, p.height / 2 - 2, 9, 8 + legOffset);
            ctx.fillRect(3, p.height / 2 - 2, 9, 8 - legOffset);
        } else {
            // Duruyorken bacaklar
            ctx.fillStyle = p.color;
            ctx.fillRect(-10, p.height / 2 - 2, 9, 8);
            ctx.fillRect(3, p.height / 2 - 2, 9, 8);
        }

        // Fotoğraf varsa → fotoğraflı karakter
        if (typeof playerAvatarImage !== 'undefined' && playerAvatarImage) {
            // Gövde (fotoğraf çerçevesi)
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.roundRect(-p.width / 2 - 3, -p.height / 2 - 3, p.width + 6, p.height + 6, 14);
            ctx.fill();

            // Fotoğrafı daire şeklinde kırp ve çiz
            ctx.save();
            ctx.beginPath();
            ctx.roundRect(-p.width / 2, -p.height / 2, p.width, p.height, 10);
            ctx.clip();
            ctx.drawImage(playerAvatarImage, -p.width / 2, -p.height / 2, p.width, p.height);
            ctx.restore();

            // Parlak çerçeve kenarı
            ctx.strokeStyle = 'rgba(255,255,255,0.4)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(-p.width / 2, -p.height / 2, p.width, p.height, 10);
            ctx.stroke();

            // Küçük kalkan rozeti
            ctx.font = '14px serif';
            ctx.fillText('🛡️', p.width / 2 - 5, -p.height / 2 + 5);
        } else {
            // Fotoğraf yoksa → varsayılan karakter çiz
            // Gövde
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.roundRect(-p.width / 2, -p.height / 2, p.width, p.height, 10);
            ctx.fill();

            // Göz alanı
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.ellipse(4, -8, 8, 10, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(-6, -8, 6, 8, 0, 0, Math.PI * 2);
            ctx.fill();

            // Göz bebekleri
            ctx.fillStyle = '#1a1a2e';
            ctx.beginPath();
            ctx.arc(6, -7, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(-4, -7, 3, 0, Math.PI * 2);
            ctx.fill();

            // Gülümseme
            ctx.strokeStyle = '#1a1a2e';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 2, 8, 0.1, Math.PI - 0.1);
            ctx.stroke();
        }

        ctx.restore();
    },
};
