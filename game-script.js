// --- game-script.js: ระบบเกมจับคู่, โปรไฟล์, และการซิงค์ลีดเดอร์บอร์ดผ่าน user_id ---
import { renderLeaderboard } from './leaderboard-renderer.js';

const SUPABASE_URL = 'https://ngdshyexremewbpnlrae.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_NcBG60jTTDqonaFiD1RwKw_etSq5A2o';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
let matchedCount = 0, clickCount = 0, playerName = '', oldPlayerName = '';
let timerInterval = null, totalSeconds = 0, totalClicksAccumulated = 0, gameStarted = false;
let userCoins = 0;
let currentUser = null;

const homeScreen = document.getElementById('home-screen');
const gameScreen = document.getElementById('game-screen');
const board = document.getElementById('board');
const clicksDisplay = document.getElementById('clicks');
const matchesDisplay = document.getElementById('matches');
const totalMatchesDisplay = document.getElementById('total-matches');
const levelTitle = document.getElementById('level-title');
const timerDisplay = document.getElementById('timer');
const homePlayerName = document.getElementById('home-player-name');
const userBadge = document.getElementById('user-badge');
const levelModal = document.getElementById('level-modal');
const modalTitle = document.getElementById('modal-title');
const modalDesc = document.getElementById('modal-desc');
const modalActionBtn = document.getElementById('modal-action-btn');
const userCoinsDisplay = document.getElementById('user-coins');
const loginModal = document.getElementById('login-modal');
const profileModal = document.getElementById('profile-modal');
const profileUserEmail = document.getElementById('profile-user-email');
const profileDisplayName = document.getElementById('profile-display-name');
const logoutActionBtn = document.getElementById('logout-action-btn');

// Element สำหรับ Modal ลีดเดอร์บอร์ดในเกม
const inGameLeaderboardModal = document.getElementById('in-game-leaderboard-modal');

async function checkUserSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session?.user) {
        currentUser = session.user;
        playerName = currentUser.user_metadata?.full_name || currentUser.email.split('@')[0];
        oldPlayerName = playerName;
        if (homePlayerName) {
            homePlayerName.innerText = playerName;
            homePlayerName.classList.add('user-rainbow-text');
        }
        
        if (userBadge) {
            userBadge.innerText = 'VIP';
            userBadge.className = 'user-badge badge-VIP';
        }

        await loadPlayerDataFromSupabase(currentUser.id);
    } else {
        currentUser = null;
        initGuestPlayer();
    }
}

function initGuestPlayer() {
    let savedName = localStorage.getItem('vj_game_player_name');
    if (!savedName) savedName = 'ผู้เล่นทั่วไป';
    playerName = savedName;
    oldPlayerName = playerName;
    if (homePlayerName) {
        homePlayerName.innerText = playerName;
        homePlayerName.classList.remove('user-rainbow-text');
    }

    if (userBadge) {
        userBadge.innerText = 'Guest';
        userBadge.className = 'user-badge badge-guest';
    }

    let savedCoins = localStorage.getItem('vj_game_user_coins');
    userCoins = savedCoins ? parseInt(savedCoins, 10) : 0;
    if (userCoinsDisplay) userCoinsDisplay.innerText = userCoins;
}

async function loadPlayerDataFromSupabase(userId) {
    if (!userId) return; // ป้องกันไม่ให้ส่ง Request หากไม่มี User ID

    try {
        const { data, error } = await supabaseClient
            .from('player_data')
            .select('coins, username')
            .eq('id', userId)
            .maybeSingle(); // ใช้ .maybeSingle() เพื่อป้องกัน Error กรณีไม่พบข้อมูลแถว

        if (error) throw error;

        if (data) {
            if (data.username) {
                playerName = data.username;
                oldPlayerName = playerName;
                if (homePlayerName) homePlayerName.innerText = playerName;
            }
            userCoins = data.coins || 0;
            if (userCoinsDisplay) userCoinsDisplay.innerText = userCoins;
        }
    } catch (err) {
        console.log('No existing player record found or DB error:', err);
    }
}

