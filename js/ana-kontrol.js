/* Ana Kontrol — Ekran geçişleri, oyun akışı, avatar, sertifika */

let currentAgeGroup = null;
let currentLevel = 0;
let gameStartTime = null;
let playerAvatarImage = null;
let cameraStream = null;
let activeEngine = null;
let selectedMiniGame = null;

// Ekran yönetimi
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function getActiveGame() {
    const map = {
        cup: CupGame, spot: SpotGame, araba: ArabaOyunu,
        firewall: typeof GuvenlikDuvari !== 'undefined' ? GuvenlikDuvari : null,
        sifre: typeof SifreKirici !== 'undefined' ? SifreKirici : null,
        platformer: Engine,
    };
    return map[activeEngine] || Engine;
}

function goHome() {
    showScreen('main-menu');
    getActiveGame().pause();
}

// Yaş gruplarına göre oyun listesi
const oyunListesi = {
    '4-5': [
        { id: 'cup',  icon: '🥤', title: 'Bardak Oyunu',     desc: 'Topu takip et!' },
        { id: 'spot', icon: '🔍', title: 'Farklı Olanı Bul', desc: 'Hangisi farklı?' },
    ],
    '6-8': [
        { id: 'platformer', icon: '🏃', title: 'Dijital Orman', desc: 'Koş ve zıpla!' },
        { id: 'araba',      icon: '🚗', title: 'Trafik Yarışı', desc: 'Arabalardan kaç!' },
    ],
    '9-12': [
        { id: 'firewall', icon: '🛡️', title: 'Güvenlik Duvarı', desc: 'Verileri filtrele!' },
        { id: 'sifre',    icon: '🧩', title: 'Şifre Kırıcı',    desc: 'Deseni hatırla!' },
    ],
};

// Yaş seçimi
function startGame(ageGroup) {
    currentAgeGroup = ageGroup;
    currentLevel = 0;
    playerAvatarImage = null;
    selectedMiniGame = null;

    const games = oyunListesi[ageGroup];
    if (games && games.length > 1) {
        const container = document.getElementById('game-cards');
        container.innerHTML = games.map(g => `
            <button class="game-card" onclick="pickGame('${g.id}')">
                <div class="game-card-icon">${g.icon}</div>
                <div class="game-card-title">${g.title}</div>
                <div class="game-card-desc">${g.desc}</div>
            </button>
        `).join('');
        showScreen('game-picker');
    } else {
        selectedMiniGame = games[0].id;
        resetAvatarScreen();
        showScreen('avatar-screen');
    }
}

function pickGame(gameType) {
    selectedMiniGame = gameType;
    resetAvatarScreen();
    showScreen('avatar-screen');
}

function goBackFromAvatar() {
    stopCamera();
    const games = oyunListesi[currentAgeGroup];
    if (games && games.length > 1) {
        showScreen('game-picker');
    } else {
        showScreen('main-menu');
    }
}

// === KAMERA & AVATAR ===

function resetAvatarScreen() {
    const video = document.getElementById('camera-video');
    const snapshot = document.getElementById('camera-snapshot');
    const preview = document.getElementById('avatar-preview');

    video.style.display = 'none';
    snapshot.style.display = 'none';
    preview.style.display = 'flex';
    preview.innerHTML = '<span class="avatar-placeholder">📷</span>';
    document.querySelector('.camera-area').classList.remove('has-photo');

    document.getElementById('btn-open-camera').style.display = '';
    document.getElementById('btn-capture').style.display = 'none';
    document.getElementById('btn-retake').style.display = 'none';
    document.getElementById('btn-avatar-next').style.display = 'none';
    document.querySelectorAll('.default-avatar-btn').forEach(b => b.classList.remove('selected'));

    stopCamera();
}

