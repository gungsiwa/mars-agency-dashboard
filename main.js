// --- main.js: ควบคุมการทำงานหลักของหน้าเว็บและโหลดข้อมูล (คงการทำงานเดิม 100%) ---

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
    
    // เรียกใช้งานระบบแอดมินที่แยกไปไว้ใน admin.js
    if (window.initAdminModule && supabaseClient) {
        window.initAdminModule(supabaseClient);
    }
});

// ================= 🏆 ดึงข้อมูล Leaderboard เกมจับคู่ VJ =================
async function loadMainLeaderboard() {
    const tbody = document.getElementById('leaderboardBody');
    if (!tbody) return;

    if (!supabaseClient) {
        tbody.innerHTML = `<tr><td colspan="4" style="color: var(--text-muted); text-align: center;">ไม่พบการเชื่อมต่อฐานข้อมูล</td></tr>`;
        return;
    }

    try {
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

        const uniquePlayers = [];
        const seenNames = new Set();
        for (const row of data) {
            const playerName = row.player_name || 'Anonymous';
            if (!seenNames.has(playerName)) {
                seenNames.add(playerName);
                uniquePlayers.push(row);
            }
            if (uniquePlayers.length >= 10) break;
        }

        let html = '';
        uniquePlayers.forEach((row, index) => {
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