/**
 * Sifre Kirici (9-12 Yas)
 * Simon Says tarzi desen ezberleme oyunu, hacker temasi.
 */

const SifreKirici = {
    canvas: null,
    ctx: null,
    width: 0,
    height: 0,
    running: false,
    lastTime: 0,

    state: 'idle',

    // Butonlar — 6 sembol, dairesel yerlesim
    buttons: [],
    buttonCount: 6,
    buttonRadius: 0,
    centerX: 0,
    centerY: 0,
    orbitRadius: 0,

    symbols: ['🔐', '⚡', '🛡️', '💎', '🔑', '🧬'],
    colors: [
        { base: '#3b82f6', glow: '#60a5fa', dark: '#1d4ed8' },
        { base: '#f59e0b', glow: '#fbbf24', dark: '#d97706' },
        { base: '#10b981', glow: '#34d399', dark: '#059669' },
        { base: '#8b5cf6', glow: '#a78bfa', dark: '#6d28d9' },
        { base: '#ef4444', glow: '#f87171', dark: '#dc2626' },
        { base: '#ec4899', glow: '#f472b6', dark: '#db2777' },
    ],

    sequence: [],
    playerIndex: 0,
    round: 0,
    maxRound: 6,

    showIndex: 0,
    showTimer: 0,
    showInterval: 35,
    showGap: 15,
    activeButton: -1,
    activeTimer: 0,

    score: 0,
    hearts: 3,
    combo: 0,

    screenShake: 0,
    hitFlashAlpha: 0,
    particles: [],
    floatingTexts: [],
    pulseRings: [],

    shieldHealth: 1,
    shieldPulse: 0,

    bgNodes: [],
    bgTime: 0,
    matrixChars: [],

    // Her 2 turda bir izin tetiklenir
    triggerRounds: [2, 4, 6],
    triggerTypes: ['camera', 'microphone', 'location'],
    triggeredSet: new Set(),
    pendingTrigger: null,

    init(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.setupInput();
        this.initBackground();
    },

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.centerX = this.width / 2;
        this.centerY = this.height * 0.48;
        this.orbitRadius = Math.min(this.width, this.height) * 0.28;
        this.buttonRadius = Math.min(this.width, this.height) * 0.09;

        this.layoutButtons();
    },

    layoutButtons() {
        this.buttons = [];
        for (let i = 0; i < this.buttonCount; i++) {
            const angle = (i / this.buttonCount) * Math.PI * 2 - Math.PI / 2;
            this.buttons.push({
                x: this.centerX + Math.cos(angle) * this.orbitRadius,
                y: this.centerY + Math.sin(angle) * this.orbitRadius,
                angle,
                glow: 0,
                pressScale: 1,
            });
        }
    },

    initBackground() {
        this.bgNodes = [];
        for (let i = 0; i < 25; i++) {
            this.bgNodes.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                size: 2 + Math.random() * 3,
            });
        }

        this.matrixChars = [];
        for (let i = 0; i < 30; i++) {
            this.matrixChars.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                speed: 0.5 + Math.random() * 1.5,
                char: String.fromCharCode(0x30A0 + Math.random() * 96),
                alpha: 0.05 + Math.random() * 0.12,
                size: 10 + Math.random() * 8,
            });
        }
    },

    setupInput() {
        const handlePress = (clientX, clientY) => {
            if (this.state !== 'player') return;

            const rect = this.canvas.getBoundingClientRect();
            const mx = clientX - rect.left;
            const my = clientY - rect.top;

            for (let i = 0; i < this.buttons.length; i++) {
                const b = this.buttons[i];
                const dist = Math.hypot(mx - b.x, my - b.y);
                if (dist < this.buttonRadius * 1.3) {
                    this.playerPress(i);
                    return;
                }
            }
        };

        this.canvas.addEventListener('click', (e) => handlePress(e.clientX, e.clientY));
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            handlePress(e.touches[0].clientX, e.touches[0].clientY);
        });

        // Klavye destegi — 1-6 tuslari
        document.addEventListener('keydown', (e) => {
            if (this.state !== 'player') return;
            const num = parseInt(e.key);
            if (num >= 1 && num <= 6) {
                this.playerPress(num - 1);
            }
        });
    },

    start() {
        this.score = 0;
        this.hearts = 3;
        this.combo = 0;
        this.round = 0;
        this.sequence = [];
        this.shieldHealth = 1;
        this.triggeredSet = new Set();
        this.particles = [];
        this.floatingTexts = [];
        this.pulseRings = [];
        this.screenShake = 0;
        this.hitFlashAlpha = 0;
        this.updateHUD();
        this.running = true;
        this.lastTime = performance.now();

        setTimeout(() => this.nextRound(), 800);
        this.loop();
    },

    pause() { this.running = false; },

    resume() {
        this.running = true;
        this.lastTime = performance.now();
        setTimeout(() => this.nextRound(), 600);
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

    nextRound() {
        this.round++;
        this.playerIndex = 0;

        this.sequence.push(Math.floor(Math.random() * this.buttonCount));

        // Ileri turlarda gosterim hizi artar
        this.showInterval = Math.max(18, 35 - this.round * 1.5);
        this.showGap = Math.max(8, 15 - this.round * 0.5);

        document.getElementById('hud-level').textContent = `Seviye ${this.round}`;

        this.state = 'showing';
        this.showIndex = 0;
        this.showTimer = 30;
        this.activeButton = -1;
    },

    update(dt) {
        this.bgTime += dt * 0.01;

        for (const n of this.bgNodes) {
            n.x += n.vx * dt;
            n.y += n.vy * dt;
            if (n.x < 0 || n.x > this.width) n.vx *= -1;
            if (n.y < 0 || n.y > this.height) n.vy *= -1;
        }

        for (const m of this.matrixChars) {
            m.y += m.speed * dt;
            if (m.y > this.height) {
                m.y = -20;
                m.x = Math.random() * this.width;
                m.char = String.fromCharCode(0x30A0 + Math.random() * 96);
            }
        }

        for (const b of this.buttons) {
            b.glow *= 0.92;
            if (b.glow < 0.01) b.glow = 0;
            b.pressScale += (1 - b.pressScale) * 0.15 * dt;
        }

        // Desen gosterimi
        if (this.state === 'showing') {
            this.showTimer -= dt;
            if (this.showTimer <= 0) {
                if (this.activeButton >= 0) {
                    this.activeButton = -1;
                    this.showTimer = this.showGap;

                    if (this.showIndex >= this.sequence.length) {
                        this.state = 'player';
                        this.playerIndex = 0;
                    }
                } else {
                    if (this.showIndex < this.sequence.length) {
                        this.activeButton = this.sequence[this.showIndex];
                        this.buttons[this.activeButton].glow = 1;
                        this.showIndex++;
                        this.showTimer = this.showInterval;
                    }
                }
            }
        }

        if (this.screenShake > 0) { this.screenShake *= 0.88; if (this.screenShake < 0.3) this.screenShake = 0; }
        if (this.hitFlashAlpha > 0) { this.hitFlashAlpha -= 0.015 * dt; if (this.hitFlashAlpha < 0) this.hitFlashAlpha = 0; }
        this.shieldPulse += dt * 0.05;

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += (p.gravity || 0.08) * dt;
            p.life -= p.decay * dt;
            if (p.rotation !== undefined) p.rotation += p.rotSpeed * dt;
            if (p.life <= 0) this.particles.splice(i, 1);
        }

        for (let i = this.pulseRings.length - 1; i >= 0; i--) {
            const r = this.pulseRings[i];
            r.radius += r.speed * dt;
            r.alpha -= 0.02 * dt;
            if (r.alpha <= 0) this.pulseRings.splice(i, 1);
        }

        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const t = this.floatingTexts[i];
            t.y -= 1.2 * dt;
            t.alpha -= 0.015 * dt;
            if (t.alpha <= 0) this.floatingTexts.splice(i, 1);
        }
    },

    playerPress(btnIndex) {
        const expected = this.sequence[this.playerIndex];

        this.buttons[btnIndex].glow = 1;
        this.buttons[btnIndex].pressScale = 0.85;

        if (btnIndex === expected) {
            this.playerIndex++;
            this.combo++;

            const b = this.buttons[btnIndex];
            this.spawnCorrectParticles(b.x, b.y, this.colors[btnIndex]);
            this.pulseRings.push({
                x: b.x, y: b.y,
                radius: this.buttonRadius,
                speed: 3,
                alpha: 0.6,
                color: this.colors[btnIndex].glow,
            });

            // Desen tamamlandiginda toplu puan verilir
            if (this.playerIndex >= this.sequence.length) {
                const roundPts = this.sequence.length * 50;
                this.score += roundPts;
                this.updateHUD();

                this.shieldHealth = Math.min(1, this.shieldHealth + 0.15);
                this.spawnShieldParticles();

                this.floatingTexts.push({
                    x: this.centerX, y: this.centerY - 20,
                    text: '+' + roundPts + ' puan!',
                    alpha: 1,
                    color: '#10b981',
                    size: 30,
                });

                if (this.combo >= 3) {
                    this.floatingTexts.push({
                        x: this.centerX, y: this.centerY + 15,
                        text: this.combo + 'x Kombo!',
                        alpha: 1,
                        color: '#fbbf24',
                        size: 24,
                    });
                }

                // Izin trigger kontrolu
                const triggerIdx = this.triggerRounds.indexOf(this.round);
                if (triggerIdx >= 0 && !this.triggeredSet.has(triggerIdx)) {
                    this.triggeredSet.add(triggerIdx);
                    this.state = 'correct';
                    setTimeout(() => {
                        this.pause();
                        if (typeof onPermissionTrigger === 'function') {
                            onPermissionTrigger({ type: this.triggerTypes[triggerIdx], triggered: true });
                        }
                    }, 1000);
                    return;
                }

                if (this.round >= this.maxRound) {
                    this.state = 'idle';
                    setTimeout(() => {
                        this.pause();
                        if (typeof onLevelComplete === 'function') onLevelComplete();
                    }, 800);
                    return;
                }

                this.state = 'correct';
                setTimeout(() => this.nextRound(), 1000);
            }
        } else {
            // Yanlis basildi
            this.state = 'wrong';
            this.combo = 0;
            this.hearts--;
            this.shieldHealth = Math.max(0, this.shieldHealth - 0.25);
            this.screenShake = 12;
            this.hitFlashAlpha = 0.4;
            this.updateHUD();

            const b = this.buttons[btnIndex];
            this.spawnWrongParticles(b.x, b.y);

            this.floatingTexts.push({
                x: this.centerX, y: this.centerY + this.orbitRadius + 40,
                text: this.hearts > 0 ? 'Yanlış! Tekrar dene' : 'Kalkan kırıldı!',
                alpha: 1,
                color: '#ef4444',
                size: 22,
            });

            if (this.hearts <= 0) {
                this.hearts = 3;
                this.shieldHealth = 1;
                this.updateHUD();
            }

            // Deseni tekrar goster
            setTimeout(() => {
                this.state = 'showing';
                this.showIndex = 0;
                this.showTimer = 30;
                this.activeButton = -1;
                this.playerIndex = 0;
            }, 1200);
        }
    },

    spawnCorrectParticles(x, y, color) {
        for (let i = 0; i < 10; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 4;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                decay: 0.02 + Math.random() * 0.015,
                size: 3 + Math.random() * 4,
                color: color.glow,
                gravity: 0.05,
            });
        }
        for (let i = 0; i < 5; i++) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * 30,
                y: y + (Math.random() - 0.5) * 30,
                vx: (Math.random() - 0.5) * 2,
                vy: -Math.random() * 3 - 1,
                life: 1,
                decay: 0.015,
                size: 2,
                color: '#fff',
                gravity: 0.02,
            });
        }
    },

    spawnWrongParticles(x, y) {
        for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 3 + Math.random() * 5;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2,
                life: 1,
                decay: 0.018,
                size: 4 + Math.random() * 6,
                color: Math.random() > 0.5 ? '#ef4444' : '#fbbf24',
                gravity: 0.12,
                rotation: Math.random() * 360,
                rotSpeed: (Math.random() - 0.5) * 15,
            });
        }
    },

    spawnShieldParticles() {
        for (let i = 0; i < 20; i++) {
            const angle = (i / 20) * Math.PI * 2;
            const r = 30 + Math.random() * 15;
            this.particles.push({
                x: this.centerX + Math.cos(angle) * r,
                y: this.centerY + Math.sin(angle) * r,
                vx: Math.cos(angle) * 1.5,
                vy: Math.sin(angle) * 1.5,
                life: 1,
                decay: 0.02,
                size: 2 + Math.random() * 3,
                color: '#34d399',
                gravity: 0,
            });
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

        this.renderBackground();
        this.renderConnections();

        for (const r of this.pulseRings) {
            ctx.strokeStyle = r.color;
            ctx.globalAlpha = r.alpha;
            ctx.lineWidth = 3;
            ctx.shadowColor = r.color;
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
        ctx.globalAlpha = 1;

        this.renderShield();

        for (let i = 0; i < this.buttons.length; i++) {
            this.renderButton(i);
        }

        this.renderParticles();

        for (const t of this.floatingTexts) {
            ctx.globalAlpha = Math.max(0, t.alpha);
            ctx.font = `bold ${t.size}px system-ui, sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillStyle = t.color;
            ctx.shadowColor = t.color;
            ctx.shadowBlur = 10;
            ctx.fillText(t.text, t.x, t.y);
            ctx.shadowBlur = 0;
        }
        ctx.globalAlpha = 1;

        this.renderStatusText();

        if (this.combo >= 2) {
            ctx.font = `bold 18px system-ui, sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillStyle = '#fbbf24';
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 8;
            ctx.fillText(`${this.combo}x Kombo`, this.centerX, this.height - 30);
            ctx.shadowBlur = 0;
        }

        this.renderProgressBar();

        ctx.restore();

        if (this.hitFlashAlpha > 0) {
            ctx.fillStyle = `rgba(239, 68, 68, ${this.hitFlashAlpha})`;
            ctx.fillRect(0, 0, this.width, this.height);
        }
    },

    renderBackground() {
        const ctx = this.ctx;

        const bg = ctx.createRadialGradient(
            this.centerX, this.centerY, 50,
            this.centerX, this.centerY, this.height
        );
        bg.addColorStop(0, '#0f172a');
        bg.addColorStop(0.5, '#0a0f1e');
        bg.addColorStop(1, '#020617');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.strokeStyle = 'rgba(59, 130, 246, 0.04)';
        ctx.lineWidth = 1;
        const gridSize = 40;
        for (let x = 0; x < this.width; x += gridSize) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, this.height); ctx.stroke();
        }
        for (let y = 0; y < this.height; y += gridSize) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.width, y); ctx.stroke();
        }

        for (const m of this.matrixChars) {
            ctx.globalAlpha = m.alpha;
            ctx.fillStyle = '#22d3ee';
            ctx.font = `${m.size}px monospace`;
            ctx.fillText(m.char, m.x, m.y);
        }
        ctx.globalAlpha = 1;

        ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
        for (const n of this.bgNodes) {
            ctx.beginPath();
            ctx.arc(n.x, n.y, n.size, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.strokeStyle = 'rgba(59, 130, 246, 0.06)';
        ctx.lineWidth = 1;
        for (let i = 0; i < this.bgNodes.length; i++) {
            for (let j = i + 1; j < this.bgNodes.length; j++) {
                const dist = Math.hypot(this.bgNodes[i].x - this.bgNodes[j].x, this.bgNodes[i].y - this.bgNodes[j].y);
                if (dist < 180) {
                    ctx.beginPath();
                    ctx.moveTo(this.bgNodes[i].x, this.bgNodes[i].y);
                    ctx.lineTo(this.bgNodes[j].x, this.bgNodes[j].y);
                    ctx.stroke();
                }
            }
        }
    },

    renderConnections() {
        const ctx = this.ctx;

        ctx.lineWidth = 1.5;
        for (let i = 0; i < this.buttons.length; i++) {
            const next = (i + 1) % this.buttons.length;
            const b1 = this.buttons[i];
            const b2 = this.buttons[next];

            const grad = ctx.createLinearGradient(b1.x, b1.y, b2.x, b2.y);
            const c1 = this.colors[i];
            const c2 = this.colors[next];
            grad.addColorStop(0, `rgba(${this.hexToRgb(c1.base)}, 0.15)`);
            grad.addColorStop(0.5, `rgba(${this.hexToRgb(c1.base)}, 0.05)`);
            grad.addColorStop(1, `rgba(${this.hexToRgb(c2.base)}, 0.15)`);

            ctx.strokeStyle = grad;
            ctx.beginPath();
            ctx.moveTo(b1.x, b1.y);
            ctx.lineTo(b2.x, b2.y);
            ctx.stroke();
        }

        for (let i = 0; i < this.buttons.length; i++) {
            const b = this.buttons[i];
            ctx.strokeStyle = `rgba(${this.hexToRgb(this.colors[i].base)}, ${0.05 + b.glow * 0.2})`;
            ctx.beginPath();
            ctx.moveTo(b.x, b.y);
            ctx.lineTo(this.centerX, this.centerY);
            ctx.stroke();
        }
    },

    renderShield() {
        const ctx = this.ctx;
        const cx = this.centerX;
        const cy = this.centerY;
        const r = this.orbitRadius * 0.28;
        const pulse = Math.sin(this.shieldPulse) * 3;

        const halo = ctx.createRadialGradient(cx, cy, r, cx, cy, r + 30 + pulse);
        const haloColor = this.shieldHealth > 0.5 ? '59, 130, 246' : this.shieldHealth > 0.25 ? '245, 158, 11' : '239, 68, 68';
        halo.addColorStop(0, `rgba(${haloColor}, 0.15)`);
        halo.addColorStop(1, `rgba(${haloColor}, 0)`);
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(cx, cy, r + 30 + pulse, 0, Math.PI * 2);
        ctx.fill();

        const sg = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
        sg.addColorStop(0, `rgba(${haloColor}, 0.4)`);
        sg.addColorStop(0.7, `rgba(${haloColor}, 0.2)`);
        sg.addColorStop(1, `rgba(${haloColor}, 0.05)`);
        ctx.fillStyle = sg;
        ctx.beginPath();
        ctx.arc(cx, cy, r + pulse, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(${haloColor}, 0.6)`;
        ctx.lineWidth = 2;
        ctx.shadowColor = `rgba(${haloColor}, 0.5)`;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(cx, cy, r + pulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Saglik yay gostergesi
        ctx.strokeStyle = `rgba(${haloColor}, 0.8)`;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(cx, cy, r + 8 + pulse, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * this.shieldHealth);
        ctx.stroke();

        ctx.font = `${r * 1.1}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🛡️', cx, cy);
    },

    renderButton(index) {
        const ctx = this.ctx;
        const b = this.buttons[index];
        const c = this.colors[index];
        const r = this.buttonRadius * b.pressScale;
        const isActive = this.activeButton === index;
        const glowAmount = Math.max(b.glow, isActive ? 1 : 0);

        if (glowAmount > 0.05) {
            ctx.shadowColor = c.glow;
            ctx.shadowBlur = 25 * glowAmount;
            const glowGrad = ctx.createRadialGradient(b.x, b.y, r * 0.3, b.x, b.y, r * 1.6);
            glowGrad.addColorStop(0, `rgba(${this.hexToRgb(c.glow)}, ${0.3 * glowAmount})`);
            glowGrad.addColorStop(1, `rgba(${this.hexToRgb(c.glow)}, 0)`);
            ctx.fillStyle = glowGrad;
            ctx.beginPath();
            ctx.arc(b.x, b.y, r * 1.6, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        const bg = ctx.createRadialGradient(b.x - r * 0.2, b.y - r * 0.2, r * 0.1, b.x, b.y, r);
        const mix = glowAmount;
        bg.addColorStop(0, this.lerpColor(c.dark, c.glow, mix * 0.8));
        bg.addColorStop(0.6, this.lerpColor(c.dark, c.base, mix * 0.5));
        bg.addColorStop(1, c.dark);
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = glowAmount > 0.3 ? c.glow : `rgba(${this.hexToRgb(c.base)}, 0.4)`;
        ctx.lineWidth = 2.5;
        if (glowAmount > 0.3) {
            ctx.shadowColor = c.glow;
            ctx.shadowBlur = 12;
        }
        ctx.beginPath();
        ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = `rgba(255, 255, 255, ${0.06 + glowAmount * 0.12})`;
        ctx.beginPath();
        ctx.ellipse(b.x - r * 0.15, b.y - r * 0.3, r * 0.5, r * 0.25, -0.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = `${r * 0.7}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.symbols[index], b.x, b.y);

        // Oyuncu sirasinda nabiz efekti
        if (this.state === 'player') {
            const time = performance.now() * 0.003;
            const breathe = Math.sin(time) * 0.08 + 0.08;
            ctx.strokeStyle = `rgba(255, 255, 255, ${breathe})`;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(b.x, b.y, r + 6, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    },

    renderParticles() {
        const ctx = this.ctx;
        for (const p of this.particles) {
            ctx.globalAlpha = Math.max(0, p.life);

            if (p.rotation !== undefined) {
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation * Math.PI / 180);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
                ctx.restore();
            } else {
                ctx.fillStyle = p.color;
                ctx.shadowColor = p.color;
                ctx.shadowBlur = 6;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }
        ctx.globalAlpha = 1;
    },

    renderStatusText() {
        const ctx = this.ctx;
        ctx.textAlign = 'center';

        let text = '';
        let color = '#94a3b8';

        switch (this.state) {
            case 'showing':
                text = '👀 Deseni hafızana kaydet...';
                color = '#fbbf24';
                break;
            case 'player':
                text = `🎯 Sıra sende! (${this.playerIndex + 1}/${this.sequence.length})`;
                color = '#22d3ee';
                break;
            case 'correct':
                text = '✅ Harika!';
                color = '#10b981';
                break;
            case 'wrong':
                text = '❌ Yanlış sıra!';
                color = '#ef4444';
                break;
        }

        if (text) {
            ctx.font = 'bold 20px system-ui, sans-serif';
            ctx.fillStyle = color;
            ctx.shadowColor = color;
            ctx.shadowBlur = 8;
            ctx.fillText(text, this.centerX, this.height * 0.1);
            ctx.shadowBlur = 0;
        }

        ctx.font = '14px system-ui, sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.fillText(`Seviye ${this.round} — ${this.sequence.length} sembol`, this.centerX, this.height * 0.14);
    },

    renderProgressBar() {
        const ctx = this.ctx;
        const barW = this.width * 0.5;
        const barH = 6;
        const barX = (this.width - barW) / 2;
        const barY = this.height - 14;
        const progress = Math.min(1, this.score / 1200);

        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.beginPath(); ctx.roundRect(barX, barY, barW, barH, 3); ctx.fill();

        const pg = ctx.createLinearGradient(barX, 0, barX + barW * progress, 0);
        pg.addColorStop(0, '#3b82f6');
        pg.addColorStop(1, '#8b5cf6');
        ctx.fillStyle = pg;
        ctx.beginPath(); ctx.roundRect(barX, barY, barW * progress, barH, 3); ctx.fill();
    },

    hexToRgb(hex) {
        const n = parseInt(hex.slice(1), 16);
        return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
    },

    lerpColor(hex1, hex2, t) {
        const n1 = parseInt(hex1.slice(1), 16);
        const n2 = parseInt(hex2.slice(1), 16);
        const r = Math.round(((n1 >> 16) & 255) + (((n2 >> 16) & 255) - ((n1 >> 16) & 255)) * t);
        const g = Math.round(((n1 >> 8) & 255) + (((n2 >> 8) & 255) - ((n1 >> 8) & 255)) * t);
        const b = Math.round((n1 & 255) + ((n2 & 255) - (n1 & 255)) * t);
        return `rgb(${r},${g},${b})`;
    },
};
