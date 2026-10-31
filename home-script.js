// --- home-script.js: ระบบโปรไฟล์, ร้านค้า, จดหมาย, เช็คอิน, วงล้อ, คอลเลกชัน และลีดเดอร์บอร์ด ---

const SUPABASE_URL = 'https://ngdshyexremewbpnlrae.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_NcBG60jTTDqonaFiD1RwKw_etSq5A2o';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

window.supabaseClient = supabaseClient;

// Global Variables
window.currentUser = null;
window.playerName = '';
window.oldPlayerName = '';
window.userCoins = 0;
window.currentCardBack = null;

// DOM Elements Reference
const homePlayerName = document.getElementById('home-player-name');
const userBadge = document.getElementById('user-badge');
const userCoinsDisplay = document.getElementById('user-coins');
const loginModal = document.getElementById('login-modal');
const profileModal = document.getElementById('profile-modal');
const profileUserEmail = document.getElementById('profile-user-email');
const profileDisplayName = document.getElementById('profile-display-name');
const logoutActionBtn = document.getElementById('logout-action-btn');
const inGameLeaderboardModal = document.getElementById('in-game-leaderboard-modal');

async function checkUserSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session?.user) {
        window.currentUser = session.user;
        window.playerName = window.currentUser.user_metadata?.full_name || window.currentUser.email.split('@')[0];
        window.oldPlayerName = window.playerName;
        if (homePlayerName) {
            homePlayerName.innerText = window.playerName;
            homePlayerName.classList.add('user-rainbow-text');
        }
        
        if (userBadge) {
            userBadge.innerText = 'VIP';
            userBadge.className = 'user-badge badge-VIP';
        }

        await loadPlayerDataFromSupabase(window.currentUser.id);
        await applyEquippedItems();
    } else {
        window.currentUser = null;
        initGuestPlayer();
    }
}

async function applyEquippedItems() {
    try {
        if (!window.currentUser) return;
        const { data: equippedItems, error } = await supabaseClient
            .from('collections')
            .select('*')
            .eq('user_id', window.currentUser.id)
            .eq('is_equipped', true);

        if (error) return;

        if (equippedItems && equippedItems.length > 0) {
            equippedItems.forEach(item => {
                if (item.item_type === 'theme_home' && item.item_key) {
                    const homeVideo = document.querySelector('.home-video-bg') || document.querySelector('video');
                    if (homeVideo) {
                        homeVideo.src = `images/${item.item_key}`;
                        homeVideo.load();
                        homeVideo.play().catch(e => console.log("Auto-play error:", e));
                    }
                }
                if (item.item_type === 'theme_game' && item.item_key) {
                    const gameContainer = document.querySelector('.game-container') || document.querySelector('#game-screen') || document.body;
                    if (gameContainer) {
                        gameContainer.style.backgroundImage = `url('images/${item.item_key}')`;
                        gameContainer.style.backgroundSize = 'cover';
                        gameContainer.style.backgroundPosition = 'center';
                    }
                }
                if (item.item_type === 'card_back' && item.item_key) {
                    window.currentCardBack = `images/${item.item_key}`;
                }
            });
        }
    } catch (err) {
        console.error("Error in applyEquippedItems:", err);
    }
}

function initGuestPlayer() {
    let savedName = localStorage.getItem('vj_game_player_name');
    if (!savedName) savedName = 'ผู้เล่นทั่วไป';
    window.playerName = savedName;
    window.oldPlayerName = window.playerName;
    if (homePlayerName) {
        homePlayerName.innerText = window.playerName;
        homePlayerName.classList.remove('user-rainbow-text');
    }

    if (userBadge) {
        userBadge.innerText = 'Guest';
        userBadge.className = 'user-badge badge-guest';
    }

    let savedCoins = localStorage.getItem('vj_game_user_coins');
    window.userCoins = savedCoins ? parseInt(savedCoins, 10) : 0;
    if (userCoinsDisplay) userCoinsDisplay.innerText = window.userCoins;
}

async function loadPlayerDataFromSupabase(userId) {
    if (!userId) return;
    try {
        const { data, error } = await supabaseClient
            .from('player_data')
            .select('coins, username')
            .eq('id', userId)
            .maybeSingle();

        if (error) throw error;
        if (data) {
            if (data.username) {
                window.playerName = data.username;
                window.oldPlayerName = window.playerName;
                if (homePlayerName) homePlayerName.innerText = window.playerName;
            }
            window.userCoins = data.coins || 0;
            if (userCoinsDisplay) userCoinsDisplay.innerText = window.userCoins;
        }
    } catch (err) {
        console.log('No player record found:', err);
    }
}

