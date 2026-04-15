/* İzin Sistemi & Ebeveyn Şifre Yönetimi */

const PermissionSystem = {
    parentPassword: '0000',
    currentTrigger: null,
    stats: {
        totalAsked: 0,
        rejected: 0,
        acceptedWithParent: 0,
    },

    generatePassword() {
        this.parentPassword = String(Math.floor(1000 + Math.random() * 9000));
        return this.parentPassword;
    },

    showPermissionPopup(trigger, ageGroup) {
        this.currentTrigger = trigger;
        this.stats.totalAsked++;

        const permData = Levels[ageGroup].permissions[trigger.type];
        if (!permData) return;

        document.getElementById('popup-icon').textContent = permData.icon;
        document.getElementById('popup-title').textContent = permData.title;
        document.getElementById('popup-message').textContent = permData.message;
        showScreen('permission-popup');
    },

    handleAccept() {
        showScreen('password-screen');
        for (let i = 1; i <= 4; i++) {
            document.getElementById('pin-' + i).value = '';
        }
        document.getElementById('pin-1').focus();
    },

    handleReject(ageGroup) {
        this.stats.rejected++;
        const permData = Levels[ageGroup].permissions[this.currentTrigger.type];

        document.getElementById('feedback-icon').textContent = '🛡️';
        document.getElementById('feedback-title').textContent = 'Harika Karar!';
        document.getElementById('feedback-message').textContent = permData.rejectMsg;
        showScreen('feedback-screen');
        this.launchConfetti();
    },

    checkPassword(ageGroup) {
        let entered = '';
        for (let i = 1; i <= 4; i++) {
            entered += document.getElementById('pin-' + i).value;
        }

        if (entered === this.parentPassword) {
            this.stats.acceptedWithParent++;
            const permData = Levels[ageGroup].permissions[this.currentTrigger.type];

            document.getElementById('feedback-icon').textContent = '👨‍👩‍👧';
            document.getElementById('feedback-title').textContent = 'Birlikte Karar Verdiniz!';
            document.getElementById('feedback-message').textContent = permData.acceptMsg;
            showScreen('feedback-screen');
            this.launchConfetti();
        } else {
            const container = document.querySelector('.password-container');
            container.classList.add('shake');
            setTimeout(() => container.classList.remove('shake'), 500);
            for (let i = 1; i <= 4; i++) {
                document.getElementById('pin-' + i).value = '';
            }
            document.getElementById('pin-1').focus();
        }
    },

    launchConfetti() {
        const canvas = document.getElementById('confetti-canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const particles = [];
        const colors = ['#fbbf24', '#f472b6', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#64c8ff'];

        for (let i = 0; i < 150; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: -20 - Math.random() * 200,
                vx: (Math.random() - 0.5) * 6,
                vy: Math.random() * 3 + 2,
                size: Math.random() * 8 + 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                rotation: Math.random() * 360,
                rotSpeed: (Math.random() - 0.5) * 10,
                shape: Math.random() > 0.5 ? 'rect' : 'circle',
            });
        }

        for (let i = 0; i < 20; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: -20 - Math.random() * 100,
                vx: (Math.random() - 0.5) * 4,
                vy: Math.random() * 2 + 1,
                size: 15 + Math.random() * 10,
                color: '#f472b6',
                rotation: 0, rotSpeed: 0,
                shape: 'heart',
            });
        }

        let frame = 0;
        const maxFrames = 180;

        const animate = () => {
            if (frame >= maxFrames) { ctx.clearRect(0, 0, canvas.width, canvas.height); return; }
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            for (const p of particles) {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.05;
                p.rotation += p.rotSpeed;

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation * Math.PI / 180);
                ctx.fillStyle = p.color;
                ctx.globalAlpha = Math.max(0, 1 - frame / maxFrames);

                if (p.shape === 'rect') {
                    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
                } else if (p.shape === 'circle') {
                    ctx.beginPath();
                    ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
                    ctx.fill();
                } else if (p.shape === 'heart') {
                    this.drawHeart(ctx, 0, 0, p.size);
                }
                ctx.restore();
            }

            frame++;
            requestAnimationFrame(animate);
        };
        animate();
    },

    drawHeart(ctx, x, y, size) {
        const s = size / 30;
        ctx.beginPath();
        ctx.moveTo(x, y + 5 * s);
        ctx.bezierCurveTo(x, y - 3 * s, x - 15 * s, y - 3 * s, x - 15 * s, y + 5 * s);
        ctx.bezierCurveTo(x - 15 * s, y + 15 * s, x, y + 22 * s, x, y + 25 * s);
        ctx.bezierCurveTo(x, y + 22 * s, x + 15 * s, y + 15 * s, x + 15 * s, y + 5 * s);
        ctx.bezierCurveTo(x + 15 * s, y - 3 * s, x, y - 3 * s, x, y + 5 * s);
        ctx.fill();
    },

    getResults() {
        return {
            total: this.stats.totalAsked,
            rejected: this.stats.rejected,
            withParent: this.stats.acceptedWithParent,
            score: this.stats.rejected * 30 + this.stats.acceptedWithParent * 10,
        };
    },
};
