/*
 * Guvenlik Duvari Oyunu (9-12 Yas)
 * Veri paketlerini yakala / kacinma - Dijital guvenlik ogretici oyun
 */

const GuvenlikDuvari = {
    canvas: null,
    ctx: null,
    width: 0,
    height: 0,
    running: false,
    lastTime: 0,

    shield: {
        x: 0, y: 0,
        width: 140, height: 22,
        speed: 7,
        moveDir: 0,
        glowPhase: 0,
    },

    packets: [],
    packetTimer: 0,
    packetInterval: 55,
    baseSpeed: 2.0,
    speedMultiplier: 1.0,

    bossTimer: 0,
    bossInterval: 900,
    bossTexts: [
        'Bedava V-Bucks!',
        'iPhone kazandin!',
        'Sifren calindi!',
        'Tikla ve kazan!',
        'Ozel teklif sana!',
        'Hesabin hacklendi!',
        'Hemen tikla!',
        'Hediye kodu al!',
        'Gizli bilgi sizdi!',
        'Bedava elmas kazan!',
    ],

    score: 0,
    hearts: 3,
    combo: 0,
    comboMultiplier: 1,
    maxCombo: 4,

    screenShake: 0,
    hitFlashAlpha: 0,
    particles: [],
    scorePopups: [],
    comboScale: 1.0,

    dataStreams: [],
    gridOffset: 0,

    // Izin tetikleyicileri -- her 300 puanda
    triggerScores: [300, 600, 900],
    triggerTypes: ['camera', 'microphone', 'location'],
    triggeredSet: new Set(),

    touchActive: false,
    touchStartX: 0,
    shieldStartX: 0,

    safeIcons: ['\u{1F6E1}', '\u2705', '\u{1F512}', '\u{1F4E6}', '\u2B50'],
    dangerIcons: ['\u{1F441}', '\u2620', '\u26A0', '\u{1F6A8}', '\u{1F525}'],

    init(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.setupInput();
        this.initDataStreams();
    },

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.shield.width = Math.min(this.width * 0.25, 160);
        this.shield.height = Math.max(18, this.height * 0.028);
        this.shield.y = this.height - this.shield.height - 50;
        this.shield.speed = Math.max(5, this.width * 0.012);

        if (this.shield.x < 10) this.shield.x = 10;
        if (this.shield.x + this.shield.width > this.width - 10) {
            this.shield.x = this.width - this.shield.width - 10;
        }
    },

    initDataStreams() {
        this.dataStreams = [];
        const count = Math.floor(this.width / 30);
        for (let i = 0; i < count; i++) {
            this.dataStreams.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                speed: 0.3 + Math.random() * 0.8,
                length: 30 + Math.random() * 80,
                alpha: 0.03 + Math.random() * 0.06,
                char: String.fromCharCode(48 + Math.floor(Math.random() * 10)),
            });
        }
    },

    setupInput() {
        document.addEventListener('keydown', (e) => {
            if (!this.running) return;
            if (e.key === 'ArrowLeft' || e.key === 'a') this.shield.moveDir = -1;
            if (e.key === 'ArrowRight' || e.key === 'd') this.shield.moveDir = 1;
        });
        document.addEventListener('keyup', (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'ArrowRight' || e.key === 'd') {
                this.shield.moveDir = 0;
            }
        });

        this.canvas.addEventListener('touchstart', (e) => {
            if (!this.running) return;
            e.preventDefault();
            this.touchActive = true;
            this.touchStartX = e.touches[0].clientX;
            this.shieldStartX = this.shield.x;
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (e) => {
            if (!this.running || !this.touchActive) return;
            e.preventDefault();
            const dx = e.touches[0].clientX - this.touchStartX;
            this.shield.x = this.shieldStartX + dx;
            this.clampShield();
        }, { passive: false });

        this.canvas.addEventListener('touchend', () => {
            this.touchActive = false;
        });

        this.canvas.addEventListener('click', (e) => {
            if (!this.running) return;
            const half = this.width / 2;
            const dir = e.clientX < half ? -1 : 1;
            this.shield.x += dir * this.shield.speed * 8;
            this.clampShield();
        });
    },

    clampShield() {
        if (this.shield.x < 10) this.shield.x = 10;
        if (this.shield.x + this.shield.width > this.width - 10) {
            this.shield.x = this.width - this.shield.width - 10;
        }
    },

    start() {
        this.score = 0;
        this.hearts = 3;
        this.combo = 0;
        this.comboMultiplier = 1;
        this.packets = [];
        this.particles = [];
        this.scorePopups = [];
        this.packetTimer = 0;
        this.bossTimer = 0;
        this.speedMultiplier = 1.0;
        this.screenShake = 0;
        this.hitFlashAlpha = 0;
        this.triggeredSet = new Set();
        this.shield.x = (this.width - this.shield.width) / 2;
        this.shield.moveDir = 0;
        this.shield.glowPhase = 0;
        this.comboScale = 1.0;
        this.initDataStreams();
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
        this.speedMultiplier = Math.min(2.2, 1.0 + this.score * 0.0008);

        if (this.shield.moveDir !== 0 && !this.touchActive) {
            this.shield.x += this.shield.moveDir * this.shield.speed * dt;
            this.clampShield();
        }

        this.shield.glowPhase += 0.04 * dt;

        this.packetTimer += dt;
        const adjustedInterval = this.packetInterval / this.speedMultiplier;
        if (this.packetTimer >= adjustedInterval) {
            this.packetTimer = 0;
            this.spawnPacket();
        }

        this.bossTimer += dt;
        if (this.bossTimer >= this.bossInterval / this.speedMultiplier) {
            this.bossTimer = 0;
            this.spawnBossPacket();
        }

        for (let i = this.packets.length - 1; i >= 0; i--) {
            const pkt = this.packets[i];
            pkt.y += pkt.speed * this.speedMultiplier * dt;
            pkt.glowPhase += 0.05 * dt;

            if (pkt.isBoss) {
                pkt.borderPhase += 0.08 * dt;
            }

            if (this.checkShieldCollision(pkt)) {
                this.handleCatch(pkt, i);
                continue;
            }

            if (pkt.y > this.height + 60) {
                if (pkt.safe) {
                    this.score = Math.max(0, this.score - 5);
                    this.breakCombo();
                    this.spawnScorePopup(pkt.x + pkt.w / 2, this.height - 30, '-5', '#f97316');
                }
                this.packets.splice(i, 1);
                this.updateHUD();
            }
        }

        if (this.screenShake > 0) {
            this.screenShake *= 0.85;
            if (this.screenShake < 0.3) this.screenShake = 0;
        }
        if (this.hitFlashAlpha > 0) {
            this.hitFlashAlpha -= 0.025 * dt;
            if (this.hitFlashAlpha < 0) this.hitFlashAlpha = 0;
        }
        this.updateParticles(dt);
        this.updateScorePopups(dt);

        if (this.comboScale > 1.0) {
            this.comboScale += (1.0 - this.comboScale) * 0.1 * dt;
            if (Math.abs(this.comboScale - 1.0) < 0.01) this.comboScale = 1.0;
        }

        for (const ds of this.dataStreams) {
            ds.y += ds.speed * dt;
            if (ds.y > this.height + ds.length) {
                ds.y = -ds.length;
                ds.x = Math.random() * this.width;
                ds.char = String.fromCharCode(48 + Math.floor(Math.random() * 10));
            }
        }
        this.gridOffset += 0.3 * dt;

        // Skora gore izin tetikleyici kontrolu
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

        // 1200 puanda oyun biter
        if (this.score >= 1200) {
            this.pause();
            if (typeof onLevelComplete === 'function') {
                onLevelComplete();
            }
        }
    },

    spawnPacket() {
        const isSafe = Math.random() < 0.55;
        const w = 48 + Math.random() * 16;
        const h = 48 + Math.random() * 16;
        const margin = 20;
        const x = margin + Math.random() * (this.width - w - margin * 2);

        const icons = isSafe ? this.safeIcons : this.dangerIcons;
        const icon = icons[Math.floor(Math.random() * icons.length)];

        this.packets.push({
            x, y: -h - 10,
            w, h,
            speed: this.baseSpeed + Math.random() * 0.8,
            safe: isSafe,
            icon,
            isBoss: false,
            bossText: '',
            glowPhase: Math.random() * Math.PI * 2,
            borderPhase: 0,
        });
    },

    spawnBossPacket() {
        const w = 130;
        const h = 70;
        const x = (this.width - w) / 2 + (Math.random() - 0.5) * (this.width * 0.4);
        const clampedX = Math.max(20, Math.min(this.width - w - 20, x));
        const text = this.bossTexts[Math.floor(Math.random() * this.bossTexts.length)];

        this.packets.push({
            x: clampedX, y: -h - 20,
            w, h,
            speed: this.baseSpeed + 0.5 + Math.random() * 0.5,
            safe: false,
            icon: '\u26A0',
            isBoss: true,
            bossText: text,
            glowPhase: 0,
            borderPhase: 0,
        });
    },

    checkShieldCollision(pkt) {
        const s = this.shield;
        const sx = s.x, sy = s.y, sw = s.width, sh = s.height;
        return (
            pkt.x < sx + sw &&
            pkt.x + pkt.w > sx &&
            pkt.y + pkt.h > sy &&
            pkt.y + pkt.h < sy + sh + pkt.speed * this.speedMultiplier * 2
        );
    },

    handleCatch(pkt, index) {
        const cx = pkt.x + pkt.w / 2;
        const cy = pkt.y + pkt.h / 2;

        if (pkt.safe) {
            const points = 10 * this.comboMultiplier;
            this.score += points;
            this.combo++;
            this.comboMultiplier = Math.min(this.maxCombo, 1 + Math.floor(this.combo / 3));
            this.comboScale = 1.5;
            this.spawnCatchParticles(cx, cy, true);
            this.spawnScorePopup(cx, cy - 20, '+' + points, '#10b981');
        } else {
            this.hearts--;
            this.screenShake = 15;
            this.hitFlashAlpha = 0.5;
            this.breakCombo();
            this.spawnCatchParticles(cx, cy, false);
            this.spawnScorePopup(cx, cy - 20, '\u{1F4A5}', '#ef4444');

            if (this.hearts <= 0) {
                this.hearts = 3;
            }
        }

        this.packets.splice(index, 1);
        this.updateHUD();
    },

    breakCombo() {
        this.combo = 0;
        this.comboMultiplier = 1;
    },

    spawnCatchParticles(x, y, isSafe) {
        const count = isSafe ? 12 : 18;
        const colors = isSafe
            ? ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#fbbf24']
            : ['#ef4444', '#f97316', '#fbbf24', '#dc2626', '#ff6b6b'];

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 5;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2,
                life: 1,
                decay: 0.018 + Math.random() * 0.015,
                size: 2 + Math.random() * 5,
                color: colors[Math.floor(Math.random() * colors.length)],
            });
        }
    },

    spawnScorePopup(x, y, text, color) {
        this.scorePopups.push({
            x, y,
            text,
            color,
            life: 1,
            vy: -1.5,
        });
    },

    updateParticles(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 0.12 * dt;
            p.life -= p.decay * dt;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    },

    updateScorePopups(dt) {
        for (let i = this.scorePopups.length - 1; i >= 0; i--) {
            const sp = this.scorePopups[i];
            sp.y += sp.vy * dt;
            sp.life -= 0.02 * dt;
            if (sp.life <= 0) this.scorePopups.splice(i, 1);
        }
    },

    updateHUD() {
        const scoreEl = document.getElementById('hud-score');
        const heartsEl = document.getElementById('hud-hearts');
        if (scoreEl) scoreEl.textContent = '\u2B50 ' + this.score;
        if (heartsEl) heartsEl.textContent = '\u2764\uFE0F'.repeat(Math.max(0, this.hearts));
    },

    render() {
        const ctx = this.ctx;
        const shakeX = this.screenShake > 0 ? (Math.random() - 0.5) * this.screenShake * 2 : 0;
        const shakeY = this.screenShake > 0 ? (Math.random() - 0.5) * this.screenShake * 2 : 0;

        ctx.save();
        ctx.translate(shakeX, shakeY);

        this.renderBackground(ctx);
        this.renderDataStreams(ctx);

        for (const pkt of this.packets) {
            if (pkt.isBoss) {
                this.renderBossPacket(ctx, pkt);
            } else {
                this.renderPacket(ctx, pkt);
            }
        }

        this.renderShield(ctx);

        for (const part of this.particles) {
            ctx.globalAlpha = Math.max(0, part.life);
            ctx.shadowBlur = 6;
            ctx.shadowColor = part.color;
            ctx.fillStyle = part.color;
            ctx.beginPath();
            ctx.arc(part.x, part.y, part.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;

        for (const sp of this.scorePopups) {
            ctx.globalAlpha = Math.max(0, sp.life);
            ctx.fillStyle = sp.color;
            ctx.shadowBlur = 8;
            ctx.shadowColor = sp.color;
            ctx.font = 'bold 20px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(sp.text, sp.x, sp.y);
        }
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;

        if (this.comboMultiplier > 1) {
            this.renderCombo(ctx);
        }

        if (this.score < 30) {
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.font = '14px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('\u25C0 Sol / Sag \u25B6 veya suru\u0308kle', this.width / 2, this.height - 12);
        }

        ctx.restore();

        if (this.hitFlashAlpha > 0) {
            const vg = ctx.createRadialGradient(
                this.width / 2, this.height / 2, this.height * 0.15,
                this.width / 2, this.height / 2, this.height * 0.75
            );
            vg.addColorStop(0, 'rgba(239, 68, 68, 0)');
            vg.addColorStop(1, `rgba(239, 68, 68, ${this.hitFlashAlpha})`);
            ctx.fillStyle = vg;
            ctx.fillRect(0, 0, this.width, this.height);
        }
    },

    renderBackground(ctx) {
        const bg = ctx.createLinearGradient(0, 0, 0, this.height);
        bg.addColorStop(0, '#0a0e1a');
        bg.addColorStop(0.5, '#0f172a');
        bg.addColorStop(1, '#1e1b4b');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.strokeStyle = 'rgba(59, 130, 246, 0.06)';
        ctx.lineWidth = 1;
        const gridSize = 40;
        const offsetY = this.gridOffset % gridSize;

        for (let x = 0; x < this.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.height);
            ctx.stroke();
        }
        for (let y = -gridSize + offsetY; y < this.height + gridSize; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.width, y);
            ctx.stroke();
        }
    },

    renderDataStreams(ctx) {
        for (const ds of this.dataStreams) {
            ctx.fillStyle = `rgba(59, 130, 246, ${ds.alpha})`;
            ctx.fillRect(ds.x, ds.y, 1.5, ds.length);

            ctx.fillStyle = `rgba(96, 165, 250, ${ds.alpha * 2.5})`;
            ctx.font = '10px monospace';
            ctx.fillText(ds.char, ds.x - 3, ds.y);
        }
    },

    renderPacket(ctx, pkt) {
        const { x, y, w, h, safe, icon, glowPhase } = pkt;
        const cx = x + w / 2;
        const cy = y + h / 2;
        const r = 10;

        const glowIntensity = 0.5 + Math.sin(glowPhase) * 0.3;
        if (safe) {
            ctx.shadowBlur = 15 * glowIntensity;
            ctx.shadowColor = 'rgba(16, 185, 129, 0.6)';
        } else {
            ctx.shadowBlur = 15 * glowIntensity;
            ctx.shadowColor = 'rgba(239, 68, 68, 0.7)';
        }

        let grad;
        if (safe) {
            grad = ctx.createLinearGradient(x, y, x + w, y + h);
            grad.addColorStop(0, '#065f46');
            grad.addColorStop(0.4, '#10b981');
            grad.addColorStop(0.7, '#34d399');
            grad.addColorStop(1, '#064e3b');
        } else {
            grad = ctx.createLinearGradient(x, y, x + w, y + h);
            grad.addColorStop(0, '#7f1d1d');
            grad.addColorStop(0.4, '#ef4444');
            grad.addColorStop(0.7, '#f97316');
            grad.addColorStop(1, '#991b1b');
        }

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, r);
        ctx.fill();

        const innerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.6);
        innerGrad.addColorStop(0, safe ? 'rgba(167, 243, 208, 0.2)' : 'rgba(252, 165, 165, 0.2)');
        innerGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = innerGrad;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, r);
        ctx.fill();

        ctx.strokeStyle = safe ? 'rgba(167, 243, 208, 0.5)' : 'rgba(252, 165, 165, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, r);
        ctx.stroke();

        ctx.shadowBlur = 0;

        ctx.font = `${Math.min(w, h) * 0.55}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(icon, cx, cy);

        ctx.textBaseline = 'alphabetic';
    },

    renderBossPacket(ctx, pkt) {
        const { x, y, w, h, bossText, glowPhase, borderPhase } = pkt;
        const cx = x + w / 2;
        const cy = y + h / 2;
        const r = 14;

        const pulse = 0.6 + Math.sin(glowPhase * 2) * 0.4;
        ctx.shadowBlur = 25 * pulse;
        ctx.shadowColor = 'rgba(168, 85, 247, 0.8)';

        const grad = ctx.createLinearGradient(x, y, x + w, y + h);
        grad.addColorStop(0, '#4c1d95');
        grad.addColorStop(0.3, '#7c3aed');
        grad.addColorStop(0.6, '#dc2626');
        grad.addColorStop(1, '#581c87');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, r);
        ctx.fill();

        const borderHue = (borderPhase * 60) % 360;
        ctx.strokeStyle = `hsl(${borderHue}, 80%, 55%)`;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 4]);
        ctx.lineDashOffset = -borderPhase * 20;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, r);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.shadowBlur = 0;

        ctx.font = 'bold 20px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fbbf24';
        ctx.fillText('\u26A0', cx, y + 18);

        ctx.font = 'bold 13px system-ui, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(bossText, cx, cy + 8);

        ctx.font = '9px system-ui, sans-serif';
        ctx.fillStyle = 'rgba(251, 191, 36, 0.7)';
        ctx.fillText('DOLANDIRICI!', cx, y + h - 8);

        ctx.textBaseline = 'alphabetic';
    },

    renderShield(ctx) {
        const s = this.shield;
        const { x, y, width: w, height: h, glowPhase } = s;
        const cx = x + w / 2;
        const glowVal = 0.5 + Math.sin(glowPhase) * 0.3;

        ctx.shadowBlur = 18 * glowVal;
        ctx.shadowColor = 'rgba(96, 165, 250, 0.7)';

        const grad = ctx.createLinearGradient(x, y, x, y + h);
        grad.addColorStop(0, 'rgba(148, 163, 184, 0.9)');
        grad.addColorStop(0.3, 'rgba(226, 232, 240, 0.95)');
        grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.9)');
        grad.addColorStop(0.7, 'rgba(203, 213, 225, 0.9)');
        grad.addColorStop(1, 'rgba(100, 116, 139, 0.85)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, h / 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(96, 165, 250, ${0.5 + glowVal * 0.4})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, h / 2);
        ctx.stroke();

        const shineGrad = ctx.createLinearGradient(x + w * 0.2, y, x + w * 0.8, y);
        shineGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        shineGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)');
        shineGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = shineGrad;
        ctx.beginPath();
        ctx.roundRect(x + w * 0.15, y + 2, w * 0.7, h * 0.35, 3);
        ctx.fill();

        ctx.shadowBlur = 0;

        ctx.font = `${h * 0.8}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(59, 130, 246, 0.8)';
        ctx.fillText('\u{1F6E1}', cx, y + h / 2);
        ctx.textBaseline = 'alphabetic';

        const edgeGlow = ctx.createRadialGradient(x, y + h / 2, 0, x, y + h / 2, 20);
        edgeGlow.addColorStop(0, `rgba(96, 165, 250, ${0.3 * glowVal})`);
        edgeGlow.addColorStop(1, 'rgba(96, 165, 250, 0)');
        ctx.fillStyle = edgeGlow;
        ctx.fillRect(x - 20, y - 10, 40, h + 20);

        const edgeGlow2 = ctx.createRadialGradient(x + w, y + h / 2, 0, x + w, y + h / 2, 20);
        edgeGlow2.addColorStop(0, `rgba(96, 165, 250, ${0.3 * glowVal})`);
        edgeGlow2.addColorStop(1, 'rgba(96, 165, 250, 0)');
        ctx.fillStyle = edgeGlow2;
        ctx.fillRect(x + w - 20, y - 10, 40, h + 20);
    },

    renderCombo(ctx) {
        const text = 'x' + this.comboMultiplier;
        const x = this.width - 60;
        const y = 90;
        const scale = this.comboScale;

        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);

        ctx.shadowBlur = 20;
        ctx.shadowColor = 'rgba(251, 191, 36, 0.6)';
        ctx.fillStyle = 'rgba(251, 191, 36, 0.15)';
        ctx.beginPath();
        ctx.arc(0, 0, 28, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 28, 0, Math.PI * 2);
        ctx.stroke();

        ctx.shadowBlur = 10;
        ctx.shadowColor = '#fbbf24';
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 26px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 0, 0);

        ctx.fillStyle = 'rgba(251, 191, 36, 0.6)';
        ctx.font = '9px system-ui, sans-serif';
        ctx.fillText('KOMBO', 0, 22);

        ctx.restore();
        ctx.shadowBlur = 0;
        ctx.textBaseline = 'alphabetic';
    },
};