// 👤 ฟังก์ชันจัดการ Modal โปรไฟล์
function handleProfileClick() {
    const profileUserEmail = document.getElementById('profile-user-email');
    const profileDisplayName = document.getElementById('profile-display-name');
    const logoutActionBtn = document.getElementById('logout-action-btn');
    const profileBox = document.querySelector('#profile-modal .cozy-modal-box');

    if (!profileBox) return;

    let nameInputGroup = document.getElementById('profile-name-input-group');
    if (!nameInputGroup && profileDisplayName) {
        const labelEl = profileBox.querySelector('label') || document.createElement('label');
        labelEl.innerText = 'ชื่อผู้แสดงในเกม:';
        labelEl.style.cssText = 'font-size: 0.85rem; font-weight: 700; color: #78350f; display: block; margin-bottom: 6px; text-align: left;';

        nameInputGroup = document.createElement('div');
        nameInputGroup.id = 'profile-name-input-group';
        nameInputGroup.style.cssText = 'display: flex; gap: 8px; align-items: center; margin-bottom: 15px;';

        profileDisplayName.style.cssText = 'flex: 1; padding: 9px 12px; border: 2px solid #fed7aa; border-radius: 12px; font-size: 0.9rem; outline: none; width: 100%;';

        const saveBtn = document.createElement('button');
        saveBtn.id = 'profile-save-name-btn';
        saveBtn.innerText = '💾 บันทึก';
        saveBtn.type = 'button';
        saveBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (typeof saveProfileChanges === 'function') {
                saveProfileChanges();
            }
        });
        saveBtn.style.cssText = 'background: linear-gradient(180deg, #f59e0b, #d97706); color: white; border: none; padding: 9px 14px; border-radius: 12px; font-size: 0.85rem; font-weight: 800; cursor: pointer; white-space: nowrap; box-shadow: 0 3px 8px rgba(217, 119, 6, 0.3);';

        const oldBigSaveBtn = profileBox.querySelector('button[onclick="saveProfileChanges()"]');
        if (oldBigSaveBtn) oldBigSaveBtn.remove();

        const parentOfInput = profileDisplayName.parentElement;
        if (parentOfInput && parentOfInput.classList.contains('cozy-input-group')) {
            parentOfInput.remove();
        }

        const nameWrapper = document.createElement('div');
        nameWrapper.style.cssText = 'text-align: left; margin-bottom: 12px;';
        nameWrapper.appendChild(labelEl);
        
        nameInputGroup.appendChild(profileDisplayName);
        nameInputGroup.appendChild(saveBtn);
        nameWrapper.appendChild(nameInputGroup);

        if (profileUserEmail) {
            profileUserEmail.after(nameWrapper);
        } else {
            profileBox.prepend(nameWrapper);
        }
    }

    let guestLoginSection = document.getElementById('profile-guest-login-section');
    if (!guestLoginSection) {
        guestLoginSection = document.createElement('div');
        guestLoginSection.id = 'profile-guest-login-section';
        guestLoginSection.style.cssText = 'margin-top: 15px; border-top: 2px dashed #fed7aa; padding-top: 15px; text-align: left;';
        
        guestLoginSection.innerHTML = `
            <p style="font-size: 0.85rem; font-weight: 700; color: #d97706; margin-bottom: 10px; text-align: center;">✨ ต้องการเข้าสู่ระบบ VIP?</p>
            <button id="profile-google-login-btn" type="button" class="login-google-btn" style="margin-bottom: 10px; padding: 8px 12px; font-size: 0.85rem; width: 100%;">
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="16" alt="Google">
                เข้าสู่ระบบด้วย Google
            </button>
            <div class="divider-text" style="margin: 10px 0;"><span>หรือใช้อีเมล</span></div>
            <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px;">
                <input type="email" id="profile-login-email" class="cozy-input" placeholder="อีเมลของคุณ" style="padding: 8px 12px; font-size: 0.85rem; border: 2px solid #fed7aa; border-radius: 10px;">
                <input type="password" id="profile-login-password" class="cozy-input" placeholder="รหัสผ่าน" style="padding: 8px 12px; font-size: 0.85rem; border: 2px solid #fed7aa; border-radius: 10px;">
            </div>
            <button id="profile-email-login-btn" type="button" class="cozy-submit-btn" style="padding: 9px; font-size: 0.85rem; width: 100%;">เข้าสู่ระบบ / สมัครสมาชิก</button>
        `;
        
        profileBox.appendChild(guestLoginSection);

        const googleBtn = document.getElementById('profile-google-login-btn');
        if (googleBtn) {
            googleBtn.addEventListener('click', async function(e) {
                e.preventDefault();
                if (typeof loginWithGoogle === 'function') await loginWithGoogle();
            });
        }

        const emailBtn = document.getElementById('profile-email-login-btn');
        if (emailBtn) {
            emailBtn.addEventListener('click', async function(e) {
                e.preventDefault();
                const emailInput = document.getElementById('profile-login-email');
                const passwordInput = document.getElementById('profile-login-password');
                if (!emailInput || !passwordInput) return;

                const email = emailInput.value.trim();
                const password = passwordInput.value;
                if (!email || !password) { alert('กรุณากรอกอีเมลและรหัสผ่าน'); return; }

                const { error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
                if (error) {
                    const { error: signUpError } = await window.supabaseClient.auth.signUp({ email, password });
                    if (signUpError) {
                        alert('ไม่สามารถเข้าสู่ระบบหรือสมัครสมาชิกได้: ' + signUpError.message);
                    } else {
                        alert('สมัครสมาชิกเรียบร้อยแล้ว! กำลังเข้าสู่ระบบ...');
                        location.reload();
                    }
                } else {
                    if (typeof closeProfileModal === 'function') closeProfileModal();
                    if (typeof checkUserSession === 'function') checkUserSession();
                    location.reload();
                }
            });
        }
    }

    if (window.currentUser) {
        if (profileUserEmail) profileUserEmail.innerText = `บัญชี: ${window.currentUser.email}`;
        if (profileDisplayName) profileDisplayName.value = window.playerName;
        if (logoutActionBtn) logoutActionBtn.style.display = 'block';
        if (guestLoginSection) guestLoginSection.style.display = 'none';
    } else {
        if (profileUserEmail) profileUserEmail.innerText = `สถานะ: ผู้เล่นทั่วไป (Guest)`;
        if (profileDisplayName) profileDisplayName.value = window.playerName;
        if (logoutActionBtn) logoutActionBtn.style.display = 'none';
        if (guestLoginSection) guestLoginSection.style.display = 'block';
    }

    if (profileModal) profileModal.classList.add('active');
}

function openLoginModal(customSubtitle) {
    const subEl = document.getElementById('login-modal-subtitle');
    if (subEl) subEl.innerText = customSubtitle || 'เพื่อบันทึกเหรียญและเล่นเกมต่อสะสมรางวัล';
    if (loginModal) loginModal.classList.add('active');
}

function closeLoginModal() { if (loginModal) loginModal.classList.remove('active'); }
function closeProfileModal() { if (profileModal) profileModal.classList.remove('active'); }

async function openInGameLeaderboard() {
    if (inGameLeaderboardModal) {
        inGameLeaderboardModal.classList.add('active');
        await fetchInGameLeaderboard();
    }
}