async function openCamera() {
    // Once getUserMedia dene, basarisiz olursa native kamera input'u ac
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            cameraStream = stream;
            const video = document.getElementById('camera-video');
            video.muted = true;
            video.setAttribute('playsinline', '');
            video.srcObject = stream;
            await video.play();

            video.style.display = 'block';
            document.getElementById('avatar-preview').style.display = 'none';
            document.getElementById('camera-snapshot').style.display = 'none';
            document.getElementById('btn-open-camera').style.display = 'none';
            document.getElementById('btn-capture').style.display = '';
            return;
        } catch (e) {
            // getUserMedia basarisiz — native camera'ya dus
        }
    }

    // Fallback: native kamera input'u tetikle (iPad/iOS icin)
    document.getElementById('camera-capture').click();
}

function capturePhoto() {
    const video = document.getElementById('camera-video');
    const canvas = document.getElementById('camera-snapshot');
    const ctx = canvas.getContext('2d');
    const vw = video.videoWidth || video.clientWidth;
    const vh = video.videoHeight || video.clientHeight;
    const size = Math.min(vw, vh) || 200;
    const sx = (vw - size) / 2;
    const sy = (vh - size) / 2;

    canvas.width = 200;
    canvas.height = 200;
    ctx.drawImage(video, sx, sy, size, size, 0, 0, 200, 200);
    setAvatarFromCanvas(canvas);

    video.style.display = 'none';
    canvas.style.display = 'block';
    document.getElementById('btn-capture').style.display = 'none';
    document.getElementById('btn-retake').style.display = '';
    document.getElementById('btn-avatar-next').style.display = '';
    document.querySelector('.camera-area').classList.add('has-photo');
    stopCamera();
}

function retakePhoto() {
    playerAvatarImage = null;
    document.getElementById('camera-snapshot').style.display = 'none';
    document.querySelector('.camera-area').classList.remove('has-photo');
    document.getElementById('btn-retake').style.display = 'none';
    document.getElementById('btn-avatar-next').style.display = 'none';
    openCamera();
}

function uploadPhoto(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.getElementById('camera-snapshot');
            const ctx = canvas.getContext('2d');
            canvas.width = 200;
            canvas.height = 200;
            const size = Math.min(img.width, img.height);
            ctx.drawImage(img, (img.width - size) / 2, (img.height - size) / 2, size, size, 0, 0, 200, 200);
            setAvatarFromCanvas(canvas);

            document.getElementById('camera-video').style.display = 'none';
            document.getElementById('avatar-preview').style.display = 'none';
            canvas.style.display = 'block';
            document.getElementById('btn-open-camera').style.display = 'none';
            document.getElementById('btn-capture').style.display = 'none';
            document.getElementById('btn-retake').style.display = '';
            document.getElementById('btn-avatar-next').style.display = '';
            document.querySelector('.camera-area').classList.add('has-photo');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    event.target.value = '';
}

function setAvatarFromCanvas(canvas) {
    const img = new Image();
    img.src = canvas.toDataURL('image/png');
    img.onload = () => { playerAvatarImage = img; };
    playerAvatarImage = img;
}

function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
}

