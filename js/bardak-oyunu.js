/**
 * Bardak Oyunu (4-5 Yaş)
 * 3 bardak altında topu takip et, tur ilerledikçe hızlanır.
 */

const CupGame = {
    canvas: null,
    ctx: null,
    width: 0,
    height: 0,
    running: false,

    state: 'idle',
    cups: [
        { x: 0, y: 0, targetX: 0 },
        { x: 0, y: 0, targetX: 0 },
        { x: 0, y: 0, targetX: 0 },
    ],
    ballUnder: 0,
    round: 0,
    maxRounds: 9,
    score: 0,
    shuffleSpeed: 0.02,
    shuffleMoves: [],
    shuffleIndex: 0,
    shuffleProgress: 0,

    cupWidth: 130,
    cupHeight: 155,
    cupGap: 40,
    liftY: 0,
    showBall: false,
    selectedCup: -1,
    resultTimer: 0,

    triggerRounds: [3, 6, 9],
    triggerTypes: ['camera', 'microphone', 'location'],
    triggeredRounds: new Set(),

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
        this.positionCups();
    },

    positionCups() {
        const totalWidth = this.cupWidth * 3 + this.cupGap * 2;
        const startX = (this.width - totalWidth) / 2;
        const y = this.height * 0.45;

        for (let i = 0; i < 3; i++) {
            this.cups[i].x = startX + i * (this.cupWidth + this.cupGap);
            this.cups[i].y = y;
            this.cups[i].targetX = this.cups[i].x;
        }
    },

    reset() {
        this.round = 0;
        this.score = 0;
        this.shuffleSpeed = 0.04;
        this.triggeredRounds = new Set();
        this.updateHUD();
        this.startRound();
    },

    startRound() {
        this.round++;
        this.state = 'showing';
        this.selectedCup = -1;
        this.showBall = true;
        this.positionCups();

        this.ballUnder = Math.floor(Math.random() * 3);

        // Topu göstermek için bardağı kaldır
        this.liftY = 0;
        this.animateLift(true, () => {
            setTimeout(() => {
                this.animateLift(false, () => {
                    this.showBall = false;
                    setTimeout(() => this.startShuffle(), 500);
                });
            }, 2000);
        });

        document.getElementById('hud-level').textContent = `Tur ${this.round} / ${this.maxRounds}`;
    },

    animateLift(up, callback) {
        const target = up ? -100 : 0;
        const speed = 3;
        const animate = () => {
            if (up) {
                this.liftY -= speed;
                if (this.liftY <= target) { this.liftY = target; callback(); return; }
            } else {
                this.liftY += speed;
                if (this.liftY >= target) { this.liftY = target; callback(); return; }
            }
            this.render();
            requestAnimationFrame(animate);
        };
        animate();
    },

    startShuffle() {
        this.state = 'shuffling';

        // Tur arttıkça zorluk kademeli artar
        const moveCount = Math.min(2 + Math.floor(this.round * 0.7), 7);
        this.shuffleSpeed = Math.min(0.02 + this.round * 0.004, 0.06);

        this.shuffleMoves = [];
        let lastSwap = [-1, -1];
        for (let i = 0; i < moveCount; i++) {
            let a, b;
            do {
                a = Math.floor(Math.random() * 3);
                b = Math.floor(Math.random() * 3);
            } while (a === b || (a === lastSwap[0] && b === lastSwap[1]));
            this.shuffleMoves.push([a, b]);
            lastSwap = [a, b];
        }

        this.shuffleIndex = 0;
        this.shuffleProgress = 0;
        this.runShuffle();
    },

    runShuffle() {
        if (this.shuffleIndex >= this.shuffleMoves.length) {
            this.state = 'picking';
            this.render();
            return;
        }

        const [a, b] = this.shuffleMoves[this.shuffleIndex];
        const posA = this.cups[a].x;
        const posB = this.cups[b].x;
        this.cups[a].targetX = posB;
        this.cups[b].targetX = posA;

        this.shuffleProgress = 0;
        this.animateShuffle(a, b, posA, posB);
    },

    animateShuffle(a, b, startA, startB) {
        this.shuffleProgress += this.shuffleSpeed;
        const baseY = this.height * 0.45;

        if (this.shuffleProgress >= 1) {
            this.shuffleProgress = 1;
            this.cups[a].x = this.cups[a].targetX;
            this.cups[b].x = this.cups[b].targetX;
            this.cups[a].y = baseY;
            this.cups[b].y = baseY;

            this.shuffleIndex++;
            this.render();
            setTimeout(() => this.runShuffle(), 200);
            return;
        }

        // Yay seklinde hareket (easing + arc)
        const t = this.shuffleProgress;
        const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        const arc = Math.sin(t * Math.PI) * 40;

        this.cups[a].x = startA + (this.cups[a].targetX - startA) * ease;
        this.cups[b].x = startB + (this.cups[b].targetX - startB) * ease;

        // Caprazlama: bir bardak yukari, digeri asagi
        this.cups[a].y = baseY - arc;
        this.cups[b].y = baseY + arc * 0.5;

        this.render();
        requestAnimationFrame(() => this.animateShuffle(a, b, startA, startB));
    },

    setupInput() {
        const handleClick = (clientX, clientY) => {
            if (this.state !== 'picking') return;

            const rect = this.canvas.getBoundingClientRect();
            const mx = clientX - rect.left;
            const my = clientY - rect.top;

            for (let i = 0; i < 3; i++) {
                const c = this.cups[i];
                if (mx >= c.x && mx <= c.x + this.cupWidth &&
                    my >= c.y - 20 && my <= c.y + this.cupHeight + 20) {
                    this.pickCup(i);
                    return;
                }
            }
        };

        this.canvas.addEventListener('click', (e) => handleClick(e.clientX, e.clientY));
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            handleClick(touch.clientX, touch.clientY);
        });
    },

    pickCup(index) {
        this.state = 'result';
        this.selectedCup = index;
        this.showBall = true;

        const correct = index === this.ballUnder;
        if (correct) {
            this.score += 10;
            this.updateHUD();
        }

        this.liftY = 0;
        this.animateLiftSingle(index, true, () => {
            setTimeout(() => {
                this.animateLiftSingle(index, false, () => {
                    this.showBall = false;

                    // Izin trigger kontrolu
                    if (this.triggerRounds.includes(this.round) && !this.triggeredRounds.has(this.round)) {
                        this.triggeredRounds.add(this.round);
                        const typeIndex = this.triggerRounds.indexOf(this.round);
                        const type = this.triggerTypes[typeIndex];
                        this.pause();
                        if (typeof onPermissionTrigger === 'function') {
                            onPermissionTrigger({ type, triggered: true });
                        }
                        return;
                    }

                    if (this.round >= this.maxRounds) {
                        this.pause();
                        if (typeof onLevelComplete === 'function') {
                            onLevelComplete();
                        }
                    } else {
                        setTimeout(() => this.startRound(), 500);
                    }
                });
            }, 1200);
        });
    },

    animateLiftSingle(cupIndex, up, callback) {
        const target = up ? -100 : 0;
        const speed = 3;
        const baseY = this.height * 0.45;
        let currentLift = up ? 0 : -100;

        const animate = () => {
            if (up) {
                currentLift -= speed;
                if (currentLift <= target) { currentLift = target; }
            } else {
                currentLift += speed;
                if (currentLift >= 0) { currentLift = 0; }
            }

            this.cups[cupIndex].y = baseY + currentLift;
            this.render();

            if ((up && currentLift <= target) || (!up && currentLift >= 0)) {
                callback();
                return;
            }
            requestAnimationFrame(animate);
        };
        animate();
    },

    start() {
        this.running = true;
        this.reset();
    },

    pause() {
        this.running = false;
    },

    resume() {
        this.running = true;
        if (this.round >= this.maxRounds) {
            this.pause();
            if (typeof onLevelComplete === 'function') {
                onLevelComplete();
            }
        } else {
            setTimeout(() => this.startRound(), 500);
        }
    },

    updateHUD() {
        const scoreEl = document.getElementById('hud-score');
        if (scoreEl) scoreEl.textContent = '⭐ ' + this.score;
    },

    render() {
        const ctx = this.ctx;

        const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, '#1a1a4e');
        gradient.addColorStop(0.5, '#2d1b69');
        gradient.addColorStop(1, '#1a0a3e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.width, this.height);

        // Yildizlar
        for (let i = 0; i < 50; i++) {
            const seed = i * 7919;
            const x = (seed * 13) % this.width;
            const y = (seed * 17) % (this.height * 0.35);
            const size = (seed % 2) + 1;
            ctx.fillStyle = `rgba(255,255,255,${0.3 + (seed % 5) / 10})`;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }

        // Masa
        const tableY = this.height * 0.65;
        ctx.fillStyle = '#5a3a1e';
        ctx.beginPath();
        ctx.ellipse(this.width / 2, tableY, this.width * 0.4, 40, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#4a2e16';
        ctx.beginPath();
        ctx.ellipse(this.width / 2, tableY, this.width * 0.4, 40, 0, 0, Math.PI);
        ctx.fill();

        // Top cizimi
        if (this.showBall) {
            const ballCup = this.cups[this.ballUnder];
            const bx = ballCup.x + this.cupWidth / 2;
            const by = this.height * 0.45 + this.cupHeight - 25;
            const ballR = 28;

            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath();
            ctx.ellipse(bx, by + ballR + 4, ballR + 6, 8, 0, 0, Math.PI * 2);
            ctx.fill();

            if (typeof playerAvatarImage !== 'undefined' && playerAvatarImage) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(bx, by, ballR, 0, Math.PI * 2);
                ctx.clip();
                ctx.drawImage(playerAvatarImage, bx - ballR, by - ballR, ballR * 2, ballR * 2);
                ctx.restore();

                ctx.strokeStyle = '#fbbf24';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(bx, by, ballR, 0, Math.PI * 2);
                ctx.stroke();

                ctx.fillStyle = 'rgba(255,255,255,0.2)';
                ctx.beginPath();
                ctx.arc(bx - 8, by - 10, 8, 0, Math.PI * 2);
                ctx.fill();
            } else {
                const topGrad = ctx.createRadialGradient(bx - 6, by - 6, 3, bx, by, ballR);
                topGrad.addColorStop(0, '#ff6b6b');
                topGrad.addColorStop(0.7, '#ef4444');
                topGrad.addColorStop(1, '#b91c1c');
                ctx.fillStyle = topGrad;
                ctx.beginPath();
                ctx.arc(bx, by, ballR, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#fbbf24';
                ctx.font = '20px serif';
                ctx.textAlign = 'center';
                ctx.fillText('★', bx, by + 7);
            }
        }

        for (let i = 0; i < 3; i++) {
            this.renderCup(i);
        }

        this.renderStatusText();

        if (this.state === 'result' && this.selectedCup >= 0) {
            const correct = this.selectedCup === this.ballUnder;
            ctx.font = 'bold 36px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = correct ? '#10b981' : '#ef4444';
            ctx.fillText(
                correct ? 'Doğru! 🎉' : 'Yanlış! 😅',
                this.width / 2,
                this.height * 0.25
            );
        }
    },

    renderCup(index) {
        const ctx = this.ctx;
        const c = this.cups[index];
        const x = c.x;
        let y = c.y;

        if (this.state === 'showing') {
            y += this.liftY;
        }

        // Golge
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(x + this.cupWidth / 2, this.height * 0.45 + this.cupHeight + 5, this.cupWidth / 2 + 5, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // Bardak govdesi (trapez sekli)
        const topW = this.cupWidth * 0.65;
        const bottomW = this.cupWidth;
        const h = this.cupHeight;
        const centerX = x + this.cupWidth / 2;

        if (this.state === 'picking') {
            ctx.fillStyle = 'rgba(100, 200, 255, 0.1)';
            ctx.beginPath();
            ctx.arc(centerX, y + h / 2, this.cupWidth * 0.7, 0, Math.PI * 2);
            ctx.fill();
        }

        const cupGrad = ctx.createLinearGradient(centerX - bottomW / 2, y, centerX + bottomW / 2, y);
        cupGrad.addColorStop(0, '#8b5cf6');
        cupGrad.addColorStop(0.3, '#a78bfa');
        cupGrad.addColorStop(0.7, '#7c3aed');
        cupGrad.addColorStop(1, '#6d28d9');
        ctx.fillStyle = cupGrad;

        ctx.beginPath();
        ctx.moveTo(centerX - topW / 2, y);
        ctx.lineTo(centerX - bottomW / 2, y + h);
        ctx.lineTo(centerX + bottomW / 2, y + h);
        ctx.lineTo(centerX + topW / 2, y);
        ctx.closePath();
        ctx.fill();

        // Ust oval
        ctx.fillStyle = '#6d28d9';
        ctx.beginPath();
        ctx.ellipse(centerX, y, topW / 2, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // Ic kisim
        ctx.fillStyle = '#3b1a7e';
        ctx.beginPath();
        ctx.ellipse(centerX, y, topW / 2 - 4, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Parlak serit
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(centerX - topW / 2 + 8, y + 10, 6, h - 25);

        // Alt kenar
        ctx.fillStyle = '#5b21b6';
        ctx.beginPath();
        ctx.ellipse(centerX, y + h, bottomW / 2, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Secim zamaninda soru isareti
        if (this.state === 'picking') {
            ctx.font = 'bold 36px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#fbbf24';
            ctx.fillText('?', centerX, y + h / 2 + 12);
        }
    },

    renderStatusText() {
        const ctx = this.ctx;
        ctx.textAlign = 'center';
        ctx.font = 'bold 28px system-ui, sans-serif';

        let text = '';
        let color = '#e0e0ff';

        switch (this.state) {
            case 'showing':
                text = '👀 Topu iyi takip et!';
                color = '#fbbf24';
                break;
            case 'shuffling':
                text = '🔄 Karıştırılıyor...';
                color = '#a78bfa';
                break;
            case 'picking':
                text = '👆 Top hangi bardağın altında?';
                color = '#64c8ff';
                break;
        }

        if (text) {
            ctx.fillStyle = color;
            ctx.fillText(text, this.width / 2, this.height * 0.18);
        }
    },
};
