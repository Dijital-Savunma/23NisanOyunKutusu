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
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: 400, height: 400 }
        });
        const video = document.getElementById('camera-video');
        video.srcObject = cameraStream;
        video.style.display = 'block';
        document.getElementById('avatar-preview').style.display = 'none';
        document.getElementById('camera-snapshot').style.display = 'none';
        document.getElementById('btn-open-camera').style.display = 'none';
        document.getElementById('btn-capture').style.display = '';
    } catch (err) {
        alert('Kameraya erişilemedi. Lütfen galeriden bir fotoğraf seç.');
    }
}

function capturePhoto() {
    const video = document.getElementById('camera-video');
    const canvas = document.getElementById('camera-snapshot');
    const ctx = canvas.getContext('2d');
    const size = Math.min(video.videoWidth, video.videoHeight);
    const sx = (video.videoWidth - size) / 2;
    const sy = (video.videoHeight - size) / 2;

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
    setTimeout(() => PermissionSystem.launchConfetti(), 300);
}

// === FİNAL SEKME & SERTİFİKA ===

function switchFinalTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach((btn, i) => {
        btn.classList.toggle('active', ['cert', 'parent', 'guide'][i] === tabName);
    });
    document.querySelectorAll('.final-tab-content').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-' + tabName).classList.add('active');
}

function downloadCertificate() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 800;
    canvas.height = 600;

    const bg = ctx.createLinearGradient(0, 0, 800, 600);
    bg.addColorStop(0, '#0a0a2e');
    bg.addColorStop(1, '#1a1a4e');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 800, 600);

    ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 6;
    ctx.strokeRect(20, 20, 760, 560);
    ctx.strokeStyle = '#8b5cf6'; ctx.lineWidth = 2;
    ctx.strokeRect(30, 30, 740, 540);

    if (playerAvatarImage) {
        ctx.save();
        ctx.beginPath(); ctx.arc(400, 110, 50, 0, Math.PI * 2); ctx.clip();
        ctx.drawImage(playerAvatarImage, 350, 60, 100, 100);
        ctx.restore();
        ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(400, 110, 50, 0, Math.PI * 2); ctx.stroke();
    } else {
        ctx.font = '50px serif'; ctx.textAlign = 'center';
        ctx.fillText('🛡️', 400, 125);
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 32px system-ui, sans-serif';
    ctx.fillText('Dijital Savunma Uzmanı', 400, 200);
    ctx.fillStyle = '#a0a0d0'; ctx.font = '18px system-ui, sans-serif';
    ctx.fillText('Sertifikası', 400, 225);

    ctx.fillStyle = '#fff'; ctx.font = '14px system-ui, sans-serif';
    ctx.fillText('Bu sertifika', 400, 270);

    const name = document.getElementById('cert-player-name').textContent;
    ctx.fillStyle = '#64c8ff'; ctx.font = 'bold 28px system-ui, sans-serif';
    ctx.fillText(name, 400, 310);

    ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(200, 325); ctx.lineTo(600, 325); ctx.stroke();

    ctx.fillStyle = '#c0c0e0'; ctx.font = '14px system-ui, sans-serif';
    ctx.fillText('adlı kahramana, dijital dünyada haklarını koruma', 400, 350);
    ctx.fillText('becerisini başarıyla gösterdiği için verilmiştir.', 400, 370);

    const results = PermissionSystem.getResults();
    const gameScore = getActiveGame().score || 0;
    const stats = [
        ['⭐ ' + (gameScore + results.score), 'Puan'],
        ['🛡️ ' + results.rejected, 'Reddedilen'],
        ['👨‍👩‍👧 ' + results.withParent, 'Ebeveyn Onayı'],
    ];
    stats.forEach((s, i) => {
        const sx = 200 + i * 200;
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.beginPath(); ctx.roundRect(sx - 60, 400, 120, 60, 10); ctx.fill();
        ctx.fillStyle = '#10b981'; ctx.font = 'bold 20px system-ui, sans-serif';
        ctx.fillText(s[0], sx, 425);
        ctx.fillStyle = '#a0a0d0'; ctx.font = '11px system-ui, sans-serif';
        ctx.fillText(s[1], sx, 448);
    });

    ctx.fillStyle = '#808090'; ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(document.getElementById('cert-date').textContent, 400, 500);
    ctx.fillStyle = '#a0a0d0'; ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText('İYTE - 23 Nisan Çocuk Şenliği', 400, 525);
    ctx.fillStyle = '#606080'; ctx.font = '11px system-ui, sans-serif';
    ctx.fillText('dijitalsavunma.org', 400, 548);

    const link = document.createElement('a');
    link.download = 'dijital-savunma-sertifikasi.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
}

// QR kod (placeholder — gerçek QR ile değiştirilecek)
function drawQRPlaceholder() {
    const canvas = document.getElementById('qr-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = 200, cellSize = 8;
    const modules = Math.floor(size / cellSize);

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size, size);

    const drawFinder = (x, y) => {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x, y, cellSize * 7, cellSize * 7);
        ctx.fillStyle = '#fff';
        ctx.fillRect(x + cellSize, y + cellSize, cellSize * 5, cellSize * 5);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x + cellSize * 2, y + cellSize * 2, cellSize * 3, cellSize * 3);
    };
    drawFinder(cellSize, cellSize);
    drawFinder(size - cellSize * 8, cellSize);
    drawFinder(cellSize, size - cellSize * 8);

    ctx.fillStyle = '#1e293b';
    for (let row = 0; row < modules; row++) {
        for (let col = 0; col < modules; col++) {
            if ((row < 9 && col < 9) || (row < 9 && col > modules - 9) || (row > modules - 9 && col < 9)) continue;
            const hash = ((row * 31 + col * 37 + 42) * 2654435761) >>> 0;
            if (hash % 3 === 0) ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
        }
    }

    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(size / 2, size / 2, 22, 0, Math.PI * 2); ctx.fill();
    ctx.font = '24px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🛡️', size / 2, size / 2);
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
