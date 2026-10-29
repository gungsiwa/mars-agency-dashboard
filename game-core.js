// --- game-core.js: ระบบเกมจับคู่หลัก, ตัวจับเวลา, ไอเทมตัวช่วย และบันทึกคะแนน ---

const allVjImages = [
    'images/vj1.png', 'images/vj2.png', 'images/vj3.png', 'images/vj4.png',
    'images/vj5.png', 'images/vj6.png', 'images/vj7.png', 'images/vj8.png',
    'images/vj9.png', 'images/vj10.png', 'images/vj11.png', 'images/vj12.png',
    'images/vj13.png', 'images/vj14.png', 'images/vj15.png', 'images/vj16.png'
];

const levels = [
    { level: 1, pairs: 4, name: 'Level 1: ง่าย (4 คู่)' },
    { level: 2, pairs: 6, name: 'Level 2: ปานกลาง (6 คู่)' },
    { level: 3, pairs: 8, name: 'Level 3: ท้าทาย (8 คู่)' },
    { level: 4, pairs: 12, name: 'Level 4: ยาก (12 คู่)' },
    { level: 5, pairs: 16, name: 'Level 5: สูงสุด (16 คู่)' }
];

let currentLevelIdx = 0;
let cards = [], flippedCards = [];
let matchedCount = 0, clickCount = 0;
let timerInterval = null, totalSeconds = 0, totalClicksAccumulated = 0, gameStarted = false;
let magnifyingGlassCount = 1;

const homeScreen = document.getElementById('home-screen');
const gameScreen = document.getElementById('game-screen');
const board = document.getElementById('board');
const clicksDisplay = document.getElementById('clicks');
const matchesDisplay = document.getElementById('matches');
const totalMatchesDisplay = document.getElementById('total-matches');
const levelTitle = document.getElementById('level-title');
const timerDisplay = document.getElementById('timer');
const levelModal = document.getElementById('level-modal');
const modalTitle = document.getElementById('modal-title');
const modalDesc = document.getElementById('modal-desc');
const modalActionBtn = document.getElementById('modal-action-btn');

function useMagnifyingGlass() {
    if (magnifyingGlassCount > 0) {
        magnifyingGlassCount--;
        updateMagnifyingGlassUI();

        const unmatchedCards = Array.from(document.querySelectorAll('.card:not(.flipped)'));
        if (unmatchedCards.length < 2) return;

        const pairMap = {};
        unmatchedCards.forEach(card => {
            const val = card.dataset.value;
            if (!pairMap[val]) pairMap[val] = [];
            pairMap[val].push(card);
        });

        const availablePairs = Object.values(pairMap).filter(pair => pair.length >= 2);
        if (availablePairs.length === 0) return;

        const randomPair = availablePairs[Math.floor(Math.random() * availablePairs.length)];
        const card1 = randomPair[0];
        const card2 = randomPair[1];

        card1.classList.add('flipped');
        card2.classList.add('flipped');

        setTimeout(() => {
            card1.classList.remove('flipped');
            card2.classList.remove('flipped');
        }, 1000);
    } else {
        alert('ไอเทมแว่นขยายหมดแล้ว! สามารถซื้อเพิ่มได้ที่ร้านค้า');
    }
}

function updateMagnifyingGlassUI() {
    const countSpan = document.getElementById('magnifying-glass-count');
    if (countSpan) countSpan.innerText = magnifyingGlassCount;
}

window.incrementMagnifyingGlass = function() {
    magnifyingGlassCount++;
    updateMagnifyingGlassUI();
};

function enterGameScreen() {
    if (homeScreen) homeScreen.style.display = 'none';
    if (gameScreen) gameScreen.style.display = 'flex';
    currentLevelIdx = 0;
    startLevel(0);

    let magnifyingBtn = document.getElementById('magnifying-glass-btn');
    if (!magnifyingBtn && gameScreen) {
        magnifyingBtn = document.createElement('button');
        magnifyingBtn.id = 'magnifying-glass-btn';
        magnifyingBtn.innerHTML = '🔍';
        magnifyingBtn.onclick = useMagnifyingGlass;

        const countSpan = document.createElement('span');
        countSpan.id = 'magnifying-glass-count';
        countSpan.style.cssText = 'position: absolute; top: -5px; right: -5px; background: #ef4444; color: white; border-radius: 50%; width: 20px; height: 20px; font-size: 12px; font-weight: bold; display: flex; justify-content: center; align-items: center;';
        countSpan.innerText = magnifyingGlassCount;
        magnifyingBtn.appendChild(countSpan);

        magnifyingBtn.style.cssText = 'position: absolute; bottom: 20px; right: 20px; z-index: 10; font-size: 24px; padding: 10px; border-radius: 50%; border: none; cursor: pointer; background: #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.2);';
        gameScreen.appendChild(magnifyingBtn);
    }
}

function returnToHome() {
    stopTimer();
    if (gameScreen) gameScreen.style.display = 'none';
    if (homeScreen) homeScreen.style.display = 'flex';
}

