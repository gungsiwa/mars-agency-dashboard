// --- main.js: ไฟล์หลักสำหรับเริ่มต้นและเชื่อมโยงทุกโมดูลเข้าด้วยกัน ---

import { initActivityModule } from './activity.js';
import { setBannerData } from './slider.js';
import { initAdminModule } from './admin.js';

const SUPABASE_URL = 'https://ngdshyexremewbpnlrae.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_NcBG60jTTDqonaFiD1RwKw_etSq5A2o';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', async () => {
    // 1. เริ่มต้นระบบกิจกรรม (Google Sheets)
    await initActivityModule();

    // 2. โหลดข้อมูลแบนเนอร์จาก Supabase และส่งให้ slider.js
    await loadBanners();

    // 3. โหลดลิงก์ภายนอก
    await loadExternalLinks();

    // 4. โหลดข้อความประกาศ (Marquee)
    await loadNotice();

    // 5. เริ่มต้นระบบแอดมินและผูก Callback เมื่อมีการเปลี่ยนแปลงข้อมูล
    initAdminModule(supabase, async (type) => {
        if (type === 'banner') await loadBanners();
        if (type === 'link') await loadExternalLinks();
        if (type === 'notice') await loadNotice();
    });
});

async function loadBanners() {
    try {
        const { data, error } = await supabase.from('site_banners').select('*').order('id', { ascending: true });
        if (error) throw error;
        setBannerData(data);
    } catch (err) {
        console.error("Error loading banners:", err);
    }
}

async function loadExternalLinks() {
    try {
        const { data, error } = await supabase.from('external_links').select('*');
        if (error) throw error;
        const linksContainer = document.getElementById("externalLinksContainer");
        if (!linksContainer) return;

        if (!data || data.length === 0) {
            linksContainer.innerHTML = '<div style="font-size: 11.5px; color: var(--text-muted); text-align: center; padding: 5px; grid-column: span 2;">ไม่มีลิงก์ในระบบ</div>';
            return;
        }

        let html = '';
        data.forEach(item => {
            if (item.url) {
                html += `<a href="${item.url}" target="_blank" class="external-link-btn">${item.title || 'ลิงก์กิจกรรม'}</a>`;
            }
        });
        linksContainer.innerHTML = html;
    } catch (err) {
        console.error("Error loading external links:", err);
    }
}

async function loadNotice() {
    try {
        const { data, error } = await supabase.from('site_notices').select('*').order('id', { ascending: false }).limit(1);
        if (error) throw error;
        const container = document.getElementById("noticeBannerContainer");
        if (!container) return;

        if (data && data.length > 0 && data[0].message) {
            container.innerHTML = `
                <div class="notice-banner">
                    <span class="notice-icon">📢</span>
                    <div class="marquee-container">
                        <div class="marquee-text">${data[0].message}</div>
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = '';
        }
    } catch (err) {
        console.error("Error loading notice:", err);
    }
}