function closeInGameLeaderboard() {
    if (inGameLeaderboardModal) inGameLeaderboardModal.classList.remove('active');
}

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
            .limit(200);

        if (error) throw error;

        if (data && data.length > 0) {
            const bestUserScores = {};
            data.forEach(row => {
                const name = row.player_name || 'ผู้เล่น';
                if (!bestUserScores[name]) {
                    bestUserScores[name] = row;
                } else {
                    if (row.max_level > bestUserScores[name].max_level || 
                        (row.max_level === bestUserScores[name].max_level && row.total_clicks < bestUserScores[name].total_clicks) ||
                        (row.max_level === bestUserScores[name].max_level && row.total_clicks === bestUserScores[name].total_clicks && row.total_time < bestUserScores[name].total_time)) {
                        bestUserScores[name] = row;
                    }
                }
            });

            const uniqueSortedData = Object.values(bestUserScores).sort((a, b) => {
                if (b.max_level !== a.max_level) return b.max_level - a.max_level;
                if (a.total_clicks !== b.total_clicks) return a.total_clicks - b.total_clicks;
                return a.total_time - b.total_time;
            });

            renderPodiumData([uniqueSortedData[0] || null, uniqueSortedData[1] || null, uniqueSortedData[2] || null], 'inGamePodiumContainer');
            renderTableData(uniqueSortedData.slice(3), tbody);
        } else {
            document.getElementById('inGamePodiumContainer').innerHTML = '';
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 15px; color: #78350f;">ยังไม่มีข้อมูลคะแนน</td></tr>`;
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #ef4444; padding: 15px;">เกิดข้อผิดพลาดในการโหลด</td></tr>`;
    }
}

function renderPodiumData(topThreeUsers, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const podiumOrder = [
        { rank: 2, data: topThreeUsers[1] },
        { rank: 1, data: topThreeUsers[0] },
        { rank: 3, data: topThreeUsers[2] }
    ];

    let html = '';
    podiumOrder.forEach(item => {
        const user = item.data;
        if (user) {
            const isVip = user.user_type === 'VIP';
            const nameClass = isVip ? 'p-name user-rainbow-text' : 'p-name';
            html += `
                <div class="podium-slot rank-${item.rank}">
                    <div class="podium-user-info">
                        <span class="${nameClass}">${user.player_name || 'ผู้เล่น'}</span>
                        <span class="p-sub">Lvl ${user.max_level || 1}</span>
                        <span class="p-sub" style="color: #475569;">🖱️ ${user.total_clicks || 0} คลิก</span>
                        <span class="p-sub" style="color: #059669;">⏱️ ${formatTime(user.total_time)}</span>
                    </div>
                    <div class="podium-block">${item.rank === 1 ? '👑 ' : ''}${item.rank}</div>
                </div>
            `;
        } else {
            html += `
                <div class="podium-slot rank-${item.rank}">
                    <div class="podium-user-info"><span class="p-name">-</span><span class="p-sub">-</span></div>
                    <div class="podium-block">${item.rank}</div>
                </div>
            `;
        }
    });
    container.innerHTML = html;
}