function handleProfileClick() {
    if (currentUser) {
        if (profileUserEmail) profileUserEmail.innerText = `บัญชี: ${currentUser.email}`;
        if (profileDisplayName) profileDisplayName.value = playerName;
        if (logoutActionBtn) logoutActionBtn.style.display = 'block';
        if (profileModal) profileModal.style.display = 'flex';
    } else {
        if (profileUserEmail) profileUserEmail.innerText = `สถานะ: ผู้เล่นทั่วไป (Guest)`;
        if (profileDisplayName) profileDisplayName.value = playerName;
        if (logoutActionBtn) logoutActionBtn.style.display = 'none';
        if (profileModal) profileModal.style.display = 'flex';
    }
}

function openLoginModal(customSubtitle) {
    const subEl = document.getElementById('login-modal-subtitle');
    if (subEl) {
        if (customSubtitle) {
            subEl.innerText = customSubtitle;
        } else {
            subEl.innerText = 'เพื่อบันทึกเหรียญและเล่นเกมต่อสะสมรางวัล';
        }
    }
    if (loginModal) loginModal.style.display = 'flex';
}

function closeLoginModal() { if (loginModal) loginModal.style.display = 'none'; }
function closeProfileModal() { if (profileModal) profileModal.style.display = 'none'; }

// ฟังก์ชันควบคุมเปิด-ปิดหน้าต่างลีดเดอร์บอร์ดในเกม
async function openInGameLeaderboard() {
    if (inGameLeaderboardModal) {
        inGameLeaderboardModal.style.display = 'flex';
        await fetchInGameLeaderboard();
    }
}

function closeInGameLeaderboard() {
    if (inGameLeaderboardModal) {
        inGameLeaderboardModal.style.display = 'none';
    }
}

// ฟังก์ชันดึงข้อมูลลีดเดอร์บอร์ดในเกม (ใช้ renderLeaderboard ร่วมกัน)
async function fetchInGameLeaderboard() {
    const tbody = document.getElementById('inGameLeaderboardBody');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 15px; color: #78350f;">กำลังโหลดข้อมูล...</td></tr>`;

    try {
        const { data, error } = await supabaseClient
            .from('vj_game_leaderboard')
            .select('*')
            .order('max_level', { ascending: false })
            .order('total_clicks', { ascending: true })
            .order('total_time', { ascending: true })
            .limit(50);

        if (error) throw error;

        // เรียกใช้ฟังก์ชันกลางจาก leaderboard-renderer.js
        renderLeaderboard(data, 'inGamePodiumContainer', 'inGameLeaderboardBody');

    } catch (err) {
        console.error('Error fetching in-game leaderboard:', err);
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #ef4444; padding: 15px;">เกิดข้อผิดพลาดในการโหลด</td></tr>`;
    }
}

function handleMemberFeature(featureName) {
    if (!currentUser) {
        openLoginModal(`กรุณาล็อกอิน เพื่อใช้งานระบบ ${featureName} และสะสมเหรียญรางวัลค่ะ ✨`);
    } else {
        alert(`ระบบ ${featureName} (กำลังพัฒนาสำหรับสมาชิก)`);
    }
}

async function saveProfileChanges() {
    const newName = profileDisplayName.value.trim();
    if (!newName) {
        alert('กรุณากรอกชื่อผู้เล่น');
        return;
    }

    playerName = newName;
    if (homePlayerName) homePlayerName.innerText = playerName;

    if (currentUser) {
        await supabaseClient.auth.updateUser({ data: { full_name: newName } });
        await supabaseClient.from('player_data').upsert({
            user_id: currentUser.id,
            username: newName,
            coins: userCoins,
            updated_at: new Date()
        });

        const { error: lbError } = await supabaseClient
            .from('vj_game_leaderboard')
            .update({ player_name: newName })
            .eq('user_id', currentUser.id);

        if (lbError) {
            console.error('Error updating leaderboard name by user_id:', lbError);
        }

        alert('อัปเดตชื่อผู้เล่นบนระบบเรียบร้อยแล้ว!');
    } else {
        localStorage.setItem('vj_game_player_name', newName);
        alert('เปลี่ยนชื่อเรียบร้อยแล้ว!');
    }

    oldPlayerName = newName;
    closeProfileModal();
}

async function loginWithGoogle() {
    const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.href }
    });
    if (error) alert('เกิดข้อผิดพลาดในการล็อกอินด้วย Google: ' + error.message);
}

