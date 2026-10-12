// --- main.js: ควบคุมการทำงานหลักของแดชบอร์ด (ฉบับแก้ไขชื่อฟิลด์ตรงกับ Supabase) ---

const SUPABASE_URL = 'https://ngdshyexremewbpnlrae.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_NcBG60jTTDqonaFiD1RwKw_etSq5A2o';
let supabaseClient = null;

if (window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const activityModule = await import('./activity.js');
        if (activityModule.initActivityModule) {
            activityModule.initActivityModule();
        }
    } catch (e) {
        console.log("Activity module not loaded:", e);
    }

    loadBanners();
    loadExternalLinks();
    loadNoticeBanner();
    loadMainLeaderboard();
    setupAdminPortal();
});

// ================= 🏆 ดึงข้อมูล Leaderboard เกมจับคู่ VJ (แสดงผลครบถ้วน: ด่าน, จำนวนคลิก, เวลา) =================
async function loadMainLeaderboard() {
    const tbody = document.getElementById('leaderboardBody');
    if (!tbody) return;

    if (!supabaseClient) {
        tbody.innerHTML = `<tr><td colspan="4" style="color: var(--text-muted); text-align: center;">ไม่พบการเชื่อมต่อฐานข้อมูล</td></tr>`;
        return;
    }

    try {
        // ดึงข้อมูลมาเรียงลำดับจาก เลเวลสูงสุด -> จำนวนคลิกน้อยที่สุด -> เวลาน้อยที่สุด
        const { data, error } = await supabaseClient
            .from('vj_game_leaderboard')
            .select('*')
            .order('max_level', { ascending: false })
            .order('total_clicks', { ascending: true })
            .order('total_time', { ascending: true })
            .limit(50);

        if (error || !data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="color: var(--text-muted); text-align: center;">ยังไม่มีประวัติคะแนนเกม</td></tr>`;
            return;
        }

        // กรองให้เหลือผู้เล่นคนละ 1 รายการที่ดีที่สุด (ไม่ให้ชื่อซ้ำหลายรอบ)
        const uniquePlayers = [];
        const seenNames = new Set();
        for (const row of data) {
            const playerName = row.player_name || 'Anonymous';
            if (!seenNames.has(playerName)) {
                seenNames.has(playerName);
                seenNames.add(playerName);
                uniquePlayers.push(row);
            }
            if (uniquePlayers.length >= 10) break; // แสดงท็อป 10 อันดับแรก
        }

        let html = '';
        uniquePlayers.forEach((row, index) => {
            // จัดรูปแบบเวลา (วินาที -> นาที:วินาที)
            const m = Math.floor(row.total_time / 60).toString().padStart(2, '0');
            const s = (row.total_time % 60).toString().padStart(2, '0');
            const timeStr = `${m}:${s}`;

            html += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${escapeHtml(row.player_name || 'Anonymous')}</td>
                    <td>Lv.${row.max_level} (${row.total_clicks} คลิก)</td>
                    <td>${timeStr}</td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    } catch (err) {
        console.error('Error loading leaderboard:', err);
        tbody.innerHTML = `<tr><td colspan="4" style="color: var(--text-muted); text-align: center;">เกิดข้อผิดพลาดในการโหลด</td></tr>`;
    }
}

// ================= 🖼️ โหลดแบนเนอร์ภาพสไลด์ (จากตาราง site_banners) =================
async function loadBanners() {
    const track = document.getElementById('bannerSliderTrack');
    const dotsContainer = document.getElementById('bannerDots');
    if (!track) return;

    let banners = [{ image_url: 'herobanner.jpg', link_url: '' }];

    if (supabaseClient) {
        try {
            const { data } = await supabaseClient.from('site_banners').select('*');
            if (data && data.length > 0) banners = data;
        } catch (e) {
            console.log('Using default banners');
        }
    }

    track.innerHTML = '';
    if (dotsContainer) dotsContainer.innerHTML = '';

    banners.forEach((banner, idx) => {
        const slide = document.createElement('div');
        slide.style.minWidth = '100%';
        slide.style.height = '100%';
        slide.style.position = 'relative';
        slide.innerHTML = `<img src="${banner.image_url}" alt="Banner" style="width:100%; height:100%; object-fit:contain;" onerror="this.src='https://via.placeholder.com/800x160/1e293b/f59e0b?text=MARS+BANNER';">`;
        track.appendChild(slide);

        if (dotsContainer) {
            const dot = document.createElement('div');
            dot.style.width = '8px';
            dot.style.height = '8px';
            dot.style.borderRadius = '50%';
            dot.style.background = idx === 0 ? 'var(--gold-accent)' : 'rgba(255,255,255,0.4)';
            dot.style.cursor = 'pointer';
            dotsContainer.appendChild(dot);
        }
    });

    // โค้ดใหม่ที่ต้องนำไปแทนที่
    if (banners.length > 1) {
        let currentIdx = 0;
        track.style.transition = 'transform 0.5s ease-in-out'; // เพิ่มความนุ่มนวลในการเลื่อน
        setInterval(() => {
            currentIdx = (currentIdx + 1) % banners.length;
            track.style.transform = `translateX(-${currentIdx * 100}%)`;
            if (dotsContainer) {
                Array.from(dotsContainer.children).forEach((d, i) => {
                    d.style.background = i === currentIdx ? 'var(--gold-accent)' : 'rgba(255,255,255,0.4)';
                });
            }
        }, 4000);
    }
}

// ================= 🔗 โหลดลิงก์ภายนอก (จากตาราง external_links) =================
async function loadExternalLinks() {
    const container = document.getElementById('externalLinksContainer');
    if (!container) return;

    let links = [
        { title: 'Bigo Live', url: 'https://www.bigo.tv' },
        { title: 'กลุ่มไลน์สังกัด', url: 'https://line.me/ti/p/IG2mfqJhkb' },
    ];

    if (supabaseClient) {
        try {
            const { data } = await supabaseClient.from('external_links').select('*');
            if (data && data.length > 0) links = data;
        } catch (e) {
            console.log('Using default links');
        }
    }

    container.innerHTML = '';
    links.forEach(link => {
        const a = document.createElement('a');
        a.href = link.url;
        a.target = '_blank';
        a.className = 'external-link-btn';
        a.innerText = link.title;
        container.appendChild(a);
    });
}

// ================= 📢 ประกาศด่วน (จากตาราง site_notices - ใช้ฟิลด์ message) =================
async function loadNoticeBanner() {
    const container = document.getElementById('noticeBannerContainer');
    if (!container) return;

    let noticeText = '📢 ยินดีต้อนรับสู่ระบบจัดการสังกัด VJ และกิจกรรม MARS Agency อย่างเป็นทางการ!';
    if (supabaseClient) {
        try {
            const { data } = await supabaseClient.from('site_notices').select('*').limit(1);
            if (data && data.length > 0 && data[0].message) {
                noticeText = data[0].message;
            }
        } catch (e) {
            console.log('Using default notice');
        }
    }

    container.innerHTML = `
        <div class="notice-banner">
            <div class="notice-icon">📢</div>
            <div class="marquee-container">
                <div class="marquee-text">${noticeText}</div>
            </div>
        </div>
    `;
}

// ================= 🔐 ระบบแอดมินหลังบ้าน (Secret Portal & Manager Modal) =================
let currentManagerType = '';

function setupAdminPortal() {
    const trigger = document.getElementById('secret-admin-trigger');
    const popup = document.getElementById('admin-menu-popup');
    const loginModal = document.getElementById('login-modal');
    const closeBtn = document.getElementById('close-modal-btn');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');

    if (trigger && popup) {
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isLogged = localStorage.getItem('mars_admin_logged') === 'true';
            if (isLogged) {
                popup.style.display = popup.style.display === 'block' ? 'none' : 'block';
            } else {
                if (loginModal) loginModal.style.display = 'flex';
            }
        });
    }

    document.addEventListener('click', () => {
        if (popup) popup.style.display = 'none';
    });

    if (closeBtn && loginModal) {
        closeBtn.addEventListener('click', () => {
            loginModal.style.display = 'none';
        });
    }

    if (loginBtn) {
        loginBtn.addEventListener('click', async () => {
            const emailInput = document.getElementById('admin-email').value.trim();
            const passInput = document.getElementById('admin-password').value.trim();
            const errBox = document.getElementById('login-error');

            if (!supabaseClient) {
                if (errBox) {
                    errBox.innerText = 'ยังไม่ได้เชื่อมต่อ Supabase';
                    errBox.style.display = 'block';
                }
                return;
            }

            try {
                const { data, error } = await supabaseClient.auth.signInWithPassword({
                    email: emailInput,
                    password: passInput
                });

                if (error) throw error;

                localStorage.setItem('mars_admin_logged', 'true');
                if (loginModal) loginModal.style.display = 'none';
                alert('🎉 เข้าสู่ระบบแอดมินสำเร็จ!');
                location.reload();
            } catch (err) {
                if (errBox) {
                    errBox.innerText = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
                    errBox.style.display = 'block';
                }
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            if (supabaseClient) await supabaseClient.auth.signOut();
            localStorage.removeItem('mars_admin_logged');
            alert('ออกจากระบบเรียบร้อย');
            location.reload();
        });
    }
}

window.openAdminManager = function(type) {
    currentManagerType = type;
    const modal = document.getElementById('admin-manager-modal');
    const titleEl = document.getElementById('manager-title');
    const fieldsContainer = document.getElementById('form-fields-container');
    if (!modal) return;

    modal.style.display = 'flex';
    if (type === 'banner') {
        titleEl.innerText = '🖼️ จัดการแบนเนอร์ภาพสไลด์';
        fieldsContainer.innerHTML = `
            <div style="margin-bottom: 8px;">
                <label style="display: block; font-size: 12px; color: #aaa; margin-bottom: 4px;">เลือกไฟล์รูปภาพจากเครื่อง/มือถือ:</label>
                <input type="file" id="m-banner-file" accept="image/*" style="width:100%; padding:6px; background:#1e1e1e; border:1px solid #444; color:#ccc; border-radius:4px; font-size:13px;">
            </div>
            <div>
                <label style="display: block; font-size: 12px; color: #aaa; margin-bottom: 4px;">URL ลิงก์เมื่อคลิกภาพ (ถ้ามี):</label>
                <input type="text" id="m-banner-link" placeholder="https://..." style="width:100%; padding:8px; background:#1e1e1e; border:1px solid #444; color:#fff; border-radius:4px; font-size:13px;">
            </div>
        `;
    } else if (type === 'link') {
        titleEl.innerText = '🔗 จัดการลิงก์ภายนอก';
        fieldsContainer.innerHTML = `
            <input type="text" id="m-link-title" placeholder="ชื่อลิงก์" style="width:100%; padding:8px; margin-bottom:8px; background:#1e1e1e; border:1px solid #444; color:#fff; border-radius:4px;">
            <input type="text" id="m-link-url" placeholder="URL ปลายทาง" style="width:100%; padding:8px; background:#1e1e1e; border:1px solid #444; color:#fff; border-radius:4px;">
        `;
    } else if (type === 'notice') {
        titleEl.innerText = '📢 จัดการข้อความแจ้งเตือน';
        fieldsContainer.innerHTML = `
            <textarea id="m-notice-text" placeholder="ข้อความประกาศด่วน..." style="width:100%; padding:8px; height:80px; background:#1e1e1e; border:1px solid #444; color:#fff; border-radius:4px;"></textarea>
        `;
    }
    loadManagerItemList(type);
};

window.closeAdminManager = function() {
    const modal = document.getElementById('admin-manager-modal');
    if (modal) modal.style.display = 'none';
};

window.saveNewItem = async function() {
    if (!supabaseClient) return;
    let tableName = currentManagerType === 'banner' ? 'site_banners' : (currentManagerType === 'link' ? 'external_links' : 'site_notices');
    try {
        if (currentManagerType === 'banner') {
            const fileInput = document.getElementById('m-banner-file');
            const linkInput = document.getElementById('m-banner-link');
            if (!fileInput.files || fileInput.files.length === 0) {
                alert('กรุณาเลือกไฟล์รูปภาพจากเครื่องหรือมือถือ');
                return;
            }

            const file = fileInput.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
            const filePath = `banners/${fileName}`;

            const { error: uploadError } = await supabaseClient.storage.from('site-assets').upload(filePath, file);
            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabaseClient.storage.from('site-assets').getPublicUrl(filePath);
            const imageUrl = publicUrlData.publicUrl;
            const linkUrl = linkInput ? linkInput.value.trim() : '';

            // บันทึกลงตาราง site_banners ให้ตรงกับคอลัมน์ image_url และ link_url
            await supabaseClient.from(tableName).insert([{ image_url: imageUrl, link_url: linkUrl }]);
            alert('อัปโหลดและบันทึกแบนเนอร์สำเร็จ!');
        } else if (currentManagerType === 'link') {
            const title = document.getElementById('m-link-title').value;
            const url = document.getElementById('m-link-url').value;
            await supabaseClient.from(tableName).insert([{ title, url }]);
            alert('บันทึกข้อมูลสำเร็จ!');
        } else if (currentManagerType === 'notice') {
            const message = document.getElementById('m-notice-text').value;
            await supabaseClient.from(tableName).delete().neq('id', 0);
            // บันทึกลงตาราง site_notices ให้ตรงกับคอลัมน์ message
            await supabaseClient.from(tableName).insert([{ message }]);
            alert('บันทึกข้อความแจ้งเตือนสำเร็จ!');
        }
        loadManagerItemList(currentManagerType);
        loadBanners();
        loadExternalLinks();
        loadNoticeBanner();
    } catch (err) {
        console.error('Save error:', err);
        alert('เกิดข้อผิดพลาดในการบันทึก: ' + err.message);
    }
};

async function loadManagerItemList(type) {
    const listContainer = document.getElementById('manager-item-list');
    if (!listContainer || !supabaseClient) return;
    listContainer.innerHTML = '<div style="color:#888; text-align:center;">กำลังโหลด...</div>';

    let tableName = type === 'banner' ? 'site_banners' : (type === 'link' ? 'external_links' : 'site_notices');
    try {
        const { data } = await supabaseClient.from(tableName).select('*');
        if (!data || data.length === 0) {
            listContainer.innerHTML = '<div style="color:#888; text-align:center;">ไม่มีข้อมูล</div>';
            return;
        }
        let html = '';
        data.forEach(item => {
            const label = item.message || item.link_url || item.title || item.url || 'รายการ';
            html += `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:6px; border-bottom:1px solid #333; font-size:12px;">
                    <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:320px;">${escapeHtml(label)}</span>
                    <button onclick="deleteItem('${tableName}', ${item.id})" style="background:#dc3545; color:#fff; border:none; padding:2px 6px; border-radius:4px; cursor:pointer; font-size:11px;">ลบ</button>
                </div>
            `;
        });
        listContainer.innerHTML = html;
    } catch (e) {
        listContainer.innerHTML = '<div style="color:#f87171; text-align:center;">โหลดไม่สำเร็จ</div>';
    }
};

window.deleteItem = async function(table, id) {
    if (!confirm('ต้องการลบรายการนี้ใช่หรือไม่?')) return;
    try {
        await supabaseClient.from(table).delete().eq('id', id);
        loadManagerItemList(currentManagerType);
        loadBanners();
        loadExternalLinks();
        loadNoticeBanner();
    } catch (err) {
        alert('ลบไม่สำเร็จ');
    }
};

function escapeHtml(str) {
    if (!str) return '';
    return str.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}