function formatTime(totalSec) {
    if (!totalSec && totalSec !== 0) return '00:00';
    const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
    const s = (totalSec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

function renderTableData(users, tbodyElement) {
    if (!users || users.length === 0) {
        tbodyElement.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 15px; color: #78350f;">ไม่มีผู้เล่นในอันดับถัดไป</td></tr>`;
        return;
    }
    let html = '';
    users.forEach((user, index) => {
        const actualRank = index + 4;
        const isVip = user.user_type === 'VIP';
        const nameClass = isVip ? 'col-name user-rainbow-text' : 'col-name';
        html += `
            <tr>
                <td class="col-rank">${actualRank}</td>
                <td class="${nameClass}" style="white-space: nowrap;">${user.player_name || 'ผู้เล่น'}</td>
                <td class="col-lvl">Lvl ${user.max_level || 1}</td>
                <td class="col-clicks">${user.total_clicks || 0}</td>
                <td class="col-time">${formatTime(user.total_time)}</td>
            </tr>
        `;
    });
    tbodyElement.innerHTML = html;
}

// 🛡️ ระบบตรวจสอบสิทธิ์
function handleMemberFeature(featureName) {
    if (!window.currentUser) {
        openLoginModal(`กรุณาล็อกอินเพื่อใช้งานระบบ "${featureName}" และสะสมเหรียญรางวัลค่ะ ✨`);
        return;
    }
    
    if (featureName === 'วงล้อโชคดี' || featureName === 'lucky_wheel') {
        openLuckyWheelModal();
    } else if (featureName === 'คอลเลกชัน') {
        openCollectionModal();
    } else if (featureName === 'ร้านค้า') {
        openShopModal();
    } else if (featureName === 'กล่องจดหมาย') {
        openMailboxModal();
    } else if (featureName === 'เช็คอิน') {
        openDailyRewardModal();
    }
}

function switchCollectionTab(tabName) {
    document.querySelectorAll('.col-tab-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.col-tab-btn').forEach(btn => btn.classList.remove('active'));

    if (tabName === 'cards') {
        document.getElementById('tab-content-cards').style.display = 'block';
        if (event && event.currentTarget) event.currentTarget.classList.add('active');
        fetchUserCollectionData('cards');
    } else if (tabName === 'shirts') {
        document.getElementById('tab-content-shirts').style.display = 'block';
        if (event && event.currentTarget) event.currentTarget.classList.add('active');
        fetchUserCollectionData('shirts');
    } else if (tabName === 'backgrounds') {
        document.getElementById('tab-content-backgrounds').style.display = 'block';
        if (event && event.currentTarget) event.currentTarget.classList.add('active');
        fetchUserCollectionData('backgrounds');
    }
}

function openCollectionModal() {
    if (!window.currentUser) {
        openLoginModal('กรุณาล็อกอินเพื่อดูคอลเลกชันส่วนตัว');
        return;
    }
    document.getElementById('collection-modal').classList.add('active');
    fetchUserCollectionData('cards');
}

function closeCollectionModal() {
    document.getElementById('collection-modal').classList.remove('active');
}

async function fetchUserCollectionData(category) {
    let containerId = 'collection-cards-list';
    if (category === 'shirts') containerId = 'collection-shirts-list';
    if (category === 'backgrounds') containerId = 'collection-backgrounds-list';

    const container = document.getElementById(containerId);
    if (!container) return;

    if (!window.currentUser) {
        container.innerHTML = `<p style="grid-column: span 3; text-align: center; color: #78350f; padding: 20px;">กรุณาล็อกอินเพื่อดูข้อมูล</p>`;
        return;
    }

    container.innerHTML = `<p style="grid-column: span 3; text-align: center; color: #78350f; padding: 20px;">กำลังโหลดข้อมูล...</p>`;

    try {
        const targetUserId = window.currentUser.id;
        let dbCategory = category;
        if (category === 'cards') dbCategory = 'card_back';
        else if (category === 'shirts') dbCategory = 'theme_game';
        else if (category === 'backgrounds') dbCategory = 'theme_home';
        
        const { data, error } = await supabaseClient.from('collections').select('*').eq('user_id', targetUserId).eq('item_type', dbCategory);

        if (error || !data || data.length === 0) {
            container.innerHTML = `<p style="grid-column: span 3; text-align: center; color: #78350f; padding: 20px;">ยังไม่มีไอเทมในหมวดหมู่นี้</p>`;
            return;
        }

        renderCollectionItems(data, container, dbCategory);
    } catch (err) {
        container.innerHTML = `<p style="grid-column: span 3; text-align: center; color: #ef4444; padding: 20px;">เกิดข้อผิดพลาดในการโหลด</p>`;
    }
}

function renderCollectionItems(items, containerElement, itemType) {
    containerElement.innerHTML = '';
    items.forEach(item => {
        const isUnlocked = item.is_unlocked;
        const isEquipped = item.is_equipped;
        const itemKey = item.item_key || '';

        const cardDiv = document.createElement('div');
        cardDiv.className = 'collection-item-card';
        // ปรับ CSS Style เพิ่มเติมเพื่อให้ป้ายสถานะและชื่อไม่ทับซ้อนกัน จัดเลย์เอาต์ให้สวยงาม
        cardDiv.style.cssText = `background: #fff; border: 2px solid ${isEquipped ? '#3b82f6' : '#fed7aa'}; border-radius: 14px; padding: 12px; text-align: center; display: flex; flex-direction: column; justify-content: space-between; gap: 8px; min-height: 180px; box-shadow: 0 2px 6px rgba(0,0,0,0.04);`;

        cardDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                <span style="font-size: 0.65rem; font-weight: 700; padding: 3px 8px; background: ${isUnlocked ? '#dcfce7' : '#f1f5f9'}; color: ${isUnlocked ? '#15803d' : '#64748b'}; border-radius: 8px;">${isUnlocked ? 'ปลดล็อกแล้ว' : 'ล็อก'}</span>
                <span style="font-size: 0.7rem; color: ${isEquipped ? '#3b82f6' : '#94a3b8'}; font-weight: bold; background: ${isEquipped ? '#eff6ff' : 'transparent'}; padding: 2px 6px; border-radius: 6px;">${isEquipped ? '✓ ใช้งานอยู่' : 'มีอยู่'}</span>
            </div>
            <div style="width: 100%; height: 90px; display: flex; justify-content: center; align-items: center; overflow: hidden; border-radius: 8px; background: #f8fafc;">
                ${itemKey.endsWith('.mp4') ? `<video src="images/${itemKey}" style="width: 100%; height: 100%; object-fit: cover;" controls></video>` : `<img src="images/${itemKey}" alt="${itemKey}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='images/vj1.png'">`}
            </div>
            <div style="font-size: 0.75rem; font-weight: 800; color: #5c3d2e; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; width: 100%; padding: 2px 0;" title="${item.name || itemKey}">${item.name || itemKey}</div>
            <button onclick="equipCollectionItem('${item.id}', '${itemType}')" style="background: ${isEquipped ? '#94a3b8' : (isUnlocked ? '#f59e0b' : '#cbd5e1')}; color: white; border: none; padding: 7px; border-radius: 8px; font-size: 0.75rem; font-weight: bold; cursor: ${isUnlocked ? 'pointer' : 'not-allowed'}; width: 100%;" ${!isUnlocked ? 'disabled' : ''}>${isEquipped ? 'สวมใส่แล้ว' : 'กดใช้งาน'}</button>
        `;
        containerElement.appendChild(cardDiv);
    });
}

// 🔧 ปรับตรรกะ: กดใช้งานไอเทมชิ้นใหม่ ชิ้นเก่าต้องหลุดออก และแสดง "ใช้งานอยู่" ได้แค่ 1 ชิ้นต่อหมวดหมู่
async function equipCollectionItem(itemId, itemType) {
    try {
        if (!window.currentUser) return;

        // 1. เคลียร์สถานะ is_equipped ของไอเทมทุกชิ้นในหมวดหมู่เดียวกันของ User นี้ให้เป็น false ทั้งหมดก่อน
        await supabaseClient
            .from('collections')
            .update({ is_equipped: false })
            .eq('user_id', window.currentUser.id)
            .eq('item_type', itemType);

        // 2. อัปเดตไอเทมที่ถูกเลือกใหม่ให้เป็น is_equipped: true
        await supabaseClient
            .from('collections')
            .update({ is_equipped: true })
            .eq('id', itemId);

        await applyEquippedItems();

        // โหลดข้อมูลหน้าคอลเลกชันกลับมาแสดงผลใหม่ตามแท็บปัจจุบัน
        let activeCategory = 'cards';
        if (itemType === 'theme_game') activeCategory = 'shirts';
        else if (itemType === 'theme_home') activeCategory = 'backgrounds';

        fetchUserCollectionData(activeCategory);
    } catch (err) {
        console.error("Error in equipCollectionItem:", err);
    }
}

// 📭 ระบบกล่องจดหมายและเช็คอิน
let audioCtx = null;
let hasPlayedSound = false;

function playNotificationSound() {
    try {
        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) audioCtx = new AudioContext();
        }
        if (!audioCtx) return;
        if (audioCtx.state === 'suspended') audioCtx.resume();

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
    } catch (e) {
        console.log('Audio error:', e);
    }
}

async function checkUnreadMails() {
    if (!supabaseClient || !window.currentUser) return;
    try {
        const { data, error } = await supabaseClient
            .from('user_mails')
            .select('is_read')
            .eq('user_id', window.currentUser.id)
            .eq('is_read', false);
        if (error) throw error;
        const mailboxBtn = document.getElementById('mailbox-btn');
        if (data && data.length > 0) {
            if (mailboxBtn) mailboxBtn.classList.add('mailbox-shaking');
            if (!hasPlayedSound) { playNotificationSound(); hasPlayedSound = true; }
        } else {
            if (mailboxBtn) mailboxBtn.classList.remove('mailbox-shaking');
            hasPlayedSound = false;
        }
    } catch (err) {
        console.error('Error checking unread mails:', err);
    }
}

async function markMailsAsRead() {
    if (!supabaseClient || !window.currentUser) return;
    try {
        await supabaseClient.from('user_mails').update({ is_read: true }).eq('user_id', window.currentUser.id).eq('is_read', false);
        const mailboxBtn = document.getElementById('mailbox-btn');
        if (mailboxBtn) mailboxBtn.classList.remove('mailbox-shaking');
        hasPlayedSound = false;
    } catch (err) {
        console.error('Error marking mails as read:', err);
    }
}

window.openMailboxModal = function() {
    if (!window.currentUser) {
        openLoginModal('กรุณาล็อกอินเพื่อเปิดกล่องจดหมาย');
        return;
    }
    const modal = document.getElementById('mailbox-modal');
    if (modal) {
        modal.classList.add('active');
        if (typeof window.loadUserMails === 'function') window.loadUserMails();
        markMailsAsRead();
    }
};

window.closeMailboxModal = function() {
    const modal = document.getElementById('mailbox-modal');
    if (modal) {
        modal.classList.remove('active');
        checkUnreadMails();
    }
};

// 🔧 ปรับแก้: เรียงลำดับจดหมายให้ฉบับล่าสุด (Newest) ขึ้นมาแสดงอยู่ด้านบนสุดเสมอ
async function loadUserMails() {
    if (!window.currentUser) return;
    try {
        const { data: userMails, error: userMailsError } = await supabaseClient
        .from('user_mails')
        .select('*')
        .eq('user_id', window.currentUser.id)
        .order('created_at', { ascending: false }); // เรียงจากใหม่ไปเก่า จดหมายล่าสุดอยู่บนสุด
        
        if (userMailsError) throw userMailsError;
        
        const { data: mailSystems, error: mailSystemError } = await supabaseClient.from('mail_system').select('*');
        if (mailSystemError) throw mailSystemError;

        const mailMap = {};
        if (mailSystems) mailSystems.forEach(m => { mailMap[m.id] = m; });

        let html = '';
        if (userMails && userMails.length > 0) {
            userMails.forEach((item) => {
                const mailId = item.mail_id || item.mail_system_id;
                const mailInfo = mailMap[mailId] || { title: 'ไม่มีหัวข้อ', content: 'ไม่มีเนื้อหา', reward_coins: 0, reward_items: [] };
                
                const isClaimed = item.is_claimed || false;
                
                let rewardDisplayHtml = '';
                if (mailInfo.reward_coins && mailInfo.reward_coins > 0) {
                    rewardDisplayHtml += `<span style="background: #fef3c7; color: #d97706; padding: 2px 8px; border-radius: 6px; font-size: 12px; font-weight: bold; margin-right: 5px;">🪙 ${mailInfo.reward_coins} Coins</span>`;
                }
                if (mailInfo.reward_items && Array.isArray(mailInfo.reward_items) && mailInfo.reward_items.length > 0) {
                    mailInfo.reward_items.forEach(ri => {
                        rewardDisplayHtml += `<span style="background: #eef2ff; color: #4f46e5; padding: 2px 8px; border-radius: 6px; font-size: 12px; font-weight: bold; margin-right: 5px;">🎁 ${ri.item_key || 'Item'} (${ri.amount || 1})</span>`;
                    });
                }

                html += `
                    <div class="mail-item" style="background: #fff; padding: 12px; margin-bottom: 10px; border-radius: 8px; border: 1px solid #ddd; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                        <div style="font-weight: bold; font-size: 14px; color: #333;">${mailInfo.title}</div>
                        <div style="font-size: 12px; color: #666; margin-top: 4px;">${mailInfo.content}</div>
                        ${rewardDisplayHtml ? `<div style="margin-top: 6px;">${rewardDisplayHtml}</div>` : ''}
                        <div style="margin-top: 8px; display: flex; justify-content: flex-end; gap: 8px;">
                            <button onclick="claimMailReward('${item.id}')" style="background: ${isClaimed ? '#ccc' : '#4CAF50'}; color: #fff; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;" ${isClaimed ? 'disabled' : ''}>${isClaimed ? 'รับแล้ว' : 'รับของรางวัล'}</button>
                            <button onclick="deleteUserMail('${item.id}', ${isClaimed})" style="background: #ef4444; color: #fff; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">ลบ</button>
                        </div>
                    </div>
                `;
            });
        } else {
            html = '<div style="text-align: center; color: #666; padding: 20px;">ไม่มีข้อความจดหมาย</div>';
        }
        const mailboxList = document.getElementById('mailbox-list');
        if (mailboxList) mailboxList.innerHTML = html;
    } catch (err) {
        console.error('Error loading mails:', err);
    }
}

async function claimMailReward(userMailId) {
    if (!window.currentUser) {
        alert('กรุณาเข้าสู่ระบบก่อนกดรับรางวัล');
        return;
    }

    const currentUserId = window.currentUser.id;

    try {
        const { data: userMailData, error: userMailError } = await supabaseClient
            .from('user_mails')
            .select('*')
            .eq('id', userMailId)
            .single();

        if (userMailError || !userMailData) {
            alert('ไม่พบข้อมูลจดหมายนี้');
            return;
        }

        if (userMailData.is_claimed) {
            alert('คุณได้กดรับรางวัลจากจดหมายฉบับนี้ไปแล้ว');
            return;
        }

        const mailId = userMailData.mail_id || userMailData.mail_system_id;
        const { data: mailInfo, error: mailInfoErr } = await supabaseClient
            .from('mail_system')
            .select('*')
            .eq('id', mailId)
            .single();

        if (!mailInfoErr && mailInfo) {
            if (mailInfo.reward_coins && mailInfo.reward_coins > 0) {
                await addCoins(mailInfo.reward_coins);
            }

            if (mailInfo.reward_items && Array.isArray(mailInfo.reward_items) && mailInfo.reward_items.length > 0) {
                for (const reward of mailInfo.reward_items) {
                    let numericItemId = parseInt(reward.item_id || reward.id || 1, 10);
                    let itemKeyStr = reward.item_key || '';
                    let itemTypeStr = reward.item_type || 'theme_home';
                    let itemNameStr = reward.name || itemKeyStr;
                    let itemAmount = reward.amount || 1;

                    const { data: existingInv } = await supabaseClient
                        .from('user_inventory')
                        .select('id, amount')
                        .eq('user_id', currentUserId)
                        .eq('item_id', numericItemId)
                        .maybeSingle();

                    if (existingInv) {
                        const newAmount = (existingInv.amount || 1) + itemAmount;
                        await supabaseClient
                            .from('user_inventory')
                            .update({ amount: newAmount })
                            .eq('id', existingInv.id);
                    } else {
                        await supabaseClient
                            .from('user_inventory')
                            .insert({
                                user_id: currentUserId,
                                item_id: numericItemId,
                                amount: itemAmount,
                                status: 'available'
                            });
                    }

                    if (itemKeyStr) {
                        const { data: existingCol } = await supabaseClient
                            .from('collections')
                            .select('id')
                            .eq('user_id', currentUserId)
                            .eq('item_key', itemKeyStr)
                            .maybeSingle();

                        if (existingCol) {
                            await supabaseClient
                                .from('collections')
                                .update({ is_unlocked: true })
                                .eq('id', existingCol.id);
                        } else {
                            await supabaseClient
                                .from('collections')
                                .insert({
                                    user_id: currentUserId,
                                    item_type: itemTypeStr,
                                    item_key: itemKeyStr,
                                    name: itemNameStr,
                                    is_unlocked: true,
                                    is_equipped: false
                                });
                        }
                    }
                }
            }
        }

        const { error: updateMailError } = await supabaseClient
            .from('user_mails')
            .update({ is_claimed: true })
            .eq('id', userMailId);

        if (updateMailError) throw updateMailError;

        if (typeof confetti === 'function') {
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        }

        alert('🎉 รับของรางวัลและเพิ่มเข้าคอลเลกชันสำเร็จ!');
        loadUserMails();

    } catch (err) {
        console.error('Error claiming reward:', err);
        alert('เกิดข้อผิดพลาดในการรับของรางวัล กรุณาลองใหม่อีกครั้ง');
    }
}

async function deleteUserMail(userMailId, isClaimed) {
    if (!isClaimed) {
        const confirmDelete = confirm('⚠️ จดหมายฉบับนี้ยังไม่ได้กดรับของรางวัล คุณยังต้องการลบจดหมายนี้หรือไม่?');
        if (!confirmDelete) return;
    } else {
        const confirmDelete = confirm('คุณต้องการลบจดหมายนี้ออกจากกล่องข้อความใช่หรือไม่?');
        if (!confirmDelete) return;
    }

    try {
        const { error } = await supabaseClient
            .from('user_mails')
            .delete()
            .eq('id', userMailId);

        if (error) throw error;

        alert('🗑️ ลบจดหมายเรียบร้อยแล้ว');
        loadUserMails();
    } catch (err) {
        console.error('Error deleting mail:', err);
        alert('ไม่สามารถลบจดหมายได้');
    }
}

window.loadUserMails = loadUserMails;
window.claimMailReward = claimMailReward;
window.deleteUserMail = deleteUserMail;

// 🎁 Daily Reward
function getTodayLocalDate() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

window.openDailyRewardModal = function() {
    if (!window.currentUser) {
        openLoginModal('กรุณาเข้าสู่ระบบเพื่อเช็คอินรับรางวัลประจำวัน');
        return;
    }
    const modal = document.getElementById('daily-reward-modal');
    if (modal) {
        modal.classList.add('active');
        window.loadDailyRewardStatus();
    }
};

window.closeDailyRewardModal = function() {
    const modal = document.getElementById('daily-reward-modal');
    if (modal) modal.classList.remove('active');
};

window.loadDailyRewardStatus = async function() {
  if (!window.currentUser) return;

  const grid = document.getElementById('daily-reward-grid');
  const claimBtn = document.getElementById('claim-reward-btn');
  const statusText = document.getElementById('claim-status-text');
  if (!grid) return;

  grid.innerHTML = `<p style="grid-column: span 4; text-align: center; color: #78350f;">กำลังโหลดข้อมูล...</p>`;

  const todayStr = getTodayLocalDate();

  try {
    const { data, error } = await supabaseClient
      .from('user_daily_rewards')
      .select('day_number, claimed_date, reward_coins, reward_item')
      .eq('user_id', window.currentUser.id)
      .order('created_at', { ascending: false });

    if (error) {
      grid.innerHTML = `<p style="grid-column: span 4; text-align: center; color: red;">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>`;
      return;
    }

    const claimedDays = data ? data.map(item => item.day_number) : [];
    const todayAlreadyClaimed = data ? data.some(item => item.claimed_date === todayStr) : false;

    const currentStreak = claimedDays.length + 1;
    let html = '';

    for (let i = 1; i <= 7; i++) {
      const isClaimed = claimedDays.includes(i);
      const isToday = (i === currentStreak) && !todayAlreadyClaimed;

      let bgStyle = "background: #fef3c7; border: 2px solid #d97706;";
      let statusBadge = `<span style="font-size: 12px; color: #92400e;">ยังไม่ถึง</span>`;
      let rewardText = "";

      if (i === 1) rewardText = "+20 เหรียญ";
      else if (i === 2) rewardText = "+40 เหรียญ";
      else if (i === 3) rewardText = "+60 เหรียญ";
      else if (i === 4) rewardText = "🔍<br>แว่นขยาย";
      else if (i === 5) rewardText = "+100 เหรียญ";
      else if (i === 6) rewardText = "+100 เหรียญ";
      else if (i === 7) rewardText = "+100 เหรียญ";

      if (isClaimed) {
        bgStyle = "background: #d1fae5; border: 2px solid #059669; opacity: 0.8;";
        statusBadge = `<span style="font-size: 12px; color: #065f46; font-weight: bold;">✓ รับแล้ว</span>`;
      } else if (isToday) {
        bgStyle = "background: #fee2e2; border: 2px solid #dc2626; transform: scale(1.02);";
        statusBadge = `<span style="font-size: 12px; color: #991b1b; font-weight: bold;">📍 วันนี้</span>`;
      }

      html += `
        <div style="${bgStyle} border-radius: 12px; padding: 10px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.05); display: flex; flex-direction: column; justify-content: space-between; align-items: center;">
          <div style="font-size: 13px; font-weight: bold; color: #78350f;">Day ${i}</div>
          <div style="font-size: 14px; margin: 4px 0; font-weight: bold; color: #1f2937;">${rewardText}</div>
          ${statusBadge}
        </div>
      `;
    }

    grid.innerHTML = html;

    if (todayAlreadyClaimed || currentStreak > 7) {
        if (claimBtn) claimBtn.style.display = 'none';
        if (statusText) statusText.innerText = 'คุณได้รับรางวัลประจำวันแล้ววันนี้';
    } else {
        if (claimBtn) {
            claimBtn.style.display = 'block';
            claimBtn.innerText = 'รับรางวัล';
        }
        if (statusText) statusText.innerText = `เช็คชื่อต่อเนื่องเพื่อรับรางวัลใหญ่! (Day ${currentStreak})`;
    }
  } catch (err) {
    console.error(err);
    grid.innerHTML = `<p style="grid-column: span 4; text-align: center; color: red;">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>`;
  }
}

window.claimDailyReward = async function() {
  if (!window.currentUser) {
    alert('กรุณาเข้าสู่ระบบก่อนรับรางวัล');
    return;
  }

  const user_id = window.currentUser.id;
  const todayStr = getTodayLocalDate();

  try {
    const { data: history, error: historyError } = await supabaseClient
      .from('user_daily_rewards')
      .select('day_number, claimed_date')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (historyError) {
      alert('เกิดข้อผิดพลาดในการตรวจสอบข้อมูลรางวัล');
      return;
    }

    let nextDay = 1;
    if (history && history.length > 0) {
      const lastRecord = history[0];
      if (lastRecord.claimed_date === todayStr) {
        alert('คุณได้ 🎁 รับรางวัลประจำวันนี้ไปเรียบร้อยแล้ว กลับมาใหม่พรุ่งนี้!');
        return;
      }
      nextDay = (lastRecord.day_number % 7) + 1;
    }

    let rewardCoins = 0;
    let rewardItem = null;

    switch (nextDay) {
      case 1: rewardCoins = 20; break;
      case 2: rewardCoins = 40; break;
      case 3: rewardCoins = 60; break;
      case 4: rewardItem = '🔍'; break;
      case 5: rewardCoins = 100; break;
      case 6: rewardCoins = 100; break;
      case 7: rewardCoins = 100; break;
    }

    const { error: insertError } = await supabaseClient
      .from('user_daily_rewards')
      .insert({
        user_id: user_id,
        day_number: nextDay,
        claimed_date: todayStr,
        reward_coins: rewardCoins,
        reward_item: rewardItem
      });

    if (insertError) {
      alert('เกิดข้อผิดพลาดในการบันทึกค่า');
      return;
    }

    if (rewardItem) {
      await supabaseClient
        .from('user_inventory')
        .insert({
          user_id: user_id,
          item_name: rewardItem,
          acquired_date: todayStr,
          status: 'available'
        });
    }

    if (rewardCoins > 0) {
      await addCoins(rewardCoins);
    }

    if (typeof confetti === 'function') {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }

    alert(`🎉 ยินดีด้วย! คุณได้รับรางวัล Day ${nextDay} เรียบร้อยแล้ว!`);
    if (typeof window.loadDailyRewardStatus === 'function') {
      await window.loadDailyRewardStatus();
    }
  } catch (err) {
    console.error(err);
    alert('เกิดข้อผิดพลาดในการรับรางวัล');
  }
};

async function saveProfileChanges() {
    const newName = profileDisplayName.value.trim();
    if (!newName) { alert('กรุณากรอกชื่อผู้เล่น'); return; }

    window.playerName = newName;
    if (homePlayerName) homePlayerName.innerText = window.playerName;

    if (window.currentUser) {
        await supabaseClient.auth.updateUser({ data: { full_name: newName } });
        await supabaseClient.from('player_data').upsert({ user_id: window.currentUser.id, username: newName, coins: window.userCoins, updated_at: new Date() });
        await supabaseClient.from('vj_game_leaderboard').update({ player_name: newName }).eq('user_id', window.currentUser.id);
        alert('อัปเดตชื่อผู้เล่นบนระบบเรียบร้อยแล้ว!');
    } else {
        localStorage.setItem('vj_game_player_name', newName);
        alert('เปลี่ยนชื่อเรียบร้อยแล้ว!');
    }
    window.oldPlayerName = newName;
    closeProfileModal();
}

async function loginWithGoogle() {
    const { error } = await supabaseClient.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.href } });
    if (error) alert('เกิดข้อผิดพลาดในการล็อกอินด้วย Google: ' + error.message);
}

async function loginWithEmail() {
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    if (!emailInput || !passwordInput) return;

    const email = emailInput.value;
    const password = passwordInput.value;
    if (!email || !password) { alert('กรุณากรอกอีเมลและรหัสผ่าน'); return; }

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
    window.userCoins += amount;
    if (userCoinsDisplay) userCoinsDisplay.innerText = window.userCoins;
    if (window.currentUser) {
        await supabaseClient.from('player_data').upsert({ id: window.currentUser.id, username: window.playerName, coins: window.userCoins, updated_at: new Date() });
        await supabaseClient.from('profiles').update({ coins: window.userCoins }).eq('id', window.currentUser.id);
    } else {
        localStorage.setItem('vj_game_user_coins', window.userCoins);
    }
}
window.addCoins = addCoins;

const wheelSectors = [
    { label: 'แย่จัง😭', value: 0, weight: 17.5, color: '#fef3c7' },
    { label: '150', value: 150, weight: 15,   color: '#fed7aa' },
    { label: '100', value: 100, weight: 17.5, color: '#fef3c7' },
    { label: '200', value: 200, weight: 9,    color: '#fbcfe8' },
    { label: '50', value: 50, weight: 17.5, color: '#fef3c7' },
    { label: '500', value: 500, weight: 5,    color: '#c7d2fe' },
    { label: '100', value: 100, weight: 17.5, color: '#fef3c7' },
    { label: '1000', value: 1000, weight: 1,  color: '#fef08a' }
];

let currentWheelAngle = 0;
let isSpinning = false;

function drawWheel() {
    const canvas = document.getElementById('wheelCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const numSectors = wheelSectors.length;
    const arc = (2 * Math.PI) / numSectors;
    const radius = canvas.width / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < numSectors; i++) {
        const angle = currentWheelAngle + i * arc;
        ctx.beginPath();
        ctx.fillStyle = wheelSectors[i].color;
        ctx.moveTo(radius, radius);
        ctx.arc(radius, radius, radius, angle, angle + arc);
        ctx.lineTo(radius, radius);
        ctx.fill();
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.save();
        ctx.translate(radius, radius);
        ctx.rotate(angle + arc / 2);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#78350f';
        ctx.font = 'bold 16px Arial';
        ctx.fillText(wheelSectors[i].label + ' 🪙', radius - 15, 6);
        ctx.restore();
    }
}

async function checkFreeSpinEligibility() {
    const todayStr = getTodayLocalDate();
    const lastFreeSpin = localStorage.getItem(`vj_free_spin_${window.currentUser ? window.currentUser.id : 'guest'}`);
    return lastFreeSpin !== todayStr;
}

window.openLuckyWheelModal = async function() {
    if (!window.currentUser) {
        openLoginModal('กรุณาล็อกอิน เพื่อร่วมหมุนวงล้อโชคดีและสะสมเหรียญรางวัลค่ะ ✨');
        return;
    }
    const modal = document.getElementById('lucky-wheel-modal');
    if (modal) {
        modal.style.display = 'flex';
        drawWheel();
        const isFree = await checkFreeSpinEligibility();
        const statusText = document.getElementById('wheel-status-text');
        const spinBtn = document.getElementById('spin-wheel-btn');
        if (isFree) {
            if (statusText) statusText.innerText = '🎁 วันนี้หมุนฟรี 1 ครั้ง!';
            if (spinBtn) spinBtn.innerText = 'หมุนฟรีเลย!';
        } else {
            if (statusText) statusText.innerText = '🪙 หมุนครั้งถัดไปใช้ 100 เหรียญ (มี ' + window.userCoins + ' เหรียญ)';
            if (spinBtn) spinBtn.innerText = 'หมุน (ใช้ 100 เหรียญ)';
        }
    }
};

window.closeLuckyWheelModal = function() {
    if (isSpinning) return;
    const modal = document.getElementById('lucky-wheel-modal');
    if (modal) modal.style.display = 'none';
};

function getRandomWeightedIndex() {
    const totalWeight = wheelSectors.reduce((acc, sec) => acc + sec.weight, 0);
    let random = Math.random() * totalWeight;
    for (let i = 0; i < wheelSectors.length; i++) {
        if (random < wheelSectors[i].weight) return i;
        random -= wheelSectors[i].weight;
    }
    return 0;
}

window.handleSpinWheel = async function() {
    if (isSpinning) return;
    const isFree = await checkFreeSpinEligibility();
    if (!isFree) {
        if (window.userCoins < 100) { alert('เหรียญของคุณไม่พอสำหรับหมุนวงล้อ (ต้องการ 100 เหรียญ)'); return; }
        await addCoins(-100);
    }

    isSpinning = true;
    const spinBtn = document.getElementById('spin-wheel-btn');
    if (spinBtn) spinBtn.disabled = true;

    const winIndex = getRandomWeightedIndex();
    const winningSector = wheelSectors[winIndex];
    const numSectors = wheelSectors.length;
    const arc = (2 * Math.PI) / numSectors;
    const targetSectorAngle = (3 * Math.PI / 2) - (winIndex * arc + arc / 2);
    const totalRotation = (5 * 2 * Math.PI) + targetSectorAngle - (currentWheelAngle % (2 * Math.PI));
    const duration = 4000;
    const startAngle = currentWheelAngle;
    const startTime = performance.now();

    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        currentWheelAngle = startAngle + totalRotation * easeOut;
        drawWheel();

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            isSpinning = false;
            if (spinBtn) spinBtn.disabled = false;
            if (isFree) {
                localStorage.setItem(`vj_free_spin_${window.currentUser ? window.currentUser.id : 'guest'}`, getTodayLocalDate());
            }
            addCoins(winningSector.value);
            if (typeof confetti === 'function') confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
            alert(`🎉 ยินดีด้วย! คุณได้รับ ${winningSector.value} เหรียญทอง!`);
            window.openLuckyWheelModal();
        }
    }
    requestAnimationFrame(animate);
};

function openShopModal() {
    const shopModal = document.getElementById('shop-modal');
    if (shopModal) {
        shopModal.classList.add('active');
        shopModal.style.display = 'flex';
    }
}

function closeShopModal() {
    const shopModal = document.getElementById('shop-modal');
    if (shopModal) {
        shopModal.classList.remove('active');
        shopModal.style.display = 'none';
    }
}

async function buyItem(itemKey, price) {
    if (window.userCoins < price) { alert('เหรียญของคุณไม่พอสำหรับการซื้อไอเทมนี้!'); return; }
    await addCoins(-price);
    if (itemKey === 'magnifier') {
        if (typeof window.incrementMagnifyingGlass === 'function') {
            window.incrementMagnifyingGlass();
        }
    }
    alert(`🎉 ซื้อไอเทม ${itemKey} สำเร็จ!`);
    closeShopModal();
}

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
window.openCollectionModal = openCollectionModal;
window.closeCollectionModal = closeCollectionModal;
window.switchCollectionTab = switchCollectionTab;
window.equipCollectionItem = equipCollectionItem;
window.openShopModal = openShopModal;
window.closeShopModal = closeShopModal;
window.buyItem = buyItem;

checkUserSession();
setTimeout(checkUnreadMails, 1000);
setInterval(checkUnreadMails, 15000);