async function loginWithEmail() {
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    if (!emailInput || !passwordInput) return;

    const email = emailInput.value;
    const password = passwordInput.value;

    if (!email || !password) {
        alert('กรุณากรอกอีเมลและรหัสผ่าน');
        return;
    }

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    
    if (error) {
        const { error: signUpError } = await supabaseClient.auth.signUp({ email, password });
        if (signUpError) {
            alert('ไม่สามารถเข้าสู่ระบบหรือสมัครสมาชิกได้: ' + signUpError.message);
        } else {
            alert('สมัครสมาชิกเรียบร้อยแล้ว! กำลังเข้าสู่ระบบ...');
            location.reload();
        }
    } else {
        closeLoginModal();
        checkUserSession();
    }
}

async function logoutUser() {
    await supabaseClient.auth.signOut();
    closeProfileModal();
    location.reload();
}

async function addCoins(amount) {
    userCoins += amount;
    if (userCoinsDisplay) userCoinsDisplay.innerText = userCoins;

    if (currentUser) {
        await supabaseClient.from('player_data').upsert({
            user_id: currentUser.id,
            username: playerName,
            coins: userCoins,
            updated_at: new Date()
        });
    } else {
        localStorage.setItem('vj_game_user_coins', userCoins);
    }
}

function enterGameScreen() {
    if (homeScreen) homeScreen.style.display = 'none';
    if (gameScreen) gameScreen.style.display = 'flex';
    currentLevelIdx = 0;
    startLevel(0);
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
    if (levelModal) levelModal.style.display = 'none';
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
            addCoins(10 * levels[currentLevelIdx].level);
            submitScoreToSupabase(levels[currentLevelIdx].level, totalClicksAccumulated, totalSeconds);
            setTimeout(() => {
                if (currentLevelIdx < levels.length - 1) {
                    if (modalTitle) modalTitle.innerText = `🎉 ผ่าน Level ${levels[currentLevelIdx].level} แล้ว!`;
                    if (modalDesc) modalDesc.innerText = `เวลาสะสม: ${timerDisplay ? timerDisplay.innerText : '00:00'} | รับรางวัล 🪙 +${10 * levels[currentLevelIdx].level} เหรียญ`;
                    if (modalActionBtn) {
                        modalActionBtn.innerText = 'ไปด่านถัดไป ➔';
                        modalActionBtn.onclick = nextLevel;
                    }
                    if (levelModal) levelModal.style.display = 'flex';
                } else {
                    if (typeof confetti === 'function') confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
                    if (modalTitle) modalTitle.innerText = `🏆 ยินดีด้วย! จบเกมครบทุกเลเวล`;
                    if (modalDesc) modalDesc.innerText = `เวลารวมทั้งหมด: ${timerDisplay ? timerDisplay.innerText : '00:00'} | บันทึกคะแนนสูงสุดเรียบร้อย!`;
                    if (modalActionBtn) {
                        modalActionBtn.innerText = 'เล่นใหม่อีกครั้ง 🔄';
                        modalActionBtn.onclick = resetEntireGame;
                    }
                    if (levelModal) levelModal.style.display = 'flex';
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
        const userType = currentUser ? 'VIP' : 'Guest';
        const scoreData = { 
            player_name: playerName, 
            max_level: maxLevel, 
            total_clicks: clicks, 
            total_time: timeSec,
            user_type: userType
        };
        
        if (currentUser) {
            scoreData.user_id = currentUser.id;
        }

        await supabaseClient.from('vj_game_leaderboard').insert([scoreData]);
    } catch (err) { console.error(err); }
}

// 📌 ผูกฟังก์ชันเข้ากับ window เพื่อให้ HTML onclick เรียกใช้งานได้ทันทีไม่ติด Error
window.handleProfileClick = handleProfileClick;
window.openLoginModal = openLoginModal;
window.closeLoginModal = closeLoginModal;
window.closeProfileModal = closeProfileModal;
window.openInGameLeaderboard = openInGameLeaderboard;
window.closeInGameLeaderboard = closeInGameLeaderboard;
window.handleMemberFeature = handleMemberFeature;
window.saveProfileChanges = saveProfileChanges;
window.loginWithGoogle = loginWithGoogle;
window.loginWithEmail = loginWithEmail;
window.logoutUser = logoutUser;
window.enterGameScreen = enterGameScreen;
window.returnToHome = returnToHome;
window.restartLevel = restartLevel;
window.nextLevel = nextLevel;
window.resetEntireGame = resetEntireGame;

checkUserSession();