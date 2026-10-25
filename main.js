// --- main.js: ควบคุมการทำงานหลักของหน้าเว็บ, ระบบแอดมิน, และ Welcome Popup ---

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
    
    // 📢 เรียกใช้งานระบบ Welcome Popup และ Sidebar Shortcut ประกาศ
    initWelcomePopup();
    
    // เรียกใช้งานระบบแอดมินที่แยกไปไว้ใน admin.js
    if (window.initAdminModule && supabaseClient) {
        window.initAdminModule(supabaseClient);
    }
});

// ================= 📢 ระบบ Welcome Popup และ Sidebar Shortcut ประกาศ =================
let currentAnnouncementData = null;

async function initWelcomePopup() {
    if (!supabaseClient) return;

    try {
        // 1. ดึงข้อมูลประกาศล่าสุดที่มีสถานะเปิดใช้งาน (is_active = true)
        const { data, error } = await supabaseClient
            .from('announcements')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1);

        const shortcutEl = document.getElementById('sidebarAnnouncementShortcut');
        const titleSpan = document.getElementById('sidebarAnnouncementTitle');

        if (error || !data || data.length === 0) {
            // หากไม่มีประกาศ Active ให้ซ่อนเมนูชอร์ตคัตที่ Sidebar ทันที
            if (shortcutEl) shortcutEl.style.display = 'none';
            return;
        }

        currentAnnouncementData = data[0];

        // 2. อัปเดตข้อความและแสดงผล Sidebar Shortcut ที่มุมล่างซ้าย (แสดงผลเสมอถ้ามีประกาศ Active)
        if (shortcutEl && titleSpan) {
            titleSpan.innerText = currentAnnouncementData.title || 'ประกาศและกิจกรรม';
            shortcutEl.style.display = 'flex';
        }

        // 3. ตรวจสอบเงื่อนไข "ไม่ต้องแสดงอีกในวันนี้" สำหรับตัว Welcome Popup Overlay หน้าแรก
        const hideDate = localStorage.getItem('mars_hide_popup_date');
        const todayStr = new Date().toISOString().split('T')[0];

        if (hideDate === todayStr) {
            return; // หากผู้ใช้ติ๊กซ่อนในวันนี้แล้ว จะไม่แสดงหน้าต่าง Popup ทับหน้าจอ แต่ปุ่ม Sidebar Shortcut ยังอยู่
        }

        const overlay = document.getElementById('welcomePopupOverlay');
        const imgContainer = document.getElementById('welcomePopupImageContainer');

        if (!overlay || !imgContainer) return;

        // แสดงรูปภาพ Popup หน้าแรก
        imgContainer.innerHTML = `
            <img src="${currentAnnouncementData.popup_image}" alt="Popup Announcement" style="width: 100%; height: auto; max-height: 450px; object-fit: contain; display: block;" onerror="this.src='https://via.placeholder.com/400x400/1e293b/f59e0b?text=MARS+ANNOUNCEMENT';">
        `;

        // เมื่อผู้ใช้คลิกที่รูปภาพป๊อปอัพ ➔ พุ่งตรงไปที่หน้า announcements.html ทันทีตามที่ต้องการ
        imgContainer.onclick = () => {
            window.location.href = 'announcements.html';
        };

        // แสดง Modal ป๊อปอัพต้อนรับ
        overlay.style.display = 'flex';

    } catch (err) {
        console.error('Error loading announcement popup:', err);
    }
}

window.closeWelcomePopup = function() {
    const overlay = document.getElementById('welcomePopupOverlay');
    const checkbox = document.getElementById('dontShowTodayCheckbox');

    if (checkbox && checkbox.checked) {
        // บันทึกวันที่ปัจจุบันลง LocalStorage เพื่อให้ซ่อนไปจนถึงเที่ยงคืนของวันใหม่
        const todayStr = new Date().toISOString().split('T')[0];
        localStorage.setItem('mars_hide_popup_date', todayStr);
    }

    if (overlay) {
        overlay.style.display = 'none';
    }
};

// ================= 🖼️ โหลดแบนเนอร์ภาพสไลด์ =================
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

    if (banners.length > 1) {
        let currentIdx = 0;
        track.style.transition = 'transform 0.5s ease-in-out';
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

// ================= 🔗 โหลดลิงก์ภายนอก =================
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

// ================= 📢 ประกาศด่วน =================
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

function escapeHtml(str) {
    if (!str) return '';
    return str.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}