function startLevel(levelIdx) {
    const levelConfig = levels[levelIdx];
    if (board) {
        board.classList.remove('level-4', 'level-5');
        if (levelConfig.level === 4) board.classList.add('level-4');
        else if (levelConfig.level === 5) board.classList.add('level-5');
    }

    if (levelTitle) levelTitle.innerText = levelConfig.name;
    if (levelModal) levelModal.classList.remove('active');
    if (totalMatchesDisplay) totalMatchesDisplay.innerText = levelConfig.pairs;

    const selectedImages = [...allVjImages].sort(() => Math.random() - 0.5).slice(0, levelConfig.pairs);
    cards = [...selectedImages, ...selectedImages].sort(() => Math.random() - 0.5);

    if (board) board.innerHTML = '';
    flippedCards = [];
    matchedCount = 0; clickCount = 0;
    if (clicksDisplay) clicksDisplay.innerText = clickCount;
    if (matchesDisplay) matchesDisplay.innerText = matchedCount;

    cards.forEach((imgUrl) => {
        const card = document.createElement('div');
        card.classList.add('card');
        card.dataset.value = imgUrl;
        card.style.backgroundImage = `url('${window.currentCardBack || 'images/card_river.png'}')`;
        card.innerHTML = `<img src="${imgUrl}" alt="VJ">`;
        card.addEventListener('click', flipCard);
        if (board) board.appendChild(card);
    });

    if (levelIdx === 0) {
        totalSeconds = 0; totalClicksAccumulated = 0; gameStarted = false;
        stopTimer();
        if (timerDisplay) timerDisplay.innerText = '00:00';
    }
}

function startTimer() {
    if (gameStarted) return;
    gameStarted = true;
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        totalSeconds++;
        const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        const s = (totalSeconds % 60).toString().padStart(2, '0');
        if (timerDisplay) timerDisplay.innerText = `${m}:${s}`;
    }, 1000);
}

function stopTimer() { clearInterval(timerInterval); gameStarted = false; }

function flipCard() {
    if (!gameStarted) startTimer();
    if (flippedCards.length === 2 || this.classList.contains('flipped')) return;

    this.classList.add('flipped');
    flippedCards.push(this);

    if (flippedCards.length === 2) {
        clickCount++; totalClicksAccumulated++;
        if (clicksDisplay) clicksDisplay.innerText = clickCount;
        checkMatch();
    }
}

function checkMatch() {
    const [card1, card2] = flippedCards;
    if (card1.dataset.value === card2.dataset.value) {
        matchedCount++;
        if (matchesDisplay) matchesDisplay.innerText = matchedCount;
        flippedCards = [];
        if (matchedCount === levels[currentLevelIdx].pairs) {
            stopTimer();
            if (typeof window.addCoins === 'function') {
                window.addCoins(10 * levels[currentLevelIdx].level);
            }
            submitScoreToSupabase(levels[currentLevelIdx].level, totalClicksAccumulated, totalSeconds);
            setTimeout(() => {
                if (currentLevelIdx < levels.length - 1) {
                    modalTitle.innerText = `🎉 ผ่าน Level ${levels[currentLevelIdx].level} แล้ว!`;
                    modalDesc.innerText = `เวลาสะสม: ${timerDisplay ? timerDisplay.innerText : '00:00'} | รับรางวัล 🪙 +${10 * levels[currentLevelIdx].level} เหรียญ`;
                    modalActionBtn.innerText = 'ไปด่านถัดไป ➔';
                    modalActionBtn.onclick = nextLevel;
                    levelModal.classList.add('active');
                } else {
                    if (typeof confetti === 'function') confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
                    modalTitle.innerText = `🏆 ยินดีด้วย! จบเกมครบทุกเลเวล`;
                    modalDesc.innerText = `เวลารวมทั้งหมด: ${timerDisplay ? timerDisplay.innerText : '00:00'}`;
                    modalActionBtn.innerText = 'เล่นใหม่อีกครั้ง 🔄';
                    modalActionBtn.onclick = resetEntireGame;
                    levelModal.classList.add('active');
                }
            }, 400);
        }
    } else {
        setTimeout(() => { card1.classList.remove('flipped'); card2.classList.remove('flipped'); flippedCards = []; }, 850);
    }
}

function restartLevel() { startLevel(currentLevelIdx); }
function nextLevel() { if (currentLevelIdx < levels.length - 1) { currentLevelIdx++; startLevel(currentLevelIdx); } }
function resetEntireGame() { currentLevelIdx = 0; startLevel(0); }

async function submitScoreToSupabase(maxLevel, clicks, timeSec) {
    try {
        const client = window.supabaseClient;
        if (!client) return;

        const scoreData = { 
            player_name: window.playerName || 'ผู้เล่น', 
            max_level: maxLevel, 
            total_clicks: clicks, 
            total_time: timeSec,
            user_type: window.currentUser ? 'VIP' : 'Guest'
        };
        if (window.currentUser) scoreData.user_id = window.currentUser.id;
        await client.from('vj_game_leaderboard').insert([scoreData]);
    } catch (err) { console.error(err); }
}

window.enterGameScreen = enterGameScreen;
window.returnToHome = returnToHome;
window.restartLevel = restartLevel;
window.nextLevel = nextLevel;
window.resetEntireGame = resetEntireGame;
window.useMagnifyingGlass = useMagnifyingGlass;