function pickDefaultAvatar(emoji, bgColor) {
    stopCamera();
    document.querySelectorAll('.default-avatar-btn').forEach(b => b.classList.remove('selected'));
    event.target.classList.add('selected');

    const canvas = document.getElementById('camera-snapshot');
    const ctx = canvas.getContext('2d');
    canvas.width = 200;
    canvas.height = 200;
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.arc(100, 100, 100, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = '120px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 100, 108);
    setAvatarFromCanvas(canvas);

    document.getElementById('camera-video').style.display = 'none';
    document.getElementById('avatar-preview').style.display = 'none';
    canvas.style.display = 'block';
    document.querySelector('.camera-area').classList.add('has-photo');
    document.getElementById('btn-open-camera').style.display = 'none';
    document.getElementById('btn-capture').style.display = 'none';
    document.getElementById('btn-retake').style.display = '';
    document.getElementById('btn-avatar-next').style.display = '';
}

function skipAvatar() {
    pickDefaultAvatar('🛡️', '#3b82f6');
    goToParentSetup();
}

function avatarDone() {
    stopCamera();
    goToParentSetup();
}

function goToParentSetup() {
    const pw = PermissionSystem.generatePassword();
    document.getElementById('parent-password').textContent = pw;
    showScreen('parent-setup');
}

function generatePassword() {
    const pw = PermissionSystem.generatePassword();
    document.getElementById('parent-password').textContent = pw;
}

// === OYUN BAŞLATMA ===

function confirmParentSetup() {
    gameStartTime = Date.now();
    document.getElementById('mobile-controls').style.display = 'none';
    document.getElementById('hud-hearts').parentElement.style.visibility = 'hidden';

    if (selectedMiniGame === 'cup') {
        activeEngine = 'cup';
        CupGame.init('game-canvas');
        showScreen('game-screen');
        CupGame.start();
    } else if (selectedMiniGame === 'spot') {
        activeEngine = 'spot';
        SpotGame.init('game-canvas');
        showScreen('game-screen');
        SpotGame.start();
    } else if (selectedMiniGame === 'araba') {
        activeEngine = 'araba';
        ArabaOyunu.init('game-canvas');
        document.getElementById('hud-hearts').parentElement.style.visibility = '';
        showScreen('game-screen');
        ArabaOyunu.start();
    } else if (selectedMiniGame === 'firewall') {
        activeEngine = 'firewall';
        GuvenlikDuvari.init('game-canvas');
        document.getElementById('hud-hearts').parentElement.style.visibility = '';
        showScreen('game-screen');
        GuvenlikDuvari.start();
    } else if (selectedMiniGame === 'sifre') {
        activeEngine = 'sifre';
        SifreKirici.init('game-canvas');
        document.getElementById('hud-hearts').parentElement.style.visibility = '';
        showScreen('game-screen');
        SifreKirici.start();
    } else {
        activeEngine = 'platformer';
        Engine.init('game-canvas');
        const groupData = Levels[currentAgeGroup];
        Object.assign(Engine.physics, groupData.physics);
        Engine.player.color = groupData.playerColor;
        Engine.player.maxJumps = 2;
        document.getElementById('mobile-controls').style.display = '';
        document.getElementById('hud-hearts').parentElement.style.visibility = '';
        loadCurrentLevel();
        showScreen('game-screen');
        Engine.start();
    }
}

function loadCurrentLevel() {
    const groupData = Levels[currentAgeGroup];
    const levelRaw = groupData.levels[currentLevel];
    if (!levelRaw) { showFinalScreen(); return; }

    document.getElementById('hud-level').textContent = levelRaw.name || ('Bölüm ' + (currentLevel + 1));
    const levelData = normalizeLevelData(levelRaw, Engine.groundY);
    for (const t of levelData.triggers) t.triggered = false;
    Engine.loadLevel(levelData);
}

// === İZİN TUZAKLARI ===

function onPermissionTrigger(trigger) {
    PermissionSystem.showPermissionPopup(trigger, currentAgeGroup);
}

function handlePermission(accepted) {
    if (accepted) PermissionSystem.handleAccept();
    else PermissionSystem.handleReject(currentAgeGroup);
}

function pinNext(current) {
    const input = document.getElementById('pin-' + current);
    if (input.value.length > 1) input.value = input.value.slice(-1);
    if (input.value.length === 1 && current < 4) {
        document.getElementById('pin-' + (current + 1)).focus();
    }
}

function checkPassword() {
    PermissionSystem.checkPassword(currentAgeGroup);
}

function backToGame() {
    PermissionSystem.stats.rejected++;
    document.getElementById('feedback-icon').textContent = '🛡️';
    document.getElementById('feedback-title').textContent = 'Doğru Seçim!';
    document.getElementById('feedback-message').textContent = 'Vazgeçmek de çok akıllıca bir karar! Emin olmadığın izinleri asla verme.';
    showScreen('feedback-screen');
    PermissionSystem.launchConfetti();
}

function continuePlaying() {
    showScreen('game-screen');
    getActiveGame().resume();
}

// === SEVİYE & FİNAL ===

function onLevelComplete() {
    if (activeEngine !== 'platformer') { showFinalScreen(); return; }
    currentLevel++;
    const groupData = Levels[currentAgeGroup];
    if (currentLevel >= groupData.levels.length) { showFinalScreen(); }
    else { loadCurrentLevel(); showScreen('game-screen'); Engine.start(); }
}

function showFinalScreen() {
    getActiveGame().pause();
    const results = PermissionSystem.getResults();
    const playTime = Math.floor((Date.now() - gameStartTime) / 1000);
    const minutes = Math.floor(playTime / 60);
    const seconds = playTime % 60;

    const ageLabels = { '4-5': 'Minik Kahraman', '6-8': 'Dijital Kaşif', '9-12': 'Siber Uzman' };
    document.getElementById('cert-player-name').textContent = ageLabels[currentAgeGroup] || 'Dijital Kahraman';

    const certAvatar = document.getElementById('cert-avatar');
    if (playerAvatarImage) {
        certAvatar.innerHTML = '';
        const img = document.createElement('img');
        img.src = playerAvatarImage.src;
        certAvatar.appendChild(img);
    } else {
        certAvatar.innerHTML = '<span class="cert-badge">🛡️</span>';
    }

    const gameScore = getActiveGame().score || 0;
    document.getElementById('cert-stats').innerHTML = `
        <div class="cert-stat"><div class="stat-value">⭐ ${gameScore + results.score}</div><div class="stat-label">Toplam Puan</div></div>
        <div class="cert-stat"><div class="stat-value">🛡️ ${results.rejected}</div><div class="stat-label">Reddedilen İzin</div></div>
        <div class="cert-stat"><div class="stat-value">👨‍👩‍👧 ${results.withParent}</div><div class="stat-label">Ebeveyn Onayı</div></div>
        <div class="cert-stat"><div class="stat-value">⏱️ ${minutes}:${String(seconds).padStart(2, '0')}</div><div class="stat-label">Süre</div></div>
    `;

    document.getElementById('cert-date').textContent =
        new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

    document.getElementById('brochure-result').innerHTML = `
        <h3>Çocuğunuzun Oyun Sonuçları</h3>
        <p>
            Çocuğunuz <strong>${results.total}</strong> izin isteğiyle karşılaştı.
            <strong>${results.rejected}</strong> tanesini reddetti,
            <strong>${results.withParent}</strong> tanesinde size danıştı.<br><br>
            ${results.rejected === results.total
                ? 'Mükemmel! Tüm izin isteklerini reddetti.'
                : results.rejected >= results.withParent
                    ? 'Harika! Çoğu izin isteğini doğru şekilde reddetti.'
                    : 'İyi bir başlangıç! Birlikte pratik yapmaya devam edin.'}
        </p>
    `;

    switchFinalTab('cert');
    showScreen('final-screen');
    drawQRPlaceholder();
    submitResults(gameScore, results, playTime);
    setTimeout(() => PermissionSystem.launchConfetti(), 300);
}

// Sonuclari sunucuya gonder
function submitResults(gameScore, results, playTime) {
    const avatarData = playerAvatarImage ? playerAvatarImage.src : null;
    const payload = {
        gameType: selectedMiniGame || 'platformer',
        ageGroup: currentAgeGroup,
        score: gameScore + results.score,
        rejected: results.rejected,
        withParent: results.withParent,
        playTimeSec: playTime,
        avatarData: avatarData,
    };
    fetch('/oyun-api/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    }).catch(() => {});
}

// === FİNAL SEKME & SERTİFİKA ===

// CSS değişkeninden renk oku — renk değişikliği için tek yer: style.css :root
function getColor(varName) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

function switchFinalTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach((btn, i) => {
        btn.classList.toggle('active', ['cert', 'parent', 'guide'][i] === tabName);
    });
    document.querySelectorAll('.final-tab-content').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-' + tabName).classList.add('active');
}

function downloadCertificate() {
    const W = 800, H = 600;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = W;
    canvas.height = H;

    // CSS'ten renkler
    const bgBlack    = getColor('--bg-black')    || '#060609';
    const bgDark     = getColor('--bg-dark')     || '#0c0c12';
    const bgMid      = getColor('--bg-mid')      || '#13131c';
    const primary    = getColor('--primary')     || '#d90000';
    const primaryLt  = getColor('--primary-light') || '#ff1a1a';
    const accent     = getColor('--accent')      || '#feedba';
    const text       = getColor('--text')        || '#ede9e0';
    const textMuted  = getColor('--text-muted')  || '#7a7870';

    // Arka plan — radyal gradient
    const bg = ctx.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, 550);
    bg.addColorStop(0, bgMid);
    bg.addColorStop(0.5, bgDark);
    bg.addColorStop(1, bgBlack);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Çerçeve — ana kırmızı
    ctx.strokeStyle = primary;
    ctx.lineWidth = 8;
    ctx.strokeRect(20, 20, W - 40, H - 40);
    ctx.strokeStyle = primaryLt;
    ctx.lineWidth = 1;
    ctx.strokeRect(35, 35, W - 70, H - 70);

    // Köşe süsler
    const corner = (x, y, sx, sy) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(sx, sy);
        ctx.strokeStyle = accent;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 25);
        ctx.lineTo(0, 0);
        ctx.lineTo(25, 0);
        ctx.stroke();
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    };
    corner(50, 50, 1, 1);
    corner(W - 50, 50, -1, 1);
    corner(50, H - 50, 1, -1);
    corner(W - 50, H - 50, -1, -1);

    // Avatar
    const avX = W / 2, avY = 125, avR = 58;
    const halo = ctx.createRadialGradient(avX, avY, avR, avX, avY, avR + 30);
    halo.addColorStop(0, 'rgba(217, 0, 0, 0.35)');
    halo.addColorStop(1, 'rgba(217, 0, 0, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(avX, avY, avR + 30, 0, Math.PI * 2);
    ctx.fill();

    if (playerAvatarImage) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(avX, avY, avR, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(playerAvatarImage, avX - avR, avY - avR, avR * 2, avR * 2);
        ctx.restore();
    } else {
        ctx.fillStyle = primary;
        ctx.beginPath();
        ctx.arc(avX, avY, avR, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = '62px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🛡️', avX, avY);
    }
    ctx.strokeStyle = accent;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(avX, avY, avR, 0, Math.PI * 2);
    ctx.stroke();

    // Başlık
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = accent;
    ctx.font = 'bold 38px system-ui, -apple-system, sans-serif';
    ctx.shadowColor = 'rgba(217, 0, 0, 0.5)';
    ctx.shadowBlur = 12;
    ctx.fillText('Dijital Savunma Uzmanı', W / 2, 230);
    ctx.shadowBlur = 0;

    ctx.fillStyle = textMuted;
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillText('Sertifikası', W / 2, 258);

    // Alt çizgi
    const underline = ctx.createLinearGradient(W / 2 - 150, 0, W / 2 + 150, 0);
    underline.addColorStop(0, 'rgba(217, 0, 0, 0)');
    underline.addColorStop(0.5, primary);
    underline.addColorStop(1, 'rgba(217, 0, 0, 0)');
    ctx.fillStyle = underline;
    ctx.fillRect(W / 2 - 150, 270, 300, 2);

    // "Bu sertifika"
    ctx.fillStyle = text;
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText('Bu sertifika', W / 2, 303);

    // İsim
    const name = document.getElementById('cert-player-name').textContent;
    ctx.fillStyle = primaryLt;
    ctx.font = 'bold 36px system-ui, sans-serif';
    ctx.shadowColor = 'rgba(255, 26, 26, 0.4)';
    ctx.shadowBlur = 10;
    ctx.fillText(name, W / 2, 348);
    ctx.shadowBlur = 0;

    ctx.strokeStyle = 'rgba(237, 233, 224, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 180, 360);
    ctx.lineTo(W / 2 + 180, 360);
    ctx.stroke();

    // Açıklama
    ctx.fillStyle = text;
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillText('adlı kahramana, dijital dünyada haklarını koruma', W / 2, 388);
    ctx.fillText('becerisini başarıyla gösterdiği için verilmiştir.', W / 2, 410);

    // İstatistik kartları — hepsi aynı tema renginde
    const results = PermissionSystem.getResults();
    const gameScore = getActiveGame().score || 0;
    const stats = [
        { label: 'Toplam Puan',     value: '⭐ ' + (gameScore + results.score) },
        { label: 'Reddedilen İzin', value: '🛡️ ' + results.rejected },
        { label: 'Ebeveyn Onayı',   value: '👨‍👩‍👧 ' + results.withParent },
    ];

    const cardW = 170, cardH = 75, cardGap = 20;
    const totalW = cardW * 3 + cardGap * 2;
    const startX = (W - totalW) / 2;
    const cardY = 445;

    stats.forEach((s, i) => {
        const cx = startX + i * (cardW + cardGap);

        ctx.fillStyle = 'rgba(237, 233, 224, 0.05)';
        ctx.beginPath();
        ctx.roundRect(cx, cardY, cardW, cardH, 12);
        ctx.fill();

        ctx.strokeStyle = primary;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(cx, cardY, cardW, cardH, 12);
        ctx.stroke();

        ctx.fillStyle = accent;
        ctx.font = 'bold 22px system-ui, sans-serif';
        ctx.fillText(s.value, cx + cardW / 2, cardY + 35);

        ctx.fillStyle = textMuted;
        ctx.font = '12px system-ui, sans-serif';
        ctx.fillText(s.label, cx + cardW / 2, cardY + 58);
    });

    // Tarih
    ctx.fillStyle = textMuted;
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText(document.getElementById('cert-date').textContent, W / 2, 548);

    // Organizasyon
    ctx.fillStyle = text;
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText('İYTE - 23 Nisan Çocuk Şenliği', W / 2, 570);

    // Site
    ctx.fillStyle = textMuted;
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('dijitalsavunma.org', W / 2, 588);

    const link = document.createElement('a');
    link.download = 'dijital-savunma-sertifikasi.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
}

