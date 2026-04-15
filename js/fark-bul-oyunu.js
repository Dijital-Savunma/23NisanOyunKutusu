/**
 * Farklı Olanı Bul Oyunu (4-5 Yaş)
 * 3 kart gösterilir, birinde ufak fark vardır, doğru olanı seç.
 */

const SpotGame = {
    canvas: null,
    ctx: null,
    width: 0,
    height: 0,

    round: 0,
    maxRounds: 9,
    score: 0,
    state: 'showing',
    differentIndex: 0,
    selectedCard: -1,
    resultTimer: null,

    cardW: 0,
    cardH: 0,
    cards: [],

    // İzin tetikleme
    triggerRounds: [3, 6, 9],
    triggerTypes: ['camera', 'microphone', 'location'],
    triggeredRounds: new Set(),

    // Çizim setleri
    puzzleSets: [
        {
            name: 'Gülen Yüz',
            draw(ctx, x, y, w, h, isDiff) {
                const cx = x + w/2, cy = y + h*0.47;
                const r = Math.min(w,h) * 0.36;
                // Gölge
                ctx.fillStyle = 'rgba(0,0,0,0.12)';
                ctx.beginPath(); ctx.ellipse(cx + 3, cy + r + 8, r * 0.7, 8, 0, 0, Math.PI * 2); ctx.fill();
                // Yüz
                const fg = ctx.createRadialGradient(cx - r*0.25, cy - r*0.25, r*0.1, cx, cy, r);
                fg.addColorStop(0, '#ffe066'); fg.addColorStop(1, '#f59e0b');
                ctx.fillStyle = fg;
                ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = '#d97706'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
                // Yanaklar
                ctx.fillStyle = 'rgba(251, 113, 133, 0.35)';
                ctx.beginPath(); ctx.ellipse(cx - r*0.55, cy + r*0.2, r*0.2, r*0.14, 0, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(cx + r*0.55, cy + r*0.2, r*0.2, r*0.14, 0, 0, Math.PI * 2); ctx.fill();
                // Gözler
                ctx.fillStyle = '#fff';
                ctx.beginPath(); ctx.ellipse(cx - r*0.3, cy - r*0.15, r*0.18, r*0.22, 0, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(cx + r*0.3, cy - r*0.15, r*0.18, r*0.22, 0, 0, Math.PI * 2); ctx.fill();
                // Göz bebekleri
                ctx.fillStyle = '#1e293b';
                ctx.beginPath(); ctx.arc(cx - r*0.27, cy - r*0.12, r*0.1, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(cx + r*0.33, cy - r*0.12, r*0.1, 0, Math.PI * 2); ctx.fill();
                // Göz parlaması
                ctx.fillStyle = '#fff';
                ctx.beginPath(); ctx.arc(cx - r*0.3, cy - r*0.18, r*0.04, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(cx + r*0.3, cy - r*0.18, r*0.04, 0, Math.PI * 2); ctx.fill();
                // Kaşlar
                ctx.strokeStyle = '#92400e'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
                ctx.beginPath(); ctx.arc(cx - r*0.3, cy - r*0.35, r*0.15, -2.5, -0.6); ctx.stroke();
                ctx.beginPath(); ctx.arc(cx + r*0.3, cy - r*0.35, r*0.15, Math.PI + 0.6, Math.PI + 2.5); ctx.stroke();
                // Ağız — FARK
                ctx.strokeStyle = '#92400e'; ctx.lineWidth = 3; ctx.lineCap = 'round';
                ctx.beginPath();
                if (isDiff) {
                    ctx.arc(cx, cy + r*0.45, r*0.22, Math.PI + 0.4, -0.4);
                } else {
                    ctx.arc(cx, cy + r*0.25, r*0.22, 0.4, Math.PI - 0.4);
                }
                ctx.stroke();
                // Parlaklık
                ctx.fillStyle = 'rgba(255,255,255,0.2)';
                ctx.beginPath(); ctx.ellipse(cx - r*0.3, cy - r*0.4, r*0.25, r*0.12, -0.4, 0, Math.PI * 2); ctx.fill();
            }
        },
        {
            name: 'Ev',
            draw(ctx, x, y, w, h, isDiff) {
                const cx = x + w/2;
                // Çimen
                ctx.fillStyle = '#4ade80';
                ctx.fillRect(x + 8, y + h*0.82, w - 16, h*0.12);
                // Gölge
                ctx.fillStyle = 'rgba(0,0,0,0.08)';
                ctx.beginPath(); ctx.ellipse(cx, y + h*0.88, w*0.35, 6, 0, 0, Math.PI * 2); ctx.fill();
                // Duvar
                const wg = ctx.createLinearGradient(x + w*0.2, 0, x + w*0.8, 0);
                wg.addColorStop(0, '#fde68a'); wg.addColorStop(1, '#fbbf24');
                ctx.fillStyle = wg;
                ctx.beginPath(); ctx.roundRect(x + w*0.18, y + h*0.42, w*0.64, h*0.42, [0,0,4,4]); ctx.fill();
                ctx.strokeStyle = '#d97706'; ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.roundRect(x + w*0.18, y + h*0.42, w*0.64, h*0.42, [0,0,4,4]); ctx.stroke();
                // Çatı
                const rg = ctx.createLinearGradient(cx, y + h*0.14, cx, y + h*0.44);
                rg.addColorStop(0, '#f87171'); rg.addColorStop(1, '#dc2626');
                ctx.fillStyle = rg;
                ctx.beginPath();
                ctx.moveTo(x + w*0.1, y + h*0.44);
                ctx.lineTo(cx, y + h*0.14);
                ctx.lineTo(x + w*0.9, y + h*0.44);
                ctx.closePath(); ctx.fill();
                ctx.strokeStyle = '#b91c1c'; ctx.lineWidth = 1.5; ctx.stroke();
                // Baca
                ctx.fillStyle = '#78716c';
                ctx.fillRect(x + w*0.62, y + h*0.16, w*0.08, h*0.16);
                ctx.fillStyle = '#57534e';
                ctx.fillRect(x + w*0.6, y + h*0.14, w*0.12, h*0.04);
                // Duman
                ctx.fillStyle = 'rgba(200,200,200,0.4)';
                ctx.beginPath(); ctx.arc(x + w*0.67, y + h*0.1, 5, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(x + w*0.7, y + h*0.06, 4, 0, Math.PI * 2); ctx.fill();
                // Pencereler
                const drawWindow = (wx, wy) => {
                    ctx.fillStyle = '#bae6fd';
                    ctx.beginPath(); ctx.roundRect(wx, wy, w*0.14, h*0.12, 3); ctx.fill();
                    ctx.strokeStyle = '#f5f5f4'; ctx.lineWidth = 2;
                    ctx.beginPath(); ctx.roundRect(wx, wy, w*0.14, h*0.12, 3); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(wx + w*0.07, wy); ctx.lineTo(wx + w*0.07, wy + h*0.12); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(wx, wy + h*0.06); ctx.lineTo(wx + w*0.14, wy + h*0.06); ctx.stroke();
                };
                drawWindow(x + w*0.24, y + h*0.5);
                drawWindow(x + w*0.56, y + h*0.5);
                // Kapı — FARK: renk
                const dg = ctx.createLinearGradient(cx - w*0.08, 0, cx + w*0.08, 0);
                if (isDiff) { dg.addColorStop(0, '#60a5fa'); dg.addColorStop(1, '#3b82f6'); }
                else { dg.addColorStop(0, '#a78bfa'); dg.addColorStop(1, '#7c3aed'); }
                ctx.fillStyle = dg;
                ctx.beginPath(); ctx.roundRect(cx - w*0.08, y + h*0.6, w*0.16, h*0.24, [4,4,0,0]); ctx.fill();
                ctx.strokeStyle = isDiff ? '#2563eb' : '#6d28d9'; ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.roundRect(cx - w*0.08, y + h*0.6, w*0.16, h*0.24, [4,4,0,0]); ctx.stroke();
                // Kapı kolu
                ctx.fillStyle = '#fbbf24';
                ctx.beginPath(); ctx.arc(cx + w*0.04, y + h*0.72, 3, 0, Math.PI * 2); ctx.fill();
            }
        },
        {
            name: 'Çiçek',
            draw(ctx, x, y, w, h, isDiff) {
                const cx = x + w/2;
                // Sap
                ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 5; ctx.lineCap = 'round';
                ctx.beginPath(); ctx.moveTo(cx, y + h*0.52); ctx.quadraticCurveTo(cx + 5, y + h*0.72, cx - 2, y + h*0.9); ctx.stroke();
                // Yapraklar
                ctx.fillStyle = '#22c55e';
                ctx.beginPath(); ctx.ellipse(cx + 16, y + h*0.68, 14, 6, 0.6, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#16a34a';
                ctx.beginPath(); ctx.ellipse(cx - 14, y + h*0.76, 12, 5, -0.5, 0, Math.PI * 2); ctx.fill();
                // Yaprak damarları
                ctx.strokeStyle = 'rgba(0,100,0,0.3)'; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(cx + 6, y + h*0.68); ctx.lineTo(cx + 26, y + h*0.67); ctx.stroke();
                // Taçyapraklar — FARK: sayı
                const petals = isDiff ? 4 : 5;
                for (let i = 0; i < petals; i++) {
                    const angle = (i / petals) * Math.PI * 2 - Math.PI/2;
                    const px = cx + Math.cos(angle) * 22;
                    const py = y + h*0.38 + Math.sin(angle) * 22;
                    const pg = ctx.createRadialGradient(px, py, 2, px, py, 14);
                    pg.addColorStop(0, '#fda4af'); pg.addColorStop(1, '#e11d48');
                    ctx.fillStyle = pg;
                    ctx.beginPath(); ctx.ellipse(px, py, 14, 16, angle + Math.PI/2, 0, Math.PI * 2); ctx.fill();
                }
                // Orta
                const cg = ctx.createRadialGradient(cx - 2, y + h*0.36, 2, cx, y + h*0.38, 12);
                cg.addColorStop(0, '#fef08a'); cg.addColorStop(1, '#f59e0b');
                ctx.fillStyle = cg;
                ctx.beginPath(); ctx.arc(cx, y + h*0.38, 11, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = 'rgba(0,0,0,0.08)';
                for (let i = 0; i < 5; i++) {
                    const a = (i / 5) * Math.PI * 2;
                    ctx.beginPath(); ctx.arc(cx + Math.cos(a)*5, y + h*0.38 + Math.sin(a)*5, 2, 0, Math.PI * 2); ctx.fill();
                }
            }
        },
        {
            name: 'Ağaç',
            draw(ctx, x, y, w, h, isDiff) {
                const cx = x + w/2;
                // Çimen
                ctx.fillStyle = '#86efac';
                ctx.beginPath(); ctx.ellipse(cx, y + h*0.9, w*0.3, 8, 0, 0, Math.PI * 2); ctx.fill();
                // Gövde
                const tg = ctx.createLinearGradient(cx - 10, 0, cx + 10, 0);
                tg.addColorStop(0, '#92400e'); tg.addColorStop(0.5, '#b45309'); tg.addColorStop(1, '#78350f');
                ctx.fillStyle = tg;
                ctx.beginPath(); ctx.roundRect(cx - 10, y + h*0.52, 20, h*0.38, [0,0,5,5]); ctx.fill();
                ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(cx - 3, y + h*0.55); ctx.lineTo(cx - 4, y + h*0.85); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(cx + 5, y + h*0.6); ctx.lineTo(cx + 4, y + h*0.82); ctx.stroke();
                // Yaprak rengi — FARK
                const leafColor = isDiff ? '#f59e0b' : '#22c55e';
                const leafDark = isDiff ? '#d97706' : '#15803d';
                // Alt yaprak kümesi
                const lg = ctx.createRadialGradient(cx, y + h*0.42, 5, cx, y + h*0.42, 35);
                lg.addColorStop(0, leafColor); lg.addColorStop(1, leafDark);
                ctx.fillStyle = lg;
                ctx.beginPath(); ctx.arc(cx - 18, y + h*0.45, 24, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(cx + 18, y + h*0.45, 24, 0, Math.PI * 2); ctx.fill();
                // Üst yaprak kümesi
                const lg2 = ctx.createRadialGradient(cx, y + h*0.3, 5, cx, y + h*0.32, 30);
                lg2.addColorStop(0, leafColor); lg2.addColorStop(1, leafDark);
                ctx.fillStyle = lg2;
                ctx.beginPath(); ctx.arc(cx, y + h*0.32, 30, 0, Math.PI * 2); ctx.fill();
                // Parlaklık
                ctx.fillStyle = 'rgba(255,255,255,0.15)';
                ctx.beginPath(); ctx.ellipse(cx - 8, y + h*0.26, 12, 8, -0.3, 0, Math.PI * 2); ctx.fill();
                // Meyveler
                ctx.fillStyle = '#ef4444';
                [[10, 0.30], [-14, 0.40], [20, 0.42], [-5, 0.48]].forEach(([ox, oy]) => {
                    ctx.beginPath(); ctx.arc(cx + ox, y + h*oy, 5, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = 'rgba(255,255,255,0.3)';
                    ctx.beginPath(); ctx.arc(cx + ox - 1.5, y + h*oy - 2, 2, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = '#ef4444';
                });
            }
        },
        {
            name: 'Kedi',
            draw(ctx, x, y, w, h, isDiff) {
                const cx = x + w/2;
                // Gölge
                ctx.fillStyle = 'rgba(0,0,0,0.1)';
                ctx.beginPath(); ctx.ellipse(cx, y + h*0.9, 28, 6, 0, 0, Math.PI * 2); ctx.fill();
                // Kuyruk — FARK
                ctx.strokeStyle = '#ea580c'; ctx.lineWidth = 6; ctx.lineCap = 'round';
                ctx.beginPath();
                if (isDiff) {
                    ctx.moveTo(cx + 22, y + h*0.65);
                    ctx.quadraticCurveTo(cx + 44, y + h*0.82, cx + 34, y + h*0.88);
                } else {
                    ctx.moveTo(cx + 22, y + h*0.65);
                    ctx.quadraticCurveTo(cx + 46, y + h*0.48, cx + 38, y + h*0.32);
                }
                ctx.stroke();
                // Gövde
                const bg = ctx.createRadialGradient(cx, y + h*0.6, 5, cx, y + h*0.6, 28);
                bg.addColorStop(0, '#fb923c'); bg.addColorStop(1, '#ea580c');
                ctx.fillStyle = bg;
                ctx.beginPath(); ctx.ellipse(cx, y + h*0.62, 24, 28, 0, 0, Math.PI * 2); ctx.fill();
                // Göğüs
                ctx.fillStyle = 'rgba(255,255,255,0.25)';
                ctx.beginPath(); ctx.ellipse(cx, y + h*0.68, 12, 16, 0, 0, Math.PI * 2); ctx.fill();
                // Ön patiler
                ctx.fillStyle = '#ea580c';
                ctx.beginPath(); ctx.ellipse(cx - 12, y + h*0.82, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(cx + 12, y + h*0.82, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
                // Pati detayları
                ctx.fillStyle = '#fcd34d';
                [[-14,-1],[-12,1],[-10,-1]].forEach(([ox,oy]) => {
                    ctx.beginPath(); ctx.arc(cx + ox, y + h*0.81 + oy, 2, 0, Math.PI * 2); ctx.fill();
                });
                [[ 10,-1],[ 12,1],[ 14,-1]].forEach(([ox,oy]) => {
                    ctx.beginPath(); ctx.arc(cx + ox, y + h*0.81 + oy, 2, 0, Math.PI * 2); ctx.fill();
                });
                // Kafa
                const hg = ctx.createRadialGradient(cx - 3, y + h*0.28, 3, cx, y + h*0.32, 22);
                hg.addColorStop(0, '#fdba74'); hg.addColorStop(1, '#ea580c');
                ctx.fillStyle = hg;
                ctx.beginPath(); ctx.arc(cx, y + h*0.32, 22, 0, Math.PI * 2); ctx.fill();
                // Kulaklar
                ctx.fillStyle = '#ea580c';
                [[-1, [cx-18, cx-24, cx-8]], [1, [cx+18, cx+24, cx+8]]].forEach(([_, pts]) => {
                    ctx.beginPath();
                    ctx.moveTo(pts[0], y + h*0.2);
                    ctx.lineTo(pts[1], y + h*0.06);
                    ctx.lineTo(pts[2], y + h*0.18);
                    ctx.fill();
                });
                // İç kulak
                ctx.fillStyle = '#fda4af';
                [[-1, [cx-16, cx-20, cx-10]], [1, [cx+16, cx+20, cx+10]]].forEach(([_, pts]) => {
                    ctx.beginPath();
                    ctx.moveTo(pts[0], y + h*0.2);
                    ctx.lineTo(pts[1], y + h*0.1);
                    ctx.lineTo(pts[2], y + h*0.19);
                    ctx.fill();
                });
                // Gözler
                ctx.fillStyle = '#fff';
                ctx.beginPath(); ctx.ellipse(cx - 9, y + h*0.3, 6, 7, 0, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(cx + 9, y + h*0.3, 6, 7, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#15803d';
                ctx.beginPath(); ctx.ellipse(cx - 9, y + h*0.3, 3.5, 5, 0, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(cx + 9, y + h*0.3, 3.5, 5, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#0a0a0a';
                ctx.beginPath(); ctx.ellipse(cx - 9, y + h*0.3, 2, 4, 0, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(cx + 9, y + h*0.3, 2, 4, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.beginPath(); ctx.arc(cx - 7.5, y + h*0.28, 1.5, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(cx + 10.5, y + h*0.28, 1.5, 0, Math.PI * 2); ctx.fill();
                // Burun
                ctx.fillStyle = '#f472b6';
                ctx.beginPath();
                ctx.moveTo(cx, y + h*0.36);
                ctx.lineTo(cx - 4, y + h*0.34);
                ctx.lineTo(cx + 4, y + h*0.34);
                ctx.fill();
                // Bıyıklar
                ctx.strokeStyle = '#78350f'; ctx.lineWidth = 1; ctx.lineCap = 'round';
                [[-1,1],[1,-1]].forEach(([dir]) => {
                    ctx.beginPath(); ctx.moveTo(cx + dir*6, y + h*0.36); ctx.lineTo(cx + dir*26, y + h*0.33); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(cx + dir*6, y + h*0.37); ctx.lineTo(cx + dir*25, y + h*0.38); ctx.stroke();
                });
            }
        },
        {
            name: 'Yıldız',
            draw(ctx, x, y, w, h, isDiff) {
                const cx = x + w/2, cy = y + h*0.47;
                const outerR = Math.min(w,h) * 0.36;
                const innerR = outerR * 0.42;
                const points = isDiff ? 6 : 5;
                // Gölge
                ctx.fillStyle = 'rgba(0,0,0,0.1)';
                ctx.beginPath(); ctx.ellipse(cx + 3, cy + outerR + 10, outerR * 0.5, 6, 0, 0, Math.PI * 2); ctx.fill();
                // Yıldız gövdesi
                const sg = ctx.createRadialGradient(cx - outerR*0.2, cy - outerR*0.2, outerR*0.1, cx, cy, outerR);
                sg.addColorStop(0, '#fef08a'); sg.addColorStop(0.6, '#fbbf24'); sg.addColorStop(1, '#d97706');
                ctx.fillStyle = sg;
                ctx.beginPath();
                for (let i = 0; i < points * 2; i++) {
                    const r = i % 2 === 0 ? outerR : innerR;
                    const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI/2;
                    const px = cx + Math.cos(angle) * r;
                    const py = cy + Math.sin(angle) * r;
                    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                }
                ctx.closePath(); ctx.fill();
                ctx.strokeStyle = '#b45309'; ctx.lineWidth = 2; ctx.stroke();
                // Parlaklık
                ctx.fillStyle = 'rgba(255,255,255,0.3)';
                ctx.beginPath(); ctx.ellipse(cx - outerR*0.15, cy - outerR*0.3, outerR*0.2, outerR*0.1, -0.5, 0, Math.PI * 2); ctx.fill();
                // Yüz
                ctx.fillStyle = '#fff';
                ctx.beginPath(); ctx.ellipse(cx - outerR*0.2, cy - outerR*0.08, 5, 6, 0, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(cx + outerR*0.2, cy - outerR*0.08, 5, 6, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#1e293b';
                ctx.beginPath(); ctx.arc(cx - outerR*0.18, cy - outerR*0.06, 3, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(cx + outerR*0.22, cy - outerR*0.06, 3, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = '#92400e'; ctx.lineWidth = 2; ctx.lineCap = 'round';
                ctx.beginPath(); ctx.arc(cx, cy + outerR*0.12, outerR*0.15, 0.3, Math.PI - 0.3); ctx.stroke();
            }
        },
        {
            name: 'Balık',
            draw(ctx, x, y, w, h, isDiff) {
                const cx = x + w/2, cy = y + h*0.5;
                // Su arka planı
                ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
                ctx.beginPath(); ctx.roundRect(x + 8, y + 8, w - 16, h - 16, 10); ctx.fill();
                // Su dalgaları
                ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)'; ctx.lineWidth = 1.5;
                for (let i = 0; i < 3; i++) {
                    ctx.beginPath();
                    const wy = y + h*0.2 + i * h*0.25;
                    for (let wx = x + 15; wx < x + w - 15; wx += 5) {
                        const wvy = wy + Math.sin((wx - x) * 0.08 + i) * 4;
                        if (wx === x + 15) ctx.moveTo(wx, wvy); else ctx.lineTo(wx, wvy);
                    }
                    ctx.stroke();
                }
                // Gövde rengi — FARK
                const bodyColor = isDiff ? '#a78bfa' : '#38bdf8';
                const bodyDark = isDiff ? '#7c3aed' : '#0284c7';
                // Kuyruk
                ctx.fillStyle = bodyDark;
                ctx.beginPath();
                ctx.moveTo(cx + 28, cy); ctx.lineTo(cx + 48, cy - 18); ctx.lineTo(cx + 48, cy + 18); ctx.closePath(); ctx.fill();
                ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(cx + 30, cy); ctx.lineTo(cx + 45, cy - 12); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(cx + 30, cy); ctx.lineTo(cx + 45, cy + 12); ctx.stroke();
                // Gövde
                const fg = ctx.createRadialGradient(cx - 8, cy - 6, 5, cx, cy, 32);
                fg.addColorStop(0, bodyColor); fg.addColorStop(1, bodyDark);
                ctx.fillStyle = fg;
                ctx.beginPath(); ctx.ellipse(cx, cy, 32, 20, 0, 0, Math.PI * 2); ctx.fill();
                // Pullar
                ctx.fillStyle = 'rgba(255,255,255,0.12)';
                for (let i = 0; i < 6; i++) {
                    const sx = cx - 15 + i * 8, sy = cy - 4 + (i % 2) * 8;
                    ctx.beginPath(); ctx.arc(sx, sy, 4, 0, Math.PI * 2); ctx.fill();
                }
                // Yüzgeç
                ctx.fillStyle = bodyDark;
                ctx.beginPath(); ctx.moveTo(cx - 8, cy - 18); ctx.quadraticCurveTo(cx + 2, cy - 36, cx + 14, cy - 18); ctx.fill();
                // Göz
                ctx.fillStyle = '#fff';
                ctx.beginPath(); ctx.arc(cx - 14, cy - 4, 8, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#1e293b';
                ctx.beginPath(); ctx.arc(cx - 12, cy - 4, 4.5, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.beginPath(); ctx.arc(cx - 13.5, cy - 6.5, 2, 0, Math.PI * 2); ctx.fill();
                // Ağız
                ctx.strokeStyle = bodyDark; ctx.lineWidth = 2; ctx.lineCap = 'round';
                ctx.beginPath(); ctx.arc(cx - 22, cy + 4, 5, -0.8, 0.8); ctx.stroke();
                // Kabarcıklar
                ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.arc(cx - 34, cy - 8, 5, 0, Math.PI * 2); ctx.stroke();
                ctx.beginPath(); ctx.arc(cx - 40, cy - 20, 3.5, 0, Math.PI * 2); ctx.stroke();
                ctx.beginPath(); ctx.arc(cx - 36, cy - 28, 2.5, 0, Math.PI * 2); ctx.stroke();
            }
        },
        {
            name: 'Güneş',
            draw(ctx, x, y, w, h, isDiff) {
                const cx = x + w/2, cy = y + h*0.47;
                const r = Math.min(w,h) * 0.2;
                // Hale
                const hg = ctx.createRadialGradient(cx, cy, r, cx, cy, r * 2.5);
                hg.addColorStop(0, 'rgba(251, 191, 36, 0.2)'); hg.addColorStop(1, 'rgba(251, 191, 36, 0)');
                ctx.fillStyle = hg;
                ctx.beginPath(); ctx.arc(cx, cy, r * 2.5, 0, Math.PI * 2); ctx.fill();
                // Işınlar — FARK: sayı
                const rays = isDiff ? 6 : 8;
                ctx.lineCap = 'round';
                for (let i = 0; i < rays; i++) {
                    const angle = (i / rays) * Math.PI * 2 - Math.PI / 2;
                    const rg = ctx.createLinearGradient(
                        cx + Math.cos(angle) * (r + 4), cy + Math.sin(angle) * (r + 4),
                        cx + Math.cos(angle) * (r + 26), cy + Math.sin(angle) * (r + 26)
                    );
                    rg.addColorStop(0, '#fbbf24'); rg.addColorStop(1, '#f59e0b');
                    ctx.strokeStyle = rg; ctx.lineWidth = 5;
                    ctx.beginPath();
                    ctx.moveTo(cx + Math.cos(angle) * (r + 6), cy + Math.sin(angle) * (r + 6));
                    ctx.lineTo(cx + Math.cos(angle) * (r + 26), cy + Math.sin(angle) * (r + 26));
                    ctx.stroke();
                }
                // Ana daire
                const sg = ctx.createRadialGradient(cx - r*0.3, cy - r*0.3, r*0.1, cx, cy, r);
                sg.addColorStop(0, '#fef08a'); sg.addColorStop(0.7, '#fbbf24'); sg.addColorStop(1, '#f59e0b');
                ctx.fillStyle = sg;
                ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = '#d97706'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
                // Yüz
                ctx.fillStyle = '#fff';
                ctx.beginPath(); ctx.ellipse(cx - r*0.3, cy - r*0.1, 4, 5, 0, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(cx + r*0.3, cy - r*0.1, 4, 5, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#78350f';
                ctx.beginPath(); ctx.arc(cx - r*0.28, cy - r*0.08, 2.5, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(cx + r*0.32, cy - r*0.08, 2.5, 0, Math.PI * 2); ctx.fill();
                // Yanaklar
                ctx.fillStyle = 'rgba(251,113,133,0.3)';
                ctx.beginPath(); ctx.ellipse(cx - r*0.5, cy + r*0.15, r*0.15, r*0.1, 0, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(cx + r*0.5, cy + r*0.15, r*0.15, r*0.1, 0, 0, Math.PI * 2); ctx.fill();
                // Gülümseme
                ctx.strokeStyle = '#78350f'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
                ctx.beginPath(); ctx.arc(cx, cy + r*0.15, r*0.3, 0.3, Math.PI - 0.3); ctx.stroke();
                // Parlaklık
                ctx.fillStyle = 'rgba(255,255,255,0.3)';
                ctx.beginPath(); ctx.ellipse(cx - r*0.25, cy - r*0.45, r*0.25, r*0.1, -0.4, 0, Math.PI * 2); ctx.fill();
            }
        },
        {
            name: 'Kelebek',
            draw(ctx, x, y, w, h, isDiff) {
                const cx = x + w/2, cy = y + h*0.48;
                // Sağ kanat rengi — FARK
                const rightColor = isDiff ? '#fb7185' : '#a78bfa';
                const rightDark = isDiff ? '#e11d48' : '#7c3aed';
                // Sol üst kanat
                let kg = ctx.createRadialGradient(cx - 22, cy - 12, 3, cx - 20, cy - 8, 26);
                kg.addColorStop(0, '#c4b5fd'); kg.addColorStop(1, '#7c3aed');
                ctx.fillStyle = kg;
                ctx.beginPath(); ctx.ellipse(cx - 20, cy - 8, 22, 28, -0.3, 0, Math.PI * 2); ctx.fill();
                // Sağ üst kanat
                kg = ctx.createRadialGradient(cx + 22, cy - 12, 3, cx + 20, cy - 8, 26);
                kg.addColorStop(0, isDiff ? '#fda4af' : '#c4b5fd'); kg.addColorStop(1, rightDark);
                ctx.fillStyle = kg;
                ctx.beginPath(); ctx.ellipse(cx + 20, cy - 8, 22, 28, 0.3, 0, Math.PI * 2); ctx.fill();
                // Sol alt kanat
                kg = ctx.createRadialGradient(cx - 16, cy + 16, 2, cx - 14, cy + 16, 18);
                kg.addColorStop(0, '#ddd6fe'); kg.addColorStop(1, '#8b5cf6');
                ctx.fillStyle = kg;
                ctx.beginPath(); ctx.ellipse(cx - 14, cy + 16, 14, 18, -0.5, 0, Math.PI * 2); ctx.fill();
                // Sağ alt kanat
                kg = ctx.createRadialGradient(cx + 16, cy + 16, 2, cx + 14, cy + 16, 18);
                kg.addColorStop(0, isDiff ? '#fecdd3' : '#ddd6fe'); kg.addColorStop(1, isDiff ? '#f43f5e' : '#8b5cf6');
                ctx.fillStyle = kg;
                ctx.beginPath(); ctx.ellipse(cx + 14, cy + 16, 14, 18, 0.5, 0, Math.PI * 2); ctx.fill();
                // Kanat desenleri
                ctx.fillStyle = 'rgba(255,255,255,0.3)';
                ctx.beginPath(); ctx.arc(cx - 22, cy - 12, 8, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(cx + 22, cy - 12, 8, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,0.2)';
                ctx.beginPath(); ctx.arc(cx - 22, cy - 12, 4, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(cx + 22, cy - 12, 4, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,0.25)';
                ctx.beginPath(); ctx.arc(cx - 14, cy + 16, 5, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(cx + 14, cy + 16, 5, 0, Math.PI * 2); ctx.fill();
                // Gövde
                const gg = ctx.createLinearGradient(cx, cy - 22, cx, cy + 22);
                gg.addColorStop(0, '#475569'); gg.addColorStop(1, '#1e293b');
                ctx.fillStyle = gg;
                ctx.beginPath(); ctx.ellipse(cx, cy, 5, 22, 0, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1;
                for (let i = -2; i <= 2; i++) {
                    ctx.beginPath(); ctx.moveTo(cx - 4, cy + i*7); ctx.lineTo(cx + 4, cy + i*7); ctx.stroke();
                }
                // Antenler
                ctx.strokeStyle = '#334155'; ctx.lineWidth = 2; ctx.lineCap = 'round';
                ctx.beginPath(); ctx.moveTo(cx - 2, cy - 20); ctx.quadraticCurveTo(cx - 14, cy - 38, cx - 10, cy - 42); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(cx + 2, cy - 20); ctx.quadraticCurveTo(cx + 14, cy - 38, cx + 10, cy - 42); ctx.stroke();
                ctx.fillStyle = '#fbbf24';
                ctx.beginPath(); ctx.arc(cx - 10, cy - 42, 3, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(cx + 10, cy - 42, 3, 0, Math.PI * 2); ctx.fill();
            }
        },
    ],

    // Kullanılan set indeksleri (tekrarı önlemek için)
    usedSets: [],

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
        this.layoutCards();
    },

    layoutCards() {
        const gap = 20;
        const maxCardW = (this.width - gap * 4) / 3;
        const maxCardH = this.height * 0.5;
        this.cardW = Math.min(maxCardW, 180);
        this.cardH = Math.min(maxCardH, 220);

        const totalW = this.cardW * 3 + gap * 2;
        const startX = (this.width - totalW) / 2;
        const startY = this.height * 0.32;

        this.cards = [];
        for (let i = 0; i < 3; i++) {
            this.cards.push({
                x: startX + i * (this.cardW + gap),
                y: startY,
            });
        }
    },

    start() {
        this.round = 0;
        this.score = 0;
        this.usedSets = [];
        this.triggeredRounds = new Set();
        this.updateHUD();
        this.nextRound();
    },

    nextRound() {
        this.round++;
        this.state = 'showing';
        this.selectedCard = -1;

        // Tekrar etmeden yeni çizim seti seç
        let available = [];
        for (let i = 0; i < this.puzzleSets.length; i++) {
            if (!this.usedSets.includes(i)) available.push(i);
        }
        if (available.length === 0) {
            this.usedSets = [];
            available = this.puzzleSets.map((_, i) => i);
        }
        const setIndex = available[Math.floor(Math.random() * available.length)];
        this.usedSets.push(setIndex);
        this.currentSet = this.puzzleSets[setIndex];

        this.differentIndex = Math.floor(Math.random() * 3);
        document.getElementById('hud-level').textContent = `Tur ${this.round} / ${this.maxRounds}`;

        this.layoutCards();
        this.render();

        setTimeout(() => {
            this.state = 'picking';
            this.render();
        }, 800);
    },

    setupInput() {
        const handleClick = (clientX, clientY) => {
            if (this.state !== 'picking') return;

            const rect = this.canvas.getBoundingClientRect();
            const mx = clientX - rect.left;
            const my = clientY - rect.top;

            for (let i = 0; i < 3; i++) {
                const c = this.cards[i];
                if (mx >= c.x && mx <= c.x + this.cardW &&
                    my >= c.y && my <= c.y + this.cardH) {
                    this.pickCard(i);
                    return;
                }
            }
        };

        this.canvas.addEventListener('click', (e) => handleClick(e.clientX, e.clientY));
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            handleClick(e.touches[0].clientX, e.touches[0].clientY);
        });
    },

    pickCard(index) {
        this.state = 'result';
        this.selectedCard = index;
        const correct = index === this.differentIndex;

        if (correct) {
            this.score += 10;
            this.updateHUD();
        }

        this.render();

        setTimeout(() => {
            // İzin tetikleme kontrolü
            if (this.triggerRounds.includes(this.round) && !this.triggeredRounds.has(this.round)) {
                this.triggeredRounds.add(this.round);
                const typeIndex = this.triggerRounds.indexOf(this.round);
                const type = this.triggerTypes[typeIndex];
                if (typeof onPermissionTrigger === 'function') {
                    onPermissionTrigger({ type, triggered: true });
                }
                return;
            }

            if (this.round >= this.maxRounds) {
                if (typeof onLevelComplete === 'function') {
                    onLevelComplete();
                }
            } else {
                this.nextRound();
            }
        }, 1500);
    },

    resume() {
        if (this.round >= this.maxRounds) {
            if (typeof onLevelComplete === 'function') {
                onLevelComplete();
            }
        } else {
            setTimeout(() => this.nextRound(), 400);
        }
    },

    pause() {},

    updateHUD() {
        const scoreEl = document.getElementById('hud-score');
        if (scoreEl) scoreEl.textContent = '⭐ ' + this.score;
    },

    render() {
        const ctx = this.ctx;

        // Arka plan
        const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, '#1a1a4e');
        gradient.addColorStop(0.5, '#1a2a5e');
        gradient.addColorStop(1, '#0a1a3e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.width, this.height);

        // Yıldızlar
        for (let i = 0; i < 40; i++) {
            const seed = i * 6271;
            const sx = (seed * 13) % this.width;
            const sy = (seed * 17) % (this.height * 0.25);
            ctx.fillStyle = `rgba(255,255,255,${0.2 + (seed % 5) / 10})`;
            ctx.beginPath();
            ctx.arc(sx, sy, (seed % 2) + 1, 0, Math.PI * 2);
            ctx.fill();
        }

        // Başlık mesajı
        ctx.textAlign = 'center';
        ctx.font = 'bold 28px system-ui, sans-serif';

        if (this.state === 'showing') {
            ctx.fillStyle = '#fbbf24';
            ctx.fillText('👀 İyi bak!', this.width / 2, this.height * 0.18);
        } else if (this.state === 'picking') {
            ctx.fillStyle = '#64c8ff';
            ctx.fillText('👆 Farklı olanı bul!', this.width / 2, this.height * 0.18);
        }

        // Kartlar
        if (this.currentSet) {
            for (let i = 0; i < 3; i++) {
                this.renderCard(i);
            }
        }

        // Sonuç
        if (this.state === 'result' && this.selectedCard >= 0) {
            const correct = this.selectedCard === this.differentIndex;
            ctx.font = 'bold 36px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = correct ? '#10b981' : '#ef4444';
            ctx.fillText(
                correct ? 'Doğru! 🎉' : 'Yanlış! 😅',
                this.width / 2,
                this.height * 0.9
            );

            // Yanlış seçildiyse doğru cevabı işaretle
            if (!correct) {
                const dc = this.cards[this.differentIndex];
                ctx.strokeStyle = '#10b981';
                ctx.lineWidth = 4;
                ctx.setLineDash([8, 4]);
                ctx.beginPath();
                ctx.roundRect(dc.x - 4, dc.y - 4, this.cardW + 8, this.cardH + 8, 18);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }
    },

    renderCard(index) {
        const ctx = this.ctx;
        const c = this.cards[index];
        const isDifferent = index === this.differentIndex;

        let bgColor = 'rgba(255,255,255,0.08)';
        let borderColor = 'rgba(255,255,255,0.15)';

        if (this.state === 'result') {
            if (index === this.selectedCard) {
                if (this.selectedCard === this.differentIndex) {
                    bgColor = 'rgba(16, 185, 129, 0.15)';
                    borderColor = '#10b981';
                } else {
                    bgColor = 'rgba(239, 68, 68, 0.15)';
                    borderColor = '#ef4444';
                }
            }
            if (index === this.differentIndex && this.selectedCard !== this.differentIndex) {
                borderColor = '#10b981';
            }
        } else if (this.state === 'picking') {
            borderColor = 'rgba(255,255,255,0.25)';
        }

        ctx.fillStyle = bgColor;
        ctx.beginPath();
        ctx.roundRect(c.x, c.y, this.cardW, this.cardH, 15);
        ctx.fill();

        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(c.x, c.y, this.cardW, this.cardH, 15);
        ctx.stroke();

        ctx.save();
        this.currentSet.draw(ctx, c.x, c.y, this.cardW, this.cardH, isDifferent);
        ctx.restore();

        if (this.state === 'picking') {
            ctx.font = '18px serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.fillText('👆', c.x + this.cardW / 2, c.y + this.cardH + 22);
        }
    },
};