// QR kod — dijitalsavunma.org/rehber sayfasına yönlendirir
function drawQRPlaceholder() {
    const canvas = document.getElementById('qr-canvas');
    if (!canvas) return;
    const url = 'https://dijitalsavunma.org/rehber';

    // QR kodu okutulabilirliği için standart siyah/beyaz kalır
    // (renkli QR mobillerde okunmayabilir — sadece ortadaki logo temadan gelir)
    if (typeof QRCode !== 'undefined' && QRCode.toCanvas) {
        QRCode.toCanvas(canvas, url, {
            width: 200,
            margin: 2,
            color: { dark: '#0a0a0a', light: '#ffffff' },
            errorCorrectionLevel: 'H',
        }, (err) => {
            if (!err) drawQRLogo(canvas);
        });
    } else {
        // CDN yuklenemezse fallback: URL'yi canvas'a yaz
        const ctx = canvas.getContext('2d');
        canvas.width = 200;
        canvas.height = 200;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 200, 200);
        ctx.fillStyle = '#0a0a0a';
        ctx.font = 'bold 16px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('dijitalsavunma.org', 100, 90);
        ctx.fillText('/rehber', 100, 115);
    }
}

// QR kodun ortasına logo — tema renginde
function drawQRLogo(canvas) {
    const ctx = canvas.getContext('2d');
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const r = canvas.width * 0.11;
    const primary = getColor('--primary') || '#d90000';
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = primary;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = `${r * 1.1}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🛡️', cx, cy + 1);
}

// Shake animasyonu
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
@keyframes shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-10px); }
    40% { transform: translateX(10px); }
    60% { transform: translateX(-10px); }
    80% { transform: translateX(10px); }
}
.shake { animation: shake 0.5s ease; }
`;
document.head.appendChild(shakeStyle);
